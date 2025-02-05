// globalObjectHelperFunctions_v2.js

// 

let isModalOpen = false;

function openModal() {
    isModalOpen = true;
    // Code to open the modal
}

function closeModal() {
    isModalOpen = false;
    // Code to close the modal
}



   function updateBPMUI(bpm) {
    console.log("debugGlobalObjectToUI - entered");
    const bpmSlider = document.getElementById('bpm-slider');
    const bpmDisplay = document.getElementById('bpm-display');
    if (bpmSlider && bpmDisplay) {
        bpmSlider.value = bpm;
        bpmDisplay.textContent = bpm;
    }
}

function updateProjectNameUI(projectName) {
    console.log("debugGlobalObjectToUI - entered");
    const projectNameInput = document.getElementById('project-name');
    if (projectNameInput) {
        projectNameInput.value = projectName;
    }
}



function setGlobalChannelURLs(urls) {
    console.log("debugGlobalObjectToUI - entered");
    window.unifiedSequencerSettings.setChannelURLs(urls);
}

// 
// 
// // Utility Functions
// 
function updateSpecificStepUI(currentSequence, channelIndex, stepIndex) {
    console.log("debugGlobalObjectToUI - entered");
    const stepButtonId = `Sequence${currentSequence}-ch${channelIndex}-step-${stepIndex}`;
    console.log(`Looking for step button with ID: ${stepButtonId}`);

    const stepButton = document.getElementById(stepButtonId);

    if (stepButton) {
        let currentStepState = window.unifiedSequencerSettings.getStepState(currentSequence, channelIndex, stepIndex);
        if (currentStepState) {
            stepButton.classList.add('selected');
        } else {
            stepButton.classList.remove('selected');
        }
    } else {
        console.error(`Step button not found for the given IDs: ${stepButtonId}`);
    }
}



function getProjectSequences() {
    console.log("debugGlobalObjectToUI - entered");
    return window.unifiedSequencerSettings.getSettings('projectSequences');
}

function getTrimSettings(channelIndex) {
    console.log("debugGlobalObjectToUI - entered");
    return window.unifiedSequencerSettings.getTrimSettings(channelIndex);
}

function setTrimSettings(channelIndex, startSliderValue, endSliderValue) {
    if (typeof startSliderValue !== 'number' || typeof endSliderValue !== 'number') {
        console.error('Invalid trim settings values');
        return;
    }

    console.log(`Setting trim settings for channel ${channelIndex}: start = ${startSliderValue}, end = ${endSliderValue}`);
    window.unifiedSequencerSettings.setTrimSettings(channelIndex, startSliderValue, endSliderValue);

    // Ensure the trim settings UI is updated to reflect changes
    const trimSettings = window.unifiedSequencerSettings.getTrimSettings(channelIndex);
    updateTrimSettingsUI([trimSettings]);
}


// Update function with modal state check
function updateTrimSettingsUI(trimSettings) {
    if (!isModalOpen) {
        console.log("Modal is not open, skipping updateTrimSettingsUI");
        return;
    }

    console.log("debugGlobalObjectToUI - entered");
    console.log("{debugGlobalObjectToUI} updateTrimSettingsUI: updating with trimSettings", trimSettings);

    trimSettings.forEach((setting, index) => {
        const startSlider = document.getElementById(`start-slider-${index}`);
        const endSlider = document.getElementById(`end-slider-${index}`);

        if (startSlider && endSlider) {
            startSlider.value = setting.startSliderValue;
            endSlider.value = setting.endSliderValue;

            // Log details about the sliders and settings
            console.log(`Sliders found for index ${index}. Setting values:`);
            console.log(`Start Slider: Element ID: start-slider-${index}, Value: ${startSlider.value}`);
            console.log(`End Slider: Element ID: end-slider-${index}, Value: ${endSlider.value}`);
        } else {
            // Use the throttled warning function
            console.warn(`Sliders not found for index ${index}. Start: ${setting.startSliderValue}, End: ${setting.endSliderValue}`);
            if (!document.getElementById(`start-slider-${index}`)) {
                console.warn(`Start slider (start-slider-${index}) not found in DOM.`);
            }
            if (!document.getElementById(`end-slider-${index}`)) {
                console.warn(`End slider (end-slider-${index}) not found in DOM.`);
            }
        }
    });

    // Additional check to verify if trimSettings has all necessary values
    trimSettings.forEach((setting, index) => {
        if (typeof setting.startSliderValue !== 'number' || typeof setting.endSliderValue !== 'number') {
            console.error(`Invalid slider values for index ${index}. Start: ${setting.startSliderValue}, End: ${setting.endSliderValue}`);
        } else {
            console.log(`Valid slider values for index ${index}. Start: ${setting.startSliderValue}, End: ${setting.endSliderValue}`);
        }
    });
}

// Throttle function to limit the frequency of updates
function throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function() {
        const context = this;
        const args = arguments;
        if (!lastRan) {
            func.apply(context, args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(function() {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(context, args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    }
}

// Throttled update function
const throttledUpdateTrimSettingsUI = throttle((trimSettings) => {
    updateTrimSettingsUI(trimSettings);
}, 1000); // 1 second throttle limit

// // Event listeners for modal open and close
// document.getElementById('openModalButton').addEventListener('click', openModal);
// document.getElementById('closeModalButton').addEventListener('click', closeModal);





function updateProjectSequencesUI(sequenceData) {
    console.log("debugGlobalObjectToUI - entered");
    console.log("{debugGlobalObjectToUI} [updateProjectSequencesUI] updateProjectSequencesUI: updating with sequences", sequenceData);

    // Log the total number of sequences being processed
    const numSequences = Object.keys(sequenceData).length;
    console.log(`[updateProjectSequencesUI] Total sequences to process: ${numSequences}`);

    Object.keys(sequenceData).forEach(sequenceKey => {
        const sequence = sequenceData[sequenceKey];
        console.log(`[updateProjectSequencesUI] Processing sequence: ${sequenceKey}`);

        Object.keys(sequence).forEach(channelKey => {
            const steps = sequence[channelKey].steps;
            if (Array.isArray(steps)) {
                steps.forEach((step, index) => {
                    const stepControlId = `${sequenceKey}-${channelKey}-step-${index}`;
                    const stepControl = document.getElementById(stepControlId);
                    if (stepControl) {
                        if (step.isActive) {
                            stepControl.classList.add('selected');
                        } else {
                            stepControl.classList.remove('selected');
                        }
                    }
                });
            } else {
                console.log(`[updateProjectSequencesUI] Steps data for channel ${channelKey} in sequence ${sequenceKey} is not an array`);
            }
        });
    });
}
