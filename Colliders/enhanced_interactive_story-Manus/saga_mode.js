/**
 * Saga Mode Implementation
 * The Colliders - Interactive Experience
 */

class SagaMode {
    constructor() {
        this.isActive = false;
        this.currentChoice = null;
        this.choiceTimeout = null;
        this.visualizers = {};
        this.additionalAudioBuffers = {};
        this.audioVariants = {
            ambient: { prefix: 'saga-ambient', count: 4 },
            transition: { prefix: 'saga-transition', count: 4 },
            choice: { prefix: 'saga-choice', count: 4 }
        };
        this.scheduledTimeouts = [];
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
        await this.loadAdditionalAudio();
        console.log('Saga mode initialized');
    }

    createUI() {
        this.progressContainer = document.createElement('div');
        this.progressContainer.className = 'progress-container';
        this.progressBar = document.createElement('div');
        this.progressBar.className = 'progress-bar';
        this.progressMarker = document.createElement('div');
        this.progressMarker.className = 'progress-marker';
        this.progressBar.appendChild(this.progressMarker);
        this.progressContainer.appendChild(this.progressBar);

        this.choiceContainer = document.createElement('div');
        this.choiceContainer.className = 'choice-container';
        this.choiceContainer.style.display = 'none';

        const yesButton = document.createElement('button');
        yesButton.className = 'choice-button yes';
        yesButton.textContent = 'YES';
        yesButton.addEventListener('click', () => this.handleChoice('yes'));

        const noButton = document.createElement('button');
        noButton.className = 'choice-button no';
        noButton.textContent = 'NO';
        noButton.addEventListener('click', () => this.handleChoice('no'));

        this.choiceContainer.appendChild(yesButton);
        this.choiceContainer.appendChild(noButton);

        this.options.container.appendChild(this.progressContainer);
        this.options.container.appendChild(this.choiceContainer);

        document.body.classList.add('saga-mode');
    }

    initializeVisualizers() {
        this.visualizers.ambient = new AudioVisualizer(this.options.visualContainer, {
            particleCount: 150,
            particleColor: '#9c27b0',
            particleSize: 2,
            particleSpeed: 0.5,
            mode: 'saga'
        });
        this.visualizers.impact = new ImpactVisualizer(this.options.visualContainer, {
            particleCount: 250,
            particleSize: 3,
            particleSpeed: 2.5,
            mode: 'saga'
        });
        this.visualizers.stream = new StreamVisualizer(this.options.visualContainer, {
            particleCount: 200,
            particleSize: 2.5,
            particleSpeed: 2,
            mode: 'saga'
        });
    }

    async loadAdditionalAudio() {
        // Gather all possible audio variant files
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
        console.log('All saga audio files loaded');
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
        this.playSagaSequence();
    }

