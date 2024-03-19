// audioTrimModule.js


class AudioTrimmer {
    constructor(channelIndex) {
        console.log("[Class Functions] constructor", { channelIndex });

        this.channelIndex = channelIndex;
        this.unifiedSequencerSettings = this.unifiedSequencerSettings; // Store the unifiedSequencerSettings reference
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.audioBuffer = null;
        this.isPlaying = false;
        this.isLooping = false;

        this.initializeSliderTrack(channelIndex);

        const trimSettings = getTrimSettings(this.channelIndex);
        console.log("getSettings read into trimSettings in AudioTrimmer class constructor", trimSettings);
        this.startSliderValue = trimSettings.startSliderValue;
        this.endSliderValue = trimSettings.endSliderValue;

        this.pitchShift = new Tone.PitchShift().toDestination();
        this.pitchShift.wet.value = 0;
        this.pitchShift.pitch = 0;
        this.pitchShiftActive = false;

        this.fetchInitialPitchShiftSettings();
        this.initializePitchShiftControls();
    }

    fetchInitialPitchShiftSettings() {
        // Assuming unifiedSequencerSettings is an instance of UnifiedSequencerSettings available globally
        const currentSequence = unifiedSequencerSettings.settings.masterSettings.currentSequence;
        const pitchSetting = unifiedSequencerSettings.getPitchShifter(currentSequence, this.channelIndex, null);

        if (pitchSetting) {
            this.pitchShift.pitch = pitchSetting.amount;
            this.pitchShiftActive = true; // Assuming presence of settings implies activation
            this.pitchShift.wet.value = 1; // Apply the effect since it's active
            console.log(`[AudioTrimmer] Fetched pitch setting: ${pitchSetting.amount} for channel ${this.channelIndex}`);

            // Update UI to reflect fetched settings
            document.getElementById('pitchShiftRange').value = pitchSetting.amount;
            document.getElementById('pitchShiftValue').textContent = pitchSetting.amount;
            document.getElementById('pitchShiftToggleButton').textContent = 'Turn Pitch Shift Off';
        }else {
            console.log(`[AudioTrimmer] No pitch setting found for channel ${this.channelIndex}`);
        }
    }
    

    initializePitchShiftControls() {
        // Initialize controls as before, with added integration to update global settings
        const pitchShiftRange = document.getElementById('pitchShiftRange');
        const pitchShiftValueDisplay = document.getElementById('pitchShiftValue');
        const pitchShiftToggleButton = document.getElementById('pitchShiftToggleButton');

        pitchShiftRange.addEventListener('input', () => {
            const value = parseFloat(pitchShiftRange.value);
            pitchShiftValueDisplay.textContent = value;
            this.pitchShift.pitch = value;
            // Update global settings whenever the pitch shift amount changes
            unifiedSequencerSettings.addOrUpdatePitchShifter(unifiedSequencerSettings.settings.masterSettings.currentSequence, this.channelIndex, null, value);
        });

        pitchShiftToggleButton.addEventListener('click', () => {
            this.pitchShiftActive = !this.pitchShiftActive;
            pitchShiftToggleButton.textContent = this.pitchShiftActive ? 'Turn Pitch Shift Off' : 'Turn Pitch Shift On';
            this.pitchShift.wet.value = this.pitchShiftActive ? 1 : 0;
            // Update global settings based on pitch shift activation status
            if (this.pitchShiftActive) {
                console.log('[AudioTrimmer] Pitch Shift Activated');
                unifiedSequencerSettings.addOrUpdatePitchShifter(unifiedSequencerSettings.settings.masterSettings.currentSequence, this.channelIndex, null, parseFloat(this.pitchShift.pitch));
            } else {
                console.log('[AudioTrimmer] Pitch Shift Deactivated');
                unifiedSequencerSettings.removePitchShifter(unifiedSequencerSettings.settings.masterSettings.currentSequence, this.channelIndex, null);
            }
        });
    }

