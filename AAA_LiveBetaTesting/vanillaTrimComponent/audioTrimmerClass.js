  // audioTrimmerClass.js
  

  class AudioTrimmer {
    constructor() {
        console.log('AudioTrimmer constructor called');
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.audioBuffer = null;
        this.sourceNode = null;
        this.isPlaying = false;
        this.isLooping = false;
        this.startTime = 0;
        this.totalSampleDuration = 0;
        this.startSliderValue = 0;
        this.endSliderValue = 100;
        this.trimmedSampleDuration = 0;
        this.displayTimeout = null;
    }

    initialize() {
        console.log('Initializing AudioTrimmer');
        ['ordinalIdInput', 'loadOrdinalButton', 'waveformCanvas', 'playbackCanvas', 'startSlider', 'endSlider', 'playButton', 'stopButton', 'loopButton', 'startDimmed', 'endDimmed']
            .forEach(id => {
                this[id] = document.getElementById(id);
                console.log(`Element with ID ${id} initialized: `, this[id]);
            });
        this.ctx = this.waveformCanvas.getContext('2d');
        this.playbackCtx = this.playbackCanvas.getContext('2d');
        this.addEventListeners();

        // Initialize slider values and event listeners
        this.initializeSliders();

        // Update the dimmed areas based on the initial slider values
        this.updateDimmedAreas(); // Ensure dimmed areas are correctly set on page load
        console.log('AudioTrimmer initialized');
    }

    initializeSliders() {
        console.log('Initializing sliders');
        this.startSlider.addEventListener('input', () => {
            this.startSliderValue = Math.min(this.startSlider.value, this.endSliderValue);
            this.updateSliderValues();
            console.log('Start slider updated:', this.startSliderValue);
        });

        this.endSlider.addEventListener('input', () => {
            this.endSliderValue = Math.max(this.endSlider.value, this.startSliderValue);
            this.updateSliderValues();
            console.log('End slider updated:', this.endSliderValue);
        });
    }

    updateSliderValues() {
        console.log('Updating slider values');
        this.startSliderValue = parseFloat(this.startSlider.value);
        this.endSliderValue = parseFloat(this.endSlider.value);
        this.updateDimmedAreas(); // This will update the dimmed areas based on the sliders
        this.updateTrimmedSampleDuration();
        this.debounceDisplayValues();
        console.log('Slider values updated:', this.startSliderValue, this.endSliderValue);
    }

        
            updateDimmedAreas() {
                // Assuming maxDuration represents the total duration or range for the sliders
                const maxDuration = this.audioBuffer ? this.audioBuffer.duration : 100;

                // Calculate the width and position of the start and end dimmed areas based on slider values
                const startDimmedWidth = `${this.startSliderValue / maxDuration * 100}%`;
                const endDimmedWidth = `${(1 - this.endSliderValue / maxDuration) * 100}%`;
                const endDimmedLeft = `${this.endSliderValue / maxDuration * 100}%`;
                console.log(`[updateDimmedAreas pt1] Start Dimmed Width: ${startDimmedWidth}, End Dimmed Width: ${endDimmedWidth}, End Dimmed Left: ${endDimmedLeft}`);

                // Adjust the start and end dimmed areas
                this.startDimmed.style.width = startDimmedWidth;
                this.startDimmed.style.left = '0';

                // Calculate the position of the end dimmed area from the left
                this.endDimmed.style.width = endDimmedWidth;
                this.endDimmed.style.left = endDimmedLeft;
                console.log(`[updateDimmedAreas pt2] Start Dimmed Width: ${startDimmedWidth}, End Dimmed Width: ${endDimmedWidth}, End Dimmed Left: ${endDimmedLeft}`);

            }

            updateTrimmedSampleDuration() {
                const startValue = this.startSliderValue;
                const endValue = this.endSliderValue;
                this.trimmedSampleDuration = Math.max(0, endValue - startValue);
                this.debounceDisplayValues();
            }


            debounceDisplayValues() {
                clearTimeout(this.displayTimeout);
                this.displayTimeout = setTimeout(() => this.displayValues(), 3000);
            }

            displayValues() {
                console.log("Total Sample Duration:", this.totalSampleDuration);
                console.log("Trimmed Sample Duration:", this.trimmedSampleDuration);
                console.log("Start Slider Value:", this.startSliderValue);
                console.log("End Slider Value:", this.endSliderValue);
                console.log("Is Playing:", this.isPlaying);
                console.log("Is Looping:", this.isLooping);
                // Add any other values you wish to display
            }

            addEventListeners() {
                this.loadOrdinaleButton.addEventListener('click', () => this.loadOrdinal());
                this.playButton.addEventListener('click', () => this.playAudio());
                this.stopButton.addEventListener('click', () => this.stopAudio());
                this.loopButton.addEventListener('click', () => this.toggleLoop());
                ['startSlider', 'endSlider'].forEach(slider => 
                    this[slider].addEventListener('input', () => this.updateSliderValues()));
            }

            async loadOrdinal() {
                console.log("[loadOrdinal] Method called");

                if (!this.ordinalIdInput.value) {
                    console.log("[loadOrdinal] No input value for ordinalIdInput");
                    return;
                }
                this.startSliderValue = 0;
                this.endSliderValue = 100;
                this.updateSliderValues();
                try {
                    console.log(`[loadOrdinal] Fetching audio from URL: ${url}`);

                    const url = `https://ordinals.com/content/${this.ordinalIdInput.value}`;
                    const response = await fetch(url);
                    const contentType = response.headers.get('content-type');
                    let arrayBuffer = contentType && contentType.includes('application/json') ?
                        this.base64ToArrayBuffer((await response.json()).audioData.split(',')[1]) : await response.arrayBuffer();
                    this.audioBuffer = await this.decodeAudioData(arrayBuffer);
                    [this.startSlider, this.endSlider].forEach(slider => slider.max = this.audioBuffer.duration);
                    this.updateSliderValues();
                    this.drawWaveform();
                } catch (error) {
                    console.error('[loadOrdinal] Error fetching or decoding audio:', error);
                }
                if (this.audioBuffer) {
                    this.totalSampleDuration = this.audioBuffer.duration;
                    this.updateTrimmedSampleDuration();
                    this.debounceDisplayValues();
                }
            }

            base64ToArrayBuffer(base64) {
                return Uint8Array.from(atob(base64), c => c.charCodeAt(0)).buffer;
            }

            decodeAudioData(audioData) {
                console.log("[decodeAudioData] Decoding audio data");
                return new Promise((resolve, reject) => 
                    this.audioContext.decodeAudioData(audioData, 
                        (decodedData) => {
                            console.log("[decodeAudioData] Audio data decoded successfully");
                            resolve(decodedData);
                        }, 
                        e => {
                            console.error(`[decodeAudioData] Decoding audio data failed with error: ${e}`);
                            reject(new Error(`Decoding audio data failed with error: ${e}`));
                        }
                    )
                );
            }

            drawWaveform() {
                if (!this.audioBuffer) {
                    console.log("[drawWaveform] No audio buffer available");
                    return;
                }
            
                console.log("[drawWaveform] Drawing waveform");               
                const width = this.waveformCanvas.width;
                const height = this.waveformCanvas.height;
                const channelData = this.audioBuffer.getChannelData(0);
                const step = Math.ceil(channelData.length / width);
                const amp = height / 2;
                this.ctx.clearRect(0, 0, width, height);
                this.ctx.beginPath();
        
                for (let i = 0; i < width; i++) {
                    const { min, max } = this.getMinMax(channelData, i * step, step);
                    this.ctx.moveTo(i, amp - amp * min);
                    this.ctx.lineTo(i, amp - amp * max);
                }
        
                this.ctx.stroke();
            }
        
            getMinMax(channelData, startIndex, step) {
                let min = 1.0, max = -1.0;
                for (let i = 0; i < step; i++) {
                    const datum = channelData[startIndex + i];
                    min = Math.min(min, datum);
                    max = Math.max(max, datum);
                }
                return { min, max };
            }

    playAudio() {
        console.log("[playAudio] Attempting to play audio");
        if (this.isPlaying) {
            console.log("[playAudio] Audio is already playing, stopping current playback");
            this.stopAudio();
        }

        this.sourceNode = this.audioContext.createBufferSource();
        this.sourceNode.buffer = this.audioBuffer;
        this.sourceNode.connect(this.audioContext.destination);
        const startValue = this.startSliderValue;
        const endValue = this.endSliderValue;
        this.sourceNode.loop = this.isLooping;
        if (this.isLooping) {
            this.sourceNode.loopStart = Math.max(0, startValue);
            this.sourceNode.loopEnd = Math.min(endValue, this.audioBuffer.duration);
        }
        if (this.audioBuffer && startValue < endValue) {
            this.sourceNode.start(0, startValue, endValue - startValue);
            this.startTime = this.audioContext.currentTime - startValue;
            this.isPlaying = true;
            this.animatePlayback();
        }
        this.sourceNode.onended = () => {
            this.isPlaying = false;
            if (this.isLooping) this.playAudio();
        };
    }

    stopAudio() {
        if (this.isPlaying && this.sourceNode) {
            this.sourceNode.disconnect();
            this.sourceNode = null;
            this.isPlaying = false;
        }
        this.isLooping = false;
    }

    toggleLoop() {
        this.isLooping = !this.isLooping;
        this.loopButton.classList.toggle('on', this.isLooping);
        this.loopButton.classList.toggle('off', !this.isLooping);
    }


    getCurrentPlaybackPosition() {
        if (!this.isPlaying) return 0;
        return (this.audioContext.currentTime - this.startTime) % this.audioBuffer.duration;
    }

    updatePlaybackCanvas() {
        const currentPosition = this.getCurrentPlaybackPosition();
        const width = this.playbackCanvas.width;
        const height = this.playbackCanvas.height;
        this.playbackCtx.clearRect(0, 0, width, height);
        const xPosition = (currentPosition / this.audioBuffer.duration) * width;
        this.playbackCtx.beginPath();
        this.playbackCtx.moveTo(xPosition, 0);
        this.playbackCtx.lineTo(xPosition, height);
        this.playbackCtx.strokeStyle = '#FF0000';
        this.playbackCtx.lineWidth = 2;
        this.playbackCtx.stroke();
    }

    animatePlayback() {
        if (this.isPlaying) {
            this.updatePlaybackCanvas();
            requestAnimationFrame(() => this.animatePlayback());
        }
    }
}
 
document.body.addEventListener('submit', function(event) {
    if (event.target.id === 'ordinalIdInput') { // Replace with your actual form ID
        event.preventDefault();
    }
});