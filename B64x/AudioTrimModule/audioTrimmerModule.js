class AudioTrimmer {
    constructor(channelIndex) {
      console.log("[AudioTrimmer] constructor", { channelIndex });
      this.channelIndex = channelIndex;
  
      // Use global settings if available, with defaults
      const globalSettings = window.unifiedSequencerSettings.getTrimSettings(channelIndex) || {};
      this.startSliderValue = globalSettings.startSliderValue ?? 0;
      this.endSliderValue = globalSettings.endSliderValue ?? 100;
      this.isLooping = globalSettings.isLooping ?? false;
      console.log("[AudioTrimmer] Initial slider values:", this.startSliderValue, this.endSliderValue);
  
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.audioBuffer = null;
      this.isPlaying = false;
      this.displayTimeout = null;
      this.animationFrameRequest = null;
      this.startTime = 0;
  
      this.initializeSliderTrack();
    }
  
    initializeSliderTrack() {
      this.sliderTrack = document.querySelector('.slider-track');
      if (!this.sliderTrack) {
        console.error('Slider track not found');
      }
    }
  
    async initialize() {
      console.log("[AudioTrimmer] initialize");
      const elementIds = [
        'waveformCanvas', 'playbackCanvas',
        'trimmerPlayButton', 'trimmerStopButton', 'loopButton', 
        'startDimmed', 'endDimmed', 'startSlider', 'endSlider'
      ];
  
      // Cache all needed DOM elements into the instance.
      const allAvailable = elementIds.every(id => {
        this[id] = document.getElementById(id);
        return this[id];
      });
  
      if (!allAvailable) {
        console.log("[AudioTrimmer] Waiting for elements...");
        setTimeout(() => this.initialize(), 500);
        return;
      }
  
      this.ctx = this.waveformCanvas.getContext('2d');
      this.playbackCtx = this.playbackCanvas.getContext('2d');
      this.playbackCtx.fillStyle = 'red';
  
      // Update slider values from trim settings (if available)
      const trimSettings = getTrimSettings(this.channelIndex) || {};
      this.startSlider.value = trimSettings.startSliderValue ?? this.startSliderValue;
      this.endSlider.value = trimSettings.endSliderValue ?? this.endSliderValue;
      this.isLooping = trimSettings.isLooping ?? this.isLooping;
  
      this.addEventListeners();
      this.updateSliderValues();
    }
  
    updateSliderValues() {
      const startLeft = this.getSliderLeft(this.startSliderValue);
      const endLeft = this.getSliderLeft(this.endSliderValue);
      this.startSlider.style.left = `${startLeft}px`;
      this.endSlider.style.left = `${endLeft}px`;
      this.updateDimmedAreas();
      this.updateTrimmedSampleDuration();
      this.debounceDisplayValues();
    }
  
    updateDimmedAreas() {
      if (!this.startDimmed || !this.endDimmed) return;
      this.startDimmed.style.width = `${this.startSliderValue}%`;
      this.endDimmed.style.width = `${100 - this.endSliderValue}%`;
      this.endDimmed.style.left = `${this.endSliderValue}%`;
    }
  
    updateTrimmedSampleDuration() {
      this.trimmedSampleDuration = Math.max(0, this.endSliderValue - this.startSliderValue);
    }
  
    debounceDisplayValues() {
      clearTimeout(this.displayTimeout);
      this.displayTimeout = setTimeout(() => this.displayValues(), 300);
    }
  
    displayValues() {
      console.log("Start Slider Value:", this.startSliderValue);
      console.log("End Slider Value:", this.endSliderValue);
      console.log("Trimmed Sample Duration:", this.trimmedSampleDuration);
    }
  
    sliderValueToTimecode(sliderValue, totalDuration) {
      return (sliderValue / 100) * totalDuration;
    }
  
    // In AudioTrimmerModule.js
    getSliderLeft(sliderValue) {
        const trackWidth = this.sliderTrack.offsetWidth;
        const sliderWidth = this.startSlider.offsetWidth; // assuming both sliders share the same width
        // The returned value positions the slider so that its center is at (sliderValue)% of the track.
        return (sliderValue / 100) * trackWidth - sliderWidth / 2;
    }
  
    setAudioBuffer(audioBuffer) {
      if (!audioBuffer) {
        console.error("Invalid audioBuffer");
        return;
      }
      this.audioBuffer = audioBuffer;
      this.updateSliderValues();
      this.drawWaveform();
    }
  
    drawWaveform() {
      if (!this.audioBuffer || !this.waveformCanvas) return;
      const { width, height } = this.waveformCanvas;
      const channelData = this.audioBuffer.getChannelData(0);
      const step = Math.ceil(channelData.length / width);
      const amp = height / 2;
      const ctx = this.ctx;
      ctx.clearRect(0, 0, width, height);
      ctx.beginPath();
      for (let i = 0; i < width; i++) {
        const { min, max } = this.getMinMax(channelData, i * step, step);
        ctx.moveTo(i, amp - amp * min);
        ctx.lineTo(i, amp - amp * max);
      }
      ctx.stroke();
    }
  
    addEventListeners() {
      // Button event listeners
      this.trimmerPlayButton.addEventListener('click', () => this.playTrimmedAudio());
      this.trimmerStopButton.addEventListener('click', () => this.stopAudio());
      this.loopButton.addEventListener('click', () => this.toggleLoop());
  
      // Slider dragging
        const sliderMouseDown = (event, isStartSlider) => {
            const slider = isStartSlider ? this.startSlider : this.endSlider;
            if (!slider || !this.sliderTrack) return;
            const trackRect = this.sliderTrack.getBoundingClientRect();
            const sliderWidth = slider.offsetWidth;
            // Calculate the offset between the mouse pointer and the slider’s left edge.
            const shiftX = event.clientX - slider.getBoundingClientRect().left;
        
            const onMouseMove = (e) => {
            const trackWidth = this.sliderTrack.offsetWidth;
            // Calculate new left position (in pixels) for the slider.
            let newLeft = e.clientX - shiftX - trackRect.left;
            // Boundaries: allow the slider’s center to go from 0 to trackWidth.
            newLeft = Math.max(-sliderWidth / 2, Math.min(newLeft, trackWidth - sliderWidth / 2));
        
            // For the start slider, do not allow it to cross the end slider.
            if (isStartSlider) {
                const endLeft = parseFloat(this.endSlider.style.left) || this.getSliderLeft(this.endSliderValue);
                newLeft = Math.min(newLeft, endLeft);            } else {
                // For the end slider, do not allow it to cross the start slider.
                const startLeft = parseFloat(this.startSlider.style.left) || this.getSliderLeft(this.startSliderValue);
                newLeft = Math.max(newLeft, startLeft);            }
        
            slider.style.left = `${newLeft}px`;
            // Convert the pixel value back to a percentage based on the slider’s center.
            const newValue = ((newLeft + sliderWidth / 2) / trackWidth) * 100;
            if (isStartSlider) {
                this.startSliderValue = newValue;
            } else {
                this.endSliderValue = newValue;
            }
            // Immediately update the global trim settings.
            unifiedSequencerSettings.settings.masterSettings.trimSettings[this.channelIndex] = {
                startSliderValue: this.startSliderValue,
                endSliderValue: this.endSliderValue,
                isLooping: this.isLooping
            };
            updateTrimSettingsUI(unifiedSequencerSettings.settings.masterSettings.trimSettings);
            this.updateSliderValues();
            };
        
            const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            };
        
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };
  
      this.startSlider.addEventListener('mousedown', (e) => sliderMouseDown(e, true));
      this.endSlider.addEventListener('mousedown', (e) => sliderMouseDown(e, false));
    }
  
    playTrimmedAudio() {
      if (!this.audioBuffer || this.isPlaying) return;
      const startOffset = this.sliderValueToTimecode(this.startSliderValue, this.audioBuffer.duration);
      const endOffset = this.sliderValueToTimecode(this.endSliderValue, this.audioBuffer.duration);
      this.isPlaying = true;
      console.log("[AudioTrimmer] Starting playback");
  
      if (this.sourceNode) this.sourceNode.disconnect();
      this.sourceNode = this.audioContext.createBufferSource();
      this.sourceNode.buffer = this.audioBuffer;
      this.sourceNode.connect(this.audioContext.destination);
      this.sourceNode.loop = this.isLooping;
      if (this.isLooping) {
        this.sourceNode.loopStart = startOffset;
        this.sourceNode.loopEnd = endOffset;
      }
      this.startTime = this.audioContext.currentTime;
      this.sourceNode.start(0, startOffset, endOffset - startOffset);
      this.animatePlayback();
      this.sourceNode.onended = () => {
        this.isPlaying = false;
        console.log("[AudioTrimmer] Playback ended");
        if (this.isLooping) {
          this.playTrimmedAudio(); // Restart loop
        } else {
          cancelAnimationFrame(this.animationFrameRequest);
        }
      };
    }
  
    stopAudio() {
      console.log("[AudioTrimmer] stopAudio");
      this.setIsLooping(false);
      if (this.isPlaying && this.sourceNode) {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
        this.sourceNode = null;
        this.isPlaying = false;
      }
      cancelAnimationFrame(this.animationFrameRequest);
    }
  
    toggleLoop() {
      this.setIsLooping(!this.isLooping);
      if (this.isPlaying) this.playTrimmedAudio();
    }
  
    getIsLooping() {
      return this.isLooping;
    }
  
    setIsLooping(isLooping) {
      this.isLooping = isLooping;
      this.updateLoopButtonState();
    }
  
    updateLoopButtonState() {
      if (!this.loopButton) return;
      if (this.isLooping) {
        this.loopButton.classList.add('on');
        this.loopButton.classList.remove('off');
      } else {
        this.loopButton.classList.remove('on');
        this.loopButton.classList.add('off');
      }
    }
  
    getMinMax(channelData, startIndex, step) {
      let min = channelData[startIndex],
        max = min;
      for (let i = 1; i < step; i++) {
        const datum = channelData[startIndex + i];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      return { min, max };
    }
  
    getStartSliderValue() {
      return this.startSliderValue;
    }
  
    getEndSliderValue() {
      return this.endSliderValue;
    }
  
    getCurrentPlaybackPosition() {
      if (!this.isPlaying || !this.audioBuffer) return 0;
      const startOffset = this.sliderValueToTimecode(this.startSliderValue, this.audioBuffer.duration);
      return ((this.audioContext.currentTime - this.startTime) % this.audioBuffer.duration) + startOffset;
    }
  
    updatePlaybackCanvas() {
      if (!this.audioBuffer) return;
    
      // Use the shared calculation from calculateTrimValues.
      const { trimStart, duration } = window.AudioUtilsPart2.calculateTrimValues(this.channelIndex, this.audioBuffer, false);
      const trimmedDuration = duration; // Duration (in seconds) of the trimmed audio section
    
      // Retrieve the playback speed for this channel (default to 1 if not set)
      const playbackSpeed = window.unifiedSequencerSettings.channelPlaybackSpeed[this.channelIndex] || 1;
    
      // Calculate the effective duration that matches playback (adjusted for speed)
      const effectiveDuration = trimmedDuration / playbackSpeed;
    
      // Compute the elapsed time since playback started.
      const elapsed = this.audioContext.currentTime - this.startTime;
      const relativePosition = elapsed % effectiveDuration;
    
      // Get dynamic dimensions of the slider track.
      const trackRect = this.sliderTrack.getBoundingClientRect();
      const trackWidth = trackRect.width;
    
      // Compute clear boundaries based solely on the slider percentage.
      // (Assuming that slider positions are centered, the slider's center falls at (value/100)*trackWidth.)
      const clearAreaLeftBoundary = (this.startSliderValue / 100) * trackWidth;
      const clearAreaRightBoundary = (this.endSliderValue / 100) * trackWidth;
      const clearWidth = clearAreaRightBoundary - clearAreaLeftBoundary;
    
      // Compute the x-position for the transport indicator.
      const xPosition = clearAreaLeftBoundary + (relativePosition / effectiveDuration) * clearWidth;
    
      // DEBUG: Log computed boundaries and positions.
      console.log('--- Transport Debug ---');
      console.log('Track width:', trackWidth);
      console.log('Start slider value (%):', this.startSliderValue);
      console.log('End slider value (%):', this.endSliderValue);
      console.log('Clear left boundary (px):', clearAreaLeftBoundary);
      console.log('Clear right boundary (px):', clearAreaRightBoundary);
      console.log('Clear area width (px):', clearWidth);
      console.log('Elapsed time:', elapsed);
      console.log('Original trimmed duration (s):', trimmedDuration);
      console.log('Playback speed:', playbackSpeed);
      console.log('Effective trimmed duration (s):', effectiveDuration);
      console.log('Relative position (s):', relativePosition);
      console.log('Computed xPosition (px):', xPosition);
      console.log('-----------------------');
    
      // Get the current canvas width from its bounding rect.
      const canvasRect = this.playbackCanvas.getBoundingClientRect();
      const canvasWidth = canvasRect.width;
      
      // Clear and draw the transport indicator.
      this.playbackCtx.clearRect(0, 0, canvasWidth, this.playbackCanvas.height);
      this.playbackCtx.beginPath();
      this.playbackCtx.moveTo(xPosition, 0);
      this.playbackCtx.lineTo(xPosition, this.playbackCanvas.height);
      this.playbackCtx.strokeStyle = '#FF0000';
      this.playbackCtx.lineWidth = 2;
      this.playbackCtx.stroke();
    }

    animatePlayback() {
      if (this.isPlaying) {
    // Comment out the transport update:
    // this.updatePlaybackCanvas();
        this.animationFrameRequest = requestAnimationFrame(() => this.animatePlayback());
      }
    }
  }
  
  // -------------------------------
  // (Optional) Helper class version if needed
  class AudioTrimmerHelper {
    static currentTrimmerInstance = null;
    static currentTrimmerChannelIndex = null;
  
    static updateAudioTrimmerWithBuffer(audioBuffer) {
      if (this.currentTrimmerInstance) {
        this.currentTrimmerInstance.setAudioBuffer(audioBuffer);
      }
    }
  
    static updateAudioTrimmerWithBufferHelper(url, channelIndex) {
      const audioBuffer = audioBuffers.get(url);
      if (audioBuffer) {
        this.updateAudioTrimmerWithBuffer(audioBuffer);
      } else {
        console.error(`Audio buffer not found for URL: ${url}`);
      }
    }
  
    static playTrimmedAudioForChannel(channelIndex) {
      if (this.currentTrimmerInstance && this.currentTrimmerChannelIndex === channelIndex) {
        this.currentTrimmerInstance.playTrimmedAudio();
      } else {
        console.error('No active trimmer instance or channel index mismatch');
      }
    }
  
    static stopAudioForChannel(channelIndex) {
      if (this.currentTrimmerInstance && this.currentTrimmerInstance.channelIndex === channelIndex) {
        this.currentTrimmerInstance.stopAudio();
      } else {
        console.error('No active trimmer instance or channel index mismatch');
      }
    }
  }