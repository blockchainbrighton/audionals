// UnifiedSequencerSettings_Observer.js

if (typeof UnifiedSequencerSettings === 'undefined') {
    throw new Error('UnifiedSequencerSettings is not defined');
}

Object.assign(UnifiedSequencerSettings.prototype, {
    // Observer methods
    addObserver(observerFunction) {
        console.log("addObserver", observerFunction);
        this.observers.push(observerFunction);
    },

    notifyObservers() {
        console.log('[SequenceChangeDebug] Notifying observers of changes.');
        this.observers.forEach(fn => fn(this.settings));
    },
});
