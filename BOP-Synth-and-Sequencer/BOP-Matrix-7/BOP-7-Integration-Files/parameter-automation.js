/**
 * @file parameter-automation.js
 * @description Step-based parameter control and automation system for BVST instruments
 * Provides sophisticated parameter mapping, automation curves, and real-time modulation
 */

import { BVSTUtils } from './bvst-interface.js';

/**
 * Parameter Automation Engine
 * Handles step-based parameter control, automation curves, and real-time modulation
 */
export class ParameterAutomationEngine {
    constructor(sequencer) {
        this.sequencer = sequencer;
        this.Tone = sequencer.Tone;
        
        // Active automation instances
        this.activeAutomations = new Map();
        
        // Automation curves library
        this.curves = this.initializeCurves();
        
        // Performance optimization
        this.automationPool = [];
        this.maxPoolSize = 100;
        
        console.log('[ParameterAutomationEngine] Initialized automation engine');
    }

    /**
     * Initialize automation curve functions
     */
    initializeCurves() {
        return {
            linear: (t) => t,
            exponential: (t) => t * t,
            logarithmic: (t) => Math.sqrt(t),
            sine: (t) => Math.sin(t * Math.PI / 2),
            cosine: (t) => 1 - Math.cos(t * Math.PI / 2),
            smoothstep: (t) => t * t * (3 - 2 * t),
            smootherstep: (t) => t * t * t * (t * (t * 6 - 15) + 10),
            bounce: (t) => {
                if (t < 1/2.75) return 7.5625 * t * t;
                if (t < 2/2.75) return 7.5625 * (t -= 1.5/2.75) * t + 0.75;
                if (t < 2.5/2.75) return 7.5625 * (t -= 2.25/2.75) * t + 0.9375;
                return 7.5625 * (t -= 2.625/2.75) * t + 0.984375;
            },
            elastic: (t) => {
                if (t === 0 || t === 1) return t;
                const p = 0.3;
                const s = p / 4;
                return -(Math.pow(2, 10 * (t -= 1)) * Math.sin((t - s) * (2 * Math.PI) / p));
            }
        };
    }

    /**
     * Schedule parameter automation for a step
     */
    scheduleStepAutomation(channel, stepIndex, time) {
        if (!channel.instrument) {
            return;
        }

        const stepData = channel.getStepData(stepIndex);
        if (!stepData || !stepData.active) {
            return;
        }

        // Apply immediate parameter changes
        this.applyStepParameters(channel, stepData.data, time);
        
        // Schedule automation curves
        this.scheduleAutomationCurves(channel, stepData.data, time);
    }

    /**
     * Apply immediate parameter changes
     */
    applyStepParameters(channel, stepData, time) {
        if (!stepData.parameters) {
            return;
        }

        for (const [paramPath, value] of Object.entries(stepData.parameters)) {
            const mapping = channel.getParameterMapping(paramPath);
            if (mapping && mapping.enabled) {
                try {
                    // Apply parameter change at the specified time
                    this.scheduleParameterChange(channel.instrument, paramPath, value, time);
                } catch (error) {
                    console.error(`[ParameterAutomationEngine] Error applying parameter ${paramPath}:`, error);
                }
            }
        }
    }

    /**
     * Schedule automation curves
     */
    scheduleAutomationCurves(channel, stepData, time) {
        if (!stepData.automation) {
            return;
        }

        for (const [paramPath, automation] of Object.entries(stepData.automation)) {
            const mapping = channel.getParameterMapping(paramPath);
            if (mapping && mapping.enabled) {
                try {
                    this.scheduleAutomationCurve(channel.instrument, paramPath, automation, time);
                } catch (error) {
                    console.error(`[ParameterAutomationEngine] Error scheduling automation for ${paramPath}:`, error);
                }
            }
        }
    }

    /**
     * Schedule a parameter change at a specific time
     */
    scheduleParameterChange(instrument, paramPath, value, time) {
        const descriptor = instrument.getParameterDescriptor(paramPath);
        if (!descriptor) {
            console.warn(`[ParameterAutomationEngine] Unknown parameter: ${paramPath}`);
            return;
        }

        // Validate and clamp value
        const validatedValue = instrument.validateParameterValue(descriptor, value);

        // Schedule the change
        this.Tone.Transport.scheduleOnce(() => {
            instrument.setParameter(paramPath, validatedValue);
        }, time);
    }

