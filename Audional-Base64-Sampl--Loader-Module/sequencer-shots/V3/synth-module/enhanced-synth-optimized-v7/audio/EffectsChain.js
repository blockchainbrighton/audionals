/**
 * EffectsChain - Modular audio effects processing
 * Manages all audio effects with enable/disable and parameter control
 */
import { audioEngine } from '../core/AudioEngine.js';
import { stateManager } from '../core/StateManager.js';
import { eventBus, EVENTS } from '../core/EventBus.js';
import { errorHandler } from '../core/ErrorHandler.js';
import { configManager } from '../core/ConfigManager.js';

export class EffectsChain {
    constructor() {
        this.effects = new Map();
        this.effectOrder = [];
        this.inputNode = null;
        this.outputNode = null;
        this.bypassNodes = new Map();
        this.isInitialized = false;
        
        this.setupEventListeners();
    }

    /**
     * Initialize the effects chain
     * @returns {Promise<boolean>} Success
     */
    async initialize() {
        if (this.isInitialized) {
            return true;
        }

        try {
            // Wait for audio engine to be ready
            if (!audioEngine.isReady) {
                await new Promise(resolve => {
                    eventBus.once(EVENTS.AUDIO_CONTEXT_READY, resolve);
                });
            }

            this.createEffects();
            this.setupEffectChain();
            this.loadStateFromManager();
            
            this.isInitialized = true;
            errorHandler.info('Effects chain initialized');
            return true;
            
        } catch (error) {
            errorHandler.handleAudioError(error, {
                operation: 'initialize',
                context: 'EffectsChain.initialize'
            });
            return false;
        }
    }

    /**
     * Create all audio effects
     */
    createEffects() {
        const context = audioEngine.context;
        
        // Create input and output nodes
        this.inputNode = context.createGain();
        this.outputNode = context.createGain();
        
        // Filter effect
        this.effects.set('filter', {
            node: context.createBiquadFilter(),
            lfo: context.createOscillator(),
            lfoGain: context.createGain(),
            enabled: true,
            lfoEnabled: false,
            type: 'filter',
            parameters: {
                type: 'lowpass',
                frequency: 5000,
                Q: 1,
                lfoRate: 0.5,
                lfoDepth: 0.5
            }
        });

        // Reverb effect
        this.effects.set('reverb', {
            node: context.createConvolver(),
            wetGain: context.createGain(),
            dryGain: context.createGain(),
            enabled: true,
            type: 'reverb',
            parameters: {
                decay: 2,
                wet: 0.3,
                roomSize: 0.7
            }
        });

        // Delay effect
        this.effects.set('delay', {
            node: context.createDelay(configManager.get('effects.maxDelayTime', 2)),
            feedback: context.createGain(),
            wetGain: context.createGain(),
            dryGain: context.createGain(),
            enabled: true,
            type: 'delay',
            parameters: {
                delayTime: 0.25,
                feedback: 0.3,
                wet: 0.2
            }
        });

        // Chorus effect
        this.effects.set('chorus', {
            delay: context.createDelay(0.1),
            lfo: context.createOscillator(),
            lfoGain: context.createGain(),
            wetGain: context.createGain(),
            dryGain: context.createGain(),
            enabled: false,
            type: 'chorus',
            parameters: {
                frequency: 1.5,
                delayTime: 0.0035,
                depth: 0.7,
                wet: 0.5
            }
        });

        // Distortion effect
        this.effects.set('distortion', {
            node: context.createWaveShaper(),
            inputGain: context.createGain(),
            outputGain: context.createGain(),
            wetGain: context.createGain(),
            dryGain: context.createGain(),
            enabled: false,
            type: 'distortion',
            parameters: {
                distortion: 0.4,
                wet: 0.3
            }
        });

        // Compressor effect
        this.effects.set('compressor', {
            node: context.createDynamicsCompressor(),
            enabled: true,
            type: 'compressor',
            parameters: {
                threshold: -24,
                ratio: 12,
                attack: 0.003,
                release: 0.25
            }
        });

        // Initialize each effect
        this.initializeFilter();
        this.initializeReverb();
        this.initializeDelay();
        this.initializeChorus();
        this.initializeDistortion();
        this.initializeCompressor();

        // Set effect processing order
        this.effectOrder = ['filter', 'distortion', 'compressor', 'chorus', 'delay', 'reverb'];
    }

