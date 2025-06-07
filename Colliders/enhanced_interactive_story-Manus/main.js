/**
 * Main JavaScript for Enhanced Interactive Story Experience
 * The Colliders - Interactive Experience
 */

document.addEventListener('DOMContentLoaded', () => {
    const app = new InteractiveStoryApp();
    app.initialize();
});

/**
 * Interactive Story Application
 */
class InteractiveStoryApp {
    constructor() {
        this.container = document.getElementById('container');
        this.visualContainer = document.getElementById('visual-container');
        this.textDisplay = document.getElementById('text-display');
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.audioBuffers = {};
        this.standardMode = null;
        this.sagaMode = null;
        this.epicMode = null;
        this.activeModeInstance = null;
        this.currentModeName = ''; // Will be set to 'none' or similar initially
        this.audioEnhancer = null;
        this.visualEnhancer = null;
        this.isInitialized = false; // Track initialization status

        this.globalTimelineData = {
            TL: typeof TL !== 'undefined' ? TL : [],
            STRIKE_FILES: typeof STRIKE_FILES !== 'undefined' ? STRIKE_FILES : [],
            STRIKE_DUR: typeof STRIKE_DUR !== 'undefined' ? STRIKE_DUR : [],
            STREAM_FILES: typeof STREAM_FILES !== 'undefined' ? STREAM_FILES : [],
            STREAM_DUR: typeof STREAM_DUR !== 'undefined' ? STREAM_DUR : [],
            MIN_LINE: typeof MIN_LINE !== 'undefined' ? MIN_LINE : 2.5, // Default MIN_LINE
            initialDelay: typeof initialDelay !== 'undefined' ? initialDelay : 0.5, // Default initialDelay
        };
    }

    async initialize() {
        if (this.isInitialized) return;
        this.isInitialized = true; // Prevent re-initialization

        try {
            this.showLoadingIndicator("Initializing Core Systems...");
            await this.loadAudioFiles();
            this.initializeEnhancers();
            await this.initializeModes();
            this.createModeSelectionInterface();
            this.hideLoadingIndicator();

            // Do NOT start any mode automatically. User will select one.
            this.showInitialMessage("Please select a mode to begin The Colliders experience.");
            console.log('Interactive Story App initialized. Waiting for mode selection.');

        } catch (error) {
            console.error('Error initializing app:', error);
            this.showErrorMessage('Failed to initialize the experience. Please refresh the page.');
            this.hideLoadingIndicator();
        }
    }

    showInitialMessage(message) {
        if (this.textDisplay) {
            this.textDisplay.innerHTML = `<p class="initial-prompt">${message}</p>`;
            this.textDisplay.style.opacity = '1';
        }
         // Style .initial-prompt in your CSS for better appearance
    }


