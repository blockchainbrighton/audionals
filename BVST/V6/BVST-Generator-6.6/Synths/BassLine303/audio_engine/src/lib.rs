use wasm_bindgen::prelude::*;
use bvst_lib::{Param, Curve, dsp::{self, Oscillator, Svf, Adsr, WaveType}};

#[wasm_bindgen]
pub struct BvstSynth {
    sample_rate: f32,
    osc: Oscillator,
    sub: Oscillator,
    filter: Svf,
    filter2: Svf, // cascade for steeper slope
    env: Adsr,
    
    // Params
    p_wave: f32, // Switch
    p_sub_vol: Param,
    p_cut: Param,
    p_res: Param,
    p_env_mod: Param,
    p_decay: Param,
    p_accent: Param,
    p_drive: Param,
    p_glide: Param,
    p_vol: Param,
    
    // State
    target_freq: f32,
    curr_freq: f32,
    gate: bool,
    accent_active: bool,
    slide_active: bool,
}

#[wasm_bindgen]
impl BvstSynth {
    pub fn new(sample_rate: f32) -> BvstSynth {
        BvstSynth {
            sample_rate,
            osc: Oscillator::new(sample_rate),
            sub: Oscillator::new(sample_rate),
            filter: Svf::new(sample_rate),
            filter2: Svf::new(sample_rate),
            env: Adsr::new(sample_rate),
            
            p_wave: 0.0,
            p_sub_vol: Param::new(Curve::Linear { min: 0.0, max: 1.0 }, 0.0),
            
            p_cut: Param::new(Curve::Exponential { min: 20.0, max: 20000.0 }, 0.5),
            p_res: Param::new(Curve::Linear { min: 0.0, max: 10.0 }, 0.2),
            p_env_mod: Param::new(Curve::Linear { min: 0.0, max: 1.0 }, 0.5),
            p_decay: Param::new(Curve::Linear { min: 0.1, max: 2.0 }, 0.4),
            
            p_accent: Param::new(Curve::Linear { min: 0.0, max: 1.0 }, 0.5),
            p_drive: Param::new(Curve::Linear { min: 0.0, max: 1.0 }, 0.0),
            p_glide: Param::new(Curve::Linear { min: 0.0, max: 0.5 }, 0.1),
            p_vol: Param::new(Curve::Squared { min: 0.0, max: 1.0 }, 0.5),
            
            target_freq: 110.0, curr_freq: 110.0,
            gate: false, accent_active: false, slide_active: false,
        }
    }

    pub fn set_param(&mut self, id: u32, value: f32) {
        match id {
            1 => self.p_wave = value,
            2 => self.p_sub_vol.set(value),
            3 => self.p_cut.set(value),
            4 => self.p_res.set(value),
            5 => self.p_env_mod.set(value),
            6 => self.p_decay.set(value),
            7 => self.p_accent.set(value),
            8 => self.p_drive.set(value),
            9 => self.p_glide.set(value),
            15 => self.p_vol.set(value),
            
            // Triggers from JS Sequencer
            20 => self.target_freq = value, // Note Freq
            21 => self.accent_active = value > 0.5,
            22 => self.slide_active = value > 0.5,
            23 => { // Gate
                self.gate = value > 0.5;
                if self.gate {
                    if !self.slide_active {
                        self.curr_freq = self.target_freq;
                        self.env.trigger(true);
                    }
                    // Retrigger env
                    self.env.trigger(true);
                } else {
                    self.env.trigger(false);
                }
            },
            
            _ => {}
        }
    }

    pub fn process(&mut self, output: &mut [f32]) {
        for sample in output.iter_mut() {
            // Process Params
            let v_decay = self.p_decay.process();
            let v_glide = self.p_glide.process();
            let v_cut = self.p_cut.process();
            let v_res = self.p_res.process();
            let v_env_mod = self.p_env_mod.process();
            let v_accent = self.p_accent.process();
            let v_drive = self.p_drive.process();
            let v_vol = self.p_vol.process();
            let v_sub_vol = self.p_sub_vol.process();

            // Glide
            if v_glide > 0.0 {
                let diff = self.target_freq - self.curr_freq;
                self.curr_freq += diff * (1.0 / (v_glide * self.sample_rate * 0.5 + 1.0));
            } else {
                self.curr_freq = self.target_freq;
            }
            
            // Env
            self.env.d = v_decay;
            let env_val = self.env.next();
            
            // Osc
            let w = if self.p_wave < 0.5 { WaveType::Saw } else { WaveType::Square };
            let osc_out = self.osc.next(self.curr_freq, w, 0.5);
            let sub_out = self.sub.next(self.curr_freq * 0.5, WaveType::Square, 0.5);
            
            let raw = osc_out + sub_out * v_sub_vol;
            
            // Filter Logic
            let mod_amt = v_env_mod * 8000.0;
            let accent_boost = if self.accent_active { v_accent * 4000.0 } else { 0.0 };
            
            let cut_val = v_cut + (env_val * (mod_amt + accent_boost));
            let nyquist = (self.sample_rate * 0.45).min(20000.0);
            let cut = dsp::clamp(cut_val, 20.0, nyquist);
            
            let mut res = v_res;
            if self.accent_active { res += v_accent * 5.0; }
            
            let stage1 = self.filter.process(raw, cut, res);
            let mut sig = self.filter2.process(stage1, cut, res);
            
            // Drive
            if v_drive > 0.0 {
                sig *= 1.0 + v_drive * 5.0;
                sig = sig.tanh();
            }
            
            // Amp
            let mut amp = env_val; 
            if self.accent_active { amp *= 1.5; }
            
            *sample = sig * amp * v_vol;
        }
    }
}