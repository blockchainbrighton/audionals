/**
 * Music-Synced Image-Reveal Application
 * Main application entry point and core utilities
 * 
 * @author Music-Synced Image-Reveal Team
 * @version 1.0.0
 */

// Utility Classes and Functions

/**
 * Seeded Pseudo-Random Number Generator
 * Provides deterministic randomization for reproducible effects
 */
class SeededRandom {
    /**
     * @param {number} seed - Initial seed value
     */
    constructor(seed = 42) {
        this.seed = seed;
        this.current = seed;
    }

    /**
     * Generate next random number between 0 and 1
     * @returns {number} Random number [0, 1)
     */
    next() {
        // Linear Congruential Generator (LCG) algorithm
        this.current = (this.current * 1664525 + 1013904223) % Math.pow(2, 32);
        return this.current / Math.pow(2, 32);
    }

    /**
     * Generate random integer between min and max (inclusive)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random integer
     */
    nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    /**
     * Generate random float between min and max
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random float
     */
    nextFloat(min, max) {
        return this.next() * (max - min) + min;
    }

    /**
     * Choose random element from array
     * @param {Array} array - Array to choose from
     * @returns {*} Random element
     */
    choice(array) {
        return array[this.nextInt(0, array.length - 1)];
    }

    /**
     * Shuffle array in place using Fisher-Yates algorithm
     * @param {Array} array - Array to shuffle
     * @returns {Array} Shuffled array
     */
    shuffle(array) {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = this.nextInt(0, i);
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }

    /**
     * Reset to initial seed
     */
    reset() {
        this.current = this.seed;
    }

    /**
     * Set new seed
     * @param {number} newSeed - New seed value
     */
    setSeed(newSeed) {
        this.seed = newSeed;
        this.current = newSeed;
    }
}

/**
 * Performance Monitor
 * Tracks FPS and frame timing for optimization
 */
class PerformanceMonitor {
    constructor() {
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fps = 60;
        this.frameTime = 16.7;
        this.fpsHistory = [];
        this.maxHistoryLength = 60; // 1 second at 60fps
        
        // DOM elements
        this.fpsElement = document.getElementById('fps-counter');
        this.frameTimeElement = document.getElementById('frame-time');
    }

    /**
     * Update performance metrics
     */
    update() {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        
        this.frameTime = deltaTime;
        this.frameCount++;
        
        // Calculate FPS over the last second
        this.fpsHistory.push(currentTime);
        while (this.fpsHistory.length > 0 && 
               currentTime - this.fpsHistory[0] > 1000) {
            this.fpsHistory.shift();
        }
        
        this.fps = this.fpsHistory.length;
        this.lastTime = currentTime;
        
        // Update UI every 10 frames to reduce DOM manipulation
        if (this.frameCount % 10 === 0) {
            this.updateUI();
        }
    }

    /**
     * Update performance UI elements
     */
    updateUI() {
        if (this.fpsElement) {
            this.fpsElement.textContent = Math.round(this.fps);
        }
        if (this.frameTimeElement) {
            this.frameTimeElement.textContent = `${this.frameTime.toFixed(1)}ms`;
        }
    }

    /**
     * Get current performance metrics
     * @returns {Object} Performance data
     */
    getMetrics() {
        return {
            fps: this.fps,
            frameTime: this.frameTime,
            frameCount: this.frameCount
        };
    }
}

/**
 * Canvas Manager
 * Handles canvas operations and rendering context
 */