    /**
     * Schedule an automation curve
     */
    scheduleAutomationCurve(instrument, paramPath, automation, startTime) {
        const descriptor = instrument.getParameterDescriptor(paramPath);
        if (!descriptor) {
            console.warn(`[ParameterAutomationEngine] Unknown parameter: ${paramPath}`);
            return;
        }

        const {
            start,
            end,
            duration,
            curve = 'linear',
            steps = 32,
            loop = false,
            loopCount = 1
        } = automation;

        // Parse duration
        const durationSeconds = this.parseDuration(duration);
        if (durationSeconds <= 0) {
            console.warn('[ParameterAutomationEngine] Invalid automation duration');
            return;
        }

        // Get curve function
        const curveFunction = this.curves[curve] || this.curves.linear;

        // Create automation instance
        const automationId = this.generateAutomationId();
        const automationInstance = {
            id: automationId,
            instrument,
            paramPath,
            descriptor,
            start: instrument.validateParameterValue(descriptor, start),
            end: instrument.validateParameterValue(descriptor, end),
            duration: durationSeconds,
            curve: curveFunction,
            steps,
            startTime,
            endTime: startTime + durationSeconds,
            loop,
            loopCount,
            currentLoop: 0,
            active: true
        };

        // Store active automation
        this.activeAutomations.set(automationId, automationInstance);

        // Schedule automation steps
        this.scheduleAutomationSteps(automationInstance);

        // Schedule cleanup
        const totalDuration = loop ? durationSeconds * loopCount : durationSeconds;
        this.Tone.Transport.scheduleOnce(() => {
            this.cleanupAutomation(automationId);
        }, startTime + totalDuration);
    }

    /**
     * Schedule individual automation steps
     */
    scheduleAutomationSteps(automation) {
        const stepDuration = automation.duration / automation.steps;
        
        for (let step = 0; step <= automation.steps; step++) {
            const t = step / automation.steps;
            const curveValue = automation.curve(t);
            const paramValue = BVSTUtils.lerp(automation.start, automation.end, curveValue);
            const stepTime = automation.startTime + (step * stepDuration);

            this.Tone.Transport.scheduleOnce(() => {
                if (automation.active) {
                    automation.instrument.setParameter(automation.paramPath, paramValue);
                }
            }, stepTime);
        }

        // Schedule loop if needed
        if (automation.loop && automation.currentLoop < automation.loopCount - 1) {
            this.Tone.Transport.scheduleOnce(() => {
                if (automation.active) {
                    automation.currentLoop++;
                    automation.startTime = automation.endTime;
                    automation.endTime = automation.startTime + automation.duration;
                    this.scheduleAutomationSteps(automation);
                }
            }, automation.endTime);
        }
    }

    /**
     * Parse duration string to seconds
     */
    parseDuration(duration) {
        if (typeof duration === 'number') {
            return duration;
        }

        if (typeof duration === 'string') {
            // Handle note values
            const noteValues = {
                '1n': 4,    // whole note
                '2n': 2,    // half note
                '4n': 1,    // quarter note
                '8n': 0.5,  // eighth note
                '16n': 0.25, // sixteenth note
                '32n': 0.125 // thirty-second note
            };

            if (noteValues[duration]) {
                // Convert to seconds based on current BPM
                const bpm = this.sequencer.projectData.bpm;
                const quarterNoteSeconds = 60 / bpm;
                return noteValues[duration] * quarterNoteSeconds;
            }

            // Handle time strings like "1.5s", "500ms"
            const timeMatch = duration.match(/^(\d+(?:\.\d+)?)(s|ms)$/);
            if (timeMatch) {
                const value = parseFloat(timeMatch[1]);
                const unit = timeMatch[2];
                return unit === 'ms' ? value / 1000 : value;
            }
        }

        console.warn(`[ParameterAutomationEngine] Invalid duration: ${duration}`);
        return 0.25; // Default to 16th note
    }

