/**
 * Audio Enhancements for Interactive Story Experience
 * Provides advanced audio processing and effects
 */

class AudioEnhancer {
    constructor(options = {}) {
        this.options = Object.assign({
            audioContext: null,
            container: null,
            visualizerContainer: null
        }, options);
        
        this.audioContext = this.options.audioContext || new (window.AudioContext || window.webkitAudioContext)();
        this.container = this.options.container || document.body;
        this.visualizerContainer = this.options.visualizerContainer || document.getElementById('visual-container');
        
        this.analyser = null;
        this.gainNode = null;
        this.filters = {};
        this.visualizers = {};
        
        this.initialize();
    }
    
    /**
     * Initialize audio enhancer
     */
    initialize() {
        // Create audio nodes
        this.createAudioNodes();
        
        // Create visualizers
        this.createVisualizers();
        
        console.log('Audio enhancer initialized');
    }
    
    /**
     * Create audio processing nodes
     */
    createAudioNodes() {
        // Create main analyser
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyserData = new Float32Array(this.analyser.fftSize);
        this.analyser.connect(this.audioContext.destination);
        
        // Create main gain node
        this.gainNode = this.audioContext.createGain();
        this.gainNode.connect(this.analyser);
        
        // Create filters
        this.filters.lowpass = this.audioContext.createBiquadFilter();
        this.filters.lowpass.type = 'lowpass';
        this.filters.lowpass.frequency.value = 1000;
        this.filters.lowpass.Q.value = 1;
        
        this.filters.highpass = this.audioContext.createBiquadFilter();
        this.filters.highpass.type = 'highpass';
        this.filters.highpass.frequency.value = 200;
        this.filters.highpass.Q.value = 1;
        
        this.filters.reverb = this.createReverbNode();
        
        // Connect filters
        this.gainNode.connect(this.filters.lowpass);
        this.filters.lowpass.connect(this.filters.highpass);
        this.filters.highpass.connect(this.audioContext.destination);
    }
    
    /**
     * Create reverb node
     */
    createReverbNode() {
        const convolver = this.audioContext.createConvolver();
        
        // Create impulse response
        const rate = this.audioContext.sampleRate;
        const length = rate * 3; // 3 seconds
        const impulse = this.audioContext.createBuffer(2, length, rate);
        const impulseL = impulse.getChannelData(0);
        const impulseR = impulse.getChannelData(1);
        
        // Fill impulse with noise and apply decay
        for (let i = 0; i < length; i++) {
            const n = Math.random() * 2 - 1;
            // Exponential decay
            const decay = Math.exp(-i / (rate * 1.5));
            impulseL[i] = n * decay;
            impulseR[i] = n * decay;
        }
        
        convolver.buffer = impulse;
        return convolver;
    }
    
    /**
     * Create audio visualizers
     */
    createVisualizers() {
        // Create waveform visualizer
        this.visualizers.waveform = this.createWaveformVisualizer();
        
        // Create frequency visualizer
        this.visualizers.frequency = this.createFrequencyVisualizer();
        
        // Create circular visualizer
        this.visualizers.circular = this.createCircularVisualizer();
    }
    
    /**
     * Create waveform visualizer
     */
    createWaveformVisualizer() {
        const container = document.createElement('div');
        container.className = 'visualizer-container waveform-visualizer';
        container.style.display = 'none';
        this.visualizerContainer.appendChild(container);
        
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 200;
        container.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        
        return {
            container,
            canvas,
            ctx,
            active: false,
            
            start: () => {
                container.style.display = 'block';
                this.visualizers.waveform.active = true;
                this.visualizers.waveform.draw();
            },
            
            stop: () => {
                container.style.display = 'none';
                this.visualizers.waveform.active = false;
            },
            
            draw: () => {
                if (!this.visualizers.waveform.active) return;
                
                const { width, height } = canvas;
                ctx.clearRect(0, 0, width, height);
                
                // Get waveform data
                this.analyser.getFloatTimeDomainData(this.analyserData);
                
                // Draw waveform
                ctx.beginPath();
                ctx.strokeStyle = '#00e5ff';
                ctx.lineWidth = 2;
                
                const sliceWidth = width / this.analyserData.length;
                let x = 0;
                
                for (let i = 0; i < this.analyserData.length; i++) {
                    const v = this.analyserData[i];
                    const y = (v * height / 2) + (height / 2);
                    
                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                    
                    x += sliceWidth;
                }
                
                ctx.stroke();
                
                requestAnimationFrame(this.visualizers.waveform.draw);
            }
        };
    }
    