class CanvasManager {
    /**
     * @param {string} canvasId - Canvas element ID
     */
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d', { 
            alpha: false,
            desynchronized: true 
        });
        
        this.width = 0;
        this.height = 0;
        this.pixelRatio = window.devicePixelRatio || 1;
        
        // Image data buffers
        this.originalImageData = null;
        this.currentImageData = null;
        this.workingImageData = null;
        
        this.setupCanvas();
        this.setupResizeHandler();
    }

    /**
     * Setup canvas with proper dimensions and pixel ratio
     */
    setupCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        
        this.width = rect.width;
        this.height = rect.height;
        
        // Set canvas size accounting for device pixel ratio
        this.canvas.width = this.width * this.pixelRatio;
        this.canvas.height = this.height * this.pixelRatio;
        
        // Scale context to match device pixel ratio
        this.ctx.scale(this.pixelRatio, this.pixelRatio);
        
        // Set CSS size
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
        
        // Enable image smoothing for better quality
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    }

    /**
     * Setup resize event handler
     */
    setupResizeHandler() {
        const resizeObserver = new ResizeObserver(() => {
            this.setupCanvas();
        });
        resizeObserver.observe(this.canvas.parentElement);
    }

    /**
     * Load and prepare image for processing
     * @param {string} imageUrl - URL of image to load
     * @returns {Promise<ImageData>} Promise resolving to image data
     */
    async loadImage(imageUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                try {
                    // Calculate dimensions to fit canvas while maintaining aspect ratio
                    const { width: fitWidth, height: fitHeight } = this.calculateFitDimensions(
                        img.width, img.height, this.width, this.height
                    );
                    
                    // Clear canvas and draw image
                    this.ctx.clearRect(0, 0, this.width, this.height);
                    
                    const x = (this.width - fitWidth) / 2;
                    const y = (this.height - fitHeight) / 2;
                    
                    this.ctx.drawImage(img, x, y, fitWidth, fitHeight);
                    
                    // Get image data
                    this.originalImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
                    // this.canvas.width IS this.width * this.pixelRatio (the backing store dimension)
                    // this.canvas.height IS this.height * this.pixelRatio (the backing store dimension)

                    // Add this log for verification:
                    console.log(`[CanvasManager.loadImage] Created originalImageData. Dimensions: ${this.originalImageData.width}x${this.originalImageData.height}. Canvas backing store: ${this.canvas.width}x${this.canvas.height}. PixelRatio: ${this.pixelRatio}`);

                    this.currentImageData = new ImageData(
                        new Uint8ClampedArray(this.originalImageData.data),
                        this.originalImageData.width,
                        this.originalImageData.height
                    );
                    
                    resolve(this.originalImageData);
                } catch (error) {
                    reject(new Error(`Failed to process image: ${error.message}`));
                }
            };
            
            img.onerror = () => {
                reject(new Error(`Failed to load image from: ${imageUrl}`));
            };
            
            img.src = imageUrl;
        });
    }

    /**
     * Calculate dimensions to fit image in canvas while maintaining aspect ratio
     * @param {number} imgWidth - Original image width
     * @param {number} imgHeight - Original image height
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     * @returns {Object} Fitted dimensions
     */
    calculateFitDimensions(imgWidth, imgHeight, canvasWidth, canvasHeight) {
        const imgAspect = imgWidth / imgHeight;
        const canvasAspect = canvasWidth / canvasHeight;
        
        let width, height;
        
        if (imgAspect > canvasAspect) {
            // Image is wider than canvas
            width = canvasWidth;
            height = canvasWidth / imgAspect;
        } else {
            // Image is taller than canvas
            height = canvasHeight;
            width = canvasHeight * imgAspect;
        }
        
        return { width, height };
    }

    /**
     * Extract image features for effect processing
     * @param {ImageData} imageData - Image data to analyze
     * @returns {Object} Image features
     */
    extractImageFeatures(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        // Color histogram (simplified to 16 bins per channel)
        const colorHistogram = {
            r: new Array(16).fill(0),
            g: new Array(16).fill(0),
            b: new Array(16).fill(0)
        };
        
        // Brightness map
        const brightnessMap = new Float32Array(width * height);
        
        // Edge map (simplified Sobel operator)
        const edgeMap = new Float32Array(width * height);
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Update color histogram
            colorHistogram.r[Math.floor(r / 16)]++;
            colorHistogram.g[Math.floor(g / 16)]++;
            colorHistogram.b[Math.floor(b / 16)]++;
            
            // Calculate brightness (luminance)
            const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
            const pixelIndex = i / 4;
            brightnessMap[pixelIndex] = brightness / 255;
            
            // Simple edge detection (gradient magnitude)
            const x = pixelIndex % width;
            const y = Math.floor(pixelIndex / width);
            
            if (x > 0 && x < width - 1 && y > 0 && y < height - 1) {
                const leftIndex = (y * width + x - 1) * 4;
                const rightIndex = (y * width + x + 1) * 4;
                const topIndex = ((y - 1) * width + x) * 4;
                const bottomIndex = ((y + 1) * width + x) * 4;
                
                const gx = (data[rightIndex] - data[leftIndex]) / 2;
                const gy = (data[bottomIndex] - data[topIndex]) / 2;
                
                edgeMap[pixelIndex] = Math.sqrt(gx * gx + gy * gy) / 255;
            }
        }
        
        return {
            colorHistogram,
            brightnessMap,
            edgeMap,
            width,
            height
        };
    }

    /**
     * Render image data to canvas
     * @param {ImageData} imageData - Image data to render
     */
    render(imageData) {
        this.ctx.putImageData(imageData, 0, 0);
    }

    /**
     * Clear canvas
     */
    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    /**
     * Get current canvas dimensions
     * @returns {Object} Canvas dimensions
     */
    getDimensions() {
        return {
            width: this.width,
            height: this.height,
            pixelRatio: this.pixelRatio
        };
    }
}

/**
 * Theme Manager
 * Handles light/dark theme switching
 */
class ThemeManager {
    constructor() {
        this.currentTheme = this.getStoredTheme() || this.getSystemTheme();
        this.applyTheme(this.currentTheme);
        this.setupEventListeners();
    }

    /**
     * Get stored theme preference
     * @returns {string|null} Stored theme
     */
    getStoredTheme() {
        return localStorage.getItem('theme');
    }

    /**
     * Get system theme preference
     * @returns {string} System theme
     */
    getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    /**
     * Apply theme to document
     * @param {string} theme - Theme to apply ('light' or 'dark')
     */
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        this.currentTheme = theme;
        
        // Update theme toggle icon
        const themeIcon = document.querySelector('.theme-icon');
        if (themeIcon) {
            themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
    }

    /**
     * Toggle between light and dark themes
     */
    toggle() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
    }

    /**
     * Setup event listeners for theme switching
     */
    setupEventListeners() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggle());
        }

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!this.getStoredTheme()) {
                this.applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    }
}

/**
 * Input Sanitizer
 * Validates and sanitizes user inputs for security
 */
class InputSanitizer {
    /**
     * Validate URL input
     * @param {string} url - URL to validate
     * @returns {boolean} Whether URL is valid
     */
    static isValidUrl(url) {
        try {
            const urlObj = new URL(url);
            return ['http:', 'https:', 'data:'].includes(urlObj.protocol);
        } catch {
            return false;
        }
    }

    /**
     * Sanitize numeric input
     * @param {string|number} value - Value to sanitize
     * @param {number} min - Minimum allowed value
     * @param {number} max - Maximum allowed value
     * @param {number} defaultValue - Default value if invalid
     * @returns {number} Sanitized number
     */
    static sanitizeNumber(value, min, max, defaultValue) {
        const num = parseFloat(value);
        if (isNaN(num)) return defaultValue;
        return Math.max(min, Math.min(max, num));
    }

    /**
     * Sanitize integer input
     * @param {string|number} value - Value to sanitize
     * @param {number} min - Minimum allowed value
     * @param {number} max - Maximum allowed value
     * @param {number} defaultValue - Default value if invalid
     * @returns {number} Sanitized integer
     */
    static sanitizeInteger(value, min, max, defaultValue) {
        const num = parseInt(value, 10);
        if (isNaN(num)) return defaultValue;
        return Math.max(min, Math.min(max, num));
    }
}

// Export utilities for use in other modules
window.MusicSyncedImageReveal = {
    SeededRandom,
    PerformanceMonitor,
    CanvasManager,
    ThemeManager,
    InputSanitizer
};

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme manager
    new ThemeManager();
    
    console.log('Music-Synced Image-Reveal utilities loaded');
});