    /**
     * Setup the effects processing chain
     */
    setupEffectChain() {
        let currentNode = this.inputNode;
        
        for (const effectName of this.effectOrder) {
            const effect = this.effects.get(effectName);
            if (effect) {
                // Create bypass node for enable/disable functionality
                const bypassNode = this.createBypassNode(effect);
                this.bypassNodes.set(effectName, bypassNode);
                
                // Connect to chain
                currentNode.connect(bypassNode.input);
                currentNode = bypassNode.output;
            }
        }
        
        // Connect final output
        currentNode.connect(this.outputNode);
        
        // Connect output to audio engine
        this.outputNode.connect(audioEngine.masterGain);
    }

    /**
     * Create a bypass node for an effect
     * @param {Object} effect - Effect object
     * @returns {Object} Bypass node with input/output
     */
    createBypassNode(effect) {
        const context = audioEngine.context;
        const input = context.createGain();
        const output = context.createGain();
        const wetGain = context.createGain();
        const dryGain = context.createGain();
        
        // Setup wet/dry mixing
        input.connect(dryGain);
        input.connect(wetGain);
        
        // Connect effect to wet path
        this.connectEffect(effect, wetGain, output);
        
        // Connect dry path
        dryGain.connect(output);
        
        return {
            input,
            output,
            wetGain,
            dryGain,
            setEnabled: (enabled) => {
                if (enabled) {
                    wetGain.gain.value = 1;
                    dryGain.gain.value = 0;
                } else {
                    wetGain.gain.value = 0;
                    dryGain.gain.value = 1;
                }
            }
        };
    }

    /**
     * Connect an effect to the wet signal path
     * @param {Object} effect - Effect object
     * @param {AudioNode} input - Input node
     * @param {AudioNode} output - Output node
     */
    connectEffect(effect, input, output) {
        switch (effect.type) {
            case 'filter':
                input.connect(effect.node);
                effect.node.connect(output);
                break;
                
            case 'reverb':
                input.connect(effect.node);
                effect.node.connect(effect.wetGain);
                input.connect(effect.dryGain);
                effect.wetGain.connect(output);
                effect.dryGain.connect(output);
                break;
                
            case 'delay':
                input.connect(effect.dryGain);
                input.connect(effect.node);
                effect.node.connect(effect.feedback);
                effect.feedback.connect(effect.node);
                effect.node.connect(effect.wetGain);
                effect.wetGain.connect(output);
                effect.dryGain.connect(output);
                break;
                
            case 'chorus':
                input.connect(effect.dryGain);
                input.connect(effect.delay);
                effect.delay.connect(effect.wetGain);
                effect.wetGain.connect(output);
                effect.dryGain.connect(output);
                break;
                
            case 'distortion':
                input.connect(effect.inputGain);
                effect.inputGain.connect(effect.node);
                effect.node.connect(effect.outputGain);
                effect.outputGain.connect(effect.wetGain);
                input.connect(effect.dryGain);
                effect.wetGain.connect(output);
                effect.dryGain.connect(output);
                break;
                
            case 'compressor':
                input.connect(effect.node);
                effect.node.connect(output);
                break;
                
            default:
                input.connect(output);
        }
    }

    /**
     * Enable or disable an effect
     * @param {string} effectName - Effect name
     * @param {boolean} enabled - Enable state
     */
    setEffectEnabled(effectName, enabled) {
        const effect = this.effects.get(effectName);
        const bypassNode = this.bypassNodes.get(effectName);
        
        if (effect && bypassNode) {
            effect.enabled = enabled;
            bypassNode.setEnabled(enabled);
            
            stateManager.setState(`effects.${effectName}.enabled`, enabled);
            eventBus.emit(EVENTS.AUDIO_EFFECT_CHANGED, { effectName, enabled });
            
            errorHandler.debug(`Effect ${effectName} ${enabled ? 'enabled' : 'disabled'}`);
        }
    }

    /**
     * Update effect parameter
     * @param {string} effectName - Effect name
     * @param {string} paramName - Parameter name
     * @param {*} value - Parameter value
     */
    setEffectParameter(effectName, paramName, value) {
        const effect = this.effects.get(effectName);
        if (!effect) {
            errorHandler.warn(`Unknown effect: ${effectName}`);
            return;
        }

        try {
            effect.parameters[paramName] = value;
            this.applyEffectParameter(effect, paramName, value);
            
            stateManager.setState(`effects.${effectName}.${paramName}`, value);
            eventBus.emit(EVENTS.AUDIO_PARAMETER_CHANGED, { effectName, paramName, value });
            
            errorHandler.debug(`Effect parameter updated: ${effectName}.${paramName} = ${value}`);
            
        } catch (error) {
            errorHandler.handleAudioError(error, {
                operation: 'setEffectParameter',
                effectName,
                paramName,
                value
            });
        }
    }

