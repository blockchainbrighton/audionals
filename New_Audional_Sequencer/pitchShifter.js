// pitchShifter.js

class PitchShifter {
    constructor(unifiedSequencerSettings) {
        this.pitchShift = new Tone.PitchShift();
        this.pitchShift.pitch = 0;
        this.active = false;
        this.unifiedSequencerSettings = unifiedSequencerSettings;
        this.currentStepChannel = null;
        this.currentStepNumber = null;

        this.setupUI();
        this.registerObserver();
    }

    setupUI() {
        // Simplified UI setup logic
        this.container = document.createElement('div');
        this.container.style = `
            display: none; 
            background-color: black; 
            color: white; 
            border: 1px solid white; 
            padding: 10px;
        `;
        this.container.innerHTML = `
            <div id="stepInfo">Step: N/A</div>
            <label for="pitchRange">Pitch: </label>
            <input type="range" id="pitchRange" min="0.2" max="100" value="1" step="0.1">
            <button id="powerButton">Turn On</button>
        `;
        document.body.appendChild(this.container);

        // Simplified event listener setup using arrow functions for automatic binding
        this.container.querySelector('#pitchRange').addEventListener('input', (e) => this.handlePitchChange(e));
        this.container.querySelector('#powerButton').addEventListener('click', () => this.toggleActiveState());
    }

    registerObserver() {
        // Assuming window.unifiedSequencerSettings is an observable
        window.unifiedSequencerSettings.addObserver((settings) => this.applySettings(settings));
    }

    applySettings(settings) {
        if (!settings || settings.type !== 'pitchShifter') return;

        const pitchSetting = this.unifiedSequencerSettings.getPitchShifter(settings.sequence, settings.channel, settings.step);
        if (pitchSetting && pitchSetting.channel === this.currentStepChannel && pitchSetting.step === this.currentStepNumber) {
            this.updateUI(pitchSetting);
        }
    }

    updateUI(settings) {
        // UI update logic
        this.pitchShift.pitch = settings.amount;
        this.active = settings.active;
        this.container.querySelector('#pitchRange').value = settings.amount;
        document.getElementById('pitchShiftValue').textContent = settings.amount; // Ensure the pitchShiftValue element exists
        this.container.querySelector('#powerButton').textContent = this.active ? 'Turn Off' : 'Turn On';
    }

    handlePitchChange(e) {
        const pitchValue = parseFloat(e.target.value);
        console.log(`Pitch value changed to: ${pitchValue}`);
        this.pitchShift.pitch = pitchValue;
        if (this.currentStepChannel !== null && this.currentStepNumber !== null) {
            console.log(`Updating pitch shifter in global settings for sequence: ${this.unifiedSequencerSettings.getCurrentSequence()}, channel: ${this.currentStepChannel}, step: ${this.currentStepNumber}`);
            this.unifiedSequencerSettings.updatePitchShifter(
                this.unifiedSequencerSettings.getCurrentSequence(),
                this.currentStepChannel,
                this.currentStepNumber,
                pitchValue,
                this.active
            );
        }
    }
    
    toggleActiveState() {
        this.active = !this.active;
        console.log(`Pitch shifter active state toggled to: ${this.active}`);
        if (this.currentStepChannel !== null && this.currentStepNumber !== null) {
            this.unifiedSequencerSettings.updatePitchShifter(
                this.unifiedSequencerSettings.getCurrentSequence(),
                this.currentStepChannel,
                this.currentStepNumber,
                this.pitchShift.pitch,
                this.active
            );
        }
    }
    

    // updatePitchShifterSetting(pitchValue) {
    //     console.log("[PitchShifter Class Functions] updatePitchShifterSetting entered");
    //     const adjustedChannel = this.currentStepChannel - 1;
    //     const adjustedStep = this.currentStepNumber - 1;
    //     if (this.active) {
    //         window.unifiedSequencerSettings.updatePitchShifter(
    //             window.unifiedSequencerSettings.getCurrentSequence(),
    //             adjustedChannel,
    //             adjustedStep,
    //             pitchValue
    //         );
    //     } else {
    //         window.unifiedSequencerSettings.updatePitchShifter(
    //             window.unifiedSequencerSettings.getCurrentSequence(),
    //             adjustedChannel,
    //             adjustedStep
    //         );
    //     }
    // }

    showUI(x, y, stepChannel, stepNumber) {
        console.log("[PitchShifter] Showing UI for stepChannel:", stepChannel, "stepNumber:", stepNumber);
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
        
        this.applySettings({
            type: 'pitchShifter', 
            sequence: window.unifiedSequencerSettings.getCurrentSequence(), 
            channel: stepChannel, 
            step: stepNumber
        });
    }

    hideUI() {
        console.log("[PitchShifter Class Functions] hideUI entered");
        this.container.style.display = 'none';
        document.removeEventListener('click', this.documentClickListener);
    }

    handleDocumentClick(event) {
        console.log("[PitchShifter Class Functions] handleDocumentClick entered");
        if (!this.container.contains(event.target)) {
            this.hideUI();
        }
    }
}

const pitchShifter = new PitchShifter(unifiedSequencerSettings);
function showPitchShifterUI(x, y, stepChannel, stepNumber) {
    pitchShifter.showUI(x, y, stepChannel, stepNumber);
}