    applyPitchShiftAndExport() {
        return new Promise((resolve, reject) => {
            if (!this.audioBuffer) {
                reject("No audio buffer loaded");
                return;
            }

            if (!this.pitchShiftActive) {
                resolve(this.audioBuffer);
                return;
            }

            // Assume this.audioBuffer is compatible with Tone.js (e.g., loaded via Tone.Buffer)
            Tone.Offline(() => {
                // Setup the pitch shift effect
                const pitchShift = new Tone.PitchShift(this.pitchShift.pitch).toDestination();
                const source = new Tone.Player(this.audioBuffer).connect(pitchShift);
                source.start(0);
            }, this.audioBuffer.duration).then((buffer) => {
                // Convert Tone.Buffer back to AudioBuffer for Web Audio API
                const offlineContext = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
                const myArrayBuffer = offlineContext.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
                for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
                    myArrayBuffer.copyToChannel(buffer.getChannelData(channel), channel);
                }
                resolve(myArrayBuffer);
            }).catch(reject);
        });
    }

    playTrimmedAudio() {
        console.log("[playTrimmedAudio] [Class Functions] playTrimmedAudio");
        console.log(`[playTrimmedAudio] Pitch shift active: ${this.pitchShiftActive}, Pitch: ${this.pitchShift.pitch}`);
    
        if (this.isPlaying) {
            console.log("[playTrimmedAudio] Audio is already playing, not starting new playback");
            return;
        }

        if (!this.audioBuffer) {
            console.error("[playTrimmedAudio] No audio buffer loaded");
            return;
        }

        this.isPlaying = true;
        this.applyPitchShiftAndExport().then(processedBuffer => {
            this.setupAndPlayAudioBuffer(processedBuffer);
        }).catch(error => {
            console.error("[playTrimmedAudio] Error processing audio:", error);
            this.isPlaying = false;
        });
    }

    setupAndPlayAudioBuffer(processedBuffer) {
        this.sourceNode = this.audioContext.createBufferSource();
        this.sourceNode.buffer = processedBuffer;
        this.sourceNode.connect(this.audioContext.destination);

        const startTime = this.sliderValueToTimecode(this.startSliderValue, processedBuffer.duration);
        const endTime = this.sliderValueToTimecode(this.endSliderValue, processedBuffer.duration);

        this.sourceNode.loop = this.isLooping;
        if (this.isLooping) {
            this.sourceNode.loopStart = startTime;
            this.sourceNode.loopEnd = endTime;
        }

        this.sourceNode.start(0, startTime, endTime - startTime);
        console.log("[playTrimmedAudio] Playback started");
        this.animatePlayback(); 

        this.sourceNode.onended = () => {
            this.isPlaying = false;
            console.log("[playTrimmedAudio] Playback ended, isPlaying set to false");
            this.cleanupAfterPlayback(); 
        };
    }
    
    cleanupAfterPlayback() {
        // Implement any cleanup logic needed after playback ends
        if (this.animationFrameRequest) {
            cancelAnimationFrame(this.animationFrameRequest); // Stop the animation when playback stops
        }
        // Additional cleanup as necessary
    }
    
    calculatePlaybackRateFromPitch(pitch) {
        // Implement logic to calculate playback rate based on pitch, if needed
        return Math.pow(2, pitch / 12); // Example: convert pitch shift in semitones to playback rate
    }
    

    initializeSliderTrack() {
    this.sliderTrack = document.querySelector('.slider-track');
    if (!this.sliderTrack) {
        console.error('Slider track not found');
    }
}

    updateTrimmedSampleDuration() {
        const startValue = this.startSliderValue;
        const endValue = this.endSliderValue;
        this.trimmedSampleDuration = Math.max(0, endValue - startValue);
        this.debounceDisplayValues();
    }

    // Method to get the current value of the start slider
    getStartSliderValue() {
        return this.startSliderValue;
    }

    // Method to get the current value of the end slider
    getEndSliderValue() {
        return this.endSliderValue;
    }

    sliderValueToTimecode(sliderValue, totalDuration) {
        return (sliderValue / 100) * totalDuration;
    }

// Method to debounce the display of values
debounceDisplayValues() {
    if (this.displayTimeout) {
        clearTimeout(this.displayTimeout);
    }
    this.displayTimeout = setTimeout(() => this.displayValues(), 300); // Adjust the delay as needed
}