    /**
     * Apply a parameter change to an effect
     * @param {Object} effect - Effect object
     * @param {string} paramName - Parameter name
     * @param {*} value - Parameter value
     */
    applyEffectParameter(effect, paramName, value) {
        const context = audioEngine.context;
        const now = context.currentTime;

        switch (effect.type) {
            case 'filter':
                switch (paramName) {
                    case 'type':
                        effect.node.type = value;
                        break;
                    case 'frequency':
                        effect.node.frequency.setValueAtTime(value, now);
                        break;
                    case 'Q':
                        effect.node.Q.setValueAtTime(value, now);
                        break;
                    case 'lfoRate':
                        if (effect.lfo) {
                            effect.lfo.frequency.setValueAtTime(value, now);
                        }
                        break;
                    case 'lfoDepth':
                        if (effect.lfoGain) {
                            effect.lfoGain.gain.setValueAtTime(value * 1000, now);
                        }
                        break;
                }
                break;

            case 'reverb':
                switch (paramName) {
                    case 'wet':
                        effect.wetGain.gain.setValueAtTime(value, now);
                        effect.dryGain.gain.setValueAtTime(1 - value, now);
                        break;
                    case 'decay':
                    case 'roomSize':
                        this.updateReverbImpulse(effect);
                        break;
                }
                break;

            case 'delay':
                switch (paramName) {
                    case 'delayTime':
                        effect.node.delayTime.setValueAtTime(value, now);
                        break;
                    case 'feedback':
                        effect.feedback.gain.setValueAtTime(value, now);
                        break;
                    case 'wet':
                        effect.wetGain.gain.setValueAtTime(value, now);
                        effect.dryGain.gain.setValueAtTime(1 - value, now);
                        break;
                }
                break;

            case 'chorus':
                switch (paramName) {
                    case 'frequency':
                        if (effect.lfo) {
                            effect.lfo.frequency.setValueAtTime(value, now);
                        }
                        break;
                    case 'delayTime':
                        effect.delay.delayTime.setValueAtTime(value, now);
                        break;
                    case 'depth':
                        if (effect.lfoGain) {
                            effect.lfoGain.gain.setValueAtTime(value * 0.002, now);
                        }
                        break;
                    case 'wet':
                        effect.wetGain.gain.setValueAtTime(value, now);
                        effect.dryGain.gain.setValueAtTime(1 - value, now);
                        break;
                }
                break;

            case 'distortion':
                switch (paramName) {
                    case 'distortion':
                        this.updateDistortionCurve(effect, value);
                        break;
                    case 'wet':
                        effect.wetGain.gain.setValueAtTime(value, now);
                        effect.dryGain.gain.setValueAtTime(1 - value, now);
                        break;
                }
                break;

            case 'compressor':
                switch (paramName) {
                    case 'threshold':
                        effect.node.threshold.setValueAtTime(value, now);
                        break;
                    case 'ratio':
                        effect.node.ratio.setValueAtTime(value, now);
                        break;
                    case 'attack':
                        effect.node.attack.setValueAtTime(value, now);
                        break;
                    case 'release':
                        effect.node.release.setValueAtTime(value, now);
                        break;
                }
                break;
        }
    }

    /**
     * Get effect parameter value
     * @param {string} effectName - Effect name
     * @param {string} paramName - Parameter name
     * @returns {*} Parameter value
     */
    getEffectParameter(effectName, paramName) {
        const effect = this.effects.get(effectName);
        return effect ? effect.parameters[paramName] : undefined;
    }

    /**
     * Get all effects status
     * @returns {Object} Effects status
     */
    getEffectsStatus() {
        const status = {};
        for (const [name, effect] of this.effects) {
            status[name] = {
                enabled: effect.enabled,
                parameters: { ...effect.parameters }
            };
        }
        return status;
    }

    /**
     * Get input node for connecting audio sources
     * @returns {AudioNode} Input node
     */
    getInputNode() {
        return this.inputNode;
    }

    /**
     * Get output node for connecting to destination
     * @returns {AudioNode} Output node
     */
    getOutputNode() {
        return this.outputNode;
    }

    // Private initialization methods