    showLoadingIndicator(text = "Loading Experience...") {
        let loadingIndicator = document.getElementById('loading-indicator');
        if (!loadingIndicator) {
            loadingIndicator = document.createElement('div');
            loadingIndicator.id = 'loading-indicator';
            document.body.appendChild(loadingIndicator);
        }
        loadingIndicator.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">${text}</div>
        `;
        loadingIndicator.style.opacity = '1';
        loadingIndicator.classList.remove('fade-out');
    }

    hideLoadingIndicator() {
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.classList.add('fade-out');
            setTimeout(() => {
                if (loadingIndicator.parentNode) {
                    loadingIndicator.parentNode.removeChild(loadingIndicator);
                }
            }, 500);
        }
    }

    showErrorMessage(message) {
        this.hideLoadingIndicator();
        let errorMessage = document.getElementById('error-message');
        if (errorMessage) errorMessage.parentNode.removeChild(errorMessage);

        errorMessage = document.createElement('div');
        errorMessage.id = 'error-message';
        errorMessage.innerHTML = `
            <div class="error-icon">⚠️</div>
            <div class="error-text">${message}</div>
            <button class="error-button">Retry</button>
        `;
        document.body.appendChild(errorMessage);

        errorMessage.querySelector('.error-button').addEventListener('click', () => {
            if (errorMessage.parentNode) errorMessage.parentNode.removeChild(errorMessage);
            window.location.reload();
        });
    }

    async loadAudioFiles() {
        this.showLoadingIndicator("Loading Audio Assets...");
        const audioFileNames = [
            ...(this.globalTimelineData.STRIKE_FILES || []),
            ...(this.globalTimelineData.STREAM_FILES || []),
            'particle-ambience.webm',
        ].filter((value, index, self) => value && self.indexOf(value) === index);

        const fetchAndDecode = async file => {
            try {
                const res = await fetch(`audio/${file}`);
                if (!res.ok) {
                    console.warn('Audio file not found:', file, res.status);
                    this.audioBuffers[file] = null; return;
                }
                const buf = await res.arrayBuffer();
                this.audioBuffers[file] = await this.audioContext.decodeAudioData(buf);
            } catch (err) {
                console.error('Error loading/decoding audio file', file, err);
                this.audioBuffers[file] = null;
            }
        };
        await Promise.all(audioFileNames.map(fetchAndDecode));
        console.log('Audio files loading complete.');
    }

    initializeEnhancers() {
        if (typeof AudioEnhancer === 'function') {
            this.audioEnhancer = new AudioEnhancer({ audioContext: this.audioContext, container: this.container, visualizerContainer: this.visualContainer });
        } else console.warn('AudioEnhancer class not found.');
        if (typeof VisualEnhancer === 'function') {
            this.visualEnhancer = new VisualEnhancer({ container: this.container, visualContainer: this.visualContainer, textDisplay: this.textDisplay });
        } else console.warn('VisualEnhancer class not found.');
        console.log('Enhancers initialized (if classes were available).');
    }

    async initializeModes() {
        this.showLoadingIndicator("Preparing Experience Modes...");
        const commonOptions = {
            audioContext: this.audioContext, textDisplay: this.textDisplay, audioBuffers: this.audioBuffers,
            audioEnhancer: this.audioEnhancer, visualEnhancer: this.visualEnhancer,
            // Pass a utility to calculate reading time
            getReadingDuration: this.getReadingDuration.bind(this)
        };

        this.standardMode = new StandardMode(this.globalTimelineData);
        await this.standardMode.initialize({ ...commonOptions, onComplete: () => this.handleModeComplete('standard') });

        if (typeof SagaMode === 'function') {
            this.sagaMode = new SagaMode(); // SagaMode might have its own timeline logic
            await this.sagaMode.initialize({ ...commonOptions, onComplete: () => this.handleModeComplete('saga') });
        } else console.warn("SagaMode class not found.");
        if (typeof EpicMode === 'function') {
            this.epicMode = new EpicMode(); // EpicMode might have its own timeline logic
            await this.epicMode.initialize({ ...commonOptions, onComplete: () => this.handleModeComplete('epic') });
        } else console.warn("EpicMode class not found.");
        console.log('Modes initialized.');
    }

    getReadingDuration(text, minDurationSeconds = 2.5) {
        const wordsPerMinute = 180; // Average reading speed
        const words = text ? text.split(/\s+/).length : 0;
        const minutes = words / wordsPerMinute;
        const seconds = minutes * 60;
        // Ensure a minimum display time, especially for short lines or titles
        // Add a small buffer for cognitive processing.
        return Math.max(seconds + 0.5, minDurationSeconds) * 1000; // Convert to ms
    }


    createModeSelectionInterface() {
        const modeSelectionContainer = document.createElement('div');
        modeSelectionContainer.className = 'mode-selection-container';
        const modeSelection = document.createElement('div');
        modeSelection.className = 'mode-selection';
        this.modeButtons = {};
        const modes = [
            { name: 'standard', label: 'Standard', instance: this.standardMode },
            { name: 'saga', label: 'Saga', instance: this.sagaMode },
            { name: 'epic', label: 'EPIC', instance: this.epicMode }
        ];
        modes.forEach(modeInfo => {
            const button = document.createElement('button');
            button.className = `mode-button ${modeInfo.name}`;
            button.textContent = modeInfo.label;
            if (!modeInfo.instance) { button.disabled = true; button.title = `${modeInfo.label} mode unavailable.`; }
            button.addEventListener('click', () => { if (!button.disabled) this.switchMode(modeInfo.name); });
            modeSelection.appendChild(button);
            this.modeButtons[modeInfo.name] = button;
        });
        modeSelectionContainer.appendChild(modeSelection);
        this.container.insertBefore(modeSelectionContainer, this.container.firstChild);
        console.log('Mode selection interface created.');
    }

    async switchMode(modeName) {
        if (this.currentModeName === modeName) return; // Already in this mode
        if (!this.modeButtons[modeName] || this.modeButtons[modeName].disabled) {
            console.warn(`Attempted to switch to unavailable/disabled mode: ${modeName}`);
            return;
        }

        // Clear initial prompt if it exists
        const initialPrompt = this.textDisplay.querySelector('.initial-prompt');
        if (initialPrompt) {
            this.textDisplay.innerHTML = ''; // Clear the prompt
        }


        const startNewMode = () => {
            if (this.activeModeInstance && typeof this.activeModeInstance.cleanup === 'function') {
                this.activeModeInstance.cleanup();
            }
            this.currentModeName = modeName;
            document.body.className = ''; // Clear body classes
            document.body.classList.add(`${modeName}-mode`);

            switch (modeName) {
                case 'standard': this.activeModeInstance = this.standardMode; break;
                case 'saga': this.activeModeInstance = this.sagaMode; break;
                case 'epic': this.activeModeInstance = this.epicMode; break;
                default: console.error(`Unknown mode: ${modeName}`); return;
            }
            if (this.activeModeInstance && typeof this.activeModeInstance.start === 'function') {
                this.activeModeInstance.start();
                Object.keys(this.modeButtons).forEach(key => this.modeButtons[key].classList.remove('active'));
                if (this.modeButtons[modeName]) this.modeButtons[modeName].classList.add('active');
            } else console.error(`Mode instance for ${modeName} or its start method is missing.`);
        };

        if (!this.currentModeName || !this.visualEnhancer || typeof this.visualEnhancer.createTransition !== 'function') { // No current mode means it's the first selection or enhancer missing
            startNewMode();
        } else {
            await this.visualEnhancer.createTransition('fade', {
                duration: 800, color: '#000', onMidpoint: startNewMode
            });
        }
    }

    handleModeComplete(modeName) {
        console.log(`${modeName} mode completed.`);
        if (this.textDisplay) { this.textDisplay.innerHTML = ""; this.textDisplay.className = ''; }

        let completionMessage = document.querySelector('.completion-message');
        if (completionMessage) completionMessage.parentNode.removeChild(completionMessage);

        completionMessage = document.createElement('div');
        completionMessage.className = 'completion-message';
        completionMessage.innerHTML = `
            <h2>Experience Complete</h2>
            <p>You have completed the ${modeName} mode of The Colliders.</p>
            <p>Select another mode to continue exploring the story.</p>
        `;
        this.container.appendChild(completionMessage);
        setTimeout(() => {
            if (completionMessage && completionMessage.parentNode) {
                completionMessage.classList.add('fade-out-completion');
                setTimeout(() => { if (completionMessage.parentNode) completionMessage.parentNode.removeChild(completionMessage); }, 500);
            }
        }, 7000);
         // After completion, reset currentModeName so user can re-select or choose another
        this.currentModeName = ''; // Or a specific 'completed' state
        if (this.modeButtons[modeName]) this.modeButtons[modeName].classList.remove('active');
        this.showInitialMessage("Select another mode to continue exploring the story, or replay the current one.");

    }
}

/**
 * Standard Mode Implementation
 */
class StandardMode {
    constructor(globalTimelineData) {
        this.isActive = false;
        this.scheduledTimeouts = [];
        this.audioSources = [];
        this.modeStartTime = 0;
        this.options = {};
        this.timeline = globalTimelineData.TL || [];
        this.initialDelay = globalTimelineData.initialDelay;
        this.MIN_LINE_DURATION_MS = (globalTimelineData.MIN_LINE || 2.5) * 1000;
        this.STRIKE_FILES = globalTimelineData.STRIKE_FILES || [];
        this.STRIKE_DUR = globalTimelineData.STRIKE_DUR || [];
    }

    async initialize(options = {}) {
        this.options = options;
        console.log('Standard mode initialized. Timeline entries:', this.timeline.length);
    }

    start() {
        if (this.isActive) return;
        console.log("StandardMode: Starting...");
        this.isActive = true;
        this.scheduledTimeouts = [];
        this.audioSources = [];
        this.modeStartTime = performance.now();

        if (!this.options.textDisplay) { console.error("StandardMode: textDisplay not available!"); this.isActive = false; return; }
        this.options.textDisplay.innerHTML = '';
        this.options.textDisplay.className = 'text-display-area standard-text'; // Specific class for standard
        this.options.textDisplay.style.opacity = '0';

        if (this.timeline.length > 0) this.scheduleTimelineEntries();
        else {
            console.warn("StandardMode: Timeline empty.");
            if (this.options.onComplete) this.options.onComplete();
            this.isActive = false;
        }
    }

    scheduleTimelineEntries() {
        if (!this.isActive) return;

        this.timeline.forEach((entry, index) => {
            const currentTimeOnStartScheduling = performance.now() - this.modeStartTime;
            const displayTimeAbsolute = (this.initialDelay + entry.time) * 1000;
            let fadeOutTimeAbsolute;
            let textVisibleDuration;

            if (entry.fadeStart !== undefined) {
                fadeOutTimeAbsolute = (this.initialDelay + entry.fadeStart) * 1000;
                textVisibleDuration = Math.max(0, fadeOutTimeAbsolute - displayTimeAbsolute);
            } else {
                // If fadeStart is not defined, calculate duration based on reading time or MIN_LINE
                // This is crucial for lines without explicit fadeStart (like the last title)
                const calculatedReadingTime = this.options.getReadingDuration(entry.text, this.MIN_LINE_DURATION_MS / 1000); // getReadingDuration expects seconds for min
                textVisibleDuration = calculatedReadingTime;
                fadeOutTimeAbsolute = displayTimeAbsolute + textVisibleDuration;
            }
             // Ensure MIN_LINE_DURATION_MS is respected if calculated duration is too short
            if (textVisibleDuration < this.MIN_LINE_DURATION_MS && entry.fadeStart === undefined) { // only apply if fadeStart wasn't explicit
                 textVisibleDuration = this.MIN_LINE_DURATION_MS;
                 fadeOutTimeAbsolute = displayTimeAbsolute + textVisibleDuration;
            }


            const appearanceDelay = Math.max(0, displayTimeAbsolute - currentTimeOnStartScheduling);

            this.scheduledTimeouts.push(setTimeout(() => {
                if (!this.isActive) return;
                if (this.options.textDisplay && entry.text) {
                    this.options.textDisplay.innerHTML = entry.text;
                    this.options.textDisplay.classList.remove('text-fade-out');
                    this.options.textDisplay.classList.add('text-fade-in'); // CSS handles the animation
                    this.options.textDisplay.style.opacity = '1';
                }
                if (entry.strike !== undefined && this.STRIKE_FILES[entry.strike]) {
                    this.playAudio(this.STRIKE_FILES[entry.strike]);
                }

                // Schedule fade out
                this.scheduledTimeouts.push(setTimeout(() => {
                    if (!this.isActive) return;
                    if (this.options.textDisplay) {
                        this.options.textDisplay.classList.remove('text-fade-in');
                        this.options.textDisplay.classList.add('text-fade-out');
                    }
                }, textVisibleDuration));
            }, appearanceDelay));
        });

        const lastEntry = this.timeline[this.timeline.length - 1];
        let experienceDuration;
        if (lastEntry.fadeStart !== undefined) {
            let soundDuration = (lastEntry.strike !== undefined && this.STRIKE_DUR[lastEntry.strike]) ? this.STRIKE_DUR[lastEntry.strike] * 1000 : this.MIN_LINE_DURATION_MS;
            experienceDuration = (this.initialDelay + lastEntry.fadeStart) * 1000 + soundDuration;
        } else {
            const lastReadingTime = this.options.getReadingDuration(lastEntry.text, this.MIN_LINE_DURATION_MS / 1000);
            experienceDuration = (this.initialDelay + lastEntry.time) * 1000 + lastReadingTime + 500; // Add buffer for last title
        }

        const currentElapsedTime = performance.now() - this.modeStartTime;
        const completionTimeoutDelay = Math.max(0, experienceDuration - currentElapsedTime + 500); // 500ms final buffer

        this.scheduledTimeouts.push(setTimeout(() => {
            if (this.isActive && this.options.onComplete) {
                console.log("StandardMode: Timeline considered complete.");
                this.options.onComplete();
            }
        }, completionTimeoutDelay));
    }

    playAudio(bufferKey, delay = 0) {
        if (!this.options.audioContext || !this.options.audioBuffers || !this.options.audioBuffers[bufferKey]) return null;
        if (this.options.audioContext.state === 'suspended') this.options.audioContext.resume().catch(e => console.error("Audio resume error:", e));
        const source = this.options.audioContext.createBufferSource();
        source.buffer = this.options.audioBuffers[bufferKey];
        source.connect(this.options.audioContext.destination);
        try { source.start(this.options.audioContext.currentTime + delay); this.audioSources.push(source); }
        catch (e) { console.error("Audio start error:", e, bufferKey); }
        return source;
    }

    clearAllTimeouts() { this.scheduledTimeouts.forEach(clearTimeout); this.scheduledTimeouts = []; }
    stopAllAudio() { this.audioSources.forEach(s => { try { if(s && s.stop) s.stop(); } catch(e){} }); this.audioSources = []; }

    cleanup() {
        console.log("StandardMode: Cleaning up.");
        this.isActive = false;
        this.clearAllTimeouts();
        this.stopAllAudio();
        if (this.options.textDisplay) { this.options.textDisplay.innerHTML = ''; this.options.textDisplay.className = 'text-display-area'; this.options.textDisplay.style.opacity = '0';}
    }
}

// STUBS (Remove when actual classes are implemented)
if (typeof SagaMode === 'undefined') { class SagaMode { async initialize(options) {this.options = options;} start() {console.log("SagaMode STUB"); if(this.options.onComplete) setTimeout(this.options.onComplete,100);} cleanup() {}} window.SagaMode = SagaMode;}
if (typeof EpicMode === 'undefined') { class EpicMode { async initialize(options) {this.options = options;} start() {console.log("EpicMode STUB"); if(this.options.onComplete) setTimeout(this.options.onComplete,100);} cleanup() {}} window.EpicMode = EpicMode;}
if (typeof AudioEnhancer === 'undefined') { class AudioEnhancer { constructor(options){} } window.AudioEnhancer = AudioEnhancer;}
if (typeof VisualEnhancer === 'undefined') { class VisualEnhancer { constructor(options){} async createTransition(type, options) {if (options && options.onMidpoint) setTimeout(options.onMidpoint, (options.duration || 1000)/2);}} window.VisualEnhancer = VisualEnhancer;}

// DYNAMIC STYLES
(() => {
    const styleId = 'interactive-story-dynamic-styles';
    if (document.getElementById(styleId)) return;
    const ds = document.createElement('style'); ds.id = styleId;
    ds.textContent = `
        #loading-indicator{position:fixed;top:0;left:0;width:100%;height:100%;background-color:#000;display:flex;flex-direction:column;justify-content:center;align-items:center;z-index:10000;transition:opacity .5s ease}
        #loading-indicator.fade-out{opacity:0;pointer-events:none}
        .loading-spinner{width:50px;height:50px;border:5px solid rgba(255,255,255,.3);border-radius:50%;border-top-color:#fff;animation:spin 1s ease-in-out infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        .loading-text{margin-top:20px;color:#fff;font-size:18px}
        #error-message{position:fixed;top:0;left:0;width:100%;height:100%;background-color:rgba(0,0,0,.9);display:flex;flex-direction:column;justify-content:center;align-items:center;z-index:10000;color:#fff}
        .error-icon{font-size:48px;margin-bottom:20px}
        .error-text{font-size:18px;margin-bottom:20px;text-align:center;max-width:80%}
        .error-button{padding:10px 20px;background-color:#f36;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:16px}
        .error-button:hover{background-color:#d02552}
        .completion-message{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background-color:rgba(10,10,20,.95);padding:30px;border-radius:12px;text-align:center;color:#eee;z-index:9990;max-width:550px;box-shadow:0 0 30px rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.1);transition:opacity .5s ease}
        .completion-message.fade-out-completion{opacity:0}
        .completion-message h2{margin-top:0;margin-bottom:15px;color:var(--epic-gold,#ffc107);font-size:1.8em}
        .completion-message p{font-size:1.1em;line-height:1.6;margin-bottom:10px}
        .mode-selection-container{position:absolute;top:20px;right:20px;z-index:9995}
        .mode-selection{display:flex;gap:10px}
        .mode-button{padding:8px 15px;background:rgba(25,25,50,.7);color:#ddd;border:1px solid #557;border-radius:5px;cursor:pointer;transition:all .3s}
        .mode-button:hover:not(:disabled){background:rgba(50,50,80,.9);color:#fff;border-color:#779}
        .mode-button.active{background:var(--accent-cyan,#00e5ff);color:#000;border-color:var(--accent-cyan,#00e5ff);font-weight:bold}
        .mode-button:disabled{opacity:.5;cursor:not-allowed}
        #text-display{color:var(--text-color,#fff)}
        .text-fade-in{animation:fadeInAnimation .8s ease forwards}
        .text-fade-out{animation:fadeOutAnimation .5s ease forwards}
        @keyframes fadeInAnimation{from{opacity:0}to{opacity:1}}
        @keyframes fadeOutAnimation{from{opacity:1}to{opacity:0}}
        .initial-prompt{font-size:1.2em; color: #aaa; padding: 2em; font-style: italic;}
        .standard-text { /* Add specific base styles for standard mode text if needed */ }
    `;
    document.head.appendChild(ds);
})();