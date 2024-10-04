// UnifiedSequencerSettings_Sequence.js

if (typeof UnifiedSequencerSettings === 'undefined') {
    throw new Error('UnifiedSequencerSettings is not defined');
}

Object.assign(UnifiedSequencerSettings.prototype, {
    // Get step settings
    getStepSettings(seqIdx, chIdx, stepIdx) {
        const step = this.getNested('projectSequences', `Sequence${seqIdx}`, `ch${chIdx}`, 'steps', stepIdx);
        if (step) return { ...step };
        console.error('getStepSettings: Invalid indices');
        return { isActive: false, isReverse: false, volume: 1, pitch: 1 };
    },

    // Get step state and reverse
    getStepStateAndReverse(seqIdx, chIdx, stepIdx) {
        const step = this.getNested('projectSequences', `Sequence${seqIdx}`, `ch${chIdx}`, 'steps', stepIdx);
        if (step) return { isActive: step.isActive, isReverse: step.isReverse };
        console.error('getStepStateAndReverse: Invalid indices');
        return { isActive: false, isReverse: false };
    },

    // Update step state and reverse
    updateStepStateAndReverse(seqIdx, chIdx, stepIdx, isActive, isReverse) {
        if ([seqIdx, chIdx, stepIdx].some(idx => typeof idx !== 'number') ||
            typeof isActive !== 'boolean' || typeof isReverse !== 'boolean') {
            throw new Error('updateStepStateAndReverse: Invalid input types');
        }
        const step = this.getNested('projectSequences', `Sequence${seqIdx}`, `ch${chIdx}`, 'steps', stepIdx);
        if (step) {
            step.isActive = isActive;
            step.isReverse = isReverse;
            this.notifyObservers();
        } else {
            throw new Error('updateStepStateAndReverse: Invalid step indices');
        }
    },

    // Toggle step active state
    toggleStepState(seqIdx, chIdx, stepIdx) {
        this.toggleStepProperty(seqIdx, chIdx, stepIdx, 'isActive');
    },

    // Toggle step reverse state
    toggleStepReverseState(seqIdx, chIdx, stepIdx) {
        this.toggleStepProperty(seqIdx, chIdx, stepIdx, 'isReverse');
    },

    // Generic toggle method for step properties
    toggleStepProperty(seqIdx, chIdx, stepIdx, property) {
        const step = this.getNested('projectSequences', `Sequence${seqIdx}`, `ch${chIdx}`, 'steps', stepIdx);
        if (step && typeof step[property] === 'boolean') {
            step[property] = !step[property];
            this.notifyObservers();
        } else {
            console.error(`toggleStepProperty: Invalid indices or property in toggleStep${property}`);
        }
    },

    // Sequence Management
    setCurrentSequence(seqIdx) {
        if (this.settings.masterSettings.currentSequence !== seqIdx) {
            this.settings.masterSettings.currentSequence = seqIdx;
            this.notifyObservers();
        }
    },

    getCurrentSequence() {
        return this.settings.masterSettings.currentSequence;
    },

    getSequenceSettings(seqIdx) {
        return this.getNested('projectSequences', `Sequence${seqIdx}`);
    },

    setSequenceSettings(seqIdx, settings) {
        this.settings.masterSettings.projectSequences[`Sequence${seqIdx}`] = settings;
        this.notifyObservers();
    },
});