/**
 * Audio Processing and Beat Detection System
 * Handles audio loading, analysis, and synchronization
 */

/**
 * Audio Manager
 * Manages audio loading, playback, and analysis using Web Audio API
 */
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.audioBuffer = null;
        this.sourceNode = null;
        this.analyserNode = null;
        this.gainNode = null;
        
        this.isPlaying = false;
        this.isPaused = false;
        this.startTime = 0;
        this.pauseTime = 0;
        this.currentTime = 0;
        this.duration = 0;
        
        // Audio analysis data
        this.frequencyData = null;
        this.timeData = null;
        this.sampleRate = 44100;
        
        // Beat detection
        this.beatDetector = null;
        this.bpmAnalyzer = null;
        
        this.setupAudioContext();
    }

    /**
     * Setup Web Audio API context
     */
    async setupAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create analyser node for frequency analysis
            this.analyserNode = this.audioContext.createAnalyser();
            this.analyserNode.fftSize = 2048;
            this.analyserNode.smoothingTimeConstant = 0.8;
            
            // Create gain node for volume control
            this.gainNode = this.audioContext.createGain();
            
            // Connect nodes
            this.gainNode.connect(this.analyserNode);
            this.analyserNode.connect(this.audioContext.destination);
            
            // Initialize frequency and time domain data arrays
            this.frequencyData = new Uint8Array(this.analyserNode.frequencyBinCount);
            this.timeData = new Uint8Array(this.analyserNode.frequencyBinCount);
            
            console.log('Audio context initialized');
        } catch (error) {
            console.error('Failed to initialize audio context:', error);
            throw new Error('Web Audio API not supported');
        }
    }

    /**
     * Load audio from URL
     * @param {string} audioUrl - URL of audio file
     * @returns {Promise<AudioBuffer>} Promise resolving to audio buffer
     */
    async loadAudio(audioUrl) {
        try {
            // Resume audio context if suspended (required by some browsers)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            const response = await fetch(audioUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            this.duration = this.audioBuffer.duration;
            this.sampleRate = this.audioBuffer.sampleRate;
            
            // Initialize beat detection and BPM analysis
            this.beatDetector = new BeatDetector(this.audioBuffer, this.sampleRate);
            this.bpmAnalyzer = new BPMAnalyzer(this.audioBuffer, this.sampleRate);
            
            console.log(`Audio loaded: ${this.duration.toFixed(2)}s, ${this.sampleRate}Hz`);
            return this.audioBuffer;
        } catch (error) {
            console.error('Failed to load audio:', error);
            throw new Error(`Failed to load audio: ${error.message}`);
        }
    }

    /**
     * Start audio playback
     * @param {number} offset - Start time offset in seconds
     */
    play(offset = 0) {
        if (!this.audioBuffer) {
            throw new Error('No audio loaded');
        }

        this.stop(); // Stop any existing playback

        // Create new source node
        this.sourceNode = this.audioContext.createBufferSource();
        this.sourceNode.buffer = this.audioBuffer;
        this.sourceNode.connect(this.gainNode);

        // Start playback
        this.startTime = this.audioContext.currentTime - offset;
        this.sourceNode.start(0, offset);
        
        this.isPlaying = true;
        this.isPaused = false;
        
        // Handle playback end
        this.sourceNode.onended = () => {
            if (this.isPlaying) {
                this.isPlaying = false;
                this.currentTime = this.duration;
            }
        };
    }

    /**
     * Pause audio playback
     */
    pause() {
        if (this.isPlaying && !this.isPaused) {
            this.pauseTime = this.getCurrentTime();
            this.stop();
            this.isPaused = true;
        }
    }

    /**
     * Resume audio playback
     */
    resume() {
        if (this.isPaused) {
            this.play(this.pauseTime);
            this.isPaused = false;
        }
    }

    /**
     * Stop audio playback
     */
    stop() {
        if (this.sourceNode) {
            try {
                this.sourceNode.stop();
            } catch (error) {
                // Ignore errors from stopping already stopped nodes
            }
            this.sourceNode = null;
        }
        this.isPlaying = false;
        this.isPaused = false;
        this.currentTime = 0;
    }

    /**
     * Get current playback time
     * @returns {number} Current time in seconds
     */
    getCurrentTime() {
        if (!this.isPlaying) {
            return this.currentTime;
        }
        return Math.min(this.audioContext.currentTime - this.startTime, this.duration);
    }

    /**
     * Get audio analysis data
     * @returns {Object} Analysis data
     */
    getAnalysisData() {
        if (!this.analyserNode) return null;

        this.analyserNode.getByteFrequencyData(this.frequencyData);
        this.analyserNode.getByteTimeDomainData(this.timeData);

        return {
            frequency: this.frequencyData,
            timeDomain: this.timeData,
            currentTime: this.getCurrentTime(),
            duration: this.duration,
            isPlaying: this.isPlaying
        };
    }

    /**
     * Set playback volume
     * @param {number} volume - Volume level (0-1)
     */
    setVolume(volume) {
        if (this.gainNode) {
            this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
        }
    }

    /**
     * Get detected BPM
     * @returns {number} BPM value
     */
    getBPM() {
        return this.bpmAnalyzer ? this.bpmAnalyzer.getBPM() : 120;
    }

    /**
     * Get beat times
     * @returns {Array<number>} Array of beat times in seconds
     */
    getBeatTimes() {
        return this.beatDetector ? this.beatDetector.getBeatTimes() : [];
    }
}

/**
 * Beat Detection Algorithm
 * Detects beats in audio using energy-based analysis
 */
class BeatDetector {
    /**
     * @param {AudioBuffer} audioBuffer - Audio buffer to analyze
     * @param {number} sampleRate - Sample rate of audio
     */
    constructor(audioBuffer, sampleRate) {
        this.audioBuffer = audioBuffer;
        this.sampleRate = sampleRate;
        this.beatTimes = [];
        this.energyHistory = [];
        this.windowSize = 1024;
        this.hopSize = 512;
        
        this.detectBeats();
    }

