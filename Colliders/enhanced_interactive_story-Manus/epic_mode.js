/**
 * EPIC Mode Implementation
 * The Colliders - Interactive Experience
 */

class EpicMode {
    constructor() {
        this.isActive = false;
        this.currentInteraction = null;
        this.interactionTimeout = null;
        this.visualizers = {};
        this.visualEffects = {};
        this.additionalAudioBuffers = {};
        this.userChoices = {};
        this.scheduledTimeouts = [];
        this.particleSystems = [];
        this.audioVariants = {
            ambient:      { prefix: 'epic-ambient',      count: 4 },
            transition:   { prefix: 'epic-transition',   count: 4 },
            impact:       { prefix: 'epic-impact',       count: 4 },
            interaction:  { prefix: 'epic-interaction',  count: 4 },
            heartbeat:    { prefix: 'epic-heartbeat',    count: 4 },
            silence:      { prefix: 'epic-silence',      count: 5 },
            distortion:   { prefix: 'epic-distortion',   count: 4 }
        };
    }
    
    async initialize(options = {}) {
        this.options = Object.assign({
            audioContext: null,
            container: document.getElementById('container'),
            visualContainer: document.getElementById('visual-container'),
            textDisplay: document.getElementById('text-display'),
            audioBuffers: {},
            onComplete: () => {}
        }, options);

        this.createUI();
        this.initializeVisualizers();
        this.initializeVisualEffects();
        this.setupAudioAnalyser();
        await this.loadAdditionalAudio();
        console.log('EPIC mode initialized');
    }
    
    createUI() {
        this.backgroundEffects = document.createElement('div');
        this.backgroundEffects.className = 'background-effects';
        this.starsBackground = document.createElement('div');
        this.starsBackground.className = 'stars';
        this.backgroundEffects.appendChild(this.starsBackground);

        this.progressContainer = document.createElement('div');
        this.progressContainer.className = 'progress-container epic-progress';
        this.progressBar = document.createElement('div');
        this.progressBar.className = 'progress-bar';
        this.progressMarker = document.createElement('div');
        this.progressMarker.className = 'progress-marker';
        this.progressBar.appendChild(this.progressMarker);
        this.progressContainer.appendChild(this.progressBar);

        this.interactionContainer = document.createElement('div');
        this.interactionContainer.className = 'interaction-container';
        this.interactionContainer.style.display = 'none';

        document.body.insertBefore(this.backgroundEffects, document.body.firstChild);
        this.options.container.appendChild(this.progressContainer);
        this.options.container.appendChild(this.interactionContainer);
        document.body.classList.add('epic-mode');
    }
    
    initializeVisualizers() {
        this.visualizers.ambient = new AudioVisualizer(this.options.visualContainer, {
            particleCount: 200,
            particleColor: '#ffc107',
            particleSize: 2.5,
            particleSpeed: 0.7,
            mode: 'epic'
        });
        this.visualizers.impact = new ImpactVisualizer(this.options.visualContainer, {
            particleCount: 350,
            particleSize: 4,
            particleSpeed: 3,
            mode: 'epic'
        });
        this.visualizers.stream = new StreamVisualizer(this.options.visualContainer, {
            particleCount: 300,
            particleSize: 3,
            particleSpeed: 2.5,
            mode: 'epic'
        });
    }
    
    initializeVisualEffects() {
        this.effectsContainer = document.createElement('div');
        this.effectsContainer.className = 'effects-container';
        this.options.visualContainer.appendChild(this.effectsContainer);
        this.visualEffects = {
            timeshift: this.createEffectLayer('timeshift-effect'),
            locationReveal: this.createEffectLayer('location-reveal-effect'),
            dimensionShift: this.createEffectLayer('dimension-shift-effect'),
            catastrophe: this.createEffectLayer('catastrophe-effect'),
            realityTear: this.createEffectLayer('reality-tear-effect'),
            cosmicUnravel: this.createEffectLayer('cosmic-unravel-effect'),
            cosmicErasure: this.createEffectLayer('cosmic-erasure-effect'),
            quantumFoam: this.createEffectLayer('quantum-foam-effect'),
            quantumBridge: this.createEffectLayer('quantum-bridge-effect'),
            reachPrompt: this.createEffectLayer('reach-prompt-effect'),
            silence: this.createEffectLayer('silence-effect'),
            distortion: this.createEffectLayer('distortion-effect'),
            arrival: this.createEffectLayer('arrival-effect'),
            heartbeat: this.createEffectLayer('heartbeat-effect'),
            networkEmbed: this.createEffectLayer('network-embed-effect'),
            timeProgression: this.createEffectLayer('time-progression-effect'),
            deathbed: this.createEffectLayer('deathbed-effect'),
            awakening: this.createEffectLayer('awakening-effect'),
            dateReveal: this.createEffectLayer('date-reveal-effect'),
            networkChoice: this.createEffectLayer('network-choice-effect'),
            broadcast: this.createEffectLayer('broadcast-effect'),
            finalReveal: this.createEffectLayer('final-reveal-effect'),
            connectionEstablished: this.createEffectLayer('connection-established-effect'),
            alienWorld: this.createEffectLayer('alien-world-effect'),
            timeRunningOut: this.createEffectLayer('time-running-out-effect'),
            networkJoined: this.createEffectLayer('network-joined-effect'),
            countdown: this.createEffectLayer('countdown-effect')
        };
    }
    
