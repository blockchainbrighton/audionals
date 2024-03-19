
class PitchShifter {
    constructor() {
        this.pitchShift = new Tone.PitchShift();
        this.pitchShift.pitch = 1; // Default pitch setting is numeric
        this.pitchShift.pitch = 0; // Default pitch shift
        this.active = false; 

        this.currentStepChannel = null;
        this.currentStepNumber = null;
        
        this.setupUI();
    }

    setupUI() {
        this.container = document.createElement('div');
        this.container.style.display = 'none'; 
        this.container.style.backgroundColor = 'black'; 
        this.container.style.color = 'white'; 
        this.container.style.border = '1px solid white'; 
        this.container.style.padding = '10px'; 
        this.container.innerHTML = `
            <div id="stepInfo">Step: N/A</div>
            <label for="pitchRange" style="color: white;">Pitch: </label>
            <input type="range" id="pitchRange" min="0.2" max="100" value="1" step="0.1">
            <button id="powerButton">Turn On</button>
        `;
        document.body.appendChild(this.container);

        this.container.querySelector('#pitchRange').addEventListener('input', (e) => {
            const pitchValue = parseFloat(e.target.value); // Ensure pitchValue is treated as a number
            this.pitchShift.pitch = pitchValue; // Tone.js pitch is now updated with a numeric value
            if (this.currentStepChannel !== null && this.currentStepNumber !== null) {
                const adjustedChannel = this.currentStepChannel - 1;
                const adjustedStep = this.currentStepNumber - 1;
                window.unifiedSequencerSettings.addOrUpdatePitchShifter(
                    window.unifiedSequencerSettings.getCurrentSequence(),
                    adjustedChannel,
                    adjustedStep,
                    pitchValue // Passed as a number
                );
            }
        });

        this.container.querySelector('#powerButton').addEventListener('click', () => {
            this.active = !this.active;
            this.container.querySelector('#powerButton').textContent = this.active ? 'Turn Off' : 'Turn On';
            if (this.currentStepChannel !== null && this.currentStepNumber !== null) {
                const adjustedChannel = this.currentStepChannel - 1;
                const adjustedStep = this.currentStepNumber - 1;
                if (this.active) {
                    console.log('Pitch Shift Effect Activated');
                    window.unifiedSequencerSettings.addOrUpdatePitchShifter(
                        window.unifiedSequencerSettings.getCurrentSequence(),
                        adjustedChannel,
                        adjustedStep,
                        parseFloat(this.pitchShift.pitch) // Ensure the pitch is passed as a number
                    );
                } else {
                    console.log('Pitch Shift Effect Deactivated');
                    window.unifiedSequencerSettings.removePitchShifter(
                        window.unifiedSequencerSettings.getCurrentSequence(),
                        adjustedChannel,
                        adjustedStep
                    );
                }
            }
        });
    }

    showUI(x, y, stepChannel, stepNumber) {
        this.currentStepChannel = stepChannel;
        this.currentStepNumber = stepNumber;
        this.container.style.display = 'block';
        this.container.style.position = 'absolute';
        this.container.style.left = `${x}px`;
        this.container.style.top = `${y}px`;
        this.container.querySelector('#stepInfo').innerText = `Step: Channel ${stepChannel}, Number ${stepNumber}`;

        setTimeout(() => {
            document.addEventListener('click', (event) => {
                if (!this.container.contains(event.target)) {
                    this.hideUI();
                    document.removeEventListener('click', this.hideUI);
                }
            });
        }, 10);
    }

    hideUI() {
        this.container.style.display = 'none';
    }
}

const pitchShifter = new PitchShifter();

function showPitchShifterUI(x, y, stepChannel, stepNumber) {
    pitchShifter.showUI(x, y, stepChannel, stepNumber);
}
