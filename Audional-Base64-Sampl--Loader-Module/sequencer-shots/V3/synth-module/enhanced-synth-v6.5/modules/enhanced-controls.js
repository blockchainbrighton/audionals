// modules/enhanced-controls.js
import { EnhancedEffects } from './enhanced-effects.js';
import { EnvelopeManager, AudioSafety } from './envelope.js';

export const EnhancedControls = {
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
                <div class="control-row"><span class="control-label">Type</span><select id="filterType"><option>lowpass</option><option>highpass</option><option>bandpass</option></select></div>
                <div class="control-row"><span class="control-label">Frequency</span><input type="range" id="filterFreq" min="20" max="20000" value="5000"><input type="number" id="filterFreqInput" min="20" max="20000" value="5000" style="width:80px; margin-left:7px;"><span class="control-value" id="filterFreqVal">5000</span></div>
                <div class="control-row"><span class="control-label">Resonance</span><input type="range" id="filterQ" min="0" max="20" value="1"><input type="number" id="filterQInput" min="0" max="20" value="1" style="width:55px; margin-left:7px;"><span class="control-value" id="filterQVal">1</span></div>
                <div class="control-row"><label class="enable-switch"><input type="checkbox" id="filterLFOEnable"><span class="slider"></span></label><span class="control-label">Filter LFO</span></div>
                <div class="control-row"><span class="control-label">LFO Rate</span><input type="range" id="filterLFORate" min="0.1" max="10" step="0.1" value="0.5"><span class="control-value" id="filterLFORateVal">0.5</span></div>
                <div class="control-row"><span class="control-label">LFO Depth</span><input type="range" id="filterLFODepth" min="0" max="1" step="0.01" value="0.5"><span class="control-value" id="filterLFODepthVal">0.5</span></div>
            `)}
            ${group('Modulation Effects', 'modulation', /* ...unchanged... */`
                <div class="control-row"><label class="enable-switch"><input type="checkbox" id="chorusEnable"><span class="slider"></span></label><span class="control-label">Chorus</span><input type="range" id="chorusWet" min="0" max="1" step="0.01" value="0.5"><span class="control-value" id="chorusWetVal">50%</span></div>
                <div class="control-row"><span class="control-label">Chorus Rate</span><input type="range" id="chorusRate" min="0.1" max="5" step="0.1" value="1.5"><span class="control-value" id="chorusRateVal">1.5</span></div>
                <div class="control-row"><label class="enable-switch"><input type="checkbox" id="phaserEnable"><span class="slider"></span></label><span class="control-label">Phaser</span><input type="range" id="phaserWet" min="0" max="1" step="0.01" value="0.5"><span class="control-value" id="phaserWetVal">50%</span></div>
                <div class="control-row"><span class="control-label">Phaser Rate</span><input type="range" id="phaserRate" min="0.1" max="2" step="0.1" value="0.5"><span class="control-value" id="phaserRateVal">0.5</span></div>
                <div class="control-row"><label class="enable-switch"><input type="checkbox" id="tremoloEnable"><span class="slider"></span></label><span class="control-label">Tremolo</span><input type="range" id="tremoloWet" min="0" max="1" step="0.01" value="0.7"><span class="control-value" id="tremoloWetVal">70%</span></div>
                <div class="control-row"><span class="control-label">Tremolo Rate</span><input type="range" id="tremoloRate" min="1" max="20" step="0.5" value="10"><span class="control-value" id="tremoloRateVal">10</span></div>
                <div class="control-row"><label class="enable-switch"><input type="checkbox" id="vibratoEnable"><span class="slider"></span></label><span class="control-label">Vibrato</span><input type="range" id="vibratoWet" min="0" max="1" step="0.01" value="0.8"><span class="control-value" id="vibratoWetVal">80%</span></div>
                <div class="control-row"><span class="control-label">Vibrato Rate</span><input type="range" id="vibratoRate" min="1" max="15" step="0.5" value="5"><span class="control-value" id="vibratoRateVal">5</span></div>
            `)}
            ${group('Distortion & Dynamics', 'distortion', /* ...unchanged... */`
                <div class="control-row"><label class="enable-switch"><input type="checkbox" id="compressorEnable" checked><span class="slider"></span></label><span class="control-label">Compressor</span></div>
                <div class="control-row"><span class="control-label">Threshold</span><input type="range" id="compressorThreshold" min="-40" max="0" step="1" value="-24"><span class="control-value" id="compressorThresholdVal">-24dB</span></div>
                <div class="control-row"><span class="control-label">Ratio</span><input type="range" id="compressorRatio" min="1" max="20" step="0.5" value="12"><span class="control-value" id="compressorRatioVal">12:1</span></div>
                <div class="control-row"><label class="enable-switch"><input type="checkbox" id="distortionEnable"><span class="slider"></span></label><span class="control-label">Distortion</span><input type="range" id="distortionWet" min="0" max="1" step="0.01" value="0.3"><span class="control-value" id="distortionWetVal">30%</span></div>
                <div class="control-row"><span class="control-label">Drive</span><input type="range" id="distortionDrive" min="0" max="1" step="0.01" value="0.4"><span class="control-value" id="distortionDriveVal">0.4</span></div>
                <div class="control-row"><label class="enable-switch"><input type="checkbox" id="bitCrusherEnable"><span class="slider"></span></label><span class="control-label">BitCrusher</span><input type="range" id="bitCrusherWet" min="0" max="1" step="0.01" value="0.3"><span class="control-value" id="bitCrusherWetVal">30%</span></div>
                <div class="control-row"><span class="control-label">Bits</span><input type="range" id="bitCrusherBits" min="1" max="16" step="1" value="4"><span class="control-value" id="bitCrusherBitsVal">4</span></div>
            `)}
            ${group('Time-Based Effects', 'time', /* ...unchanged... */`
                <div class="control-row"><label class="enable-switch"><input type="checkbox" id="delayEnable" checked><span class="slider"></span></label><span class="control-label">Delay</span><input type="range" id="delay" min="0" max="100" value="20"><input type="number" id="delayInput" min="0" max="100" value="20" style="width:60px; margin-left:7px;"><span class="control-value" id="delayVal">20%</span></div>
                <div class="control-row"><span class="control-label">Delay Time</span><input type="range" id="delayTime" min="0.01" max="1" step="0.01" value="0.25"><span class="control-value" id="delayTimeVal">0.25s</span></div>
                <div class="control-row"><span class="control-label">Feedback</span><input type="range" id="delayFeedback" min="0" max="0.95" step="0.01" value="0.3"><span class="control-value" id="delayFeedbackVal">0.3</span></div>
                <div class="control-row"><label class="enable-switch"><input type="checkbox" id="reverbEnable" checked><span class="slider"></span></label><span class="control-label">Reverb</span><input type="range" id="reverb" min="0" max="100" value="30"><input type="number" id="reverbInput" min="0" max="100" value="30" style="width:60px; margin-left:7px;"><span class="control-value" id="reverbVal">30%</span></div>
                <div class="control-row"><span class="control-label">Room Size</span><input type="range" id="reverbRoom" min="0.1" max="1" step="0.01" value="0.7"><span class="control-value" id="reverbRoomVal">0.7</span></div>
                <div class="control-row"><span class="control-label">Decay</span><input type="range" id="reverbDecay" min="0.1" max="10" step="0.1" value="2"><span class="control-value" id="reverbDecayVal">2s</span></div>
            `)}
            ${group('BPM', 'bpm', `<div class="control-row"><span class="control-label">BPM</span><input type="number" id="bpm" min="40" max="240" value="120"></div>`)}
        </div>`;
    },

    // -------------- Reusable setup helpers ---------------

    setupToggles(panel) {
        for (const id of ['audio','env','osc','filter','modulation','distortion','time','bpm']) {
            const toggle = panel.querySelector(`#${id}_toggle`);
            const content = panel.querySelector(`#${id}_content`);
            if (!toggle || !content) continue;
            content.classList.toggle('group-content-collapsed', !toggle.checked);
            toggle.addEventListener('change', () =>
                content.classList.toggle('group-content-collapsed', !toggle.checked)
            );
            panel.querySelector(`#${id}_title_row`)?.addEventListener('click', e => {
                if (e.target !== toggle) {
                    toggle.checked = !toggle.checked;
                    toggle.dispatchEvent(new Event('change'));
                }
            });
        }
    },

    setupEffects(panel) {
        // Effect toggles
        [
            ['filterEnable','filter'],['filterLFOEnable','filterLFO'],
            ['chorusEnable','chorus'],['phaserEnable','phaser'],['tremoloEnable','tremolo'],['vibratoEnable','vibrato'],
            ['compressorEnable','compressor'],['distortionEnable','distortion'],['bitCrusherEnable','bitCrusher'],
            ['delayEnable','delay'],['reverbEnable','reverb'],
        ].forEach(([id, name]) => this.effectToggle(id, name));

        // Param controls
        this.effectParams(panel);
    },

    effectToggle(toggleId, effectName) {
        const el = document.getElementById(toggleId);
        if (!el) return;
        el.onchange = () => EnhancedEffects.toggleEffect(effectName, el.checked);
        el.checked = !!EnhancedEffects.enabled?.[effectName];
    },

    effectParams(panel) {
        // Param control wiring: [slider, input, value, setFn, formatter]
        const params = [
            // Filter
            ['#filterFreq',   '#filterFreqInput',   '#filterFreqVal',   v => EnhancedEffects.setFilter({ frequency: v })],
            ['#filterQ',      '#filterQInput',      '#filterQVal',      v => EnhancedEffects.setFilter({ Q: v })],
            [null,            null,                 null,               null,  null, '#filterType', e => EnhancedEffects.setFilter({ type: e.target.value })],
            // Filter LFO
            ['#filterLFORate',null,                 '#filterLFORateVal',v => EnhancedEffects.setFilterLFO({ frequency: v })],
            ['#filterLFODepth',null,'#filterLFODepthVal',v=>EnhancedEffects.setFilterLFO({depth:v})],
            // Chorus
            ['#chorusWet',    null, '#chorusWetVal', v => EnhancedEffects.setChorus({ wet: v }), v => Math.round(v*100)+'%'],
            ['#chorusRate',   null, '#chorusRateVal', v => EnhancedEffects.setChorus({ frequency: v })],
            // Phaser
            ['#phaserWet',    null, '#phaserWetVal', v => EnhancedEffects.setPhaser({ wet: v }), v => Math.round(v*100)+'%'],
            ['#phaserRate',   null, '#phaserRateVal', v => EnhancedEffects.setPhaser({ frequency: v })],
            // Tremolo
            ['#tremoloWet',   null, '#tremoloWetVal', v => EnhancedEffects.setTremolo({ wet: v }), v => Math.round(v*100)+'%'],
            ['#tremoloRate',  null, '#tremoloRateVal', v => EnhancedEffects.setTremolo({ frequency: v })],
            // Vibrato
            ['#vibratoWet',   null, '#vibratoWetVal', v => EnhancedEffects.setVibrato({ wet: v }), v => Math.round(v*100)+'%'],
            ['#vibratoRate',  null, '#vibratoRateVal', v => EnhancedEffects.setVibrato({ frequency: v })],
            // Compressor
            ['#compressorThreshold',null,'#compressorThresholdVal',v=>EnhancedEffects.setCompressor({threshold:v}),v=>v+'dB'],
            ['#compressorRatio',null,'#compressorRatioVal',v=>EnhancedEffects.setCompressor({ratio:v}),v=>v+':1'],
            // Distortion
            ['#distortionWet',null,'#distortionWetVal',v=>EnhancedEffects.setDistortion({wet:v}),v=>Math.round(v*100)+'%'],
            ['#distortionDrive',null,'#distortionDriveVal',v=>EnhancedEffects.setDistortion({distortion:v})],
            // BitCrusher
            ['#bitCrusherWet',null,'#bitCrusherWetVal',v=>EnhancedEffects.setBitCrusher({wet:v}),v=>Math.round(v*100)+'%'],
            ['#bitCrusherBits',null,'#bitCrusherBitsVal',v=>EnhancedEffects.setBitCrusher({bits:v})],
            // Delay
            ['#delay',        '#delayInput', '#delayVal', v => EnhancedEffects.setDelay({ wet: v/100 }), v => v+'%'],
            ['#delayTime',    null, '#delayTimeVal', v => EnhancedEffects.setDelay({ delayTime: v }), v => v+'s'],
            ['#delayFeedback',null, '#delayFeedbackVal', v => EnhancedEffects.setDelay({ feedback: v })],
            // Reverb
            ['#reverb', '#reverbInput', '#reverbVal', v=>EnhancedEffects.setReverb({wet:v/100}), v=>v+'%'],
            ['#reverbRoom',   null, '#reverbRoomVal', v => EnhancedEffects.setReverb({ roomSize: v })],
            ['#reverbDecay',  null, '#reverbDecayVal', v => EnhancedEffects.setReverb({ decay: v }), v => v+'s'],
        ];
        for (const [slider, input, value, cb, fmt, sel, selCb] of params) {
            if (slider) this.linkSliderAndCallback(slider, input, value, cb, fmt);
            if (sel) panel.querySelector(sel)?.addEventListener('change', selCb);
        }
    },

    setupAudioSafety(panel) {
        this.linkSliderAndCallback('#masterVolume','#masterVolumeInput','#masterVolumeVal',v=>{
            AudioSafety.setMasterVolume(v); EnhancedEffects.setMasterVolume(v);
        },v=>Math.round(v*100)+'%');
        this.linkSliderAndCallback('#limiterThreshold','#limiterThresholdInput','#limiterThresholdVal',AudioSafety.setLimiterThreshold,v=>v+'dB');
        panel.querySelector('#emergencyStop').onclick = AudioSafety.emergencyStop;
    },

    setupEnvelope(panel) {
        panel.querySelector('#envelopePreset').onchange = e => {
            if (e.target.value) EnvelopeManager.loadPreset(e.target.value);
        };
        [
            ['#envelopeAttack','#envelopeAttackInput','#envelopeAttackVal','attack',3],
            ['#envelopeDecay','#envelopeDecayInput','#envelopeDecayVal','decay',3],
            ['#envelopeSustain','#envelopeSustainInput','#envelopeSustainVal','sustain',2],
            ['#envelopeRelease','#envelopeReleaseInput','#envelopeReleaseVal','release',3],
        ].forEach(([slider,input,val,param,dp])=>{
            this.linkSliderAndCallback(slider,input,val,v=>EnvelopeManager.setParameter(param,v),v=>parseFloat(v).toFixed(dp));
        });
    },

    setupOscillator(panel) {
        panel.querySelector('#waveform').onchange = () => window.synthApp?.synth?.set({ oscillator: { type: panel.querySelector('#waveform').value } });
        this.linkSliderAndCallback('#detune','#detuneInput','#detuneVal',v=>window.synthApp?.synth?.set({detune:v}));
        panel.querySelector('#bpm').onchange = e => window.Tone && (Tone.Transport.bpm.value = +e.target.value);
    },

    linkSliderAndCallback(sliderSel, inputSel, valueSel, cb, fmt) {
        const slider = sliderSel && document.querySelector(sliderSel);
        const input = inputSel && document.querySelector(inputSel);
        const valDisp = valueSel && document.querySelector(valueSel);
        if (!slider) return;
        const update = v => {
            if (input) input.value = v;
            if (valDisp) valDisp.textContent = fmt ? fmt(v) : v;
            cb?.(v);
        };
        slider.oninput = e => update(e.target.value);
        if (input) input.oninput = e => {
            let v = e.target.value;
            if (slider.min !== undefined) v = Math.max(Number(slider.min), v);
            if (slider.max !== undefined) v = Math.min(Number(slider.max), v);
            slider.value = v;
            update(v);
        };
    },

    updateAllDisplayValues() {
        const fmt = {
            '#masterVolume':      v=>Math.round(v*100)+'%',
            '#limiterThreshold':  v=>v+'dB',
            '#envelopeAttack':    v=>(+v).toFixed(3),
            '#envelopeDecay':     v=>(+v).toFixed(3),
            '#envelopeSustain':   v=>(+v).toFixed(2),
            '#envelopeRelease':   v=>(+v).toFixed(3),
            '#chorusWet':         v=>Math.round(v*100)+'%',
            '#phaserWet':         v=>Math.round(v*100)+'%',
            '#tremoloWet':        v=>Math.round(v*100)+'%',
            '#vibratoWet':        v=>Math.round(v*100)+'%',
            '#compressorThreshold':v=>v+'dB',
            '#compressorRatio':   v=>v+':1',
            '#distortionWet':     v=>Math.round(v*100)+'%',
            '#bitCrusherWet':     v=>Math.round(v*100)+'%',
            '#delay':             v=>v+'%',
            '#delayTime':         v=>v+'s',
            '#reverb':            v=>v+'%',
            '#reverbDecay':       v=>v+'s'
        };
        for (const id of [
            '#masterVolume','#limiterThreshold','#envelopeAttack','#envelopeDecay','#envelopeSustain','#envelopeRelease',
            '#detune','#filterFreq','#filterQ','#filterLFORate','#filterLFODepth','#chorusWet','#chorusRate','#phaserWet','#phaserRate','#tremoloWet','#tremoloRate',
            '#vibratoWet','#vibratoRate','#compressorThreshold','#compressorRatio','#distortionWet','#distortionDrive','#bitCrusherWet','#bitCrusherBits',
            '#delay','#delayTime','#delayFeedback','#reverb','#reverbRoom','#reverbDecay'
        ]) {
            const el = document.querySelector(id);
            if (el?.value !== undefined) {
                const valEl = document.querySelector(id.replace(/Input$/, 'Val'));
                if (valEl) valEl.textContent = (fmt[id]||((v)=>v))(el.value);
            }
        }
        console.log('[EnhancedControls] All display values updated');
    }
};
