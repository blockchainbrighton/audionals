// pitchShifter.js

// Define a PitchShifter class
class PitchShifter {
    constructor() {
        // Create a PitchShift effect with Tone.js
        this.pitchShift = new Tone.PitchShift().toDestination();
        this.pitchShift.pitch = 1; // Default pitch setting
        this.active = false; // Effect is off by default
        
        // Setup UI
        this.setupUI();
    }

    setupUI() {
        // Create UI container
        this.container = document.createElement('div');
        this.container.style.display = 'none'; // Initially hidden
        this.container.style.backgroundColor = 'black'; // Ensure it's readable
        this.container.style.border = '1px solid black'; // Add border for visibility
        this.container.style.padding = '10px'; // Add some padding
        this.container.innerHTML = `
            <div id="stepInfo">Step: N/A</div>
            <label for="pitchRange">Pitch: </label>
            <input type="range" id="pitchRange" min="0.2" max="100" value="1" step="0.1">
            <button id="powerButton">Turn On</button>
        `;
        document.body.appendChild(this.container);

        // Setup listeners
        this.container.querySelector('#pitchRange').addEventListener('input', (e) => {
            this.pitchShift.pitch = e.target.value;
        });

        this.container.querySelector('#powerButton').addEventListener('click', () => {
            this.toggleEffect();
        });
    }

    toggleEffect() {
        this.active = !this.active;
        this.container.querySelector('#powerButton').textContent = this.active ? 'Turn Off' : 'Turn On';
        if (this.active) {
            console.log('Pitch Shift Effect Activated');
        } else {
            console.log('Pitch Shift Effect Deactivated');
        }
    }

    // Inside pitchShifter.js, update the showUI method to accept channelIndex and stepNumber:
    showUI(x, y, channelIndex, stepNumber) {
        this.container.style.display = 'block';
        this.container.style.position = 'absolute';
        this.container.style.left = `${x}px`;
        this.container.style.top = `${y}px`;
        // Update the display text with channel and step number
        this.container.querySelector('#stepInfo').innerText = `Step: Channel ${channelIndex}, Number ${stepNumber}`;
        // Auto-hide and click outside logic remains unchanged
    
        // Setup a timeout to automatically close the UI after 5 seconds
        // setTimeout(() => {
        //     this.hideUI();
        // }, 5000);

        // Close UI when clicked outside
        const handleClickOutside = (event) => {
            if (!this.container.contains(event.target)) {
                this.hideUI();
                document.removeEventListener('click', handleClickOutside);
            }
        };

        // Add click event listener to document to close the UI if clicked outside
        setTimeout(() => { // Timeout ensures it doesn't immediately trigger after opening
            document.addEventListener('click', handleClickOutside);
        }, 10);
    }

    hideUI() {
        this.container.style.display = 'none';
    }
}

// Create an instance of PitchShifter
const pitchShifter = new PitchShifter();

// Function to show Pitch Shifter UI, could be called from the step button's right-click menu
function showPitchShifterUI(x, y, stepChannel, stepNumber) {
    pitchShifter.showUI(x, y, stepChannel, stepNumber);
}
