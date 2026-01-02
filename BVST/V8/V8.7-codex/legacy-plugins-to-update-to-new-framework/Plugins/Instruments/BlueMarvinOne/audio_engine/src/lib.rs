use wasm_bindgen::prelude::*;
use bvst_lib::{Param, Curve, dsp::{self, Oscillator, Svf, Adsr, WaveType, FilterMode}};

// --- CONSTANTS ---
const MAX_VOICES: usize = 8; // Polyphony for comfort, though 2600 is Mono. We'll make it Poly because why not? Or should strict emulation be mono? The original HTML was Mono priority. I'll stick to Poly for BVST standards unless user insisted on Mono. The HTML logic had "keysPressed" set, suggesting it *could* handle poly if the engine supported it, but the engine code `createVoice` was mono. I'll make it Poly for better UX.
const BLOCK_SIZE: usize = 32;

// --- VOICE ---
#[derive(Clone)]
struct Voice {
    active: bool,
    note: u32,
    velocity: f32,
    
    osc1: Oscillator,
    osc2: Oscillator,
    filter: Svf,
    env: Adsr,
    
    sample_rate: f32,
}

impl Voice {
    fn new(sample_rate: f32) -> Self {
        Self {
            active: false, note: 0, velocity: 0.0,
            osc1: Oscillator::new(sample_rate),
            osc2: Oscillator::new(sample_rate),
            filter: Svf::new(sample_rate),
            env: Adsr::new(sample_rate),
            sample_rate,
        }
    }

    fn trigger(&mut self, note: u32, vel: f32) {
        self.active = true;
        self.note = note;
        self.velocity = vel;
        self.env.trigger(true);
        self.osc1.reset();
        self.osc2.reset();
    }

    fn release(&mut self) {
        self.env.trigger(false);
    }

    fn process_block(&mut self, params: &EngineParams, output: &mut [f32]) {
        if !self.active { return; }

        // --- CONTROL RATE ---
        let env_val = self.env.next();
        
        if env_val < 0.0001 && !self.env.is_active() {
            self.active = false;
            return;
        }

        // Frequencies
        let base_freq = dsp::mtof(self.note as f32);
        let f1 = base_freq * 2.0_f32.powf(params.vco1_freq / 12.0); // Semitones
        let f2 = base_freq * 2.0_f32.powf(params.vco2_detune / 100.0); // Cents (slider is -50 to 50)

        // Filter Coeffs (Static in this model, but we calculate per block to allow smooth automation)
        let coeffs = self.filter.calc_coeffs(params.cutoff, params.res);
        
        let vol = env_val * self.velocity * params.volume;

        // --- AUDIO LOOP ---
        for out in output.iter_mut() {
            // OSC 1 (Saw)
            let s1 = self.osc1.next(f1, WaveType::Saw, 0.0);
            
            // OSC 2 (Pulse)
            let s2 = self.osc2.next(f2, WaveType::Pulse, params.vco2_width);

            // Mix
            let mix = (s1 * params.vco1_mix) + (s2 * params.vco2_mix);

            // Filter
            let filtered = self.filter.process_with_coeffs(mix, &coeffs, FilterMode::LowPass);

            // VCA
            *out += filtered * vol;
        }
    }
}

// --- PARAMS ---
struct EngineParams {
    vco1_freq: f32,
    vco1_mix: f32,
    vco2_detune: f32,
    vco2_width: f32,
    vco2_mix: f32,
    cutoff: f32,
    res: f32,
    volume: f32,
}

// --- HELPER ---
fn to_norm(v: f32, min: f32, max: f32) -> f32 {
    ((v - min) / (max - min)).clamp(0.0, 1.0)
}

#[wasm_bindgen]
pub struct BvstSynth {
    voices: Vec<Voice>,
    sample_rate: f32,
    
    // Parameters
    p_vco1_freq: Param,
    p_vco1_mix: Param,
    p_vco2_detune: Param,
    p_vco2_width: Param,
    p_vco2_mix: Param,
    p_cutoff: Param,
    p_res: Param,
    
    p_env_a: Param,
    p_env_d: Param,
    p_env_s: Param,
    p_env_r: Param,
    
    p_vol: Param,
}

