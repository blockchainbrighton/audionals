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

        // Play Button: Handle mousedown and mouseup for note on/off
        if (playButton) {
            playButton.addEventListener("mousedown", async () => {
                await this.synthController.startAudioContext();
                this.synthController.playNote();
            });

            playButton.addEventListener("mouseup", () => {
                this.synthController.stopNote();
            });

            playButton.addEventListener("mouseleave", () => {
                this.synthController.stopNote();
            });
        } else {
            console.warn("playButton is not defined.");
        }

        // Latch Button
        if (latchButton) {
            latchButton.addEventListener("click", async () => {
                await this.synthController.startAudioContext();
                this.synthController.latchNote();
            });
        } else {
            console.warn("latchButton is not defined.");
        }

        // Waveform Select
        if (waveformSelect) {
            waveformSelect.addEventListener("change", () => {
                this.synthController.updateWaveform();
            });
        } else {
            console.warn("waveformSelect is not defined.");
        }

        // Note Select
        if (noteSelect) {
            noteSelect.addEventListener("change", () => {
                this.synthController.updateNoteSelection();
            });
        } else {
            console.warn("noteSelect is not defined.");
        }

        // Arpeggiator Button
        if (arpButton) {
            arpButton.addEventListener("click", () => {
                if (this.synthController.arpeggiator) {
                    this.synthController.arpeggiator.toggleArpeggiator();
                } else {
                    console.warn("Arpeggiator instance is not defined in SynthController.");
                }
            });
        } else {
            console.warn("arpButton is not defined.");
        }

        // Tempo Controls
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

        // Arpeggiator Speed Buttons
        if (this.synthController.arpSpeedButtons) {
            this.synthController.arpSpeedButtons.forEach(button => {
                button.addEventListener("click", () => { 
                    if (this.synthController.arpeggiator) {
                        this.synthController.arpeggiator.handleArpSpeedChange(button);
                    } else {
                        console.warn("Arpeggiator instance is not defined in SynthController.");
                    }
                });
            });
        } else {
            console.warn("arpSpeedButtons are not defined.");
        }

        // Pattern Select
        if (patternSelect) {
            patternSelect.addEventListener("change", (e) => {
                this.synthController.setPattern(e.target.value);
            });
        } else {
            console.warn("patternSelect is not defined.");
        }

        // Random Pattern Button
        if (randomPatternButton) {
            randomPatternButton.addEventListener("click", () => { 
                if (this.synthController.arpeggiator) {
                    this.synthController.arpeggiator.setRandomPattern();
                }
            });
        } else {
            console.warn("randomPatternButton is not defined.");
        }

        // Random Notes Button
        if (randomNotesButton) {
            randomNotesButton.addEventListener("click", () => { 
                if (this.synthController.arpeggiator) {
                    this.synthController.arpeggiator.randomizeNotes();
                }
            });
        } else {
            console.warn("randomNotesButton is not defined.");
        }

        // Randomness Toggle
        if (randomnessToggle) {
            randomnessToggle.addEventListener("change", (e) => {
                this.synthController.toggleRandomness(e.target.checked);
            });
        } else {
            console.warn("randomnessToggle is not defined.");
        }

        // Swing Slider
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