    initializeFilter() {
        const effect = this.effects.get('filter');
        const context = audioEngine.context;
        
        // Setup LFO
        effect.lfo = context.createOscillator();
        effect.lfoGain = context.createGain();
        
        effect.lfo.connect(effect.lfoGain);
        effect.lfoGain.connect(effect.node.frequency);
        
        effect.lfo.frequency.value = effect.parameters.lfoRate;
        effect.lfoGain.gain.value = 0; // Start with LFO disabled
        effect.lfo.start();
        
        // Set initial parameters
        effect.node.type = effect.parameters.type;
        effect.node.frequency.value = effect.parameters.frequency;
        effect.node.Q.value = effect.parameters.Q;
    }

    initializeReverb() {
        const effect = this.effects.get('reverb');
        
        // Set initial wet/dry mix
        effect.wetGain.gain.value = effect.parameters.wet;
        effect.dryGain.gain.value = 1 - effect.parameters.wet;
        
        // Generate impulse response
        this.updateReverbImpulse(effect);
    }

    initializeDelay() {
        const effect = this.effects.get('delay');
        
        // Set initial parameters
        effect.node.delayTime.value = effect.parameters.delayTime;
        effect.feedback.gain.value = effect.parameters.feedback;
        effect.wetGain.gain.value = effect.parameters.wet;
        effect.dryGain.gain.value = 1 - effect.parameters.wet;
    }

    initializeChorus() {
        const effect = this.effects.get('chorus');
        const context = audioEngine.context;
        
        // Setup LFO
        effect.lfo = context.createOscillator();
        effect.lfoGain = context.createGain();
        
        effect.lfo.connect(effect.lfoGain);
        effect.lfoGain.connect(effect.delay.delayTime);
        
        effect.lfo.frequency.value = effect.parameters.frequency;
        effect.lfoGain.gain.value = effect.parameters.depth * 0.002;
        effect.lfo.start();
        
        // Set initial parameters
        effect.delay.delayTime.value = effect.parameters.delayTime;
        effect.wetGain.gain.value = effect.parameters.wet;
        effect.dryGain.gain.value = 1 - effect.parameters.wet;
    }

    initializeDistortion() {
        const effect = this.effects.get('distortion');
        
        // Set initial parameters
        effect.inputGain.gain.value = 1;
        effect.outputGain.gain.value = 0.5;
        effect.wetGain.gain.value = effect.parameters.wet;
        effect.dryGain.gain.value = 1 - effect.parameters.wet;
        
        // Generate distortion curve
        this.updateDistortionCurve(effect, effect.parameters.distortion);
    }

    initializeCompressor() {
        const effect = this.effects.get('compressor');
        
        // Set initial parameters
        effect.node.threshold.value = effect.parameters.threshold;
        effect.node.ratio.value = effect.parameters.ratio;
        effect.node.attack.value = effect.parameters.attack;
        effect.node.release.value = effect.parameters.release;
    }

    // Helper methods

    updateReverbImpulse(effect) {
        const context = audioEngine.context;
        const decay = effect.parameters.decay;
        const roomSize = effect.parameters.roomSize;
        
        const length = context.sampleRate * decay;
        const impulse = context.createBuffer(2, length, context.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                const n = length - i;
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(n / length, roomSize);
            }
        }
        
        effect.node.buffer = impulse;
    }

    updateDistortionCurve(effect, amount) {
        const samples = 44100;
        const curve = new Float32Array(samples);
        const deg = Math.PI / 180;
        
        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
        }
        
        effect.node.curve = curve;
        effect.node.oversample = '4x';
    }

    loadStateFromManager() {
        // Load effect states from state manager
        for (const effectName of this.effects.keys()) {
            const enabled = stateManager.getStateValue(`effects.${effectName}.enabled`);
            if (enabled !== undefined) {
                this.setEffectEnabled(effectName, enabled);
            }
            
            // Load parameters
            const effect = this.effects.get(effectName);
            for (const paramName of Object.keys(effect.parameters)) {
                const value = stateManager.getStateValue(`effects.${effectName}.${paramName}`);
                if (value !== undefined) {
                    this.setEffectParameter(effectName, paramName, value);
                }
            }
        }
    }

    setupEventListeners() {
        // Listen for effect enable/disable changes
        for (const effectName of ['filter', 'reverb', 'delay', 'chorus', 'distortion', 'compressor']) {
            stateManager.subscribe(`effects.${effectName}.enabled`, (enabled) => {
                this.setEffectEnabled(effectName, enabled);
            });
        }
    }
}

// Create and export singleton instance
export const effectsChain = new EffectsChain();

