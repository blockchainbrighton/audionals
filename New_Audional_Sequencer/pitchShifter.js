// pitchShifter.js

class PitchShifter {
    constructor() {
        this.pitchShift = new Tone.PitchShift();
        this.pitchShift.pitch = 0;
        this.active = false;
        
        this.setupUI();
        this.registerObserver();
    }

    setupUI() {
        console.log("[PitchShifter Class Functions] setupUI entered");
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

    registerObserver() {
        console.log("[PitchShifter] Registering as observer to global settings.");
        window.unifiedSequencerSettings.addObserver(this.applySettings.bind(this));
    }
    

    applySettings(settings) {
        console.log("[PitchShifter] applySettings triggered with settings:", settings);
        if (!settings || settings.type !== 'pitchShifter') return;
    
        const pitchSetting = window.unifiedSequencerSettings.getPitchShifter(
            settings.sequence, settings.channel, settings.step
        );
        console.log("[PitchShifter] Applying pitch setting:", pitchSetting);
        if (pitchSetting && pitchSetting.channel === this.currentStepChannel && pitchSetting.step === this.currentStepNumber) {
            this.updateUI(pitchSetting);
        } else {
            console.log("[PitchShifter] No applicable pitch settings found for current step/channel.");
        }
    }

    updateUI(settings) {
        console.log("[PitchShifter] Updating UI with settings:", settings);
        this.pitchShift.pitch = settings.amount;
        this.active = settings.active;
        this.container.querySelector('#pitchRange').value = settings.amount;
        this.container.querySelector('#pitchShiftValue').textContent = settings.amount;
        this.container.querySelector('#powerButton').textContent = this.active ? 'Turn Off' : 'Turn On';
    }

    handlePitchChange(e) {
        const pitchValue = parseFloat(e.target.value);
        this.pitchShift.pitch = pitchValue;
        window.unifiedSequencerSettings.updatePitchShifter(
            window.unifiedSequencerSettings.getCurrentSequence(), 
            this.currentStepChannel, 
            this.currentStepNumber, 
            pitchValue, 
            this.active
        );
        console.log("[PitchShifter] Pitch changed to:", this.pitchShift.pitch);
    }

    toggleActiveState() {
        this.active = !this.active;
        window.unifiedSequencerSettings.updatePitchShifter(
            window.unifiedSequencerSettings.getCurrentSequence(), 
            this.currentStepChannel, 
            this.currentStepNumber, 
            this.pitchShift.pitch, 
            this.active
        );
        console.log("[PitchShifter] Active state changed to:", this.active);
    }
   

    updatePitchShifterSetting(pitchValue) {
        console.log("[PitchShifter Class Functions] updatePitchShifterSetting entered");
        const adjustedChannel = this.currentStepChannel - 1;
        const adjustedStep = this.currentStepNumber - 1;
        if (this.active) {
            window.unifiedSequencerSettings.updatePitchShifter(
                window.unifiedSequencerSettings.getCurrentSequence(),
                adjustedChannel,
                adjustedStep,
                pitchValue
            );
        } else {
            window.unifiedSequencerSettings.updatePitchShifter(
                window.unifiedSequencerSettings.getCurrentSequence(),
                adjustedChannel,
                adjustedStep
            );
        }
    }

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

const pitchShifter = new PitchShifter();
function showPitchShifterUI(x, y, stepChannel, stepNumber) {
    pitchShifter.showUI(x, y, stepChannel, stepNumber);
}