    /**
     * Create frequency visualizer
     */
    createFrequencyVisualizer() {
        const container = document.createElement('div');
        container.className = 'visualizer-container frequency-visualizer';
        container.style.display = 'none';
        this.visualizerContainer.appendChild(container);
        
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 200;
        container.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        
        // Create frequency data array
        const frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
        
        return {
            container,
            canvas,
            ctx,
            frequencyData,
            active: false,
            
            start: () => {
                container.style.display = 'block';
                this.visualizers.frequency.active = true;
                this.visualizers.frequency.draw();
            },
            
            stop: () => {
                container.style.display = 'none';
                this.visualizers.frequency.active = false;
            },
            
            draw: () => {
                if (!this.visualizers.frequency.active) return;
                
                const { width, height } = canvas;
                ctx.clearRect(0, 0, width, height);
                
                // Get frequency data
                this.analyser.getByteFrequencyData(frequencyData);
                
                // Draw frequency bars
                const barWidth = (width / frequencyData.length) * 2.5;
                let x = 0;
                
                for (let i = 0; i < frequencyData.length; i++) {
                    const barHeight = (frequencyData[i] / 255) * height;
                    
                    // Use gradient based on frequency
                    const hue = i / frequencyData.length * 360;
                    ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
                    
                    ctx.fillRect(x, height - barHeight, barWidth, barHeight);
                    
                    x += barWidth + 1;
                    
                    // Only draw a portion of the bars for performance
                    if (x > width) break;
                }
                
                requestAnimationFrame(this.visualizers.frequency.draw);
            }
        };
    }
    
    /**
     * Create circular visualizer
     */
    createCircularVisualizer() {
        const container = document.createElement('div');
        container.className = 'visualizer-container circular-visualizer';
        container.style.display = 'none';
        this.visualizerContainer.appendChild(container);
        
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        container.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        
        // Create frequency data array
        const frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
        
        return {
            container,
            canvas,
            ctx,
            frequencyData,
            active: false,
            
            start: () => {
                container.style.display = 'block';
                this.visualizers.circular.active = true;
                this.visualizers.circular.draw();
            },
            
            stop: () => {
                container.style.display = 'none';
                this.visualizers.circular.active = false;
            },
            
            draw: () => {
                if (!this.visualizers.circular.active) return;
                
                const { width, height } = canvas;
                ctx.clearRect(0, 0, width, height);
                
                // Get frequency data
                this.analyser.getByteFrequencyData(frequencyData);
                
                // Draw circular visualizer
                const centerX = width / 2;
                const centerY = height / 2;
                const radius = Math.min(width, height) / 3;
                
                // Draw base circle
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = 1;
                ctx.stroke();
                
                // Draw frequency bars in circular pattern
                const barCount = 180;
                const step = Math.PI * 2 / barCount;
                
                for (let i = 0; i < barCount; i++) {
                    const freqIndex = Math.floor(i / barCount * frequencyData.length);
                    const value = frequencyData[freqIndex] / 255;
                    
                    const barHeight = radius * value * 1.5;
                    const angle = i * step;
                    
                    const x1 = centerX + Math.cos(angle) * radius;
                    const y1 = centerY + Math.sin(angle) * radius;
                    const x2 = centerX + Math.cos(angle) * (radius + barHeight);
                    const y2 = centerY + Math.sin(angle) * (radius + barHeight);
                    
                    // Use gradient based on frequency
                    const hue = (i / barCount * 360 + Date.now() / 50) % 360;
                    ctx.strokeStyle = `hsla(${hue}, 100%, 50%, 0.8)`;
                    ctx.lineWidth = 2;
                    
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }
                
                requestAnimationFrame(this.visualizers.circular.draw);
            }
        };
    }
    
    /**
     * Process audio source
     * @param {AudioNode} source - Audio source node
     * @param {Object} options - Processing options
     */
    processAudio(source, options = {}) {
        const opts = Object.assign({
            gain: 1.0,
            lowpass: false,
            highpass: false,
            reverb: false
        }, options);
        
        // Connect source to gain node
        source.connect(this.gainNode);
        
        // Set gain
        this.gainNode.gain.value = opts.gain;
        
        // Apply filters
        if (opts.lowpass) {
            this.filters.lowpass.frequency.value = opts.lowpass.frequency || 1000;
            this.filters.lowpass.Q.value = opts.lowpass.Q || 1;
            source.connect(this.filters.lowpass);
        }
        
        if (opts.highpass) {
            this.filters.highpass.frequency.value = opts.highpass.frequency || 200;
            this.filters.highpass.Q.value = opts.highpass.Q || 1;
            source.connect(this.filters.highpass);
        }
        
        if (opts.reverb) {
            source.connect(this.filters.reverb);
            this.filters.reverb.connect(this.audioContext.destination);
        }
        
        // Connect source to analyser
        source.connect(this.analyser);
    }
    