    /**
     * Detect beats in the audio buffer
     */
    detectBeats() {
        const channelData = this.audioBuffer.getChannelData(0);
        const energyThreshold = 1.3; // Energy threshold multiplier
        const minBeatInterval = 0.1; // Minimum time between beats (seconds)
        
        // Calculate energy for each window
        const energies = [];
        for (let i = 0; i < channelData.length - this.windowSize; i += this.hopSize) {
            let energy = 0;
            for (let j = 0; j < this.windowSize; j++) {
                const sample = channelData[i + j];
                energy += sample * sample;
            }
            energies.push(energy / this.windowSize);
        }

        // Smooth energy values
        const smoothedEnergies = this.smoothArray(energies, 3);
        
        // Detect peaks in energy
        const localAvgWindow = 10;
        let lastBeatTime = -minBeatInterval;
        
        for (let i = localAvgWindow; i < smoothedEnergies.length - localAvgWindow; i++) {
            const currentEnergy = smoothedEnergies[i];
            
            // Calculate local average energy
            let localAvg = 0;
            for (let j = i - localAvgWindow; j <= i + localAvgWindow; j++) {
                localAvg += smoothedEnergies[j];
            }
            localAvg /= (2 * localAvgWindow + 1);
            
            // Check if current energy is significantly higher than local average
            const currentTime = (i * this.hopSize) / this.sampleRate;
            
            if (currentEnergy > localAvg * energyThreshold && 
                currentTime - lastBeatTime >= minBeatInterval) {
                
                // Verify it's a local maximum
                if (currentEnergy > smoothedEnergies[i - 1] && 
                    currentEnergy > smoothedEnergies[i + 1]) {
                    this.beatTimes.push(currentTime);
                    lastBeatTime = currentTime;
                }
            }
        }

        console.log(`Detected ${this.beatTimes.length} beats`);
    }

    /**
     * Smooth array values using moving average
     * @param {Array<number>} array - Array to smooth
     * @param {number} windowSize - Smoothing window size
     * @returns {Array<number>} Smoothed array
     */
    smoothArray(array, windowSize) {
        const smoothed = [];
        const halfWindow = Math.floor(windowSize / 2);
        
        for (let i = 0; i < array.length; i++) {
            let sum = 0;
            let count = 0;
            
            for (let j = Math.max(0, i - halfWindow); 
                 j <= Math.min(array.length - 1, i + halfWindow); j++) {
                sum += array[j];
                count++;
            }
            
            smoothed.push(sum / count);
        }
        
        return smoothed;
    }

    /**
     * Get detected beat times
     * @returns {Array<number>} Beat times in seconds
     */
    getBeatTimes() {
        return this.beatTimes;
    }
}

/**
 * BPM Analysis
 * Analyzes tempo and calculates BPM
 */
class BPMAnalyzer {
    /**
     * @param {AudioBuffer} audioBuffer - Audio buffer to analyze
     * @param {number} sampleRate - Sample rate of audio
     */
    constructor(audioBuffer, sampleRate) {
        this.audioBuffer = audioBuffer;
        this.sampleRate = sampleRate;
        this.bpm = 120; // Default BPM
        
        this.analyzeBPM();
    }

    /**
     * Analyze BPM using autocorrelation of beat intervals
     */
    analyzeBPM() {
        const beatDetector = new BeatDetector(this.audioBuffer, this.sampleRate);
        const beatTimes = beatDetector.getBeatTimes();
        
        if (beatTimes.length < 4) {
            console.warn('Not enough beats detected for BPM analysis, using default 120 BPM');
            return;
        }

        // Calculate intervals between consecutive beats
        const intervals = [];
        for (let i = 1; i < beatTimes.length; i++) {
            intervals.push(beatTimes[i] - beatTimes[i - 1]);
        }

        // Find most common interval using histogram
        const histogramBins = 100;
        const minInterval = 0.2; // 300 BPM max
        const maxInterval = 2.0; // 30 BPM min
        const binSize = (maxInterval - minInterval) / histogramBins;
        
        const histogram = new Array(histogramBins).fill(0);
        
        intervals.forEach(interval => {
            if (interval >= minInterval && interval <= maxInterval) {
                const bin = Math.floor((interval - minInterval) / binSize);
                if (bin >= 0 && bin < histogramBins) {
                    histogram[bin]++;
                }
            }
        });

        // Find peak in histogram
        let maxCount = 0;
        let peakBin = 0;
        
        for (let i = 0; i < histogramBins; i++) {
            if (histogram[i] > maxCount) {
                maxCount = histogram[i];
                peakBin = i;
            }
        }

        // Convert peak bin back to interval and then to BPM
        const peakInterval = minInterval + (peakBin + 0.5) * binSize;
        this.bpm = Math.round(60 / peakInterval);
        
        // Validate BPM range
        this.bpm = Math.max(60, Math.min(200, this.bpm));
        
        console.log(`Detected BPM: ${this.bpm}`);
    }

    /**
     * Get detected BPM
     * @returns {number} BPM value
     */
    getBPM() {
        return this.bpm;
    }
}

/**
 * Beat Scheduler
 * Schedules effects based on musical timing
 */
class BeatScheduler {
    /**
     * @param {AudioManager} audioManager - Audio manager instance
     * @param {number} bpm - Beats per minute
     * @param {number} barsCount - Number of bars for the sequence
     */
    constructor(audioManager, bpm = 120, barsCount = 16) {
        this.audioManager = audioManager;
        this.bpm = bpm;
        this.barsCount = barsCount;
        this.beatsPerBar = 4; // 4/4 time signature
        
        this.totalBeats = this.barsCount * this.beatsPerBar;
        this.beatDuration = 60 / this.bpm; // Duration of one beat in seconds
        this.totalDuration = this.totalBeats * this.beatDuration;
        
        this.callbacks = new Map();
        this.isRunning = false;
        this.startTime = 0;
        
        this.setupScheduler();
    }

    /**
     * Setup the beat scheduler
     */
    setupScheduler() {
        this.scheduleLoop = this.scheduleLoop.bind(this);
    }