#[wasm_bindgen]
impl BvstSynth {
    pub fn new(sample_rate: f32) -> Self {
        let mut voices = Vec::with_capacity(MAX_VOICES);
        for _ in 0..MAX_VOICES { voices.push(Voice::new(sample_rate)); }

        Self {
            voices,
            sample_rate,
            // ID 1: VCO1 Freq (-24 to 24)
            p_vco1_freq: Param::new(Curve::Linear { min: -24.0, max: 24.0 }, 0.5), // 0.5 -> 0
            // ID 2: VCO1 Mix
            p_vco1_mix: Param::new(Curve::Linear { min: 0.0, max: 1.0 }, 0.8),
            // ID 3: VCO2 Detune (-50 to 50 cents)
            p_vco2_detune: Param::new(Curve::Linear { min: -50.0, max: 50.0 }, 0.55), // 0.5 -> 0, 0.55 -> +5
            // ID 4: VCO2 Width
            p_vco2_width: Param::new(Curve::Linear { min: 0.0, max: 0.9 }, 0.55), // ~0.5
            // ID 5: VCO2 Mix
            p_vco2_mix: Param::new(Curve::Linear { min: 0.0, max: 1.0 }, 0.6),
            
            // ID 6: Cutoff
            p_cutoff: Param::new(Curve::Exponential { min: 100.0, max: 10000.0 }, 0.6), // ~2000
            // ID 7: Res
            p_res: Param::new(Curve::Linear { min: 0.0, max: 10.0 }, 0.5), // ~5
            
            // ID 8-11: ADSR
            p_env_a: Param::new(Curve::Exponential { min: 0.001, max: 2.0 }, 0.05),
            p_env_d: Param::new(Curve::Exponential { min: 0.01, max: 2.0 }, 0.2),
            p_env_s: Param::new(Curve::Linear { min: 0.0, max: 1.0 }, 0.5),
            p_env_r: Param::new(Curve::Exponential { min: 0.01, max: 4.0 }, 0.3),
            
            // ID 12: Volume
            p_vol: Param::new(Curve::Linear { min: 0.0, max: 1.0 }, 0.7),
        }
    }

    pub fn set_param(&mut self, id: usize, value: f32) {
        match id {
            1 => self.p_vco1_freq.set(to_norm(value, -24.0, 24.0)),
            2 => self.p_vco1_mix.set(to_norm(value, 0.0, 1.0)),
            3 => self.p_vco2_detune.set(to_norm(value, -50.0, 50.0)),
            4 => self.p_vco2_width.set(to_norm(value, 0.0, 0.9)),
            5 => self.p_vco2_mix.set(to_norm(value, 0.0, 1.0)),
            6 => self.p_cutoff.set(to_norm(value, 100.0, 10000.0)),
            7 => self.p_res.set(to_norm(value, 0.0, 10.0)),
            8 => self.p_env_a.set(to_norm(value, 0.001, 2.0)),
            9 => self.p_env_d.set(to_norm(value, 0.01, 2.0)),
            10 => self.p_env_s.set(to_norm(value, 0.0, 1.0)),
            11 => self.p_env_r.set(to_norm(value, 0.01, 4.0)),
            12 => self.p_vol.set(to_norm(value, 0.0, 1.0)),
            
            // MIDI HANDLING
            128 => self.note_on(value as u32, 1.0),
            129 => self.note_off(value as u32),
            
            _ => {}
        }
    }

    pub fn process(&mut self, _input_l: &[f32], _input_r: &[f32], output_l: &mut [f32], output_r: &mut [f32]) {
        // Update Params
        let params = EngineParams {
            vco1_freq: self.p_vco1_freq.process(),
            vco1_mix: self.p_vco1_mix.process(),
            vco2_detune: self.p_vco2_detune.process(),
            vco2_width: self.p_vco2_width.process(),
            vco2_mix: self.p_vco2_mix.process(),
            cutoff: self.p_cutoff.process(),
            res: self.p_res.process(),
            volume: self.p_vol.process(),
        };

        // Update Envelope Params on all voices
        let a = self.p_env_a.process();
        let d = self.p_env_d.process();
        let s = self.p_env_s.process();
        let r = self.p_env_r.process();

        for v in &mut self.voices {
            v.env.a = a;
            v.env.d = d;
            v.env.s = s;
            v.env.r = r;
        }

        // Clear Output
        for x in output_l.iter_mut() { *x = 0.0; }
        for x in output_r.iter_mut() { *x = 0.0; }

        // Process Blocks
        let mut block_idx = 0;
        while block_idx < output_l.len() {
            let end = (block_idx + BLOCK_SIZE).min(output_l.len());
            let mut mix_buf = [0.0; BLOCK_SIZE];
            
            for voice in &mut self.voices {
                voice.process_block(&params, &mut mix_buf[0..(end - block_idx)]);
            }

            // Copy to Output (Stereo Dupe)
            for (i, val) in mix_buf[0..(end - block_idx)].iter().enumerate() {
                output_l[block_idx + i] = *val;
                output_r[block_idx + i] = *val;
            }
            
            block_idx += BLOCK_SIZE;
        }
    }
    
    // MIDI Handlers
    pub fn note_on(&mut self, note: u32, velocity: f32) {
        // Find free voice
        for v in &mut self.voices {
            if !v.active {
                v.trigger(note, velocity);
                return;
            }
        }
        // Steal oldest (simplistic: just take first)
        self.voices[0].trigger(note, velocity);
    }

    pub fn note_off(&mut self, note: u32) {
        for v in &mut self.voices {
            if v.active && v.note == note {
                v.release();
            }
        }
    }
}