    /**
     * Show visualizer by type
     * @param {string} type - Visualizer type: 'waveform', 'frequency', or 'circular'
     */
    showVisualizer(type) {
        // Hide all visualizers
        Object.values(this.visualizers).forEach(v => v.stop());
        
        // Show requested visualizer
        if (this.visualizers[type]) {
            this.visualizers[type].start();
        }
    }
    
    /**
     * Hide all visualizers
     */
    hideVisualizers() {
        Object.values(this.visualizers).forEach(v => v.stop());
    }
    
    /**
     * Create audio effect
     * @param {string} type - Effect type: 'echo', 'distortion', 'filter'
     * @param {Object} options - Effect options
     */
    createEffect(type, options = {}) {
        switch (type) {
            case 'echo':
                return this.createEchoEffect(options);
            case 'distortion':
                return this.createDistortionEffect(options);
            case 'filter':
                return this.createFilterEffect(options);
            default:
                return null;
        }
    }
    
    /**
     * Create echo effect
     * @param {Object} options - Echo options
     */
    createEchoEffect(options = {}) {
        const opts = Object.assign({
            delay: 0.5,
            feedback: 0.5,
            wet: 0.5
        }, options);
        
        const delay = this.audioContext.createDelay();
        delay.delayTime.value = opts.delay;
        
        const feedback = this.audioContext.createGain();
        feedback.gain.value = opts.feedback;
        
        const wet = this.audioContext.createGain();
        wet.gain.value = opts.wet;
        
        const dry = this.audioContext.createGain();
        dry.gain.value = 1 - opts.wet;
        
        // Create effect chain
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(wet);
        
        return {
            input: (source) => {
                source.connect(delay);
                source.connect(dry);
            },
            output: (destination) => {
                wet.connect(destination);
                dry.connect(destination);
            },
            params: {
                delay: delay.delayTime,
                feedback: feedback.gain,
                wet: wet.gain,
                dry: dry.gain
            }
        };
    }
    
    /**
     * Create distortion effect
     * @param {Object} options - Distortion options
     */
    createDistortionEffect(options = {}) {
        const opts = Object.assign({
            amount: 20,
            wet: 0.5
        }, options);
        
        const distortion = this.audioContext.createWaveShaper();
        distortion.curve = this.makeDistortionCurve(opts.amount);
        distortion.oversample = '4x';
        
        const wet = this.audioContext.createGain();
        wet.gain.value = opts.wet;
        
        const dry = this.audioContext.createGain();
        dry.gain.value = 1 - opts.wet;
        
        // Connect nodes
        distortion.connect(wet);
        
        return {
            input: (source) => {
                source.connect(distortion);
                source.connect(dry);
            },
            output: (destination) => {
                wet.connect(destination);
                dry.connect(destination);
            },
            params: {
                wet: wet.gain,
                dry: dry.gain
            },
            setAmount: (amount) => {
                distortion.curve = this.makeDistortionCurve(amount);
            }
        };
    }
    
    /**
     * Create filter effect
     * @param {Object} options - Filter options
     */
    createFilterEffect(options = {}) {
        const opts = Object.assign({
            type: 'lowpass',
            frequency: 1000,
            Q: 1,
            gain: 0
        }, options);
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = opts.type;
        filter.frequency.value = opts.frequency;
        filter.Q.value = opts.Q;
        filter.gain.value = opts.gain;
        
        return {
            input: (source) => {
                source.connect(filter);
            },
            output: (destination) => {
                filter.connect(destination);
            },
            params: {
                frequency: filter.frequency,
                Q: filter.Q,
                gain: filter.gain
            }
        };
    }
    
    /**
     * Create distortion curve
     * @param {number} amount - Distortion amount
     */
    makeDistortionCurve(amount) {
        const samples = 44100;
        const curve = new Float32Array(samples);
        const deg = Math.PI / 180;
        
        for (let i = 0; i < samples; ++i) {
            const x = i * 2 / samples - 1;
            curve[i] = (3 + amount) * x * 20 * deg / (Math.PI + amount * Math.abs(x));
        }
        
        return curve;
    }
}

// Export AudioEnhancer class
window.AudioEnhancer = AudioEnhancer;