    /**
     * Start the scheduler
     */
    start() {
        this.isRunning = true;
        this.startTime = performance.now();
        this.scheduleLoop();
    }

    /**
     * Stop the scheduler
     */
    stop() {
        this.isRunning = false;
    }

    /**
     * Main scheduling loop
     */
    scheduleLoop() {
        if (!this.isRunning) return;

        const currentTime = this.audioManager.getCurrentTime();
        const progress = Math.min(currentTime / this.totalDuration, 1);
        const currentBeat = Math.floor((currentTime / this.beatDuration) % this.totalBeats);
        const currentBar = Math.floor(currentBeat / this.beatsPerBar);
        const beatInBar = currentBeat % this.beatsPerBar;

        // Trigger callbacks
        this.callbacks.forEach((callback, key) => {
            callback({
                currentTime,
                progress,
                currentBeat,
                currentBar,
                beatInBar,
                totalBeats: this.totalBeats,
                totalBars: this.barsCount,
                beatDuration: this.beatDuration,
                bpm: this.bpm
            });
        });

        // Continue loop
        requestAnimationFrame(this.scheduleLoop);
    }

    /**
     * Register callback for beat events
     * @param {string} key - Unique key for the callback
     * @param {Function} callback - Callback function
     */
    onBeat(key, callback) {
        this.callbacks.set(key, callback);
    }

    /**
     * Unregister callback
     * @param {string} key - Key of callback to remove
     */
    offBeat(key) {
        this.callbacks.delete(key);
    }

    /**
     * Update BPM and recalculate timing
     * @param {number} newBpm - New BPM value
     */
    setBPM(newBpm) {
        this.bpm = newBpm;
        this.beatDuration = 60 / this.bpm;
        this.totalDuration = this.totalBeats * this.beatDuration;
    }

    /**
     * Update bar count and recalculate timing
     * @param {number} newBarsCount - New bar count
     */
    setBarsCount(newBarsCount) {
        this.barsCount = newBarsCount;
        this.totalBeats = this.barsCount * this.beatsPerBar;
        this.totalDuration = this.totalBeats * this.beatDuration;
    }

    /**
     * Get current timing information
     * @returns {Object} Timing data
     */
    getTimingInfo() {
        const currentTime = this.audioManager.getCurrentTime();
        const progress = Math.min(currentTime / this.totalDuration, 1);
        const currentBeat = Math.floor((currentTime / this.beatDuration) % this.totalBeats);
        const currentBar = Math.floor(currentBeat / this.beatsPerBar);
        const beatInBar = currentBeat % this.beatsPerBar;

        return {
            currentTime,
            progress,
            currentBeat,
            currentBar,
            beatInBar,
            totalBeats: this.totalBeats,
            totalBars: this.barsCount,
            beatDuration: this.beatDuration,
            bpm: this.bpm,
            isRunning: this.isRunning
        };
    }
}

// Add audio classes to the global namespace
window.MusicSyncedImageReveal = {
    ...window.MusicSyncedImageReveal,
    AudioManager,
    BeatDetector,
    BPMAnalyzer,
    BeatScheduler
};


/**
 * Effect Management and Plugin Architecture
 * Handles effect discovery, scheduling, and orchestration
 */

/**
 * Effect Manager
 * Manages loading, scheduling, and execution of visual effects
 */
class EffectManager {
    constructor(canvasManager, audioManager, beatScheduler) {
        this.canvasManager = canvasManager;
        this.audioManager = audioManager;
        this.beatScheduler = beatScheduler;
        
        // Effect registry
        this.availableEffects = new Map();
        this.activeEffects = new Map();
        this.effectQueue = [];
        
        // Effect scheduling
        this.currentEffectIndex = 0;
        this.effectSequence = [];
        this.isRunning = false;
        
        // Random number generator for effect parameters
        this.random = new SeededRandom(42);
        
        // Image features for effect optimization
        this.imageFeatures = null;
        
        // Performance tracking
        this.performanceMonitor = new PerformanceMonitor();
        
        this.setupEffectManager();
    }

    /**
     * Setup effect manager
     */
    setupEffectManager() {
        // Register for beat events
        this.beatScheduler.onBeat('effectManager', (timingInfo) => {
            this.updateEffects(timingInfo);
        });
        
        // Auto-discover effects
        this.discoverEffects();
    }

    async initAsync() { // New async initialization method
        this.setupEffectManagerListeners(); // If it doesn't depend on discovered effects
        await this.discoverEffects(); // Await the discovery process
    }

    setupEffectManagerListeners() { // Was part of setupEffectManager
        this.beatScheduler.onBeat('effectManager', (timingInfo) => {
            this.updateEffects(timingInfo);
        });
    }


    /**
     * Discover and load available effects
     */
    async discoverEffects() {
        const effectNames = [
            'VShift',
            'Scanlines', 
            'GaussianBlur',
            'Pixelation',
            'AlphaFade',
            'Glitch',
            'ColorSweep',
            'BrightnessReveal',
            'GlyphReveal',
            'RippleDistortion',
            'RadialReveal',
            'InkDiffusion'
        ];

        for (const effectName of effectNames) {
            try {
                const module = await import(`./effects/${effectName}.js`);
                const EffectClass = module[effectName];
                
                if (EffectClass) {
                    this.registerEffect(effectName, EffectClass);
                    console.log(`Loaded effect: ${effectName}`);
                }
            } catch (error) {
                console.warn(`Failed to load effect ${effectName}:`, error);
            }
        }

        console.log(`Discovered ${this.availableEffects.size} effects`);
    }

    /**
     * Register an effect class
     * @param {string} name - Effect name
     * @param {class} EffectClass - Effect class constructor
     */
    registerEffect(name, EffectClass) {
        this.availableEffects.set(name, EffectClass);
    }

    /**
     * Initialize effects with image data
     * @param {ImageData} imageData - Original image data
     */
    initializeEffects(imageData) {
        // Extract image features for effect optimization
        this.imageFeatures = this.canvasManager.extractImageFeatures(imageData);
        
        // Generate effect sequence
        this.generateEffectSequence();
        
        console.log('Effects initialized with image data');
    }

