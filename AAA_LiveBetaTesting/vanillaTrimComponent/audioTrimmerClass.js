  // index.js
  

        class AudioTrimmer {
            constructor() {
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
                ['ordinalIdInput', 'loadSampleButton', 'waveformCanvas', 'playbackCanvas', 'startSlider', 'endSlider', 'playButton', 'stopButton', 'loopButton', 'startDimmed', 'endDimmed']
                    .forEach(id => this[id] = document.getElementById(id));
                this.ctx = this.waveformCanvas.getContext('2d');
                this.playbackCtx = this.playbackCanvas.getContext('2d');
                this.addEventListeners();

                // Initialize slider values and event listeners
                this.initializeSliders();

                // Update the dimmed areas based on the initial slider values
                this.updateDimmedAreas(); // Ensure dimmed areas are correctly set on page load
            }

            initializeSliders() {
                const startSlider = this.startSlider;
                const endSlider = this.endSlider;

                // Initialize state
                let startSliderState = 0;   // Start slider state (0-100)
                let endSliderState = 100;    // End slider state (0-100)

                startSlider.value = startSliderState;
                endSlider.value = endSliderState;

                startSlider.addEventListener('input', () => {
                    startSliderState = parseInt(startSlider.value);
                    if (startSliderState > endSliderState) {
                        startSlider.value = endSliderState; // Limit to end slider position
                    }
                });

                endSlider.addEventListener('input', () => {
                    endSliderState = parseInt(endSlider.value);
                    if (endSliderState < startSliderState) {
                        endSlider.value = startSliderState; // Limit to start slider position
                    }
                });
            }

            updateSliderValues() {
                this.startSliderValue = parseFloat(this.startSlider.value);
                this.endSliderValue = parseFloat(this.endSlider.value);
                this.updateDimmedAreas(); // This will update the dimmed areas based on the sliders
                this.updateTrimmedSampleDuration();
                this.debounceDisplayValues();
            }

        
            updateDimmedAreas() {
                // Assuming maxDuration represents the total duration or range for the sliders
                const maxDuration = this.audioBuffer ? this.audioBuffer.duration : 100;

                // Calculate the width and position of the start and end dimmed areas based on slider values
                const startDimmedWidth = `${this.startSliderValue / maxDuration * 100}%`;
                const endDimmedWidth = `${(1 - this.endSliderValue / maxDuration) * 100}%`;
                const endDimmedLeft = `${this.endSliderValue / maxDuration * 100}%`;

                // Adjust the start and end dimmed areas
                this.startDimmed.style.width = startDimmedWidth;
                this.startDimmed.style.left = '0';

                // Calculate the position of the end dimmed area from the left
                this.endDimmed.style.width = endDimmedWidth;
                this.endDimmed.style.left = endDimmedLeft;
            }

            updateTrimmedSampleDuration() {
                const startValue = this.startSliderValue;
                const endValue = this.endSliderValue;
                this.trimmedSampleDuration = Math.max(0, endValue - startValue);
                this.debounceDisplayValues();
            }


            debounceDisplayValues() {
                if (this.displayTimeout) {
                    clearTimeout(this.displayTimeout);
                }
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
                this.loadSampleButton.addEventListener('click', () => this.loadSample());
                this.playButton.addEventListener('click', () => this.playAudio());
                this.stopButton.addEventListener('click', () => this.stopAudio());
                this.loopButton.addEventListener('click', () => this.toggleLoop());
                ['startSlider', 'endSlider'].forEach(slider => 
                    this[slider].addEventListener('input', () => this.updateSliderValues()));
            }

            async loadSample() {
                if (!this.ordinalIdInput.value) return;
                this.startSliderValue = 0;
                this.endSliderValue = 100;
                this.updateSliderValues();
                try {
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
                    console.error('Error fetching or decoding audio:', error);
                }
                if (this.audioBuffer) {
                    this.totalSampleDuration = this.audioBuffer.duration;
                    this.updateTrimmedSampleDuration();
                }
                if (this.audioBuffer) {
                    this.totalSampleDuration = this.audioBuffer.duration;
                    this.updateTrimmedSampleDuration();
                }
                this.debounceDisplayValues();
            }

            base64ToArrayBuffer(base64) {
                return Uint8Array.from(atob(base64), c => c.charCodeAt(0)).buffer;
            }

            decodeAudioData(audioData) {
                return new Promise((resolve, reject) => 
                    this.audioContext.decodeAudioData(audioData, resolve, e => reject(new Error(`Decoding audio data failed with error: ${e}`))));
            }

    drawWaveform() {
        if (!this.audioBuffer) return;
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

    getMinMax(channelData, startIndex, step) {
        let min = 1.0, max = -1.0;
        for (let i = 0; i < step; i++) {
            const datum = channelData[startIndex + i];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
        }
        return { min, max };
    }

    playAudio() {
        if (this.isPlaying) {
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