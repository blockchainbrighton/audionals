// synthEventListeners.js


// Event listeners for various buttons and interactions
// Attach unified event listeners
document.getElementById("startRecording").addEventListener("click", handleEvent);
document.getElementById("stopRecording").addEventListener("click", handleEvent);
document.getElementById("playRecording").addEventListener("click", handleEvent);
document.getElementById("stopPlayback").addEventListener("click", handleEvent);
document.getElementById("loopToggle").addEventListener("click", handleEvent);
document.addEventListener('midiMessageReceived', handleEvent);

document.querySelector("button[onclick='playMS10TriangleBass()']").addEventListener("click", function() {
    recordSynthInteraction({ event: "notePlayed", note: elements.note.value });
});

document.addEventListener('midiMessageReceived', function(e) {
    recordMIDIInput(e.detail.midiMessage);
    logCurrentSettings("midiMessageReceived");
});

// Get references to the bar selection buttons
const barButtons = document.querySelectorAll('#selectBar1, #selectBar2, #selectBar4');

// Function to handle button clicks
function handleBarButtonClick(event) {
    // Remove the 'selected' class from all bar buttons
    barButtons.forEach(button => {
        button.classList.remove('selected');
        button.style.backgroundColor = "";  // Reset the button color
    });
    
    // Highlight the clicked button and set its state
    event.target.classList.add('selected');
    event.target.style.backgroundColor = "#A0A0A0";  // Highlight the button

    // Update the number of bars for looping based on the selected button
    selectedLoopBars = parseInt(event.target.getAttribute('data-bar'));
}

// Attach click event listeners to the bar selection buttons
barButtons.forEach(button => {
    button.addEventListener('click', handleBarButtonClick);
});