    /**
     * Generate randomized effect sequence
     */
    generateEffectSequence() {
        const effectNames = Array.from(this.availableEffects.keys());
        const totalBars = this.beatScheduler.barsCount;
        const effectsPerSequence = Math.min(effectNames.length, totalBars);
        
        // Shuffle effects for random order
        const shuffledEffects = this.random.shuffle(effectNames);
        
        this.effectSequence = [];
        
        for (let i = 0; i < effectsPerSequence; i++) {
            const effectName = shuffledEffects[i % shuffledEffects.length];
            const startBar = Math.floor((i / effectsPerSequence) * totalBars);
            const duration = this.random.nextFloat(0.5, 2.0); // Random duration
            const intensity = this.random.nextInt(30, 80); // Random intensity
            
            this.effectSequence.push({
                name: effectName,
                startBar,
                duration,
                intensity,
                parameters: this.generateEffectParameters(effectName)
            });
        }
        
        // Sort by start time
        this.effectSequence.sort((a, b) => a.startBar - b.startBar);
        
        console.log(`Generated effect sequence with ${this.effectSequence.length} effects`);
    }

    /**
     * Generate random parameters for an effect
     * @param {string} effectName - Name of the effect
     * @returns {Object} Random parameters
     */
    generateEffectParameters(effectName) {
        const baseParams = {
            easing: this.random.choice(['linear', 'easeIn', 'easeOut', 'easeInOut', 'easeInCubic']),
            blendMode: this.random.choice(['normal', 'multiply', 'screen', 'overlay'])
        };

        // Effect-specific parameters
        switch (effectName) {
            case 'VShift':
                return {
                    ...baseParams,
                    maxOffset: this.random.nextInt(10, 50),
                    direction: this.random.choice(['up', 'down', 'random'])
                };
            
            case 'Scanlines':
                return {
                    ...baseParams,
                    lineSpacing: this.random.nextInt(2, 8),
                    opacity: this.random.nextFloat(0.3, 0.8)
                };
            
            case 'GaussianBlur':
                return {
                    ...baseParams,
                    radius: this.random.nextFloat(1, 10),
                    quality: this.random.choice(['low', 'medium', 'high'])
                };
            
            case 'Pixelation':
                return {
                    ...baseParams,
                    pixelSize: this.random.nextInt(4, 20),
                    smoothing: this.random.nextFloat(0, 0.5)
                };
            
            case 'Glitch':
                return {
                    ...baseParams,
                    rgbShift: this.random.nextInt(2, 10),
                    noiseIntensity: this.random.nextFloat(0.1, 0.5),
                    blockSize: this.random.nextInt(5, 25)
                };
            
            case 'ColorSweep':
                return {
                    ...baseParams,
                    hueShift: this.random.nextInt(0, 360),
                    saturationBoost: this.random.nextFloat(0.5, 2.0),
                    direction: this.random.choice(['horizontal', 'vertical', 'radial'])
                };
            
            case 'GlyphReveal':
                return {
                    ...baseParams,
                    glyphSet: this.random.choice(['ascii', 'unicode', 'symbols']),
                    density: this.random.nextFloat(0.3, 0.8)
                };
            
            case 'RippleDistortion':
                return {
                    ...baseParams,
                    amplitude: this.random.nextFloat(5, 25),
                    frequency: this.random.nextFloat(0.1, 0.5),
                    centerX: this.random.nextFloat(0.2, 0.8),
                    centerY: this.random.nextFloat(0.2, 0.8)
                };
            
            case 'RadialReveal':
                return {
                    ...baseParams,
                    centerX: this.random.nextFloat(0.3, 0.7),
                    centerY: this.random.nextFloat(0.3, 0.7),
                    featherSize: this.random.nextFloat(0.1, 0.3)
                };
            
            case 'InkDiffusion':
                return {
                    ...baseParams,
                    seedCount: this.random.nextInt(3, 12),
                    diffusionRate: this.random.nextFloat(0.5, 2.0),
                    viscosity: this.random.nextFloat(0.3, 0.8)
                };
            
            default:
                return baseParams;
        }
    }

    /**
     * Start effect sequence
     */
    start() {
        this.isRunning = true;
        this.currentEffectIndex = 0;
        this.activeEffects.clear();
        
        console.log('Effect sequence started');
    }

    /**
     * Stop effect sequence
     */
    stop() {
        this.isRunning = false;
        
        // Stop all active effects
        this.activeEffects.forEach(effect => effect.stop());
        this.activeEffects.clear();
        
        console.log('Effect sequence stopped');
    }

    /**
     * Update effects for current timing
     * @param {Object} timingInfo - Beat timing information
     */
    updateEffects(timingInfo) {
        if (!this.isRunning) return;

        // Start new effects based on timing
        this.checkForNewEffects(timingInfo);
        
        // Update active effects
        const currentImageData = new ImageData(
            new Uint8ClampedArray(this.canvasManager.originalImageData.data),
            this.canvasManager.originalImageData.width,
            this.canvasManager.originalImageData.height
        );

        let hasActiveEffects = false;
        
        this.activeEffects.forEach((effect, effectId) => {
            const result = effect.update(timingInfo.currentTime, timingInfo);
            
            if (result) {
                // Blend effect result with current image
                const blendedData = effect.blendImageData(
                    currentImageData,
                    result,
                    effect.getIntensity(),
                    effect.parameters.blendMode || 'normal'
                );
                currentImageData.data.set(blendedData.data);
                hasActiveEffects = true;
            } else {
                // Effect is no longer active, remove it
                this.activeEffects.delete(effectId);
            }
        });

        // Render final result
        this.canvasManager.render(currentImageData);
        
        // Update performance metrics
        this.performanceMonitor.update();
        
        // Update current effect display
        this.updateCurrentEffectDisplay();
        
        // Update progress
        this.updateProgress(timingInfo);
    }

