// eventListener.js

export class EventListenerManager {
    constructor(synthController) {
        this.synthController = synthController;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const {
            playButton,
            latchButton,
            waveformSelect,
            noteSelect,
            arpButton,
            tempoDown,
            tempoUp,
            patternSelect,
            randomPatternButton,
            randomNotesButton,
            randomnessToggle,
            swingSlider,
            swingDisplay
        } = this.synthController;
    
        // Check and add event listeners conditionally
        if (playButton) {
            playButton.addEventListener("click", async () => {
                await this.synthController.startAudioContext();
                this.synthController.playNote();
            });
        } else {
            console.warn("playButton is not defined.");
        }
    
        if (latchButton) {
            latchButton.addEventListener("click", async () => {
                await this.synthController.startAudioContext();
                this.synthController.latchNote();
            });
        } else {
            console.warn("latchButton is not defined.");
        }
    
        if (waveformSelect) {
            waveformSelect.addEventListener("change", () => {
                this.synthController.updateWaveform();
            });
        } else {
            console.warn("waveformSelect is not defined.");
        }
    
        if (noteSelect) {
            noteSelect.addEventListener("change", () => {
                this.synthController.updateNoteSelection();
            });
        } else {
            console.warn("noteSelect is not defined.");
        }
    
        if (arpButton) {
            arpButton.addEventListener("click", () => {
                this.synthController.arpeggiator.handleArpeggiatorToggle();
            });
      
        } else {
            console.warn("arpButton is not defined.");
        }
    
        if (tempoUp) {
            tempoUp.addEventListener("click", () => { 
                this.synthController.updateTempo(5); 
            });
        } else {
            console.warn("tempoUp is not defined.");
        }
    
        if (tempoDown) {
            tempoDown.addEventListener("click", () => { 
                this.synthController.updateTempo(-5); 
            });
        } else {
            console.warn("tempoDown is not defined.");
        }
    
        if (this.synthController.arpSpeedButtons) {
            this.synthController.arpSpeedButtons.forEach(button => {
                button.addEventListener("click", () => { 
                    if (this.synthController.arpeggiator) {
                        this.synthController.arpeggiator.handleArpSpeedChange(button);
                    }
                });
            });
        } else {
            console.warn("arpSpeedButtons are not defined.");
        }
    
        if (patternSelect) {
            patternSelect.addEventListener("change", (e) => {
                this.synthController.setPattern(e.target.value);
            });
        } else {
            console.warn("patternSelect is not defined.");
        }
    
        if (randomPatternButton) {
            randomPatternButton.addEventListener("click", () => { 
                if (this.synthController.arpeggiator) {
                    this.synthController.arpeggiator.setRandomPattern();
                }
            });
        } else {
            console.warn("randomPatternButton is not defined.");
        }
    
        if (randomNotesButton) {
            randomNotesButton.addEventListener("click", () => { 
                if (this.synthController.arpeggiator) {
                    this.synthController.arpeggiator.randomizeNotes();
                }
            });
        } else {
            console.warn("randomNotesButton is not defined.");
        }
    
        if (randomnessToggle) {
            randomnessToggle.addEventListener("change", (e) => {
                this.synthController.toggleRandomness(e.target.checked);
            });
        } else {
            console.warn("randomnessToggle is not defined.");
        }
    
        if (swingSlider && swingDisplay) {
            swingSlider.addEventListener("input", (e) => {
                const swingValue = parseFloat(e.target.value);
                swingDisplay.textContent = `${swingValue}%`;
                this.synthController.updateSwing(swingValue);
            });
        } else {
            console.warn("swingSlider or swingDisplay is not defined.");
        }
    }
    
}