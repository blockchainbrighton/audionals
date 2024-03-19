class PitchShifter {
    constructor() {
        this.pitchShift = new Tone.PitchShift();
        this.pitchShift.pitch = 0;
        this.active = false;

        this.currentStepChannel = null;
        this.currentStepNumber = null;
        
        this.setupUI();
        this.documentClickListener = (event) => this.handleDocumentClick(event);
    }

    setupUI() {
        // Create container element with predefined styles
        this.container = document.createElement('div');
        Object.assign(this.container.style, {
            display: 'none', 
            backgroundColor: 'black', 
            color: 'white', 
            border: '1px solid white', 
            padding: '10px', 
        });
        this.container.innerHTML = `
            <div id="stepInfo">Step: N/A</div>
            <label for="pitchRange">Pitch: </label>
            <input type="range" id="pitchRange" min="0.2" max="100" value="1" step="0.1">
            <button id="powerButton">Turn On</button>
        `;
        document.body.appendChild(this.container);

        // Setup event listeners for pitch range and power button
        this.container.querySelector('#pitchRange').addEventListener('input', this.handlePitchChange.bind(this));
        this.container.querySelector('#powerButton').addEventListener('click', this.toggleActiveState.bind(this));
    }
    handlePitchChange(e) {
        const pitchValue = parseFloat(e.target.value);
        this.pitchShift.pitch = pitchValue;
        this.updatePitchShifterSetting(pitchValue);
        // Update the UI to reflect the new pitch value
        this.container.querySelector('#pitchShiftValue').textContent = pitchValue; // Assuming you add a span to display pitch value
    }

    toggleActiveState() {
        this.active = !this.active;
        const button = this.container.querySelector('#powerButton');
        button.textContent = this.active ? 'Turn Off' : 'Turn On';
        this.updatePitchShifterSetting(parseFloat(this.container.querySelector('#pitchRange').value));
    }

    updatePitchShifterSetting(pitchValue) {
        const adjustedChannel = this.currentStepChannel - 1;
        const adjustedStep = this.currentStepNumber - 1;
        if (this.active) {
            window.unifiedSequencerSettings.addOrUpdatePitchShifter(
                window.unifiedSequencerSettings.getCurrentSequence(),
                adjustedChannel,
                adjustedStep,
                pitchValue
            );
        } else {
            window.unifiedSequencerSettings.removePitchShifter(
                window.unifiedSequencerSettings.getCurrentSequence(),
                adjustedChannel,
                adjustedStep
            );
        }
    }

    showUI(x, y, stepChannel, stepNumber) {
        this.currentStepChannel = stepChannel;
        this.currentStepNumber = stepNumber;

        // Update the UI based on current settings
        const settings = window.unifiedSequencerSettings.getPitchShifter(window.unifiedSequencerSettings.getCurrentSequence(), stepChannel, stepNumber);
        if (settings) {
            this.pitchShift.pitch = settings.amount;
            this.active = settings.active;
            this.container.querySelector('#pitchRange').value = settings.amount;
            this.container.querySelector('#pitchShiftValue').textContent = settings.amount; // Update pitch value display
            this.container.querySelector('#powerButton').textContent = this.active ? 'Turn Off' : 'Turn On';
        }

        Object.assign(this.container.style, {
            display: 'block',
            position: 'absolute',
            left: `${x}px`,
            top: `${y}px`,
        });
        this.container.querySelector('#stepInfo').innerText = `Step: Channel ${stepChannel}, Number ${stepNumber}`;
        document.addEventListener('click', this.documentClickListener);
    }

    hideUI() {
        this.container.style.display = 'none';
        document.removeEventListener('click', this.documentClickListener);
    }

    handleDocumentClick(event) {
        if (!this.container.contains(event.target)) {
            this.hideUI();
        }
    }
}

const pitchShifter = new PitchShifter();
function showPitchShifterUI(x, y, stepChannel, stepNumber) {
    pitchShifter.showUI(x, y, stepChannel, stepNumber);
}