    /**
     * Check for new effects to start
     * @param {Object} timingInfo - Beat timing information
     */
    checkForNewEffects(timingInfo) {
        while (this.currentEffectIndex < this.effectSequence.length) {
            const effectConfig = this.effectSequence[this.currentEffectIndex];
            const effectStartTime = effectConfig.startBar * this.beatScheduler.beatsPerBar * this.beatScheduler.beatDuration;
            
            if (timingInfo.currentTime >= effectStartTime) {
                this.startEffect(effectConfig, effectStartTime);
                this.currentEffectIndex++;
            } else {
                break;
            }
        }
    }

    /**
     * Start a specific effect
     * @param {Object} effectConfig - Effect configuration
     * @param {number} startTime - Effect start time
     */
    startEffect(effectConfig, startTime) {
        const EffectClass = this.availableEffects.get(effectConfig.name);
        if (!EffectClass) {
            console.warn(`Effect class not found: ${effectConfig.name}`);
            return;
        }

        try {
            // Create effect instance
            const effect = new EffectClass(effectConfig.name, {
                intensity: effectConfig.intensity,
                duration: effectConfig.duration,
                ...effectConfig.parameters
            });

            // Initialize effect
            effect.initialize(
                this.canvasManager.canvas,
                this.canvasManager.originalImageData,
                this.random
            );

            // Start effect
            effect.start(startTime, effectConfig.duration);
            
            // Add to active effects
            const effectId = `${effectConfig.name}_${Date.now()}`;
            this.activeEffects.set(effectId, effect);
            
            console.log(`Started effect: ${effectConfig.name} at ${startTime.toFixed(2)}s`);
        } catch (error) {
            console.error(`Failed to start effect ${effectConfig.name}:`, error);
        }
    }

    /**
     * Update current effect display
     */
    updateCurrentEffectDisplay() {
        const currentEffectElement = document.getElementById('current-effect');
        if (!currentEffectElement) return;

        const activeEffectNames = Array.from(this.activeEffects.values())
            .map(effect => effect.name)
            .join(', ');
        
        currentEffectElement.textContent = activeEffectNames || 'None';
    }

    /**
     * Update progress display
     * @param {Object} timingInfo - Beat timing information
     */
    updateProgress(timingInfo) {
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        
        if (progressBar) {
            progressBar.value = timingInfo.progress * 100;
        }
        
        if (progressText) {
            progressText.textContent = `${Math.round(timingInfo.progress * 100)}%`;
        }
    }

    /**
     * Set random seed for effect generation
     * @param {number} seed - Random seed
     */
    setSeed(seed) {
        this.random.setSeed(seed);
        this.generateEffectSequence();
    }

    /**
     * Set effect intensity globally
     * @param {number} intensity - Intensity value (0-100)
     */
    setGlobalIntensity(intensity) {
        this.activeEffects.forEach(effect => {
            effect.setIntensity(intensity);
        });
    }

    /**
     * Get effect manager status
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            availableEffects: Array.from(this.availableEffects.keys()),
            activeEffects: Array.from(this.activeEffects.keys()),
            effectSequence: this.effectSequence,
            currentEffectIndex: this.currentEffectIndex,
            performanceMetrics: this.performanceMonitor.getMetrics()
        };
    }
}

/**
 * Main Application Controller
 * Orchestrates all components of the application
 */
class MusicSyncedImageRevealApp {
    constructor() {
        // Core components
        this.canvasManager = null;
        this.audioManager = null;
        this.beatScheduler = null;
        this.effectManager = null;
        this.themeManager = null;
        
        // Application state
        this.isInitialized = false;
        this.isRunning = false;
        this.currentImageUrl = '';
        this.currentAudioUrl = '';
        
        // UI elements
        this.elements = {};
        
        this.initialize();
    }

