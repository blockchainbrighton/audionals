/**
 * Module: BOP-SYNTH-V12/EnhancedRecorder.js
 * Purpose: Audio recording functionality
 * Exports: EnhancedRecorder
 * Depends on: none
 */

const SCHEDULE_LOOKAHEAD = 0.02;
const STOP_PADDING = 0.1;
const MIN_EVENT_DURATION = 0.005;

export class EnhancedRecorder {
    constructor(state, synthEngine, eventBus) {
        this.state = state;
        this.synthEngine = synthEngine;
        this.eventBus = eventBus;
        this.isRecording = false;
        this.isPlaying = false;
        this.isArmed = false;
        this.recStartTime = 0;
        this.scheduledEventIds = [];
        this.isFirstNote = false; // <-- ADD
        this.hostSyncActive = false;
        this.recordBpm = 120;
        this.startedOwnTransport = false;
        this.anchorTransportTime = null;
        this.anchorAudioTime = null;
        this.anchorOffset = 0;
        this.loopInterval = 0;
        this.loopStart = 0;
        this.state.seqMeta = { recordBpm: this.recordBpm };
    }

    playNote(note, velocity = 0.8) {
        if (this.state.activeNotes.has(note)) return; // Prevent re-triggering

        // If armed, start recording and record the note as the first at t=0
        if (this.isArmed) {
            this.startRecording(note, velocity); // <-- Pass note/vel!
            return; // All first-note logic happens inside startRecording
        }

        this.state.activeNotes.add(note);
        this.eventBus.dispatchEvent(new CustomEvent('note-visual-change', { detail: { note, active: true } }));

        if (this.isRecording) {
            const time = this.synthEngine.Tone.now() - this.recStartTime;
            const noteId = `${note}_${time.toFixed(4)}`;
            this.state.activeNoteIds.set(note, noteId);
            this.state.seq.push({ id: noteId, note, start: time, dur: 0, vel: velocity });
        }
        this.synthEngine.noteOn(note, velocity);
    }

    releaseNote(note) {
        if (!this.state.activeNotes.has(note)) return;

        this.state.activeNotes.delete(note);
        this.eventBus.dispatchEvent(new CustomEvent('note-visual-change', { detail: { note, active: false } }));

        if (this.isRecording) {
            const noteId = this.state.activeNoteIds.get(note);
            const noteObject = this.state.seq.find(n => n.id === noteId);
            if (noteObject) {
                const endTime = this.synthEngine.Tone.now() - this.recStartTime;
                noteObject.dur = endTime - noteObject.start;
                this.state.activeNoteIds.delete(note);
            }
        }
        this.synthEngine.noteOff(note);
    }

    toggleRecording() {
        if (this.isPlaying) return;
        if (this.isRecording) this.stopAll();
        else if (this.isArmed) { this.isArmed = false; this.updateState(); }
        else { this.isArmed = true; this.updateState(); }
    }

    // --- Major Change: Accept first note (if present) and record at t=0
    startRecording(firstNote = null, velocity = 0.8) {
        if (this.isRecording) return;
        this.isRecording = true;
        this.isArmed = false;
        this.recStartTime = this.synthEngine.Tone.now();
        this.recordBpm = this.getTransportBpm();
        this.state.seqMeta = { recordBpm: this.recordBpm };
        this.state.seq = [];
        this.state.activeNoteIds.clear();
        this.updateState();
        this.eventBus.dispatchEvent(new CustomEvent('sequence-changed'));
        if (firstNote) {
            // Immediately record the first note at start: 0
            const noteId = `${firstNote}_0.0000`;
            this.state.activeNotes.add(firstNote); // Also visually mark as held
            this.state.activeNoteIds.set(firstNote, noteId);
            this.state.seq.push({ id: noteId, note: firstNote, start: 0, dur: 0, vel: velocity });
            this.synthEngine.noteOn(firstNote, velocity);
            this.eventBus.dispatchEvent(new CustomEvent('note-visual-change', { detail: { note: firstNote, active: true } }));
        }
    }