    createEffectLayer(className) {
        const layer = document.createElement('div');
        layer.className = `effect-layer ${className}`;
        layer.style.opacity = '0';
        this.effectsContainer.appendChild(layer);
        return layer;
    }
    
    setupAudioAnalyser() {
        const audioCtx = this.options.audioContext;
        this.analyser = audioCtx.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyserData = new Float32Array(this.analyser.fftSize);
        this.analyser.connect(audioCtx.destination);
    }
    
    async loadAdditionalAudio() {
        const fileList = [];
        Object.values(this.audioVariants).forEach(({ prefix, count }) => {
            for (let i = 1; i <= count; ++i)
                fileList.push(`${prefix}_${i}.webm`);
        });
        const audioCtx = this.options.audioContext;
        const fetchAndDecode = async file => {
            try {
                const res = await fetch(`audio/${file}`);
                if (!res.ok) {
                    console.warn('Missing:', file);
                    return;
                }
                const buf = await res.arrayBuffer();
                this.additionalAudioBuffers[file] = await audioCtx.decodeAudioData(buf);
            } catch (err) {
                console.error('Error loading', file, err);
            }
        };
        await Promise.all(fileList.map(fetchAndDecode));
        console.log('All epic audio files loaded');
    }

    getRandomVariantFile(type) {
        const v = this.audioVariants[type];
        const idx = Math.floor(Math.random() * v.count) + 1;
        return `${v.prefix}_${idx}.webm`;
    }
    
    start() {
        if (this.isActive) return;
        this.isActive = true;
        this.visualizers.ambient.start();
        this.playAmbienceLoop();
        this.playEpicSequence();
    }
    
    playAmbienceLoop(fadeIn = 2.0, volume = 0.7) {
        const audioCtx = this.options.audioContext;
        const filename = this.getRandomVariantFile('ambient');
        const buffer = this.additionalAudioBuffers[filename] || this.options.audioBuffers['particle-ambience.webm'];
        if (!buffer) return;

        this.ambienceGain = audioCtx.createGain();
        this.ambienceGain.gain.setValueAtTime(0, audioCtx.currentTime);
        this.ambienceGain.connect(audioCtx.destination);

        this.ambienceNode = audioCtx.createBufferSource();
        this.ambienceNode.buffer = buffer;
        this.ambienceNode.loop = true;
        this.ambienceNode.connect(this.ambienceGain);
        this.ambienceNode.connect(this.analyser);
        this.ambienceNode.start();

        this.ambienceGain.gain.linearRampToValueAtTime(
            volume,
            audioCtx.currentTime + fadeIn
        );
    }
    
    stopAmbience(fadeOut = 1.5) {
        if (!this.ambienceNode || !this.ambienceGain) return;

        const audioCtx = this.options.audioContext;
        const now = audioCtx.currentTime;
        this.ambienceGain.gain.cancelScheduledValues(now);
        this.ambienceGain.gain.setValueAtTime(this.ambienceGain.gain.value, now);
        this.ambienceGain.gain.linearRampToValueAtTime(0, now + fadeOut);

        this.ambienceNode.stop(now + fadeOut + 0.05);
        this.ambienceNode.onended = () => {
            this.ambienceNode.disconnect();
            this.ambienceGain.disconnect();
            this.ambienceNode = null;
            this.ambienceGain = null;
        };
    }
    
