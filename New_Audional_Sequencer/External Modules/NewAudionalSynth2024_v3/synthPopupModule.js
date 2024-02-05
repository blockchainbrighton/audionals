// SynthPopupModule.js

function openSynthPopup(index) {
    // Define the URL to the synthesizer HTML page
    const synthPageUrl = 'External Modules/NewAudionalSynth2024_v3/ms10Merged.html';

    // Create a pop-up window for the synthesizer
    const synthWindow = window.open(synthPageUrl, `SynthChannel${index}`, 'width=600,height=400');

    // Optional: Pass channel or other relevant information to the synthesizer window
    synthWindow.onload = () => {
        // Example: Setting the title dynamically based on the channel index
        synthWindow.document.title = `Synth for Channel ${index}`;
        // Further customization or initialization can go here
    };
}


