/**
 * @file synth-arpeggiator.js
 * @description Event-driven arpeggiator engine that shares the transport with the
 * recorder and exposes its generated sequence to the global state for editing.
 */

const DEFAULT_SETTINGS = {
    pattern: 'up',
    rate: '8n',
    gate: 0.8,
    octaves: 1,
    latch: false,
    velocity: 0.9,
    loop: false
};

const SUPPORTED_PATTERNS = new Set(['up', 'down', 'updown', 'random']);

const SCHEDULE_LOOKAHEAD = 0.02; // seconds of lead time to guarantee scheduling ahead of playback
const STOP_PADDING = 0.1; // tail padding to ensure all releases finish before stopping

export class ArpeggiatorEngine {
    constructor(state, synthEngine, eventBus) {
        this.state = state;
        this.synthEngine = synthEngine;
        this.eventBus = eventBus;
        this.Tone = synthEngine?.Tone || window.Tone;

        this.isEnabled = false;
        this.isPlaying = false;
        this.isArmed = false;
        this.sourceNotes = [];
        this.heldNotes = new Set();
        this.sequence = [];
        this.seqMeta = { recordBpm: 120 };
        this.settings = { ...DEFAULT_SETTINGS };
        this.recordBpm = 120;
        this.scheduledEventIds = [];
        this.startedOwnTransport = false;
        this.hostSyncActive = false;
        this._suppressExternalSync = false;
        this.anchorTransportTime = null;
        this.anchorAudioTime = null;
        this.anchorOffset = 0;
        this.loopInterval = 0;

        this.#initState();

        this.eventBus.addEventListener('sequence-changed', () => {
            if (this._suppressExternalSync) return;
            if (this.state.mode !== 'arpeggiator') return;
            this.syncFromSharedSequence();
        });
        this.eventBus.addEventListener('tempo-updated', () => {
            if (this.isPlaying) return;
            this.rebuildSequence();
        });
    }

