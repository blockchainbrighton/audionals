use wasm_bindgen::prelude::*;
use bvst_lib::{Param, Curve, dsp::{self, Oscillator, NoiseGen, Adsr, WaveType}};

// Simple dedicated envelopes for drums
struct DrumEnv {
    val: f32,
    decay: f32,
    active: bool
}
impl DrumEnv {
    fn new(decay: f32) -> Self { Self { val: 0.0, decay, active: false } }
    fn trigger(&mut self) { self.val = 1.0; self.active = true; }
    fn process(&mut self) -> f32 {
        if !self.active { return 0.0; }
        self.val *= self.decay;
        if self.val < 0.001 { self.active = false; self.val = 0.0; }
        self.val
    }
}

#[wasm_bindgen]
pub struct BvstSynth {
    sample_rate: f32,
    
    // Kick
    osc_k: Oscillator,
    env_k_amp: DrumEnv,
    env_k_pitch: DrumEnv,
    
    // Snare
    osc_s: Oscillator,
    noise_s: NoiseGen,
    env_s_tone: DrumEnv,
    env_s_noise: DrumEnv,
    
    // Hat
    noise_h: NoiseGen,
    env_h: DrumEnv,
    
    // Params
    p_vol: Param,
    p_drive: Param,
}

#[wasm_bindgen]
impl BvstSynth {
    pub fn new(sample_rate: f32) -> BvstSynth {
        BvstSynth {
            sample_rate,
            
            osc_k: Oscillator::new(sample_rate),
            env_k_amp: DrumEnv::new(0.995), // Slow decay
            env_k_pitch: DrumEnv::new(0.98), // Fast pitch drop
            
            osc_s: Oscillator::new(sample_rate),
            noise_s: NoiseGen::new(),
            env_s_tone: DrumEnv::new(0.99),
            env_s_noise: DrumEnv::new(0.98),
            
            noise_h: NoiseGen::new(),
            env_h: DrumEnv::new(0.95), // Very fast
            
            p_vol: Param::new(Curve::Squared { min: 0.0, max: 1.0 }, 0.7),
            p_drive: Param::new(Curve::Linear { min: 0.0, max: 1.0 }, 0.2),
        }
    }

    pub fn set_param(&mut self, id: u32, value: f32) {
        match id {
            15 => self.p_vol.set(value),
            8 => self.p_drive.set(value),
            
            // Trigger Logic
            // Freq comes in on 20, Gate on 23.
            // We check Gate ON (1.0) + Freq Range to trigger specific drum.
            23 => {
                if value > 0.5 {
                    // We need the last set freq. But usually they come in pair (Freq then Gate).
                    // Let's assume set_param(20) was called just before.
                }
            },
            
            // Note Freq - We use this to TRIGGER directly for simplicity in this engine
            // C2 ~ 65Hz, D2 ~ 73Hz, F#2 ~ 92Hz
            20 => {
                let f = value;
                if f > 60.0 && f < 70.0 { // C2 Kick
                    self.env_k_amp.trigger();
                    self.env_k_pitch.trigger();
                } else if f > 70.0 && f < 80.0 { // D2 Snare
                    self.env_s_tone.trigger();
                    self.env_s_noise.trigger();
                } else if f > 90.0 && f < 100.0 { // F#2 Closed Hat
                    self.env_h.decay = 0.92; // Short
                    self.env_h.trigger();
                } else if f > 110.0 { // A#2 Open Hat
                    self.env_h.decay = 0.99; // Long
                    self.env_h.trigger();
                }
            },
            
            _ => {}
        }
    }

    pub fn process(&mut self, output: &mut [f32]) {
        for sample in output.iter_mut() {
            let v_vol = self.p_vol.process();
            let v_drive = self.p_drive.process();
            
            // Kick
            let k_env = self.env_k_amp.process();
            let k_p_env = self.env_k_pitch.process();
            let k_freq = 50.0 + (k_p_env * 150.0);
            let k_raw = self.osc_k.next_simple(k_freq, WaveType::Sine);
            let k_out = k_raw * k_env;
            
            // Snare
            let s_t_env = self.env_s_tone.process();
            let s_n_env = self.env_s_noise.process();
            let s_tone = self.osc_s.next_simple(180.0, WaveType::Sine) * s_t_env;
            let s_noise = self.noise_s.next() * s_n_env;
            let s_out = (s_tone * 0.5) + s_noise;
            
            // Hat
            let h_env = self.env_h.process();
            let h_noise = self.noise_h.next();
            // Simple Highpass via subtraction? Or just raw noise for cheapness
            let h_out = h_noise * h_env * 0.6;
            
            // Mix
            let mut mix = k_out + s_out + h_out;
            
            // Drive
            if v_drive > 0.0 {
                mix *= 1.0 + v_drive * 3.0;
                mix = mix.tanh();
            }
            
            *sample = mix * v_vol;
        }
    }
}