    /**
     * Initialize the application
     */
    async initialize() {
        try {
            // Initialize core components
            this.canvasManager = new CanvasManager('main-canvas');
            this.audioManager = new AudioManager();
            this.themeManager = new ThemeManager();
            
            // Get UI elements
            this.getUIElements();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Setup keyboard shortcuts
            this.setupKeyboardShortcuts();
            
            this.isInitialized = true;
            console.log('Application initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showError('Failed to initialize application. Please refresh the page.');
        }
    }

    /**
     * Get references to UI elements
     */
    getUIElements() {
        this.elements = {
            imageUrl: document.getElementById('image-url'),
            songUrl: document.getElementById('song-url'),
            tempoBpm: document.getElementById('tempo-bpm'),
            numBars: document.getElementById('num-bars'),
            randomSeed: document.getElementById('random-seed'),
            revealSpeed: document.getElementById('reveal-speed'),
            effectIntensity: document.getElementById('effect-intensity'),
            startBtn: document.getElementById('start-btn'),
            pauseBtn: document.getElementById('pause-btn'),
            resetBtn: document.getElementById('reset-btn'),
            loadingIndicator: document.getElementById('loading-indicator'),
            canvasOverlay: document.getElementById('canvas-overlay')
        };
    }

    /**
     * Setup event listeners for UI controls
     */
    setupEventListeners() {
        // Button controls
        this.elements.startBtn.addEventListener('click', () => this.start());
        this.elements.pauseBtn.addEventListener('click', () => this.togglePause());
        this.elements.resetBtn.addEventListener('click', () => this.reset());
        
        // Slider controls
        this.elements.revealSpeed.addEventListener('input', (e) => {
            document.getElementById('reveal-speed-value').textContent = parseFloat(e.target.value).toFixed(1);
        });
        
        this.elements.effectIntensity.addEventListener('input', (e) => {
            document.getElementById('effect-intensity-value').textContent = e.target.value;
            if (this.effectManager) {
                this.effectManager.setGlobalIntensity(parseInt(e.target.value));
            }
        });
        
        // Input validation
        this.elements.imageUrl.addEventListener('blur', () => this.validateImageUrl());
        this.elements.songUrl.addEventListener('blur', () => this.validateAudioUrl());
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ignore if typing in input fields
            if (e.target.tagName === 'INPUT') return;
            
            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    if (this.isRunning) {
                        this.togglePause();
                    } else {
                        this.start();
                    }
                    break;
                case 'KeyR':
                    e.preventDefault();
                    this.reset();
                    break;
                case 'KeyT':
                    e.preventDefault();
                    this.themeManager.toggle();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.adjustRevealSpeed(-0.1);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.adjustRevealSpeed(0.1);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.adjustEffectIntensity(5);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.adjustEffectIntensity(-5);
                    break;
            }
        });
    }

    /**
     * Start the application
     */
    async start() {
        if (!this.isInitialized) {
            this.showError('Application not initialized');
            return;
        }

        try {
            this.showLoading(true);
            
            // Validate inputs
            if (!this.validateInputs()) {
                this.showLoading(false);
                return;
            }
            
            // Load image and audio
            await this.loadAssets();

            // Initialize effect system
            await this.initializeEffectSystem(); // Now needs to be awaited

       
            // Start playback
            this.startPlayback();
            
            this.isRunning = true;
            this.updateUIState();
            this.showLoading(false);
            
        } catch (error) {
            console.error('Failed to start application:', error);
            this.showError(`Failed to start: ${error.message}`);
            this.showLoading(false);
        }
    }

    /**
     * Toggle pause/resume
     */
    togglePause() {
        if (!this.isRunning) return;
        
        if (this.audioManager.isPaused) {
            this.audioManager.resume();
            this.beatScheduler.start();
            this.effectManager.start();
            this.elements.pauseBtn.textContent = 'Pause';
        } else {
            this.audioManager.pause();
            this.beatScheduler.stop();
            this.effectManager.stop();
            this.elements.pauseBtn.textContent = 'Resume';
        }
    }

    /**
     * Reset the application
     */
    reset() {
        if (this.audioManager) {
            this.audioManager.stop();
        }
        if (this.beatScheduler) {
            this.beatScheduler.stop();
        }
        if (this.effectManager) {
            this.effectManager.stop();
        }
        
        this.canvasManager.clear();
        this.isRunning = false;
        this.updateUIState();
    }

    /**
     * Load image and audio assets
     */
    async loadAssets() {
        const imageUrl = this.elements.imageUrl.value.trim();
        const audioUrl = this.elements.songUrl.value.trim();
        
        // Load image
        await this.canvasManager.loadImage(imageUrl);
        this.currentImageUrl = imageUrl;
        
        // Load audio
        await this.audioManager.loadAudio(audioUrl);
        this.currentAudioUrl = audioUrl;
        
        // Update BPM if auto-detected
        const detectedBPM = this.audioManager.getBPM();
        this.elements.tempoBpm.value = detectedBPM;
    }

    /**
     * Initialize effect system
     */
    async initializeEffectSystem() {
        const bpm = parseInt(this.elements.tempoBpm.value);
        const barsCount = parseInt(this.elements.numBars.value);
        const seed = parseInt(this.elements.randomSeed.value);
        
        // Create beat scheduler
        this.beatScheduler = new BeatScheduler(this.audioManager, bpm, barsCount);
        
        // Create effect manager
        this.effectManager = new EffectManager(
            this.canvasManager,
            this.audioManager,
            this.beatScheduler
        );

        await this.effectManager.initAsync(); // Await the new async init

        
        // Initialize with image data
        this.effectManager.initializeEffects(this.canvasManager.originalImageData);
        
        // Set random seed
        this.effectManager.setSeed(seed);
    }

    /**
     * Start playback
     */
    startPlayback() {
        this.audioManager.play();
        this.beatScheduler.start();
        this.effectManager.start();
    }

    /**
     * Validate all inputs
     * @returns {boolean} Whether inputs are valid
     */
    validateInputs() {
        return this.validateImageUrl() && this.validateAudioUrl();
    }

    /**
     * Validate image URL
     * @returns {boolean} Whether URL is valid
     */
    validateImageUrl() {
        const url = this.elements.imageUrl.value.trim();
        const isValid = url && InputSanitizer.isValidUrl(url);
        
        this.elements.imageUrl.classList.toggle('invalid', !isValid);
        return isValid;
    }

    /**
     * Validate audio URL
     * @returns {boolean} Whether URL is valid
     */
    validateAudioUrl() {
        const url = this.elements.songUrl.value.trim();
        const isValid = url && InputSanitizer.isValidUrl(url);
        
        this.elements.songUrl.classList.toggle('invalid', !isValid);
        return isValid;
    }

    /**
     * Adjust reveal speed
     * @param {number} delta - Speed adjustment
     */
    adjustRevealSpeed(delta) {
        const current = parseFloat(this.elements.revealSpeed.value);
        const newValue = Math.max(0.1, Math.min(2, current + delta));
        this.elements.revealSpeed.value = newValue;
        document.getElementById('reveal-speed-value').textContent = newValue.toFixed(1);
    }

    /**
     * Adjust effect intensity
     * @param {number} delta - Intensity adjustment
     */
    adjustEffectIntensity(delta) {
        const current = parseInt(this.elements.effectIntensity.value);
        const newValue = Math.max(0, Math.min(100, current + delta));
        this.elements.effectIntensity.value = newValue;
        document.getElementById('effect-intensity-value').textContent = newValue;
        
        if (this.effectManager) {
            this.effectManager.setGlobalIntensity(newValue);
        }
    }

    /**
     * Update UI state based on application state
     */
    updateUIState() {
        this.elements.startBtn.disabled = this.isRunning;
        this.elements.pauseBtn.disabled = !this.isRunning;
        this.elements.resetBtn.disabled = false;
        
        if (!this.isRunning) {
            this.elements.pauseBtn.textContent = 'Pause';
        }
    }

    /**
     * Show/hide loading indicator
     * @param {boolean} show - Whether to show loading
     */
    showLoading(show) {
        this.elements.canvasOverlay.classList.toggle('visible', show);
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        console.error(message);
        alert(message); // Simple error display - could be enhanced with custom modal
    }
}

// Add new classes to global namespace
window.MusicSyncedImageReveal = {
    ...window.MusicSyncedImageReveal,
    EffectManager,
    MusicSyncedImageRevealApp
};

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MusicSyncedImageRevealApp();
});

