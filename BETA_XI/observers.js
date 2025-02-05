// observers.js



// Register all observers
function registerObservers() {
    console.log("[observers] registerObservers called")
    if (window.unifiedSequencerSettings) {
         } else {
        console.error("UnifiedSequencerSettings instance not found.");
    }
    console.log("[SequenceChangeDebug] All observers registered.");

}