// Method to display values (for debugging or UI update)
displayValues() {
    console.log("Start Slider Value:", this.startSliderValue);
    console.log("End Slider Value:", this.endSliderValue);
    console.log("Trimmed Sample Duration:", this.trimmedSampleDuration);
    // Add any other values you wish to display
}


      // Method to set the audio buffer and update the waveform
      setAudioBuffer(audioBuffer) {
        console.log("[Class Functions] setAudioBuffer", { audioBuffer });

        this.audioBuffer = audioBuffer;
        this.drawWaveform();
        console.log(" updateDimmedAreas method called from setAudioBuffer");
        this.updateDimmedAreas();
        this.updateSliderValues();
    }

    drawWaveform() {
        console.log("[Class Functions] drawWaveform");
        if (!this.audioBuffer) {
            console.log("[Class Functions] drawWaveform - No audio buffer");
            return;
        }
        const width = this.waveformCanvas.width;
        const height = this.waveformCanvas.height;
        const channelData = this.audioBuffer.getChannelData(0);
        const step = Math.ceil(channelData.length / width);
        const amp = height / 2;
        this.ctx.clearRect(0, 0, width, height);
        this.ctx.beginPath();
        
        for (let i = 0; i < width; i++) {
            const { min, max } = this.getMinMax(channelData, i * step, step);
            this.ctx.moveTo(i, amp * (1 + min));
            this.ctx.lineTo(i, amp * (1 + max));
        }
        
        this.ctx.stroke();
        }

        async initialize() {
            console.log("[Class Functions] initialize");
        
            const elementIds = ['ordinalIdInput', 'loadSampleButton', 'waveformCanvas', 'playbackCanvas', 'trimmerPlayButton', 'trimmerStopButton', 'loopButton', 'startDimmed', 'endDimmed', 'startSlider', 'endSlider'];
            let allElementsAvailable = true;
        
            elementIds.forEach(id => {
                this[id] = document.getElementById(id);
                if (!this[id]) {
                    console.error(`[Class Functions] initialize - Element not found: ${id}`);
                    allElementsAvailable = false;
                }
            });
        
            if (allElementsAvailable) {
                this.ctx = this.waveformCanvas.getContext('2d');
                this.addEventListeners();
                console.log(" updateDimmedAreas method called from initialize");

                this.updateDimmedAreas();
                this.updateSliderValues();

            } else {
                console.log("[Class Functions] initialize - Waiting for elements to be available");
                setTimeout(() => this.initialize(), 500); // Retry initialization after a delay
            }

            // Initialize slider values based on global settings
            const trimSettings = getTrimSettings(this.channelIndex);
            this.startSlider.value = trimSettings.startSliderValue;
            this.endSlider.value = trimSettings.endSliderValue;
            this.isLooping = trimSettings.isLooping;
            this.updateLoopButtonState();
            this.updateDimmedAreas();
            this.updateSliderValues();
            this.playbackCtx = this.playbackCanvas.getContext('2d');
            this.playbackCtx.fillStyle = 'red';

        
        }



        updateSliderValues() {
            // Assuming the slider values are stored as percentages
            const startLeft = (this.startSliderValue / 100) * this.sliderTrack.offsetWidth;
            const endLeft = (this.endSliderValue / 100) * this.sliderTrack.offsetWidth;
        
            // Update the visual position of the sliders
            this.startSlider.style.left = `${startLeft}px`;
            this.endSlider.style.left = `${endLeft}px`;
        
            // Update the dimmed areas based on the new slider positions
            this.updateDimmedAreas();
        
            console.log("updateDimmedAreas method called from updateSliderValues");
            this.updateTrimmedSampleDuration();
            this.debounceDisplayValues();
        }
        
        updateDimmedAreas() {
            console.log("[Class Functions] updateDimmedAreas function entered into");
        
            // Use the internal state values instead of the slider element values
            const startSliderValue = this.startSliderValue;
            const endSliderValue = this.endSliderValue;
        
            const startDimmedWidth = `${startSliderValue}%`;
            const endDimmedWidth = `${100 - endSliderValue}%`;
        
            this.startDimmed.style.width = startDimmedWidth;
            this.startDimmed.style.left = '0';
            this.endDimmed.style.width = endDimmedWidth;
            this.endDimmed.style.left = `${endSliderValue}%`; // Position the end dimmed area correctly
        }
        
        
        

        
  

        addEventListeners() {
            console.log("[Class Functions] addEventListeners");
        
            // Bind the methods to ensure the correct 'this' context
            this.boundPlayTrimmedAudio = this.playTrimmedAudio.bind(this);
            this.boundStopAudio = this.stopAudio.bind(this);
        
            // Remove existing listeners to avoid duplicates
            this.trimmerPlayButton.removeEventListener('click', this.boundPlayTrimmedAudio);
            this.trimmerStopButton.removeEventListener('click', this.boundStopAudio);
        
            // Attach new event listeners
            this.trimmerPlayButton.addEventListener('click', this.boundPlayTrimmedAudio);
            this.trimmerStopButton.addEventListener('click', this.boundStopAudio);

            this.loopButton.addEventListener('click', this.toggleLoop.bind(this));
        
        

        
            const sliderMouseDown = (event, isStartSlider) => {
                const slider = isStartSlider ? this.startSlider : this.endSlider;
                console.log(`[Slider Mouse Down] Slider: ${isStartSlider ? 'Start' : 'End'}`);
            
                if (!slider) {
                    console.error('Slider element is undefined');
                    return;
                }
            
                const shiftX = event.clientX - slider.getBoundingClientRect().left;
            
                document.onmousemove = (e) => {
                    if (!this.sliderTrack) {
                        console.error('Slider track is undefined');
                        return;
                    }
            
                    let newLeft = e.clientX - shiftX - this.sliderTrack.getBoundingClientRect().left;
            
                    // Constrain the slider within the bounds of the slider track
                    newLeft = Math.max(0, Math.min(newLeft, this.sliderTrack.offsetWidth - slider.offsetWidth));
            
                    // Adjust this logic to allow sliders to meet
                    if (isStartSlider) {
                        const endSliderLeft = this.endSlider.getBoundingClientRect().left - this.sliderTrack.getBoundingClientRect().left;
                        newLeft = Math.min(newLeft, endSliderLeft); // Allow startSlider to meet endSlider
                    } else {
                        const startSliderRight = this.startSlider.getBoundingClientRect().right - this.sliderTrack.getBoundingClientRect().left;
                        newLeft = Math.max(newLeft, startSliderRight); // Allow endSlider to meet startSlider
                    }
            
                    slider.style.left = `${newLeft}px`;
            
                    // Update slider values and UI
                    const newValue = (newLeft / this.sliderTrack.offsetWidth) * 100;
                    if (isStartSlider) {
                        this.startSliderValue = newValue;
                    } else {
                        this.endSliderValue = newValue;
                    }
            
                    let updatedTrimSettings = unifiedSequencerSettings.settings.masterSettings.trimSettings;
                    updatedTrimSettings[this.channelIndex] = {
                        ...updatedTrimSettings[this.channelIndex],
                        startSliderValue: this.startSliderValue,
                        endSliderValue: this.endSliderValue
                    };
            
                    updateTrimSettingsUI(updatedTrimSettings);
                    this.updateSliderValues();
                };
            
                document.onmouseup = () => {
                    document.onmousemove = document.onmouseup = null;
                };
            };
            
            this.startSlider.addEventListener('mousedown', (event) => sliderMouseDown(event, true));
            this.endSlider.addEventListener('mousedown', (event) => sliderMouseDown(event, false));
            
        }            
        
        
      

    async loadSample() {
        console.log("[Class Functions] loadSample");

        if (!this.ordinalIdInput.value) return;
        try {
            this.audioBuffer = await fetchAudio(`https://ordinals.com/content/${this.ordinalIdInput.value}`);
            this.trimSettings = getTrimSettings(this.channelIndex);
            this.drawWaveform();
            console.log(" updateDimmedAreas method called from loadSample");
            this.updateSliderValues();

            this.updateDimmedAreas();
        } catch (error) {
            console.error('Error loading audio:', error);
        }
    }

        
        getMinMax(channelData, startIndex, step) {
        let min = 1.0, max = -1.0;
        for (let i = 0; i < step; i++) {
            const datum = channelData[startIndex + i];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
        }
        return { min, max };
        }

       
    
         // Method to get the current value of the isLooping flag
         getIsLooping() {
            return this.isLooping;
        }

        // Method to set the isLooping flag
        setIsLooping(isLooping) {
            this.isLooping = isLooping;
            this.updateLoopButtonState();
        }

        // Method to update the loop button's visual state based on isLooping flag
        updateLoopButtonState() {
            console.log(`[updateLoopButtonState] isLooping: ${this.isLooping}`); // Add this line

            if (this.loopButton) {
                if (this.isLooping) {
                    this.loopButton.classList.add('on');
                    this.loopButton.classList.remove('off');
                } else {
                    this.loopButton.classList.add('off');
                    this.loopButton.classList.remove('on');
                }
            }
        }
        
        
       

        stopAudio() {
            console.log("[Class Functions] stopAudio");
            this.setIsLooping(false); // Use setIsLooping to ensure consistent state management

            if (this.isPlaying && this.sourceNode) {
                this.sourceNode.stop(); // Stop the audio playback
                this.sourceNode.disconnect();
                this.sourceNode = null;
                this.isPlaying = false;
            }
            if (this.animationFrameRequest) {
                cancelAnimationFrame(this.animationFrameRequest);
            }
        }
        

        toggleLoop() {
            console.log("[Class Functions] toggleLoop");
        
            this.isLooping = !this.isLooping;
            this.updateLoopButtonState(); // Ensure the visual state is updated
            if (this.isPlaying) {
                this.playTrimmedAudio(); // Restart playback with new loop setting if already playing
            }
        }
        

        getCurrentPlaybackPosition() {
            if (!this.isPlaying) return 0;
            const startOffset = this.sliderValueToTimecode(this.startSliderValue, this.audioBuffer.duration);
            return ((this.audioContext.currentTime - this.startTime) % this.audioBuffer.duration) + startOffset;
        }
        
        
        
        updatePlaybackCanvas() {
            // 1. Calculate Exact Current Position
            const actualCurrentPosition = this.audioContext.currentTime - this.startTime; // Current position in the actual audio playback
            const startOffset = this.sliderValueToTimecode(this.startSliderValue, this.audioBuffer.duration); // Start of the trimmed audio
            const endOffset = this.sliderValueToTimecode(this.endSliderValue, this.audioBuffer.duration); // End of the trimmed audio
            const trimmedDuration = endOffset - startOffset; // Duration of the trimmed audio
        
            // 2. Map Current Position to Trimmed Segment
            // Ensuring the position loops correctly within the trimmed segment if looping is enabled
            const relativePosition = (actualCurrentPosition - startOffset) % trimmedDuration;
            if (relativePosition < 0 || relativePosition > trimmedDuration) {
                // If outside the trimmed segment, don't draw the playbar
                return;
            }
        
            // 3. Scale Position to Canvas
            const canvasWidth = this.playbackCanvas.width;
            const canvasHeight = this.playbackCanvas.height;
            const startSliderCanvasPosition = (this.startSliderValue / 100) * canvasWidth; // Canvas position of the start slider
            const endSliderCanvasPosition = (this.endSliderValue / 100) * canvasWidth; // Canvas position of the end slider
            const trimmedSegmentCanvasWidth = endSliderCanvasPosition - startSliderCanvasPosition; // Width of the trimmed segment on the canvas
        
            // Calculate the xPosition for the playback bar within the trimmed segment on the canvas
            const xPosition = startSliderCanvasPosition + (relativePosition / trimmedDuration) * trimmedSegmentCanvasWidth;
        
            // Clear the previous position and draw the playbar at the new position
            this.playbackCtx.clearRect(0, 0, canvasWidth, canvasHeight);
            this.playbackCtx.beginPath();
            this.playbackCtx.moveTo(xPosition, 0);
            this.playbackCtx.lineTo(xPosition, canvasHeight);
            this.playbackCtx.strokeStyle = '#FF0000';
            this.playbackCtx.lineWidth = 2;
            this.playbackCtx.stroke();
        }         
        
        
        
        animatePlayback() {
            if (this.isPlaying) {
                console.log("[animatePlayback] Animation frame requested.");
                this.updatePlaybackCanvas();
                this.animationFrameRequest = requestAnimationFrame(() => this.animatePlayback());
            } else {
                console.log("[animatePlayback] Animation stopped. 'isPlaying' is false.");
            }
        }
    }             



