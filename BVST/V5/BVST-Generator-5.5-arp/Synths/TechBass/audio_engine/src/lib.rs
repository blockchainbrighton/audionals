use wasm_bindgen::prelude::*;
use bvst_lib::{Param, Curve, dsp::{self, Oscillator, Svf, Adsr, Compressor, WaveType}};

#[wasm_bindgen]
pub struct BvstSynth {
    sample_rate: f32,
    osc_c: Oscillator,
    osc_m: Oscillator,
    env_amp: Adsr,
    env_mod: Adsr,
    filter: Svf,
    comp: Compressor,
    
    // Params
    p_fm_amt: Param,
    p_mod_ratio: Param,
    p_cut: Param,
    p_dec: Param,
    p_drive: Param,
    p_comp_thresh: Param,
    p_vol: Param,
    
    curr_freq: f32,
    gate: bool,
}

#[wasm_bindgen]
impl BvstSynth {
    pub fn new(sample_rate: f32) -> BvstSynth {
        BvstSynth {
            sample_rate,
            osc_c: Oscillator::new(sample_rate),
            osc_m: Oscillator::new(sample_rate),
            env_amp: Adsr::new(sample_rate),
            env_mod: Adsr::new(sample_rate),
            filter: Svf::new(sample_rate),
            comp: Compressor::new(sample_rate),
            
            p_fm_amt: Param::new(Curve::Linear { min: 0.0, max: 1000.0 }, 500.0),
            p_mod_ratio: Param::new(Curve::Linear { min: 0.5, max: 4.0 }, 1.0),
            p_cut: Param::new(Curve::Exponential { min: 50.0, max: 5000.0 }, 800.0),
            p_dec: Param::new(Curve::Linear { min: 0.1, max: 1.0 }, 0.3),
            p_drive: Param::new(Curve::Linear { min: 0.0, max: 1.0 }, 0.2),
            p_comp_thresh: Param::new(Curve::Linear { min: -40.0, max: 0.0 }, -10.0),
            p_vol: Param::new(Curve::Squared { min: 0.0, max: 1.0 }, 0.6),
            
            curr_freq: 55.0, gate: false,
        }
    }

    pub fn set_param(&mut self, id: u32, value: f32) {
        match id {
            1 => self.p_fm_amt.set(value),
            2 => self.p_mod_ratio.set(value),
            3 => self.p_cut.set(value),
            4 => self.p_dec.set(value),
            5 => self.p_drive.set(value),
            6 => self.p_comp_thresh.set(value),
            7 => self.p_vol.set(value),
            
            26 => self.curr_freq = value,
            27 => {
                self.gate = value > 0.5;
                self.env_amp.trigger(self.gate);
                self.env_mod.trigger(self.gate);
            },
            _ => {}
        }
    }

    pub fn process(&mut self, output: &mut [f32]) {
        for sample in output.iter_mut() {
            // Params
            let v_fm = self.p_fm_amt.process();
            let v_ratio = self.p_mod_ratio.process(); // Rounded later?
            let v_cut = self.p_cut.process();
            let v_dec = self.p_dec.process();
            let v_drive = self.p_drive.process();
            let v_thresh = self.p_comp_thresh.process();
            let v_vol = self.p_vol.process();
            
            // Sync Envs
            self.env_amp.d = v_dec;
            self.env_mod.d = v_dec * 0.8; 
            
            let env_a = self.env_amp.next();
            let env_m = self.env_mod.next();
            
            // FM
            let mod_freq = self.curr_freq * v_ratio;
            let mod_out = self.osc_m.next_simple(mod_freq, WaveType::Sine);
            
            let carrier_freq = self.curr_freq + (mod_out * v_fm * env_m);
            let sig = self.osc_c.next_simple(carrier_freq, WaveType::Sine); // Or Triangle? Sine for pure FM bass
            
            // Filter (Lowpass)
            let cut = dsp::clamp(v_cut + (env_m * 3000.0), 20.0, 20000.0);
            let filtered = self.filter.process(sig, cut, 0.5);
            
            // Drive
            let mut driven = filtered * (1.0 + v_drive * 10.0);
            driven = driven.tanh();
            
            // Amp
            let raw_out = driven * env_a;
            
            // Compressor (Punch)
            // Fixed ratio 4:1, fast attack 5ms, fast release 50ms
            let compressed = self.comp.process(raw_out, v_thresh, 4.0, 0.005, 0.050);
            
            *sample = compressed * v_vol;
        }
    }
}
