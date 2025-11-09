/**
 * Module: BOP-SYNTH-V12/EnhancedRecorder.js
 * Purpose: Audio recording functionality
 * Exports: EnhancedRecorder
 * Depends on: none
 */

const DEFAULT_SEQUENCE_STEPS = 64;
const STEP_FRACTION_OF_BEAT = 0.25; // 16th-note grid

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
        this.state.seqMeta = { recordBpm: this.recordBpm };
        this.playbackStartTransport = 0;
        this._pendingLiveReschedule = null;
    }

    abortCurrentPlayback({
        dispatchRelease = true,
        emitStatus = false,
        resetTransport = true,
        notifyRelease = true,
        suppressPlaybackStopEvent = false
    } = {}) {
        const transport = this.synthEngine?.Tone?.Transport;
        const wasPlaying = this.isPlaying;
        if (transport) {
            this.scheduledEventIds.forEach(id => transport.clear(id));
            this.scheduledEventIds = [];
            if (resetTransport && !this.hostSyncActive) {
                const immediate = this.synthEngine?.getImmediateTime?.();
                transport.stop(immediate);
                transport.position = 0;
            }
        } else {
            this.scheduledEventIds = [];
        }

        this.hostSyncActive = false;
        this.startedOwnTransport = false;
        this.isPlaying = false;
        this.isRecording = false;
        this.isArmed = false;
        this.playbackStartTransport = 0;
        if (this._pendingLiveReschedule) {
            clearTimeout(this._pendingLiveReschedule);
            this._pendingLiveReschedule = null;
        }
        if (wasPlaying && !suppressPlaybackStopEvent) {
            this.eventBus.dispatchEvent(new CustomEvent('playback-stopped', {
                detail: { transportStop: transport?.seconds ?? 0 }
            }));
        }

        if (dispatchRelease) {
            this.synthEngine.releaseAll();
            if (notifyRelease) {
                this.eventBus.dispatchEvent(new CustomEvent('release-all-keys'));
            }
        }

        if (emitStatus) {
            this.updateState();
        }
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

    editNote(noteIndex, payload = {}) {
        const seq = this.state.seq;
        if (!Array.isArray(seq)) return;
        if (!Number.isInteger(noteIndex) || noteIndex < 0 || noteIndex >= seq.length) return;
        const current = seq[noteIndex];
        if (!current) return;
        const incoming = (payload && typeof payload === 'object' && payload.note)
            ? payload.note
            : payload;
        if (incoming && incoming !== current) {
            seq[noteIndex] = this.normalizeNote({ ...current, ...incoming });
        } else {
            this.normalizeNote(current);
        }
        if (this.isPlaying) {
            this.queueLiveReschedule();
        }
    }

    normalizeNote(note) {
        if (!note || typeof note !== 'object') return note;
        if (!Number.isFinite(note.start)) {
            note.start = 0;
        }
        note.start = Math.max(0, note.start);
        if (!Number.isFinite(note.dur)) {
            note.dur = 0.001;
        }
        note.dur = Math.max(0.001, note.dur);
        if (typeof note.vel === 'number') {
            note.vel = Math.max(0, Math.min(1, note.vel));
        }
        return note;
    }

    queueLiveReschedule() {
        if (!this.isPlaying) return;
        if (this._pendingLiveReschedule) return;
        this._pendingLiveReschedule = setTimeout(() => {
            this._pendingLiveReschedule = null;
            this.rescheduleLivePlaybackFromCurrentPosition();
        }, 25);
    }

    rescheduleLivePlaybackFromCurrentPosition() {
        if (!this.isPlaying) return;
        const transport = this.synthEngine?.Tone?.Transport;
        if (!transport) return;
        const nowTransport = transport.seconds;
        const nowAudio = this.synthEngine?.Tone?.now?.() ?? 0;
        const elapsedSinceOrigin = Math.max(0, nowTransport - (this.playbackStartTransport ?? 0));
        const timeScale = this.getPlaybackTimeScale(transport);
        const loopStatus = this.state.loopSettings || {};
        const loopActive = !!(loopStatus?.enabled && typeof loopStatus.start === 'number' && typeof loopStatus.end === 'number' && loopStatus.end > loopStatus.start);
        const loopStart = loopActive ? loopStatus.start : 0;
        const sequenceDuration = this.getSequenceDuration(timeScale);
        const loopEnd = loopActive ? loopStatus.end : (loopStart + sequenceDuration);
        const loopDuration = Math.max(0.0001, loopEnd - loopStart);
        const liveStartOffset = loopActive
            ? loopStart + (elapsedSinceOrigin % loopDuration)
            : Math.min(elapsedSinceOrigin, sequenceDuration);
        this.abortCurrentPlayback({
            dispatchRelease: false,
            emitStatus: false,
            resetTransport: false,
            notifyRelease: false,
            suppressPlaybackStopEvent: true
        });
        this.startPlayback({
            transportTime: nowTransport,
            audioTime: nowAudio,
            liveStartOffset,
            resume: true
        });
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
        if (!this.state.seq?.length) return;

        const transport = this.synthEngine?.Tone?.Transport;
        if (!transport) {
            console.error('[Recorder] Unable to start playback: Tone.Transport unavailable.');
            return;
        }

        const willHostSync =
            typeof syncDetail === 'number' ||
            (syncDetail && typeof syncDetail === 'object' && (
                typeof syncDetail.transportTime === 'number' ||
                typeof syncDetail.startTime === 'number' ||
                typeof syncDetail.audioTime === 'number'
            ));
        this.abortCurrentPlayback({
            dispatchRelease: true,
            emitStatus: false,
            resetTransport: !willHostSync,
            notifyRelease: !willHostSync
        });

        const nowTransport = transport.seconds;
        const nowAudio = this.synthEngine.Tone.now();
        const timeScale = this.getPlaybackTimeScale(transport);

        let hostTransportTime;
        let hostAudioTime;
        let liveStartOffset = 0;

        if (typeof syncDetail === 'number') {
            hostTransportTime = syncDetail;
        } else if (syncDetail && typeof syncDetail === 'object') {
            if (typeof syncDetail.transportTime === 'number') hostTransportTime = syncDetail.transportTime;
            else if (typeof syncDetail.startTime === 'number') hostTransportTime = syncDetail.startTime;
            if (typeof syncDetail.audioTime === 'number') hostAudioTime = syncDetail.audioTime;
            if (typeof syncDetail.liveStartOffset === 'number' && Number.isFinite(syncDetail.liveStartOffset)) {
                liveStartOffset = Math.max(0, syncDetail.liveStartOffset);
            }
        }

        if (hostTransportTime === undefined && hostAudioTime !== undefined) {
            hostTransportTime = nowTransport + Math.max(0, hostAudioTime - nowAudio);
        }

        const hasHostTransport = typeof hostTransportTime === 'number';
        const hasHostAudio = typeof hostAudioTime === 'number';
        const baseDeltaAudio = hasHostAudio ? Math.max(0, hostAudioTime - nowAudio) : null;
        const baseDeltaTransport = hasHostTransport ? Math.max(0, hostTransportTime - nowTransport) : null;
        const baseDelta = baseDeltaAudio ?? baseDeltaTransport ?? 0;
        const hasHost = hasHostTransport || hasHostAudio;
        const hostTransportBase = hasHostTransport ? hostTransportTime : null;

        this.isPlaying = true;
        this.hostSyncActive = hasHost;

        console.debug('[REC] startPlayback', 'events', this.state.seq.length, 'mode', hasHost ? 'host-sync' : 'stand-alone', 'transportBase', hasHost ? hostTransportTime : 'self');

        this.startedOwnTransport = false;

        const loopStatus = this.state.loopSettings || {};
        const loopActive = !!(loopStatus?.enabled && typeof loopStatus.start === 'number' && typeof loopStatus.end === 'number' && loopStatus.end > loopStatus.start);
        const loopStart = loopActive ? loopStatus.start : 0;
        const scaledSequenceDuration = this.getSequenceDuration(timeScale);
        const loopEnd = loopActive ? loopStatus.end : scaledSequenceDuration;
        const loopDuration = Math.max(0.0001, loopEnd - loopStart);
        const playheadRelative = loopActive
            ? Math.min(loopDuration, (Math.max(0, liveStartOffset - loopStart)) % loopDuration)
            : Math.min(Math.max(0, liveStartOffset), scaledSequenceDuration);

        if (loopActive && !hasHost) {
            try {
                transport.position = loopStart + playheadRelative;
            } catch (err) {
                console.warn('[REC] Unable to reposition transport to loop start:', err);
            }
        }

        const immediate = this.synthEngine?.getImmediateTime?.();
        const playableEvents = [];
        this.state.seq.forEach(evt => {
            if (!evt || typeof evt.start !== 'number') return;
            const scaledDur = Math.max((evt.dur ?? 0) * timeScale, 0.001);
            if (scaledDur <= 0) return;
            const scaledStart = evt.start * timeScale;
            if (loopActive && (scaledStart >= loopEnd || (scaledStart + scaledDur) <= loopStart)) {
                return;
            }
            playableEvents.push({
                event: evt,
                scaledStart,
                scaledDur
            });
        });

        playableEvents.forEach(item => {
            const { event, scaledStart, scaledDur } = item;
            const effectiveStart = loopActive ? Math.max(loopStart, scaledStart) : scaledStart;
            const loopRelativeStart = loopActive
                ? Math.max(0, effectiveStart - loopStart)
                : effectiveStart;
            let relativeFromPlayhead = loopRelativeStart - playheadRelative;
            if (loopActive) {
                while (relativeFromPlayhead < -1e-6) {
                    relativeFromPlayhead += loopDuration;
                }
            } else if (relativeFromPlayhead < -1e-6) {
                return;
            }
            const positiveOffset = Math.max(0, relativeFromPlayhead);
            let scheduleTarget;
            if (hostTransportBase !== null) {
                scheduleTarget = Math.max(0, hostTransportBase + positiveOffset);
            } else if (hasHost) {
                scheduleTarget = `+${Math.max(0, baseDelta + positiveOffset)}`;
            } else {
                scheduleTarget = `+${positiveOffset}`;
            }
            console.debug('   schedule', event.note, 'at', scheduleTarget, 'dur', scaledDur.toFixed(3));
            const id = transport.schedule((time) => {
                this.synthEngine.triggerAttackRelease(event.note, scaledDur, time, event.vel);
            }, scheduleTarget);
            this.scheduledEventIds.push(id);
        });

        if (!loopActive) {
            if (hostTransportBase !== null) {
                const stopAt = Math.max(0, hostTransportBase + scaledSequenceDuration + 0.1);
                const stopId = transport.scheduleOnce(() => this.stopAll(), stopAt);
                this.scheduledEventIds.push(stopId);
            } else if (hasHost) {
                const stopOffset = Math.max(0, baseDelta + scaledSequenceDuration + 0.1);
                const stopId = transport.scheduleOnce(() => this.stopAll(), `+${stopOffset}`);
                this.scheduledEventIds.push(stopId);
            } else {
                const dur = scaledSequenceDuration + 0.1;
                this.scheduledEventIds.push(
                    transport.scheduleOnce(() => this.stopAll(), `+${dur}`)
                );
                transport.start(immediate);
                this.startedOwnTransport = true;
            }
        } else if (!hasHost) {
            transport.start(immediate);
            this.startedOwnTransport = true;
        }

        const referenceTransportStart = hostTransportBase ?? (hasHost ? (transport.seconds + baseDelta) : transport.seconds);
        const playbackOrigin = Number.isFinite(referenceTransportStart)
            ? referenceTransportStart - playheadRelative
            : 0;
        this.playbackStartTransport = Number.isFinite(playbackOrigin) ? playbackOrigin : 0;

        this.eventBus.dispatchEvent(new CustomEvent('playback-started', {
            detail: {
                transportStart: this.playbackStartTransport,
                transportReference: referenceTransportStart,
                loop: this.state.loopSettings || null
            }
        }));
        this.updateState();
    }

    stopAll() {
        const resetTransport = !this.hostSyncActive;
        this.abortCurrentPlayback({
            dispatchRelease: true,
            emitStatus: false,
            resetTransport,
            notifyRelease: resetTransport
        });
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
        const baseDuration = this.state.seq.length
            ? Math.max(...this.state.seq.map(e => e.start + (e.dur || 0)))
            : 0;
        const referenceBpm = this.state.seqMeta?.recordBpm || this.recordBpm || this.getTransportBpm();
        const secondsPerBeat = 60 / Math.max(1e-6, referenceBpm || 120);
        const defaultDuration = secondsPerBeat * STEP_FRACTION_OF_BEAT * DEFAULT_SEQUENCE_STEPS;
        return Math.max(baseDuration, defaultDuration) * timeScale;
    }

    updateState() {
        this.state.isRec = this.isRecording;
        this.state.isArmed = this.isArmed;
        this.state.isPlaying = this.isPlaying;
        this.eventBus.dispatchEvent(new CustomEvent('recording-state-changed', {
            detail: {
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
