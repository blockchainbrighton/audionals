// enhanced-controls.js

import EnvelopeManager from './envelope-manager.js';
import AudioSafety from './audio-safety.js';
import { EnhancedEffects } from './enhanced-effects.js';

const EnhancedControls = {
    init() {
        EnvelopeManager.init();
        AudioSafety.init();

        const panel = document.getElementById('control-panel');
        panel.innerHTML = this.panelHTML();

        EnhancedEffects.init();

        this.setupToggles(panel);
        this.setupEffects(panel);
        this.setupAudioSafety(panel);
        this.setupEnvelope(panel);
        this.setupOscillator(panel);
        this.updateAllDisplayValues();
    },

    panelHTML() {
        // Helper for composing control groups
        const group = (title, id, content, expanded = false) =>
            `<div class="control-group">
                <div class="group-title-row" id="${id}_title_row">
                    <input type="checkbox" id="${id}_toggle" class="group-toggle" ${expanded ? "checked" : ""} />
                    <h3 style="margin:0;flex:1 1 auto;">${title}</h3>
                </div>
                <div id="${id}_content" class="group-content${expanded ? "" : " group-content-collapsed"}">
                    ${content}
                </div>
            </div>`;

        // All control blocks (no code changed, only reduced duplication)
        return `<div class="control-panel">
            ${group('Audio Safety', 'audio', `
                <div class="control-row">
                    <span class="control-label">Master Volume</span>
                    <input type="range" id="masterVolume" min="0" max="1" step="0.01" value="0.7">
                    <input type="number" id="masterVolumeInput" min="0" max="1" step="0.01" value="0.7" style="width:58px; margin-left:7px;">
                    <span class="control-value" id="masterVolumeVal">70%</span>
                </div>
                <div class="control-row">
                    <span class="control-label">Limiter Threshold</span>
                    <input type="range" id="limiterThreshold" min="-20" max="0" step="0.1" value="-3">
                    <input type="number" id="limiterThresholdInput" min="-20" max="0" step="0.1" value="-3" style="width:62px; margin-left:7px;">
                    <span class="control-value" id="limiterThresholdVal">-3dB</span>
                </div>
                <div class="control-row">
                    <span class="control-label" id="voiceCount">Voices: 0/16</span>
                    <button id="emergencyStop" class="emergency-button">Emergency Stop</button>
                </div>
            `)}
            ${group('Envelope (ADSR)', 'env', /* ...unchanged... */`
                <div class="control-row"><span class="control-label">Preset</span>
                <select id="envelopePreset">
                    <option value="">Custom</option>
                    <option value="piano">Piano</option>
                    <option value="organ">Organ</option>
                    <option value="strings">Strings</option>
                    <option value="brass">Brass</option>
                    <option value="pad">Pad</option>
                    <option value="pluck">Pluck</option>
                    <option value="bass">Bass</option>
                </select></div>
                <div class="control-row"><span class="control-label">Attack</span>
                <input type="range" id="envelopeAttack" min="0.001" max="5" step="0.001" value="0.01">
                <input type="number" id="envelopeAttackInput" min="0.001" max="5" step="0.001" value="0.01" style="width:65px; margin-left:7px;">
                <span class="control-value" id="envelopeAttackVal">0.010</span></div>
                <div class="control-row"><span class="control-label">Decay</span>
                <input type="range" id="envelopeDecay" min="0.001" max="5" step="0.001" value="0.1">
                <input type="number" id="envelopeDecayInput" min="0.001" max="5" step="0.001" value="0.1" style="width:65px; margin-left:7px;">
                <span class="control-value" id="envelopeDecayVal">0.100</span></div>
                <div class="control-row"><span class="control-label">Sustain</span>
                <input type="range" id="envelopeSustain" min="0" max="1" step="0.01" value="0.7">
                <input type="number" id="envelopeSustainInput" min="0" max="1" step="0.01" value="0.7" style="width:58px; margin-left:7px;">
                <span class="control-value" id="envelopeSustainVal">0.70</span></div>
                <div class="control-row"><span class="control-label">Release</span>
                <input type="range" id="envelopeRelease" min="0.001" max="5" step="0.001" value="0.3">
                <input type="number" id="envelopeReleaseInput" min="0.001" max="5" step="0.001" value="0.3" style="width:65px; margin-left:7px;">
                <span class="control-value" id="envelopeReleaseVal">0.300</span></div>
            `)}
            ${group('Oscillator', 'osc', /* ...unchanged... */`
                <div class="control-row">
                    <span class="control-label">Waveform</span>
                    <select id="waveform"><option>sine</option><option>square</option><option>sawtooth</option><option>triangle</option></select>
                </div>
                <div class="control-row">
                    <span class="control-label">Detune</span>
                    <input type="range" id="detune" min="-50" max="50" value="0">
                    <input type="number" id="detuneInput" min="-50" max="50" value="0" style="width:58px; margin-left:7px;">
                    <span class="control-value" id="detuneVal">0</span>
                </div>
            `)}
            ${group('Filter & LFO', 'filter', /* ...unchanged... */`
                <div class="control-row"><label class="enable-switch"><input type="checkbox" id="filterEnable" checked><span class="slider"></span></label><span class="control-label">Filter Enable</span></div>