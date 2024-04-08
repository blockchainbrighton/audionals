// observers.js

// Register all observers
function registerObservers() {
    console.log("[observers] registerObservers called")
    if (window.unifiedSequencerSettings) {
        window.unifiedSequencerSettings.addObserver(updateStepStateObserver);
        window.unifiedSequencerSettings.addObserver(updateProjectNameObserver);
        window.unifiedSequencerSettings.addObserver(updateBPMObserver);
        window.unifiedSequencerSettings.addObserver(updateProjectURLsObserver);
        window.unifiedSequencerSettings.addObserver(updateTrimSettingsObserver);
        window.unifiedSequencerSettings.addObserver(updateProjectChannelNamesObserver);
        window.unifiedSequencerSettings.addObserver(updateProjectSequencesObserver);
        window.unifiedSequencerSettings.addObserver(updateCurrentSequenceObserver);
        window.unifiedSequencerSettings.addObserver(updateTotalSequencesObserver);
    } else {
        console.error("UnifiedSequencerSettings instance not found.");
    }
}

// This observer function should be placed in your observers file
function updateStepStateObserver(settings) {
    console.log("[observers] updateStepStateObserver called");

    // Reset UI for step buttons across all channels
    const channels = document.querySelectorAll('.channel');
    channels.forEach(channel => {
        const stepButtons = channel.querySelectorAll('.step-button');
        stepButtons.forEach(button => {
            button.classList.remove('selected', 'reverse-playback'); // Also remove reverse playback class
            button.style.backgroundColor = ''; // Reset the background color
        });
    });

    // Apply the current state of steps to the UI, including reverse playback
    const currentSequenceSettings = settings.masterSettings.projectSequences[`Sequence${settings.masterSettings.currentSequence}`];
    if (currentSequenceSettings) {
        Object.keys(currentSequenceSettings).forEach(channelKey => {
            const channelIndex = parseInt(channelKey.replace('ch', ''), 10); // Assuming channel keys are 'ch0', 'ch1', etc.
            const channel = currentSequenceSettings[channelKey];
            const steps = channel.steps;
            const channelElement = document.querySelector(`[data-id="Channel-${channelIndex}"]`);

            if (channelElement) {
                const stepButtons = channelElement.querySelectorAll('.step-button');
                stepButtons.forEach((button, index) => {
                    if (Array.isArray(steps[index])) { // Check if step state is stored in an array
                        const [isActive, isReverse] = steps[index];
                        if (isActive) {
                            button.classList.add('selected');
                            if (isReverse) {
                                button.classList.add('reverse-playback');
                                button.style.backgroundColor = 'green'; // Indicate reverse playback
                            }
                        }
                    } else if (typeof steps[index] === 'number') { // For backward compatibility with number indices
                        button.classList.add('selected');
                    }
                });
            }
        });
    }

    // Consider adding a call to a function like 'updateUIForSequenceZero' if needed
    // This can adjust the UI based on sequence-specific details
}


// Observer for Trim Settings
// Ensure the observer function for updating trim settings (updateTrimSettingsObserver)
// correctly initializes the UI with default values if they are undefined.
function updateTrimSettingsObserver(settings) {
    console.log("[observers] updateTrimSettingsObserver called with:", settings)
    if (settings && settings.masterSettings && settings.masterSettings.trimSettings) {
        console.log("Updating Trim Settings UI:", settings.masterSettings.trimSettings);

        // This assumes updateTrimSettingsUI correctly handles default values
        updateTrimSettingsUI(settings.masterSettings.trimSettings);
    }
}


// Observer for Project Name
function updateProjectNameObserver(settings) {
    console.log("[observers] updateProjectNameObserver called with:", settings)
    if (settings && settings.masterSettings && settings.masterSettings.projectName) {
        console.log("[observers] Updating Project Name UI:", settings.masterSettings.projectName);

        updateProjectNameUI(settings.masterSettings.projectName);
    }
}

// Observer for BPM
function updateBPMObserver(settings) {
    console.log("[observers] updateBPMObserver called with:", settings)
    if (settings && settings.masterSettings && settings.masterSettings.projectBPM) {
        console.log("Updating BPM UI:", settings.masterSettings.projectBPM);

        updateBPMUI(settings.masterSettings.projectBPM);
    }
}

// Observer for Project URLs
function updateProjectURLsObserver(settings) {
    console.log("[observers] updateProjectURLsObserver called with:", settings)
    if (settings && settings.masterSettings && settings.masterSettings.projectURLs) {
        console.log("Updating Project URLs UI:", settings.masterSettings.projectURLs);
        unifiedSequencerSettings.updateAllLoadSampleButtonTexts();
        updateProjectURLsUI(settings.masterSettings.projectURLs);
    }
}


// Observer for Project Channel Names
function updateProjectChannelNamesObserver(settings) {
    console.log("[observers] updateProjectChannelNamesObserver called with:", settings)
    if (settings && settings.masterSettings && settings.masterSettings.projectChannelNames) {
        console.log("Updating Project channel Names UI:", settings.masterSettings.projectChannelNames);

        settings.masterSettings.projectChannelNames.forEach((name, index) => {
            const channelLabel = document.querySelector(`#channel-name-${index}`);
            if (channelLabel) {
                channelLabel.textContent = name || 'Default Channel Name'; // Use a default name if empty
            }
        });
    }
}

// Observer for Project Sequences
function updateProjectSequencesObserver(settings) {
    console.log("[observers] updateProjectSequencesObserver called with:", settings)
    if (settings && settings.masterSettings && settings.masterSettings.projectSequences) {
        console.log("Updating Project Sequences UI:", settings.masterSettings.projectSequences);

         updateProjectSequencesUI(settings.masterSettings.projectSequences);
    }
}


function updateCurrentSequenceObserver(settings) {
    console.log("[Observer] updateCurrentSequenceObserver called with:", settings)
    if (settings && settings.masterSettings && typeof settings.masterSettings.currentSequence === 'number') {
        console.log("[Observer] Current Sequence changed:", settings.masterSettings.currentSequence);
    }
}


function updateTotalSequencesObserver(settings) {
    console.log("[Observer] updateTotalSequencesObserver called with:", settings)
    if (settings && settings.masterSettings && Array.isArray(settings.masterSettings.projectSequences)) {
        console.log("[Observer] Total number of Sequences changed:", settings.masterSettings.projectSequences.length);
    }
}




// Call registerObservers on script load
registerObservers();