    startPlayback(syncDetail) {
        const sequence = Array.isArray(this.state.seq) ? this.state.seq : [];
        if (this.isPlaying || !sequence.length) return;

        const transport = this.synthEngine?.Tone?.Transport;
        if (!transport) {
            console.error('[Recorder] Unable to start playback: Tone.Transport unavailable.');
            return;
        }

        const nowTransport = transport.seconds;
        const nowAudio = this.synthEngine.Tone.now();
        const timeScale = this.getPlaybackTimeScale(transport);
        const loopConfig = this.#getLoopConfig(timeScale);
        const events = this.#collectPlaybackEvents(sequence, loopConfig, timeScale);

        if (!events.length) {
            console.warn('[Recorder] No playback events to schedule.');
            return;
        }

        const {
            hasHost,
            anchorOffset,
            anchorTransportTime,
            anchorAudioTime
        } = this.#resolveSyncAnchor(syncDetail, transport, nowTransport, nowAudio);

        this.#clearScheduledEvents();
        this.anchorOffset = anchorOffset;
        this.anchorTransportTime = anchorTransportTime;
        this.anchorAudioTime = anchorAudioTime;
        this.loopInterval = loopConfig.loopInterval;
        this.loopStart = loopConfig.loopStart;

        events.forEach(evt => this.#schedulePlaybackEvent(evt, anchorOffset, this.loopInterval));

        const cycleDuration = this.loopInterval > 0 ? this.loopInterval : this.getSequenceDuration(timeScale);
        if (!this.loopInterval && cycleDuration > 0) {
            const stopOffset = anchorOffset + cycleDuration + STOP_PADDING;
            const stopId = transport.scheduleOnce(() => this.stopAll(), `+${Math.max(0, stopOffset).toFixed(6)}`);
            this.#addScheduledId(stopId);
        }

        this.isPlaying = true;
        this.hostSyncActive = hasHost;
        this.startedOwnTransport = !hasHost;

        if (!hasHost && transport.state !== 'started') {
            transport.start();
        }

        this.updateState();
    }

    stopAll() {
        const transport = this.synthEngine?.Tone?.Transport;
        const wasHostSync = this.hostSyncActive;

        this.#clearScheduledEvents();

        this.isPlaying = false;
        this.isRecording = false;
        this.isArmed = false;
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
        this.loopStart = 0;

        this.synthEngine.releaseAll();
        this.eventBus.dispatchEvent(new CustomEvent('release-all-keys'));
        this.updateState();
        this.eventBus.dispatchEvent(new CustomEvent('sequence-changed'));
    }

    clearSequence() {
        this.stopAll();
        this.state.seq = [];
        this.state.seqMeta = { recordBpm: this.getTransportBpm() };
        this.recordBpm = this.state.seqMeta.recordBpm;
        this.updateState();
        this.eventBus.dispatchEvent(new CustomEvent('sequence-changed'));
    }

    getSequenceDuration(timeScale = 1) {
        if (!this.state.seq.length) return 0;
        const base = Math.max(...this.state.seq.map(e => e.start + (e.dur || 0)));
        return base * timeScale;
    }

    #getLoopConfig(timeScale) {
        const loopManager = this.state.loopManager;
        if (!loopManager || !loopManager.isLoopEnabled) {
            return { enabled: false, loopStart: 0, loopDuration: 0, loopInterval: 0 };
        }
        const loopStartRaw = Math.max(0, Number(loopManager.loopStart) || 0);
        const loopEndRaw = Math.max(loopStartRaw, Number(loopManager.loopEnd) || loopStartRaw);
        const loopDuration = loopEndRaw - loopStartRaw;
        if (loopDuration <= 0) {
            return { enabled: false, loopStart: loopStartRaw, loopDuration: 0, loopInterval: 0 };
        }
        return {
            enabled: true,
            loopStart: loopStartRaw,
            loopDuration,
            loopInterval: loopDuration * timeScale
        };
    }

    #collectPlaybackEvents(sequence, loopConfig, timeScale) {
        const events = [];
        const includeLoop = loopConfig.enabled && loopConfig.loopDuration > 0;
        const loopStart = includeLoop ? loopConfig.loopStart : 0;
        const loopEnd = includeLoop ? loopConfig.loopStart + loopConfig.loopDuration : Infinity;