    playAmbienceLoop(fadeIn = 2.0, volume = 0.6) {
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

    playSagaSequence() {
        this.clearAllTimeouts();
        this.options.textDisplay.innerHTML = "";
        let endTime = 0;

        for (let i = 0; i < SAGA_TL.length; ++i) {
            const entry = SAGA_TL[i];
            const inTime = entry.time;
            let outTime;

            const progress = i / SAGA_TL.length;
            this.scheduledTimeouts.push(setTimeout(() => {
                this.updateProgress(progress);
            }, inTime * 1000));

            if (typeof entry.strike !== "undefined") {
                this.playSound(STRIKE_FILES[entry.strike], inTime);
                outTime = inTime + STRIKE_DUR[entry.strike];
                this.scheduledTimeouts.push(setTimeout(() => {
                    this.visualizers.impact.triggerExplosion(1.5);
                }, inTime * 1000));
            } else if (typeof entry.stream !== "undefined") {
                this.playSound(STREAM_FILES[entry.stream], inTime);
                outTime = inTime + STREAM_DUR[entry.stream];
                this.scheduledTimeouts.push(setTimeout(() => {
                    this.visualizers.stream.startStream(STREAM_DUR[entry.stream] * 1000);
                }, inTime * 1000));
            } else if (typeof entry.transition !== "undefined") {
                // Play a random transition sound
                this.playSound(this.getRandomVariantFile('transition'), inTime);
                outTime = inTime + 3.5;
            } else if (typeof entry.fadeStart !== "undefined") {
                outTime = entry.fadeStart;
            } else {
                outTime = inTime + 3.5;
            }

            if (entry.interactive) {
                this.showAndHideInteractiveText(entry.text, inTime, outTime);
            } else {
                this.showAndHideText(entry.text, inTime, outTime);
            }
            endTime = Math.max(endTime, outTime);
        }

        this.scheduledTimeouts.push(setTimeout(() => {
            this.options.textDisplay.innerHTML = "Preparing final transmission…";
            this.stopAmbience();
            this.cleanup();
            setTimeout(() => {
                this.options.onComplete();
            }, 1400);
            this.isActive = false;
        }, (endTime + 1) * 1000));
    }

    playChoiceResponse(choice) {
        this.clearAllTimeouts();
        this.options.textDisplay.innerHTML = "";
        let endTime = 0;

        const responses = CHOICE_RESPONSES[choice];

        // Play a random choice response sound
        this.playSound(this.getRandomVariantFile('choice'), 0);

        for (let i = 0; i < responses.length; ++i) {
            const entry = responses[i];
            const inTime = entry.time;
            const outTime = entry.fadeStart;
            this.showAndHideText(entry.text, inTime, outTime);
            endTime = Math.max(endTime, outTime);
        }

        this.scheduledTimeouts.push(setTimeout(() => {
            this.playSagaSequence();
        }, (endTime + 1) * 1000));
    }

    showAndHideText(text, delay, outDelay) {
        this.scheduledTimeouts.push(setTimeout(() => {
            this.options.textDisplay.innerHTML = text;
            this.options.textDisplay.className = 'saga-text-in';
        }, delay * 1000));

        this.scheduledTimeouts.push(setTimeout(() => {
            this.options.textDisplay.className = 'text-fade-out';
            setTimeout(() => {
                this.options.textDisplay.innerHTML = "";
                this.options.textDisplay.className = '';
            }, 500);
        }, outDelay * 1000));
    }

    showAndHideInteractiveText(text, delay, outDelay) {
        this.scheduledTimeouts.push(setTimeout(() => {
            this.options.textDisplay.innerHTML = text;
            this.options.textDisplay.className = 'saga-text-in';
            setTimeout(() => {
                this.choiceContainer.style.display = 'flex';
                this.choiceContainer.style.opacity = '0';
                setTimeout(() => {
                    this.choiceContainer.style.opacity = '1';
                }, 100);

                this.choiceTimeout = setTimeout(() => {
                    this.handleChoice('no');
                }, (outDelay - delay - 1) * 1000);
            }, 1000);
        }, delay * 1000));
    }

    handleChoice(choice) {
        if (this.choiceTimeout) {
            clearTimeout(this.choiceTimeout);
            this.choiceTimeout = null;
        }
        this.currentChoice = choice;
        this.choiceContainer.style.opacity = '0';
        setTimeout(() => {
            this.choiceContainer.style.display = 'none';
            this.options.textDisplay.innerHTML = "";
            this.options.textDisplay.className = '';
            this.playChoiceResponse(choice);
        }, 500);
    }

    playSound(filename, delay) {
        const audioCtx = this.options.audioContext;
        this.scheduledTimeouts.push(setTimeout(() => {
            const buffer = this.additionalAudioBuffers[filename] || this.options.audioBuffers[filename];
            if (buffer) {
                const src = audioCtx.createBufferSource();
                src.buffer = buffer;
                src.connect(audioCtx.destination);
                src.start();
                if (this.analyser && this.analyserData) {
                    const analyser = this.analyser;
                    const analyserData = this.analyserData;
                    src.connect(analyser);
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

    setupAudioAnalyser() {
        const audioCtx = this.options.audioContext;
        this.analyser = audioCtx.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyserData = new Float32Array(this.analyser.fftSize);
        this.analyser.connect(audioCtx.destination);
    }

    cleanup() {
        Object.values(this.visualizers).forEach(visualizer => {
            if (visualizer.isActive) {
                visualizer.stop();
            }
        });
        this.clearAllTimeouts();
        this.progressContainer.style.opacity = '0';
        this.choiceContainer.style.display = 'none';
        document.body.classList.remove('saga-mode');
    }
}

window.SagaMode = SagaMode;