    /**
     * Generate unique automation ID
     */
    generateAutomationId() {
        return `automation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Cleanup automation instance
     */
    cleanupAutomation(automationId) {
        const automation = this.activeAutomations.get(automationId);
        if (automation) {
            automation.active = false;
            this.activeAutomations.delete(automationId);
            
            // Return to pool for reuse
            if (this.automationPool.length < this.maxPoolSize) {
                this.automationPool.push(automation);
            }
        }
    }

    /**
     * Stop all active automations
     */
    stopAllAutomations() {
        for (const [id, automation] of this.activeAutomations) {
            automation.active = false;
        }
        this.activeAutomations.clear();
        console.log('[ParameterAutomationEngine] Stopped all automations');
    }

    /**
     * Stop automations for a specific instrument
     */
    stopInstrumentAutomations(instrument) {
        const toRemove = [];
        
        for (const [id, automation] of this.activeAutomations) {
            if (automation.instrument === instrument) {
                automation.active = false;
                toRemove.push(id);
            }
        }
        
        toRemove.forEach(id => this.activeAutomations.delete(id));
        console.log(`[ParameterAutomationEngine] Stopped ${toRemove.length} automations for instrument`);
    }

    /**
     * Get active automation count
     */
    getActiveAutomationCount() {
        return this.activeAutomations.size;
    }
}

/**
 * Parameter Mapping Manager
 * Manages parameter mappings between sequencer steps and instrument parameters
 */
export class ParameterMappingManager {
    constructor(channel) {
        this.channel = channel;
        this.mappings = new Map();
        this.presets = this.initializePresets();
        
        console.log('[ParameterMappingManager] Initialized parameter mapping manager');
    }

    /**
     * Initialize mapping presets
     */
    initializePresets() {
        return {
            'filter-sweep': {
                name: 'Filter Sweep',
                description: 'Classic filter cutoff sweep',
                mappings: {
                    'filter.frequency': {
                        enabled: true,
                        mode: 'absolute',
                        curve: 'exponential',
                        range: [200, 8000]
                    }
                }
            },
            'envelope-punch': {
                name: 'Envelope Punch',
                description: 'Punchy envelope modulation',
                mappings: {
                    'envelope.attack': {
                        enabled: true,
                        mode: 'absolute',
                        curve: 'exponential',
                        range: [0.001, 0.1]
                    },
                    'envelope.decay': {
                        enabled: true,
                        mode: 'absolute',
                        curve: 'linear',
                        range: [0.05, 0.5]
                    }
                }
            },
            'vibrato-expression': {
                name: 'Vibrato Expression',
                description: 'Musical vibrato modulation',
                mappings: {
                    'vibrato.frequency': {
                        enabled: true,
                        mode: 'absolute',
                        curve: 'sine',
                        range: [2, 8]
                    },
                    'vibrato.depth': {
                        enabled: true,
                        mode: 'absolute',
                        curve: 'smoothstep',
                        range: [0, 0.3]
                    }
                }
            },
            'distortion-drive': {
                name: 'Distortion Drive',
                description: 'Progressive distortion buildup',
                mappings: {
                    'distortion.wet': {
                        enabled: true,
                        mode: 'absolute',
                        curve: 'exponential',
                        range: [0, 0.8]
                    }
                }
            }
        };
    }

    /**
     * Set parameter mapping
     */
    setMapping(parameterPath, mapping) {
        if (!this.channel.instrument) {
            console.warn('[ParameterMappingManager] No instrument loaded');
            return false;
        }

        const descriptor = this.channel.instrument.getParameterDescriptor(parameterPath);
        if (!descriptor) {
            console.warn(`[ParameterMappingManager] Unknown parameter: ${parameterPath}`);
            return false;
        }

        if (!descriptor.automatable) {
            console.warn(`[ParameterMappingManager] Parameter not automatable: ${parameterPath}`);
            return false;
        }

        const fullMapping = {
            enabled: mapping.enabled !== false,
            mode: mapping.mode || 'absolute',
            curve: mapping.curve || descriptor.curve || 'linear',
            range: mapping.range || [descriptor.min, descriptor.max],
            invert: mapping.invert || false,
            quantize: mapping.quantize || false,
            quantizeSteps: mapping.quantizeSteps || 12
        };

        this.mappings.set(parameterPath, fullMapping);
        
        console.log(`[ParameterMappingManager] Set mapping for ${parameterPath}`);
        return true;
    }

    /**
     * Get parameter mapping
     */
    getMapping(parameterPath) {
        return this.mappings.get(parameterPath) || null;
    }

    /**
     * Remove parameter mapping
     */
    removeMapping(parameterPath) {
        const removed = this.mappings.delete(parameterPath);
        if (removed) {
            console.log(`[ParameterMappingManager] Removed mapping for ${parameterPath}`);
        }
        return removed;
    }

    /**
     * Get all mappings
     */
    getAllMappings() {
        return Object.fromEntries(this.mappings);
    }

    /**
     * Clear all mappings
     */
    clearAllMappings() {
        this.mappings.clear();
        console.log('[ParameterMappingManager] Cleared all mappings');
    }

    /**
     * Apply preset mappings
     */
    applyPreset(presetName) {
        const preset = this.presets[presetName];
        if (!preset) {
            console.warn(`[ParameterMappingManager] Unknown preset: ${presetName}`);
            return false;
        }

        let appliedCount = 0;
        for (const [paramPath, mapping] of Object.entries(preset.mappings)) {
            if (this.setMapping(paramPath, mapping)) {
                appliedCount++;
            }
        }

        console.log(`[ParameterMappingManager] Applied preset '${presetName}' (${appliedCount} mappings)`);
        return appliedCount > 0;
    }

    /**
     * Get available presets
     */
    getAvailablePresets() {
        return Object.keys(this.presets).map(key => ({
            id: key,
            ...this.presets[key]
        }));
    }

    /**
     * Create custom preset from current mappings
     */
    createPreset(name, description) {
        const preset = {
            name,
            description,
            mappings: this.getAllMappings()
        };

        this.presets[name.toLowerCase().replace(/\s+/g, '-')] = preset;
        
        console.log(`[ParameterMappingManager] Created preset '${name}'`);
        return preset;
    }

    /**
     * Map step value to parameter value
     */
    mapStepValue(parameterPath, stepValue, stepIndex = 0) {
        const mapping = this.getMapping(parameterPath);
        if (!mapping || !mapping.enabled) {
            return stepValue;
        }

        let mappedValue = stepValue;

        // Apply range mapping
        if (mapping.range) {
            const [min, max] = mapping.range;
            mappedValue = BVSTUtils.map(stepValue, 0, 1, min, max);
        }

        // Apply inversion
        if (mapping.invert) {
            mappedValue = 1 - mappedValue;
        }

        // Apply quantization
        if (mapping.quantize && mapping.quantizeSteps > 1) {
            const step = 1 / (mapping.quantizeSteps - 1);
            mappedValue = Math.round(mappedValue / step) * step;
        }

        return mappedValue;
    }

    /**
     * Generate automation curve between two values
     */
    generateAutomationCurve(parameterPath, startValue, endValue, duration, options = {}) {
        const mapping = this.getMapping(parameterPath);
        const curve = options.curve || mapping?.curve || 'linear';
        
        return {
            start: this.mapStepValue(parameterPath, startValue),
            end: this.mapStepValue(parameterPath, endValue),
            duration,
            curve,
            steps: options.steps || 32,
            loop: options.loop || false,
            loopCount: options.loopCount || 1
        };
    }
}

/**
 * Step Parameter Editor
 * Provides UI and logic for editing step-based parameter data
 */
export class StepParameterEditor {
    constructor(channel, stepIndex) {
        this.channel = channel;
        this.stepIndex = stepIndex;
        this.stepData = channel.getStepData(stepIndex);
        this.mappingManager = new ParameterMappingManager(channel);
        
        this.uiContainer = null;
        this.parameterControls = new Map();
        
        console.log(`[StepParameterEditor] Created editor for step ${stepIndex}`);
    }

    /**
     * Create parameter editor UI
     */
    createUI(container) {
        this.uiContainer = container;
        container.innerHTML = '';

        if (!this.channel.instrument) {
            container.innerHTML = '<p>No instrument loaded</p>';
            return;
        }

        // Create main container
        const editorDiv = document.createElement('div');
        editorDiv.className = 'step-parameter-editor';

        // Create header
        const header = document.createElement('div');
        header.className = 'editor-header';
        header.innerHTML = `
            <h4>Step ${this.stepIndex + 1} Parameters</h4>
            <div class="step-controls">
                <label>
                    <input type="checkbox" id="stepActive" ${this.stepData.active ? 'checked' : ''}>
                    Active
                </label>
            </div>
        `;

        // Create note control
        const noteSection = this.createNoteSection();
        
        // Create parameter sections
        const parameterSections = this.createParameterSections();

        // Create automation section
        const automationSection = this.createAutomationSection();

        editorDiv.appendChild(header);
        editorDiv.appendChild(noteSection);
        editorDiv.appendChild(parameterSections);
        editorDiv.appendChild(automationSection);

        container.appendChild(editorDiv);

        // Bind events
        this.bindEvents();
    }

    /**
     * Create note control section
     */
    createNoteSection() {
        const section = document.createElement('div');
        section.className = 'parameter-section';
        section.innerHTML = `
            <h5>Note</h5>
            <div class="control-row">
                <label>Note:</label>
                <select id="stepNote">
                    ${this.generateNoteOptions()}
                </select>
                <label>Velocity:</label>
                <input type="range" id="stepVelocity" min="0" max="1" step="0.01" value="${this.stepData.data.velocity || 0.8}">
                <span id="velocityValue">${Math.round((this.stepData.data.velocity || 0.8) * 100)}%</span>
            </div>
        `;

        return section;
    }

    /**
     * Generate note options for select
     */
    generateNoteOptions() {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octaves = [2, 3, 4, 5, 6, 7];
        
        let options = '';
        octaves.forEach(octave => {
            notes.forEach(note => {
                const noteName = `${note}${octave}`;
                const selected = noteName === (this.stepData.data.note || 'C4') ? 'selected' : '';
                options += `<option value="${noteName}" ${selected}>${noteName}</option>`;
            });
        });

        return options;
    }

    /**
     * Create parameter control sections
     */
    createParameterSections() {
        const container = document.createElement('div');
        container.className = 'parameter-sections';

        if (!this.channel.instrument) {
            return container;
        }

        // Group parameters by category
        const parameters = this.channel.instrument.getAllParameterDescriptors();
        const categories = this.groupParametersByCategory(parameters);

        for (const [category, params] of Object.entries(categories)) {
            const section = this.createParameterCategorySection(category, params);
            container.appendChild(section);
        }

        return container;
    }

    /**
     * Group parameters by category
     */
    groupParametersByCategory(parameters) {
        const categories = {};
        
        parameters.forEach(param => {
            const category = param.category || 'general';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(param);
        });

        return categories;
    }

    /**
     * Create parameter category section
     */
    createParameterCategorySection(category, parameters) {
        const section = document.createElement('div');
        section.className = 'parameter-category';
        
        const header = document.createElement('h5');
        header.textContent = this.capitalizeFirst(category);
        section.appendChild(header);

        parameters.forEach(param => {
            if (param.automatable) {
                const control = this.createParameterControl(param);
                section.appendChild(control);
            }
        });

        return section;
    }

    /**
     * Create control for a parameter
     */
    createParameterControl(param) {
        const controlRow = document.createElement('div');
        controlRow.className = 'parameter-control-row';

        const currentValue = this.stepData.data.parameters?.[param.path] || param.default;
        const mapping = this.mappingManager.getMapping(param.path);

        controlRow.innerHTML = `
            <div class="parameter-info">
                <label>
                    <input type="checkbox" class="param-enable" data-param="${param.path}" ${mapping?.enabled ? 'checked' : ''}>
                    ${param.name}
                </label>
            </div>
            <div class="parameter-control">
                ${this.createParameterInput(param, currentValue)}
            </div>
            <div class="parameter-mapping">
                <button class="mapping-btn" data-param="${param.path}">Map</button>
            </div>
        `;

        this.parameterControls.set(param.path, controlRow);
        return controlRow;
    }

    /**
     * Create input for parameter based on type
     */
    createParameterInput(param, currentValue) {
        switch (param.type) {
            case 'number':
                return `
                    <input type="range" class="param-slider" data-param="${param.path}" 
                           min="${param.min}" max="${param.max}" step="${(param.max - param.min) / 1000}" 
                           value="${currentValue}">
                    <span class="param-value">${currentValue.toFixed(3)}${param.unit}</span>
                `;
            case 'boolean':
                return `
                    <input type="checkbox" class="param-checkbox" data-param="${param.path}" 
                           ${currentValue ? 'checked' : ''}>
                `;
            case 'enum':
                const options = param.options.map(opt => 
                    `<option value="${opt}" ${opt === currentValue ? 'selected' : ''}>${opt}</option>`
                ).join('');
                return `
                    <select class="param-select" data-param="${param.path}">
                        ${options}
                    </select>
                `;
            default:
                return `<span>Unsupported parameter type</span>`;
        }
    }

    /**
     * Create automation section
     */
    createAutomationSection() {
        const section = document.createElement('div');
        section.className = 'automation-section';
        section.innerHTML = `
            <h5>Automation</h5>
            <div class="automation-controls">
                <button id="addAutomation">Add Automation</button>
                <select id="automationPresets">
                    <option value="">Select Preset...</option>
                    ${this.generatePresetOptions()}
                </select>
            </div>
            <div id="automationList" class="automation-list"></div>
        `;

        return section;
    }

    /**
     * Generate preset options
     */
    generatePresetOptions() {
        const presets = this.mappingManager.getAvailablePresets();
        return presets.map(preset => 
            `<option value="${preset.id}">${preset.name}</option>`
        ).join('');
    }

    /**
     * Bind UI events
     */
    bindEvents() {
        if (!this.uiContainer) return;

        // Step active toggle
        const stepActiveCheckbox = this.uiContainer.querySelector('#stepActive');
        stepActiveCheckbox?.addEventListener('change', (e) => {
            this.stepData.active = e.target.checked;
            this.updateStepData();
        });

        // Note controls
        const noteSelect = this.uiContainer.querySelector('#stepNote');
        noteSelect?.addEventListener('change', (e) => {
            this.stepData.data.note = e.target.value;
            this.updateStepData();
        });

        const velocitySlider = this.uiContainer.querySelector('#stepVelocity');
        const velocityValue = this.uiContainer.querySelector('#velocityValue');
        velocitySlider?.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.stepData.data.velocity = value;
            velocityValue.textContent = `${Math.round(value * 100)}%`;
            this.updateStepData();
        });

        // Parameter controls
        this.bindParameterControls();

        // Automation controls
        this.bindAutomationControls();
    }

    /**
     * Bind parameter control events
     */
    bindParameterControls() {
        // Parameter enable checkboxes
        this.uiContainer.querySelectorAll('.param-enable').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const paramPath = e.target.dataset.param;
                const enabled = e.target.checked;
                
                const mapping = this.mappingManager.getMapping(paramPath) || {};
                mapping.enabled = enabled;
                this.mappingManager.setMapping(paramPath, mapping);
            });
        });

        // Parameter sliders
        this.uiContainer.querySelectorAll('.param-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const paramPath = e.target.dataset.param;
                const value = parseFloat(e.target.value);
                
                this.setStepParameter(paramPath, value);
                
                // Update value display
                const valueSpan = e.target.nextElementSibling;
                if (valueSpan) {
                    const descriptor = this.channel.instrument.getParameterDescriptor(paramPath);
                    valueSpan.textContent = `${value.toFixed(3)}${descriptor?.unit || ''}`;
                }
            });
        });

        // Parameter checkboxes
        this.uiContainer.querySelectorAll('.param-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const paramPath = e.target.dataset.param;
                const value = e.target.checked;
                this.setStepParameter(paramPath, value);
            });
        });

        // Parameter selects
        this.uiContainer.querySelectorAll('.param-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const paramPath = e.target.dataset.param;
                const value = e.target.value;
                this.setStepParameter(paramPath, value);
            });
        });
    }

    /**
     * Bind automation control events
     */
    bindAutomationControls() {
        // Preset selector
        const presetSelect = this.uiContainer.querySelector('#automationPresets');
        presetSelect?.addEventListener('change', (e) => {
            if (e.target.value) {
                this.mappingManager.applyPreset(e.target.value);
                this.refreshUI();
            }
        });
    }

    /**
     * Set step parameter value
     */
    setStepParameter(paramPath, value) {
        if (!this.stepData.data.parameters) {
            this.stepData.data.parameters = {};
        }
        
        this.stepData.data.parameters[paramPath] = value;
        this.updateStepData();
    }

    /**
     * Update step data in channel
     */
    updateStepData() {
        this.channel.setStepData(this.stepIndex, this.stepData);
    }

    /**
     * Refresh UI to reflect current state
     */
    refreshUI() {
        if (this.uiContainer) {
            this.createUI(this.uiContainer);
        }
    }

    /**
     * Utility function to capitalize first letter
     */
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Destroy the editor
     */
    destroy() {
        this.parameterControls.clear();
        if (this.uiContainer) {
            this.uiContainer.innerHTML = '';
        }
    }
}

export { ParameterAutomationEngine, ParameterMappingManager, StepParameterEditor };