    playEpicSequence() {
        this.clearAllTimeouts();
        this.options.textDisplay.innerHTML = "";
        let endTime = 0;
        for (let i = 0; i < EPIC_TL.length; ++i) {
            const entry = EPIC_TL[i];
            const inTime = entry.time;
            let outTime;

            const progress = i / EPIC_TL.length;
            this.scheduledTimeouts.push(setTimeout(() => {
                this.updateProgress(progress);
            }, inTime * 1000));

            if (typeof entry.strike !== "undefined") {
                // Play a random impact
                this.playSound(this.getRandomVariantFile('impact'), inTime);
                outTime = inTime + STRIKE_DUR[entry.strike];
                this.scheduledTimeouts.push(setTimeout(() => {
                    this.visualizers.impact.triggerExplosion(2.0);
                }, inTime * 1000));
            } else if (typeof entry.stream !== "undefined") {
                this.playSound(STREAM_FILES[entry.stream], inTime);
                outTime = inTime + STREAM_DUR[entry.stream];
                this.scheduledTimeouts.push(setTimeout(() => {
                    this.visualizers.stream.startStream(STREAM_DUR[entry.stream] * 1200);
                }, inTime * 1000));
            } else if (typeof entry.transition !== "undefined") {
                // Play a random transition
                this.playSound(this.getRandomVariantFile('transition'), inTime);
                outTime = inTime + 3.5;
            } else if (typeof entry.fadeStart !== "undefined") {
                outTime = entry.fadeStart;
            } else {
                outTime = inTime + 3.5;
            }

            if (entry.visualEffect) {
                this.scheduledTimeouts.push(setTimeout(() => {
                    this.triggerVisualEffect(entry.visualEffect);
                }, inTime * 1000));
            }

            if (entry.interactive) {
                this.showAndHideInteractiveText(entry.text, inTime, outTime, entry.interactive);
            } else {
                this.showAndHideText(entry.text, inTime, outTime);
            }
            endTime = Math.max(endTime, outTime);
        }

        this.scheduledTimeouts.push(setTimeout(() => {
            this.options.textDisplay.innerHTML = '<span class="epic-final-message">Preparing final transmission…</span>';
            this.stopAmbience();
            this.cleanup();
            setTimeout(() => {
                this.options.onComplete();
            }, 1400);
            this.isActive = false;
        }, (endTime + 1) * 1000));
    }
    
    playInteractionResponse(type, choice) {
        this.clearAllTimeouts();
        this.options.textDisplay.innerHTML = "";
        let endTime = 0;
        const responses = EPIC_CHOICE_RESPONSES[type][choice];

        // Play a random interaction
        this.playSound(this.getRandomVariantFile('interaction'), 0);

        for (let i = 0; i < responses.length; ++i) {
            const entry = responses[i];
            const inTime = entry.time;
            const outTime = entry.fadeStart;
            if (entry.visualEffect) {
                this.scheduledTimeouts.push(setTimeout(() => {
                    this.triggerVisualEffect(entry.visualEffect);
                }, inTime * 1000));
            }
            this.showAndHideText(entry.text, inTime, outTime);
            endTime = Math.max(endTime, outTime);
        }

        this.scheduledTimeouts.push(setTimeout(() => {
            this.playEpicSequence();
        }, (endTime + 1) * 1000));
    }
    
    showAndHideText(text, delay, outDelay) {
        this.scheduledTimeouts.push(setTimeout(() => {
            this.options.textDisplay.innerHTML = text;
            this.options.textDisplay.className = 'epic-text-in';
        }, delay * 1000));
        this.scheduledTimeouts.push(setTimeout(() => {
            this.options.textDisplay.className = 'text-fade-out';
            setTimeout(() => {
                this.options.textDisplay.innerHTML = "";
                this.options.textDisplay.className = '';
            }, 500);
        }, outDelay * 1000));
    }
    
    showAndHideInteractiveText(text, delay, outDelay, interactionType) {
        this.scheduledTimeouts.push(setTimeout(() => {
            this.options.textDisplay.innerHTML = text;
            this.options.textDisplay.className = 'epic-text-in';
            this.createInteractionInterface(interactionType);
            setTimeout(() => {
                this.interactionContainer.style.display = 'flex';
                this.interactionContainer.style.opacity = '0';
                setTimeout(() => {
                    this.interactionContainer.style.opacity = '1';
                }, 100);
                this.interactionTimeout = setTimeout(() => {
                    this.handleInteraction(interactionType, 'no');
                }, (outDelay - delay - 1) * 1000);
            }, 1000);
        }, delay * 1000));
    }
    