    #initState() {
        if (!this.state.arp) {
            this.state.arp = {
                enabled: false,
                isPlaying: false,
                isArmed: false,
                sourceNotes: [],
                sequence: [],
                settings: { ...this.settings },
                seqMeta: { recordBpm: this.recordBpm },
                mode: 'recorder'
            };
        } else {
            this.settings = { ...DEFAULT_SETTINGS, ...(this.state.arp.settings || {}) };
            this.sourceNotes = Array.isArray(this.state.arp.sourceNotes) ? [...this.state.arp.sourceNotes] : [];
            this.sequence = Array.isArray(this.state.arp.sequence) ? [...this.state.arp.sequence] : [];
            if (this.state.arp.seqMeta) this.seqMeta = { ...this.state.arp.seqMeta };
            this.isEnabled = !!this.state.arp.enabled;
            this.isPlaying = !!this.state.arp.isPlaying;
            this.isArmed = !!this.state.arp.isArmed;
        }
        this.recordBpm = this.seqMeta?.recordBpm || this.getTransportBpm();
        this.#syncSharedState();
    }

    setEnabled(enabled) {
        this.isEnabled = !!enabled;
        this.state.arp.enabled = this.isEnabled;
        this.#syncSharedState();
        this.#emitState();
    }

    toggleArm() {
        if (this.isPlaying) return;
        this.isArmed = !this.isArmed;
        if (this.isArmed) {
            this.sourceNotes = [];
            this.state.arp.sourceNotes = [];
            this.sequence = [];
            this.seqMeta = { recordBpm: this.getTransportBpm(), settings: { ...this.settings } };
            this.#syncSharedSequence();
            this.#emitSequenceChanged();
        }
        this.#dispatchStatus(this.isArmed ? 'Arp capture ready. Play notes to build pattern.' : 'Arp capture ended.');
        this.#emitState();
    }

    setSettings(partial = {}) {
        const next = { ...this.settings, ...partial };
        if (partial.pattern && !SUPPORTED_PATTERNS.has(partial.pattern)) {
            console.warn('[Arpeggiator] Unsupported pattern', partial.pattern);
            delete next.pattern;
        }
        if (partial.loop !== undefined) {
            next.loop = !!partial.loop;
        }
        const loopChanged = typeof partial.loop !== 'undefined' && !!next.loop !== !!this.settings.loop;

        this.settings = next;
        this.state.arp.settings = { ...this.settings };
        if (partial.sourceNotes) delete this.state.arp.settings.sourceNotes;
        this.rebuildSequence();

        if (loopChanged && this.isPlaying) {
            const resumeSync = {
                transportTime: this.anchorTransportTime,
                audioTime: this.anchorAudioTime
            };
            this.stopPlayback();
            this.startPlayback(resumeSync);
        }
    }

    setSequence(sequence, meta = null) {
        const events = Array.isArray(sequence) ? sequence.map(evt => ({ ...evt })) : [];
        this.sequence = events;
        this.state.arp.sequence = events.map(evt => ({ ...evt }));
        if (meta && typeof meta === 'object') {
            this.seqMeta = { ...meta };
            if (meta.settings) {
                this.settings = { ...this.settings, ...meta.settings };
            }
        }
        this.sourceNotes = Array.isArray(meta?.sourceNotes) ? [...meta.sourceNotes] : [...(meta?.settings?.sourceNotes || [])];
        this.state.arp.sourceNotes = [...this.sourceNotes];
        this.recordBpm = this.seqMeta?.recordBpm || this.getTransportBpm();
        this.#syncSharedSequence();
    }

    getSequence() {
        return {
            events: this.sequence.map(evt => ({ ...evt })),
            meta: {
                ...this.seqMeta,
                recordBpm: this.recordBpm,
                settings: { ...this.settings },
                sourceNotes: [...this.sourceNotes]
            }
        };
    }

    captureNotesFromSequence(sequence) {
        if (!Array.isArray(sequence)) return;
        const Tone = this.Tone;
        if (!Tone) return;
        const midiSeen = new Set();
        const result = [];
        sequence.forEach(evt => {
            try {
                const midi = Tone.Frequency(evt.note).toMidi();
                if (!midiSeen.has(midi)) {
                    midiSeen.add(midi);
                    result.push(evt.note);
                }
            } catch (err) {
                console.warn('[Arpeggiator] Could not parse note', evt.note, err);
            }
        });
        this.sourceNotes = result;
        this.state.arp.sourceNotes = [...result];
    }

    handleNoteOn(note, velocity = 0.9) {
        if (!note) return;
        if (this.isArmed && !this.sourceNotes.includes(note)) {
            this.sourceNotes.push(note);
            this.state.arp.sourceNotes = [...this.sourceNotes];
            this.rebuildSequence();
        }
        this.heldNotes.add(note);
    }

    handleNoteOff(note) {
        if (!note) return;
        this.heldNotes.delete(note);
        if (!this.settings.latch && !this.isArmed) {
            const idx = this.sourceNotes.indexOf(note);
            if (idx >= 0) {
                this.sourceNotes.splice(idx, 1);
                this.state.arp.sourceNotes = [...this.sourceNotes];
                this.rebuildSequence();
            }
        }
    }

    rebuildSequence() {
        const Tone = this.Tone;
        if (!Tone) {
            console.warn('[Arpeggiator] Tone.js not available for sequence rebuild.');
            return;
        }
        if (!this.sourceNotes.length) {
            this.sequence = [];
            this.state.arp.sequence = [];
            this.state.seq = [];
            this.state.seqMeta = { recordBpm: this.getTransportBpm() };
            this.#emitSequenceChanged();
            return;
        }
        const ordered = this.#buildPatternOrder();
        const stepDur = Tone.Time(this.settings.rate || DEFAULT_SETTINGS.rate).toSeconds();
        const gate = Math.max(0.1, Math.min(1, this.settings.gate ?? DEFAULT_SETTINGS.gate));
        const events = [];
        let cursor = 0;
        ordered.forEach((note, index) => {
            const id = `arp_${index}_${Date.now()}`;
            events.push({
                id,
                note,
                start: parseFloat(cursor.toFixed(6)),
                dur: parseFloat((stepDur * gate).toFixed(6)),
                vel: this.settings.velocity ?? DEFAULT_SETTINGS.velocity
            });
            cursor += stepDur;
        });
        this.sequence = events;
        this.state.arp.sequence = events.map(evt => ({ ...evt }));
        this.seqMeta = {
            recordBpm: this.getTransportBpm(),
            settings: { ...this.settings },
            gate,
            rate: this.settings.rate,
            sourceNotes: [...this.sourceNotes]
        };
        this.state.arp.seqMeta = { ...this.seqMeta };
        this.state.seq = events.map(evt => ({ ...evt }));
        this.state.seqMeta = { ...this.seqMeta };
        this.#emitSequenceChanged();
    }

    editNote(index, changes = {}) {
        if (typeof index !== 'number' || index < 0 || index >= this.sequence.length) return;
        const updated = { ...this.sequence[index], ...changes };
        this.sequence[index] = updated;
        this.#emitSequenceChanged();
    }

    deleteNote(index) {
        if (typeof index !== 'number' || index < 0 || index >= this.sequence.length) return;
        this.sequence.splice(index, 1);
        this.#emitSequenceChanged();
    }

    startPlayback(syncDetail) {
        if (this.isPlaying || !this.sequence.length) return;
        const transport = this.synthEngine?.Tone?.Transport;
        if (!transport) {
            console.error('[Arpeggiator] Cannot start playback without Tone.Transport.');
            return;
        }

        const nowTransport = transport.seconds;
        const nowAudio = this.synthEngine.Tone.now();
        const {
            hasHost,
            anchorOffset,
            anchorTransportTime,
            anchorAudioTime
        } = this.#resolveSyncAnchor(syncDetail, transport, nowTransport, nowAudio);

        const timeScale = this.getPlaybackTimeScale(transport);
        const cycleDuration = this.getSequenceDuration(timeScale);
        const loopInterval = this.settings.loop && cycleDuration > 0.001 ? cycleDuration : 0;

        this.#clearScheduledEvents();
        this.anchorOffset = anchorOffset;
        this.anchorTransportTime = anchorTransportTime;
        this.anchorAudioTime = anchorAudioTime;
        this.loopInterval = loopInterval;

        let scheduledCount = 0;
        this.sequence.forEach(evt => {
            scheduledCount += this.#scheduleNoteEvent(evt, {
                anchorOffset,
                timeScale,
                loopInterval
            });
        });

        if (!scheduledCount) {
            console.warn('[Arpeggiator] No events were scheduled for playback.');
            return;
        }

        if (!loopInterval && cycleDuration > 0) {
            const stopOffset = anchorOffset + cycleDuration + STOP_PADDING;
            const stopId = transport.scheduleOnce(() => {
                this.stopPlayback();
            }, `+${Math.max(0, stopOffset).toFixed(6)}`);
            this.#addScheduledId(stopId);
        }

        this.isPlaying = true;
        this.hostSyncActive = hasHost;
        this.startedOwnTransport = !hasHost;

        if (!hasHost && transport.state !== 'started') {
            transport.start();
        }

        this.#emitState();
    }

    stopPlayback() {
        const transport = this.synthEngine?.Tone?.Transport;
        const wasHostSync = this.hostSyncActive;
        this.#clearScheduledEvents();
        this.isPlaying = false;
        this.hostSyncActive = false;

        if (!wasHostSync && this.startedOwnTransport && transport) {
            transport.stop();
            transport.position = 0;
        }

        this.startedOwnTransport = false;
        this.anchorTransportTime = null;
        this.anchorAudioTime = null;
        this.anchorOffset = 0;
        this.loopInterval = 0;

        this.synthEngine.releaseAll();
        this.eventBus.dispatchEvent(new CustomEvent('release-all-keys'));
        this.#emitState();
    }

    clear() {
        if (this.isPlaying) this.stopPlayback();
        this.sequence = [];
        this.state.arp.sequence = [];
        this.sourceNotes = [];
        this.state.arp.sourceNotes = [];
        this.seqMeta = { recordBpm: this.getTransportBpm(), settings: { ...this.settings } };
        this.state.seq = [];
        this.state.seqMeta = { ...this.seqMeta };
        this.anchorOffset = 0;
        this.loopInterval = 0;
        this.anchorTransportTime = null;
        this.anchorAudioTime = null;
        this.#emitSequenceChanged();
        this.#emitState();
    }

    getSequenceDuration(timeScale = 1) {
        if (!this.sequence.length) return 0;
        const base = Math.max(...this.sequence.map(evt => evt.start + evt.dur));
        return base * timeScale;
    }

    getTransportBpm() {
        const transport = this.synthEngine?.Tone?.Transport;
        if (!transport) return this.recordBpm || 120;
        if (typeof transport.bpm?.value === 'number') return transport.bpm.value;
        if (typeof transport.bpm === 'number') return transport.bpm;
        return this.recordBpm || 120;
    }

    getPlaybackTimeScale(transport) {
        const currentBpm = this.getTransportBpm(transport);
        const sourceBpm = this.seqMeta?.recordBpm || this.recordBpm || currentBpm || 120;
        if (!sourceBpm || !currentBpm) return 1;
        return sourceBpm / currentBpm;
    }

    #resolveSyncAnchor(syncDetail, transport, nowTransport, nowAudio) {
        let hostTransportTime = null;
        let hostAudioTime = null;

        if (typeof syncDetail === 'number') {
            hostTransportTime = syncDetail;
        } else if (syncDetail && typeof syncDetail === 'object') {
            if (typeof syncDetail.transportTime === 'number') hostTransportTime = syncDetail.transportTime;
            else if (typeof syncDetail.startTime === 'number') hostTransportTime = syncDetail.startTime;
            if (typeof syncDetail.audioTime === 'number') hostAudioTime = syncDetail.audioTime;
        }

        if (hostTransportTime === null && hostAudioTime !== null) {
            hostTransportTime = nowTransport + Math.max(0, hostAudioTime - nowAudio);
        }

        const hasHost = typeof hostTransportTime === 'number';
        const baseDelta = hasHost ? Math.max(0, hostTransportTime - nowTransport) : 0;
        const anchorOffset = hasHost ? baseDelta : baseDelta + SCHEDULE_LOOKAHEAD;
        return {
            hasHost,
            anchorOffset,
            anchorTransportTime: nowTransport + anchorOffset,
            anchorAudioTime: nowAudio + anchorOffset
        };
    }

    #scheduleNoteEvent(evt, { anchorOffset, timeScale, loopInterval }) {
        if (!evt || typeof evt.start !== 'number' || typeof evt.dur !== 'number') return 0;
        const scaledStart = evt.start * timeScale;
        const scaledDur = Math.max(evt.dur * timeScale, 0);
        if (scaledDur <= 0 && !loopInterval) return 0;

        const noteVelocity = typeof evt.vel === 'number' ? evt.vel : (this.settings.velocity ?? DEFAULT_SETTINGS.velocity);
        const startOffset = Math.max(0, anchorOffset + scaledStart);

        this.#scheduleTransportEvent(startOffset, loopInterval, (time) => {
            this.eventBus.dispatchEvent(new CustomEvent('note-visual-change', { detail: { note: evt.note, active: true } }));
            const playDur = Math.max(scaledDur, 0.001);
            this.synthEngine.triggerAttackRelease(evt.note, playDur, time, noteVelocity);
        }, loopInterval === 0);

        if (scaledDur > 0) {
            const releaseOffset = startOffset + scaledDur;
            this.#scheduleTransportEvent(releaseOffset, loopInterval, () => {
                this.eventBus.dispatchEvent(new CustomEvent('note-visual-change', { detail: { note: evt.note, active: false } }));
            }, loopInterval === 0);
        }

        return 1;
    }

    #scheduleTransportEvent(offset, loopInterval, callback, removeAfterExecute = false) {
        const transport = this.synthEngine?.Tone?.Transport;
        if (!transport) return null;
        const startSeconds = Math.max(0, offset);
        const startExpr = `+${startSeconds.toFixed(6)}`;

        if (loopInterval > 0.001) {
            const id = transport.scheduleRepeat((time) => callback(time), loopInterval, startExpr);
            this.#addScheduledId(id);
            return id;
        }

        let id;
        const wrapped = (time) => {
            callback(time);
            if (removeAfterExecute) this.#removeScheduledId(id);
        };
        id = transport.schedule(wrapped, startExpr);
        this.#addScheduledId(id);
        return id;
    }

    #clearScheduledEvents() {
        const transport = this.synthEngine?.Tone?.Transport;
        if (transport) {
            this.scheduledEventIds.forEach(id => transport.clear(id));
        }
        this.scheduledEventIds = [];
    }

    #addScheduledId(id) {
        if (id === undefined || id === null) return;
        this.scheduledEventIds.push(id);
    }

    #removeScheduledId(id) {
        if (id === undefined || id === null) return;
        const idx = this.scheduledEventIds.indexOf(id);
        if (idx >= 0) this.scheduledEventIds.splice(idx, 1);
    }

    getState() {
        return {
            enabled: this.isEnabled,
            isArmed: this.isArmed,
            sourceNotes: [...this.sourceNotes],
            sequence: this.sequence.map(evt => ({ ...evt })),
            seqMeta: { ...this.seqMeta, recordBpm: this.recordBpm },
            settings: { ...this.settings }
        };
    }

    loadState(saved) {
        if (!saved) return;
        this.isEnabled = !!saved.enabled;
        this.isArmed = !!saved.isArmed;
        this.settings = { ...DEFAULT_SETTINGS, ...(saved.settings || {}) };
        this.sourceNotes = Array.isArray(saved.sourceNotes) ? [...saved.sourceNotes] : [];
        this.sequence = Array.isArray(saved.sequence) ? saved.sequence.map(evt => ({ ...evt })) : [];
        this.seqMeta = { ...(saved.seqMeta || {}), settings: { ...this.settings }, sourceNotes: [...this.sourceNotes] };
        this.recordBpm = this.seqMeta?.recordBpm || this.getTransportBpm();
        this.#syncSharedSequence();
        this.#emitSequenceChanged();
        this.#emitState();
    }

    syncFromSharedSequence() {
        const sharedSeq = Array.isArray(this.state.seq) ? this.state.seq : [];
        this.sequence = sharedSeq.map(evt => ({ ...evt }));
        this.captureNotesFromSequence(this.sequence);
        this.seqMeta = { ...this.state.seqMeta, settings: { ...this.settings }, sourceNotes: [...this.sourceNotes] };
        this.recordBpm = this.seqMeta?.recordBpm || this.getTransportBpm();
        this.#syncSharedSequence();
    }

    #buildPatternOrder() {
        const Tone = this.Tone;
        const baseMidi = this.sourceNotes
            .map(note => {
                try { return Tone.Frequency(note).toMidi(); }
                catch { return null; }
            })
            .filter(midi => midi !== null)
            .sort((a, b) => a - b);
        if (!baseMidi.length) return [];
        const octaves = Math.max(1, Math.min(4, parseInt(this.settings.octaves, 10) || 1));
        const pattern = this.settings.pattern || 'up';
        const expanded = [];
        for (let oct = 0; oct < octaves; oct += 1) {
            baseMidi.forEach(midi => expanded.push(midi + oct * 12));
        }
        let sequenceMidi;
        switch (pattern) {
            case 'down':
                sequenceMidi = [...expanded].sort((a, b) => b - a);
                break;
            case 'updown':
                {
                    const ascending = [...expanded].sort((a, b) => a - b);
                    const descending = [...ascending].reverse().slice(1, -1);
                    sequenceMidi = [...ascending, ...descending];
                }
                break;
            case 'random':
                sequenceMidi = [...expanded].sort(() => Math.random() - 0.5);
                break;
            case 'up':
            default:
                sequenceMidi = [...expanded].sort((a, b) => a - b);
                break;
        }
        return sequenceMidi.map(midi => Tone.Frequency(midi, 'midi').toNote());
    }

    #syncSharedSequence() {
        this.state.arp.sequence = this.sequence.map(evt => ({ ...evt }));
        this.state.arp.seqMeta = { ...this.seqMeta, recordBpm: this.recordBpm };
        this.state.arp.settings = { ...this.settings };
        this.state.arp.sourceNotes = [...this.sourceNotes];
        this.state.seq = this.sequence.map(evt => ({ ...evt }));
        this.state.seqMeta = { ...this.seqMeta, recordBpm: this.recordBpm };
    }

    #syncSharedState() {
        this.state.arp = this.state.arp || {};
        this.state.arp.enabled = this.isEnabled;
        this.state.arp.isPlaying = this.isPlaying;
        this.state.arp.isArmed = this.isArmed;
        this.state.arp.settings = { ...this.settings };
        this.state.arp.seqMeta = { ...this.seqMeta, recordBpm: this.recordBpm };
        this.state.arp.sourceNotes = [...this.sourceNotes];
        this.state.arp.sequence = this.sequence.map(evt => ({ ...evt }));
    }

    #emitSequenceChanged() {
        this.#syncSharedSequence();
        this._suppressExternalSync = true;
        this.eventBus.dispatchEvent(new CustomEvent('sequence-changed'));
        this.eventBus.dispatchEvent(new CustomEvent('arp-sequence-changed', {
            detail: {
                sequence: this.getSequence(),
                settings: { ...this.settings }
            }
        }));
        this._suppressExternalSync = false;
    }

    #emitState() {
        this.#syncSharedState();
        this.eventBus.dispatchEvent(new CustomEvent('recording-state-changed', {
            detail: {
                activeEngine: this.state.mode === 'arpeggiator' ? 'arpeggiator' : 'recorder',
                isRecording: false,
                isArmed: this.isArmed,
                isPlaying: this.isPlaying,
                hasSequence: this.sequence.length > 0
            }
        }));
        this.eventBus.dispatchEvent(new CustomEvent('arp-state-changed', {
            detail: {
                enabled: this.isEnabled,
                isArmed: this.isArmed,
                isPlaying: this.isPlaying,
                sourceNotes: [...this.sourceNotes],
                settings: { ...this.settings }
            }
        }));
    }

    #dispatchStatus(message, type = 'info') {
        this.eventBus.dispatchEvent(new CustomEvent('status-update', {
            detail: { message: `Arp: ${message}`, type }
        }));
    }
}

export default ArpeggiatorEngine;