        sequence.forEach(evt => {
            if (!evt || typeof evt.start !== 'number' || typeof evt.dur !== 'number') return;
            if (evt.dur <= 0) return;
            if (includeLoop) {
                const inWindow = evt.start >= loopStart - MIN_EVENT_DURATION && evt.start <= loopEnd + MIN_EVENT_DURATION;
                if (!inWindow) return;
            }
            const relativeStart = includeLoop ? Math.max(0, evt.start - loopStart) : evt.start;
            const scaledStart = relativeStart * timeScale;
            const scaledDur = Math.max(evt.dur * timeScale, 0);
            if (scaledDur < MIN_EVENT_DURATION) return;
            events.push({
                note: evt.note,
                vel: evt.vel,
                scaledStart,
                scaledDur
            });
        });

        return events;
    }

    #schedulePlaybackEvent(evt, anchorOffset, loopInterval) {
        if (!evt) return;
        const startOffset = Math.max(0, anchorOffset + evt.scaledStart);
        const velocity = typeof evt.vel === 'number' ? evt.vel : 0.9;

        this.#scheduleTransportEvent(startOffset, loopInterval, (time) => {
            this.eventBus.dispatchEvent(new CustomEvent('note-visual-change', { detail: { note: evt.note, active: true } }));
            const playDur = Math.max(evt.scaledDur, 0.001);
            this.synthEngine.triggerAttackRelease(evt.note, playDur, time, velocity);
        }, loopInterval === 0);

        if (evt.scaledDur > 0) {
            const releaseOffset = startOffset + evt.scaledDur;
            this.#scheduleTransportEvent(releaseOffset, loopInterval, () => {
                this.eventBus.dispatchEvent(new CustomEvent('note-visual-change', { detail: { note: evt.note, active: false } }));
            }, loopInterval === 0);
        }
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

    updateState() {
        this.state.isRec = this.isRecording;
        this.state.isArmed = this.isArmed;
        this.state.isPlaying = this.isPlaying;
        this.eventBus.dispatchEvent(new CustomEvent('recording-state-changed', {
            detail: {
                activeEngine: 'recorder',
                isRecording: this.isRecording,
                isArmed: this.isArmed,
                isPlaying: this.isPlaying,
                hasSequence: this.state.seq && this.state.seq.length > 0
            }
        }));
        let statusText = 'Inactive';
        if (this.isRecording) statusText = 'Recording...';
        else if (this.isPlaying) statusText = 'Playing...';
        else if (this.isArmed) statusText = 'Armed for Recording';
        else if (this.state.seq?.length > 0) statusText = 'Sequence Ready';
        this.eventBus.dispatchEvent(new CustomEvent('status-update', {
            detail: { message: `Status: ${statusText}` }
        }));
    }

    getSequence() {
        return {
            events: this.state.seq,
            meta: { ...this.state.seqMeta, recordBpm: this.recordBpm }
        };
    }

    setSequence(sequencePayload, meta = null) {
        let events = sequencePayload;
        let incomingMeta = meta;
        if (sequencePayload && !Array.isArray(sequencePayload) && typeof sequencePayload === 'object') {
            events = Array.isArray(sequencePayload.events) ? sequencePayload.events : [];
            incomingMeta = sequencePayload.meta ?? incomingMeta;
        }

        if (Array.isArray(events)) {
            this.state.seq = events;
            if (incomingMeta && typeof incomingMeta === 'object') {
                this.state.seqMeta = { ...incomingMeta };
                if (typeof this.state.seqMeta.recordBpm === 'number') {
                    this.recordBpm = this.state.seqMeta.recordBpm;
                }
            } else {
                const fallbackBpm = this.recordBpm || this.getTransportBpm();
                this.state.seqMeta = { recordBpm: fallbackBpm };
                this.recordBpm = fallbackBpm;
            }
            console.log('[Recorder] Sequence data set from patch.');
            this.updateState();
        } else {
            console.error('[Recorder] Invalid sequence data provided to setSequence.');
        }
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
        const sourceBpm = this.state.seqMeta?.recordBpm || this.recordBpm || currentBpm || 120;
        if (!sourceBpm || !currentBpm) return 1;
        return sourceBpm / currentBpm;
    }
}

export default EnhancedRecorder;