    createInteractionInterface(type) {
        this.interactionContainer.innerHTML = '';
        const yesButton = document.createElement('button');
        yesButton.className = 'interaction-button yes';
        const noButton = document.createElement('button');
        noButton.className = 'interaction-button no';
        if (type === 'bridge') {
            yesButton.textContent = 'REACH OUT';
            noButton.textContent = 'STAY BACK';
        } else if (type === 'join') {
            yesButton.textContent = 'JOIN NETWORK';
            noButton.textContent = 'DECLINE';
        }
        yesButton.addEventListener('click', () => this.handleInteraction(type, 'yes'));
        noButton.addEventListener('click', () => this.handleInteraction(type, 'no'));
        this.interactionContainer.appendChild(yesButton);
        this.interactionContainer.appendChild(noButton);
    }
    
    handleInteraction(type, choice) {
        if (this.interactionTimeout) {
            clearTimeout(this.interactionTimeout);
            this.interactionTimeout = null;
        }
        this.userChoices[type] = choice;
        this.interactionContainer.style.opacity = '0';
        setTimeout(() => {
            this.interactionContainer.style.display = 'none';
            this.options.textDisplay.innerHTML = "";
            this.options.textDisplay.className = '';
            this.playInteractionResponse(type, choice);
        }, 500);
    }
    
    triggerVisualEffect(effectName) {
        const effect = this.visualEffects[effectName];
        if (!effect) return;

        // Play effect-specific sounds using random variant:
        if (effectName === 'heartbeat') {
            this.playSound(this.getRandomVariantFile('heartbeat'), 0);
        } else if (effectName === 'silence') {
            this.playSound(this.getRandomVariantFile('silence'), 0);
        } else if (effectName === 'distortion') {
            this.playSound(this.getRandomVariantFile('distortion'), 0);
        }

        effect.style.opacity = '1';
        this.createParticleEffect(effectName);
        setTimeout(() => {
            effect.style.opacity = '0';
        }, 3000);
    }
    
    createParticleEffect(effectName) {
        switch(effectName) {
            case 'catastrophe':
                this.createExplosionParticles(); break;
            case 'cosmicUnravel':
                this.createVortexParticles(); break;
            case 'arrival':
                this.createPortalParticles(); break;
            case 'broadcast':
                this.createWaveParticles(); break;
            case 'finalReveal':
                this.createStarburstParticles(); break;
        }
    }
    createExplosionParticles() { console.log('Explosion particle effect triggered'); }
    createVortexParticles()    { console.log('Vortex particle effect triggered'); }
    createPortalParticles()    { console.log('Portal particle effect triggered'); }
    createWaveParticles()      { console.log('Wave particle effect triggered'); }
    createStarburstParticles() { console.log('Starburst particle effect triggered'); }

    playSound(filename, delay, alternateFile = null) {
        const audioCtx = this.options.audioContext;
        this.scheduledTimeouts.push(setTimeout(() => {
            let buffer = null;
            if (alternateFile && this.additionalAudioBuffers[alternateFile]) {
                buffer = this.additionalAudioBuffers[alternateFile];
            } else {
                buffer = this.additionalAudioBuffers[filename] || this.options.audioBuffers[filename];
            }
            if (buffer) {
                const src = audioCtx.createBufferSource();
                src.buffer = buffer;
                src.connect(audioCtx.destination);
                src.connect(this.analyser);
                src.start();
                if (this.analyser && this.analyserData) {
                    const analyser = this.analyser;
                    const analyserData = this.analyserData;
                    const updateVisualizers = () => {
                        if (!this.isActive) return;
                        analyser.getFloatTimeDomainData(analyserData);
                        Object.values(this.visualizers).forEach(visualizer => {
                            if (visualizer.isActive) {
                                visualizer.updateAudioData(analyserData);
                            }
                        });
                        requestAnimationFrame(updateVisualizers);
                    };
                    updateVisualizers();
                }
            }
        }, delay * 1000));
    }
    
    updateProgress(progress) {
        if (!this.progressBar) return;
        this.progressBar.style.width = `${progress * 100}%`;
        this.progressMarker.style.left = `${progress * 100}%`;
    }
    
    clearAllTimeouts() {
        if (this.scheduledTimeouts) {
            this.scheduledTimeouts.forEach(id => clearTimeout(id));
        }
        this.scheduledTimeouts = [];
    }
    
    cleanup() {
        Object.values(this.visualizers).forEach(visualizer => {
            if (visualizer.isActive) visualizer.stop();
        });
        this.clearAllTimeouts();
        this.progressContainer.style.opacity = '0';
        this.interactionContainer.style.display = 'none';
        Object.values(this.visualEffects).forEach(effect => {
            effect.style.opacity = '0';
        });
        document.body.classList.remove('epic-mode');
    }
}

window.EpicMode = EpicMode;
