/**
 * Module: BOP-SYNTH-V12/EnhancedRecorder.js
 * Purpose: Audio recording functionality
 * Exports: EnhancedRecorder
 * Depends on: none
 */

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
    }

    abortCurrentPlayback({ dispatchRelease = true, emitStatus = false, resetTransport = true, notifyRelease = true } = {}) {
        const transport = this.synthEngine?.Tone?.Transport;
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

        if (typeof syncDetail === 'number') {
            hostTransportTime = syncDetail;
        } else if (syncDetail && typeof syncDetail === 'object') {
            if (typeof syncDetail.transportTime === 'number') hostTransportTime = syncDetail.transportTime;
            else if (typeof syncDetail.startTime === 'number') hostTransportTime = syncDetail.startTime;
            if (typeof syncDetail.audioTime === 'number') hostAudioTime = syncDetail.audioTime;
        }

        if (hostTransportTime === undefined && hostAudioTime !== undefined) {
            hostTransportTime = nowTransport + Math.max(0, hostAudioTime - nowAudio);
        }

        const hasHost = typeof hostTransportTime === 'number';
        const baseDelta = hasHost ? Math.max(0, hostTransportTime - nowTransport) : 0;

        this.isPlaying = true;
        this.hostSyncActive = hasHost;

        console.debug('[REC] startPlayback', 'events', this.state.seq.length, 'mode', hasHost ? 'host-sync' : 'stand-alone', 'transportBase', hasHost ? hostTransportTime : 'self');

        this.startedOwnTransport = false;

        const immediate = this.synthEngine?.getImmediateTime?.();
        const playableEvents = [];
        this.state.seq.forEach(evt => {
            if (!evt || typeof evt.start !== 'number') return;
            const scaledDur = Math.max((evt.dur ?? 0) * timeScale, 0.001);
            if (scaledDur <= 0) return;
            playableEvents.push({
                event: evt,
                scaledStart: evt.start * timeScale,
                scaledDur
            });
        });

        playableEvents.forEach(item => {
            const { event, scaledStart, scaledDur } = item;
            const offset = hasHost ? Math.max(0, baseDelta + scaledStart) : Math.max(0, scaledStart);
            const scheduleAt = `+${offset}`;
            console.debug('   schedule', event.note, 'offset', offset.toFixed(4), 'dur', scaledDur.toFixed(3));
            const id = transport.schedule((time) => {
                this.synthEngine.triggerAttackRelease(event.note, scaledDur, time, event.vel);
            }, scheduleAt);
            this.scheduledEventIds.push(id);
        });

        const scaledSequenceDuration = this.getSequenceDuration(timeScale);

        if (hasHost) {
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
        if (!this.state.seq.length) return 0;
        const base = Math.max(...this.state.seq.map(e => e.start + (e.dur || 0)));
        return base * timeScale;
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
