// modules/loop.js
export const LoopManager = {
    // Loop state
    isLoopEnabled: false,
    isLooping: false,
    loopStart: 0,
    loopEnd: 0,
    loopCount: 0,
    maxLoops: -1, // -1 for infinite
    currentLoopIteration: 0,

    // Quantization settings
    quantizeEnabled: false,
    quantizeGrid: 0.125, // thirty-second note by default
    swingAmount: 0, // 0-1 swing amount

    // Tempo conversion
    originalTempo: 120,
    targetTempo: 120,
    tempoRatio: 1,

    // Crossfade settings
    crossfadeEnabled: true,
    crossfadeDuration: 0.1, // seconds
    
    // Safety settings
    maxLoopDuration: 30, // seconds
    fadeInDuration: 0.05,
    fadeOutDuration: 0.1,

    // Internal state
    scheduledEvents: [],
    loopTimeoutId: null,
    crossfadeGain: null,
    isStoppingLoop: false,

    init() {
        console.log('[LoopManager] Initializing enhanced loop system...');
        this.createCrossfadeNode();
        this.bindToSynthApp();
    },

    createCrossfadeNode() {
        if (typeof Tone !== 'undefined') {
            this.crossfadeGain = new Tone.Gain(1);
            console.log('[LoopManager] Created crossfade gain node');
        }
    },

    bindToSynthApp() {
        if (window.synthApp) {
            window.synthApp.loop = {
                enabled: false,
                start: 0,
                end: 0,
                quantized: false,
                grid: 0.25,
                tempo: 120,
                crossfade: true
            };
        }
        console.log('[LoopManager] Bound to synthApp');
    },

    autoDetectLoopBounds(sequence = null) {
        const seq = sequence || window.synthApp?.seq || [];
        if (seq.length === 0) {
            this.loopStart = 0;
            this.loopEnd = 0;
            console.warn('[LoopManager] autoDetectLoopBounds: sequence is empty, returning {0,0}');
            return { start: 0, end: 0 };
        }

        let minStart = Math.min(...seq.map(note => note.start));
        let maxEnd = Math.max(...seq.map(note => note.start + note.dur));
        const beatDuration = 60 / (this.targetTempo || 120);
        
        // Ensure minimum loop duration for stability
        const minLoopDuration = beatDuration * 2; // At least 2 beats
        
        minStart = Math.floor(minStart / beatDuration) * beatDuration;
        maxEnd = Math.ceil(maxEnd / beatDuration) * beatDuration;
        
        // Ensure minimum duration
        if (maxEnd - minStart < minLoopDuration) {
            maxEnd = minStart + minLoopDuration;
        }
        
        // Ensure maximum duration for safety
        if (maxEnd - minStart > this.maxLoopDuration) {
            maxEnd = minStart + this.maxLoopDuration;
            console.warn(`[LoopManager] Loop duration capped at ${this.maxLoopDuration}s for safety`);
        }

        this.loopStart = Math.max(0, minStart);
        this.loopEnd = maxEnd;

        console.log(`[LoopManager] Auto-detected loop bounds: ${this.loopStart}s - ${this.loopEnd}s`);
        return { start: this.loopStart, end: this.loopEnd };
    },

    setLoopBounds(start, end) {
        this.loopStart = Math.max(0, start);
        this.loopEnd = Math.max(this.loopStart, end);
        
        // Safety check for loop duration
        const duration = this.loopEnd - this.loopStart;
        if (duration > this.maxLoopDuration) {
            this.loopEnd = this.loopStart + this.maxLoopDuration;
            console.warn(`[LoopManager] Loop duration capped at ${this.maxLoopDuration}s for safety`);
        }
        
        console.log(`[LoopManager] Loop bounds set: ${this.loopStart}s - ${this.loopEnd}s`);
    },

    getLoopDuration() {
        const dur = this.loopEnd - this.loopStart;
        if (dur <= 0) {
            console.warn(`[LoopManager] getLoopDuration: duration is non-positive (${dur}), check bounds!`);
        }
        return dur;
    },

    setLoopEnabled(enabled) {
        this.isLoopEnabled = enabled;
        if (window.synthApp?.loop) {
            window.synthApp.loop.enabled = enabled;
        }
        console.log(`[LoopManager] Loop ${enabled ? 'enabled' : 'disabled'}`);
    },

    setMaxLoops(count) {
        this.maxLoops = count;
        console.log(`[LoopManager] Max loops set to: ${count === -1 ? 'infinite' : count}`);
    },

    setCrossfadeEnabled(enabled) {
        this.crossfadeEnabled = enabled;
        if (window.synthApp?.loop) {
            window.synthApp.loop.crossfade = enabled;
        }
        console.log(`[LoopManager] Crossfade ${enabled ? 'enabled' : 'disabled'}`);
    },

    prepareLoopedSequence(sequence = null) {
        const seq = sequence || window.synthApp?.seq || [];
        if (seq.length === 0) {
            console.warn('[LoopManager] prepareLoopedSequence: sequence is empty');
            return [];
        }

        if (this.loopEnd <= this.loopStart) {
            this.autoDetectLoopBounds(seq);
        }

        const loopedSeq = seq.filter(note => {
            const noteStart = note.start;
            const noteEnd = note.start + note.dur;
            return noteStart < this.loopEnd && noteEnd > this.loopStart;
        });

        const adjustedSeq = loopedSeq.map(note => {
            const start = Math.max(0, note.start - this.loopStart);
            const end = Math.min(note.start + note.dur, this.loopEnd - this.loopStart);
            return {
                ...note,
                start,
                dur: Math.max(0.01, end - start), // Minimum duration for stability
            };
        });

        // Apply quantization and tempo conversion
        let processedSeq = this.processSequence(adjustedSeq);

        // Filter out notes with non-positive duration
        const dropped = processedSeq.filter(note => note.dur <= 0.01);
        if (dropped.length) {
            console.warn(`[LoopManager] Dropping ${dropped.length} notes with dur<=0.01 in prepareLoopedSequence:`, dropped);
        }
        processedSeq = processedSeq.filter(note => note.dur > 0.01);

        if (this.swingAmount && this.swingAmount > 0) {
            processedSeq = this.applySwing(processedSeq);
        }

        // Apply crossfade adjustments if enabled
        if (this.crossfadeEnabled) {
            processedSeq = this.applyCrossfadeAdjustments(processedSeq);
        }

        console.log(`[LoopManager] prepareLoopedSequence: returning ${processedSeq.length} notes (original: ${seq.length})`);
        return processedSeq;
    },

    applyCrossfadeAdjustments(sequence) {
        const loopDuration = this.getLoopDuration();
        const crossfadeStart = loopDuration - this.crossfadeDuration;
        
        return sequence.map(note => {
            // Adjust notes that would overlap the crossfade region
            if (note.start + note.dur > crossfadeStart) {
                const adjustedDur = Math.max(0.01, crossfadeStart - note.start);
                if (adjustedDur !== note.dur) {
                    console.log(`[LoopManager] Adjusted note duration for crossfade: ${note.dur} -> ${adjustedDur}`);
                    return { ...note, dur: adjustedDur };
                }
            }
            return note;
        });
    },

    scheduleLoopIteration(sequence, loopNumber = 0) {
        if (!window.synthApp?.synth) {
            console.warn('[LoopManager] scheduleLoopIteration: synth is not available');
            return [];
        }

        sequence = sequence.filter(note => note.dur > 0.01);
        if (!sequence.length) {
            console.warn(`[LoopManager] scheduleLoopIteration: no notes to schedule for loop #${loopNumber}`);
            return [];
        }

        const loopDuration = this.getLoopDuration();
        const startOffset = loopNumber * loopDuration;
        const eventIds = [];

        // Add fade-in for first loop
        if (loopNumber === 0 && this.fadeInDuration > 0) {
            this.scheduleFadeIn(startOffset);
        }

        sequence.forEach(note => {
            if (note.dur > 0.01) {
                const scheduleTime = startOffset + note.start;
                
                // Apply velocity scaling for safety
                const safeVelocity = Math.min(0.8, Math.max(0.1, note.vel || 0.8));
                
                const eventId = Tone.Transport.schedule(time => {
                    if (!this.isStoppingLoop) {
                        try {
                            window.synthApp.synth.triggerAttackRelease(
                                note.note,
                                note.dur,
                                time,
                                safeVelocity
                            );
                        } catch (err) {
                            console.warn(`[LoopManager] Error playing note ${note.note}:`, err);
                        }
                    }
                }, scheduleTime);
                eventIds.push(eventId);
            }
        });

        // Schedule crossfade for next iteration
        if (this.crossfadeEnabled && this.maxLoops !== 1) {
            this.scheduleCrossfade(startOffset, loopDuration);
        }

        return eventIds;
    },

    scheduleFadeIn(startTime) {
        if (this.crossfadeGain && this.fadeInDuration > 0) {
            const eventId = Tone.Transport.schedule(time => {
                this.crossfadeGain.gain.setValueAtTime(0, time);
                this.crossfadeGain.gain.rampTo(1, this.fadeInDuration, time);
            }, startTime);
            this.scheduledEvents.push(eventId);
        }
    },

    scheduleCrossfade(loopStartTime, loopDuration) {
        if (!this.crossfadeEnabled || !this.crossfadeGain) return;
        
        const crossfadeStartTime = loopStartTime + loopDuration - this.crossfadeDuration;
        
        const eventId = Tone.Transport.schedule(time => {
            if (!this.isStoppingLoop) {
                // Fade out current iteration
                this.crossfadeGain.gain.setValueAtTime(1, time);
                this.crossfadeGain.gain.rampTo(0.3, this.crossfadeDuration, time);
                
                // Fade back in for next iteration
                setTimeout(() => {
                    if (!this.isStoppingLoop && this.crossfadeGain) {
                        this.crossfadeGain.gain.rampTo(1, this.crossfadeDuration / 2);
                    }
                }, this.crossfadeDuration * 500); // Half crossfade duration in ms
            }
        }, crossfadeStartTime);
        
        this.scheduledEvents.push(eventId);
    },

    startLoop(sequence = null) {
        if (this.isLooping) {
            console.log('[LoopManager] Loop already running');
            return;
        }

        const loopSeq = this.prepareLoopedSequence(sequence);
        if (loopSeq.length === 0) {
            console.log('[LoopManager] No notes to loop, aborting startLoop');
            return;
        }

        // Safety check for loop duration
        const loopDuration = this.getLoopDuration();
        if (loopDuration > this.maxLoopDuration) {
            console.error(`[LoopManager] Loop duration ${loopDuration}s exceeds maximum ${this.maxLoopDuration}s`);
            return;
        }

        this.isLooping = true;
        this.isStoppingLoop = false;
        this.currentLoopIteration = 0;
        this.scheduledEvents = [];

        console.log(`[LoopManager] Starting enhanced loop playback: ${loopSeq.length} notes, duration: ${loopDuration}s, maxLoops: ${this.maxLoops}`);

        // Connect crossfade gain if available - route through enhanced effects system
        if (this.crossfadeGain && window.synthApp?.synth) {
            try {
                // Don't disconnect the synth - it should stay connected to the enhanced effects
                // The crossfade gain is just for volume control during loop transitions
                console.log('[LoopManager] Crossfade gain available for loop transitions');
            } catch (err) {
                console.warn('[LoopManager] Could not setup crossfade gain:', err);
            }
        }

        Tone.Transport.cancel();

        const initialLoops = this.maxLoops === -1 ? 4 : Math.min(4, this.maxLoops);
        for (let i = 0; i < initialLoops; i++) {
            const eventIds = this.scheduleLoopIteration(loopSeq, i);
            this.scheduledEvents.push(...eventIds);
        }

        if (this.maxLoops === -1) {
            this.scheduleNextLoops(loopSeq, initialLoops);
        }

        Tone.Transport.start();

        if (this.maxLoops > 0) {
            const totalDuration = this.maxLoops * loopDuration;
            this.loopTimeoutId = setTimeout(() => {
                this.stopLoop();
            }, totalDuration * 1000);
            console.log(`[LoopManager] Will auto-stop after ${totalDuration}s`);
        }
    },

    scheduleNextLoops(sequence, startFromLoop) {
        if (!this.isLooping || this.maxLoops !== -1 || this.isStoppingLoop) return;

        const loopDuration = this.getLoopDuration();
        const scheduleAhead = 2;

        for (let i = 0; i < scheduleAhead; i++) {
            const loopNumber = startFromLoop + i;
            const eventIds = this.scheduleLoopIteration(sequence, loopNumber);
            this.scheduledEvents.push(...eventIds);
        }

        setTimeout(() => {
            if (this.isLooping && !this.isStoppingLoop) {
                this.scheduleNextLoops(sequence, startFromLoop + scheduleAhead);
            }
        }, loopDuration * 1000);

        console.log(`[LoopManager] Scheduled next ${scheduleAhead} loops from loop #${startFromLoop}`);
    },

    stopLoop() {
        if (!this.isLooping) return;

        console.log('[LoopManager] Stopping enhanced loop playback');

        this.isStoppingLoop = true;

        // Schedule fade-out
        if (this.crossfadeGain && this.fadeOutDuration > 0) {
            this.crossfadeGain.gain.rampTo(0, this.fadeOutDuration);
            
            setTimeout(() => {
                this.completeLoopStop();
            }, this.fadeOutDuration * 1000);
        } else {
            this.completeLoopStop();
        }
    },

    completeLoopStop() {
        this.isLooping = false;
        this.isStoppingLoop = false;
        this.currentLoopIteration = 0;

        this.scheduledEvents.forEach(eventId => {
            try {
                Tone.Transport.clear(eventId);
            } catch (err) {
                console.warn('[LoopManager] Error clearing event:', err);
            }
        });
        this.scheduledEvents = [];

        if (this.loopTimeoutId) {
            clearTimeout(this.loopTimeoutId);
            this.loopTimeoutId = null;
        }

        // Restore crossfade gain to normal level - don't touch synth routing
        if (this.crossfadeGain) {
            try {
                this.crossfadeGain.gain.setValueAtTime(1, Tone.now());
                console.log('[LoopManager] Crossfade gain restored to normal level');
            } catch (err) {
                console.warn('[LoopManager] Error restoring crossfade gain:', err);
            }
        }

        Tone.Transport.stop();
        Tone.Transport.cancel();

        console.log('[LoopManager] Enhanced loop stopped and all events cleared');
    },

    isCurrentlyLooping() {
        return this.isLooping;
    },

    getLoopStatus() {
        return {
            enabled: this.isLoopEnabled,
            active: this.isLooping,
            start: this.loopStart,
            end: this.loopEnd,
            duration: this.getLoopDuration(),
            iteration: this.currentLoopIteration,
            maxLoops: this.maxLoops,
            crossfadeEnabled: this.crossfadeEnabled
        };
    },

    setQuantization(enabled, grid = 0.25) {
        this.quantizeEnabled = enabled;
        this.quantizeGrid = grid;
        console.log(`[LoopManager] Quantization ${enabled ? 'enabled' : 'disabled'}, grid: ${grid}`);
    },

    quantizeTime(time, grid = null) {
        const gridSize = grid || this.quantizeGrid;
        const beatDuration = 60 / (this.targetTempo || 120);
        const gridDuration = beatDuration * gridSize;
        const quantized = Math.round(time / gridDuration) * gridDuration;
        if (Math.abs(time - quantized) > 0.001) {
            console.log(`[LoopManager] Quantized time from ${time} to ${quantized} (grid: ${gridSize})`);
        }
        return quantized;
    },

    quantizeSequence(sequence) {
        if (!this.quantizeEnabled) return sequence;

        const quantizedSeq = sequence.map(note => ({
            ...note,
            start: this.quantizeTime(note.start),
            dur: Math.max(0.01, this.quantizeTime(note.dur, this.quantizeGrid / 2))
        }));

        console.log(`[LoopManager] quantizeSequence: quantized ${quantizedSeq.length} notes`);
        return quantizedSeq;
    },

    setTempoConversion(originalTempo, targetTempo) {
        this.originalTempo = originalTempo;
        this.targetTempo = targetTempo;
        this.tempoRatio = targetTempo / originalTempo;
        console.log(`[LoopManager] Tempo conversion: ${originalTempo} -> ${targetTempo} BPM (ratio: ${this.tempoRatio})`);
    },

    convertSequenceTempo(sequence) {
        if (this.tempoRatio === 1) return sequence;
        const converted = sequence.map(note => ({
            ...note,
            start: note.start / this.tempoRatio,
            dur: Math.max(0.01, note.dur / this.tempoRatio)
        }));
        console.log(`[LoopManager] convertSequenceTempo: scaled ${converted.length} notes by ratio ${this.tempoRatio}`);
        return converted;
    },

    processSequence(sequence) {
        let processedSeq = [...sequence];

        if (this.tempoRatio !== 1) {
            processedSeq = this.convertSequenceTempo(processedSeq);
        }

        if (this.quantizeEnabled) {
            processedSeq = this.quantizeSequence(processedSeq);
        }

        return processedSeq;
    },

    setQuantizationGrid(subdivision) {
        const grids = {
            'whole': 4.0,
            'half': 2.0,
            'quarter': 1.0,
            'eighth': 0.5,
            'sixteenth': 0.25,
            'thirtysecond': 0.125
        };

        if (grids[subdivision]) {
            this.quantizeGrid = grids[subdivision];
            console.log(`[LoopManager] Quantization grid set to ${subdivision} note (${this.quantizeGrid})`);
        } else {
            console.warn(`[LoopManager] Unknown quantization grid: ${subdivision}`);
        }
    },

    getQuantizeGridKey() {
        const grids = {
            4.0: 'whole',
            2.0: 'half',
            1.0: 'quarter',
            0.5: 'eighth',
            0.25: 'sixteenth',
            0.125: 'thirtysecond'
        };
        // JS treats object keys as strings, so use toString()
        return grids[this.quantizeGrid?.toString()] || 'thirtysecond';
    },

    getQuantizationOptions() {
        return [
            { value: 4.0, label: 'Whole Note', key: 'whole' },
            { value: 2.0, label: 'Half Note', key: 'half' },
            { value: 1.0, label: 'Quarter Note', key: 'quarter' },
            { value: 0.5, label: 'Eighth Note', key: 'eighth' },
            { value: 0.25, label: 'Sixteenth Note', key: 'sixteenth' },
            { value: 0.125, label: 'Thirty-second Note', key: 'thirtysecond' }
        ];
    },

    setSwing(amount = 0) {
        this.swingAmount = Math.max(0, Math.min(1, amount));
        console.log(`[LoopManager] Swing set to ${this.swingAmount * 100}%`);
    },

    applySwing(sequence) {
        if (!this.swingAmount || this.swingAmount === 0) return sequence;

        const beatDuration = 60 / (this.targetTempo || 120);
        const swingOffset = beatDuration * this.quantizeGrid * this.swingAmount * 0.1;

        const seq = sequence.map((note, index) => {
            const beatPosition = Math.floor(note.start / (beatDuration * this.quantizeGrid));
            const shouldSwing = beatPosition % 2 === 1;
            if (shouldSwing && swingOffset > 0) {
                console.log(`[LoopManager] applySwing: Swinging note at ${note.start} +${swingOffset}`);
            }
            return {
                ...note,
                start: shouldSwing ? note.start + swingOffset : note.start
            };
        });

        return seq;
    }
};
