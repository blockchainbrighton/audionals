use wasm_bindgen::prelude::*;
use bvst_lib::{Param, Curve, dsp::{self, Oscillator, Adsr, WaveType}};

#[wasm_bindgen]
pub struct BvstSynth {
    sample_rate: f32,
    osc: Oscillator,
    env: Adsr,
    
    // Params
    p_pulse_width: Param,
    p_decay: Param,
    p_crush: Param,
    p_vol: Param,
    
    curr_freq: f32,
    gate: bool,
}

#[wasm_bindgen]
impl BvstSynth {
    pub fn new(sample_rate: f32) -> BvstSynth {
        let mut env = Adsr::new(sample_rate);
        env.a = 0.001; // Fast attack
        env.s = 0.0;   // Pluck style
        
        BvstSynth {
            sample_rate,
            osc: Oscillator::new(sample_rate),
            env,
            
            p_pulse_width: Param::new(Curve::Linear { min: 0.1, max: 0.9 }, 0.5),
            p_decay: Param::new(Curve::Linear { min: 0.05, max: 0.5 }, 0.1),
            p_crush: Param::new(Curve::Linear { min: 0.0, max: 1.0 }, 0.0),
            p_vol: Param::new(Curve::Squared { min: 0.0, max: 1.0 }, 0.6),
            
            curr_freq: 440.0,
            gate: false,
        }
    }

    pub fn set_param(&mut self, id: u32, value: f32) {
        match id {
            1 => self.p_pulse_width.set(value),
            2 => { self.p_decay.set(value); self.env.d = value; },
            3 => self.p_crush.set(value),
            4 => self.p_vol.set(value),
            
            26 => self.curr_freq = value,
            27 => {
                self.gate = value > 0.5;
                self.env.trigger(self.gate);
            },
            _ => {}
        }
    }

    pub fn process(&mut self, output: &mut [f32]) {
        for sample in output.iter_mut() {
            let v_pw = self.p_pulse_width.process();
            let v_crush = self.p_crush.process();
            let v_vol = self.p_vol.process();
            
            let env_val = self.env.next();
            
            let raw = self.osc.next(self.curr_freq, WaveType::Pulse, v_pw);
            
            // Simple Bitcrush/Decimate sim
            let mut processed = raw;
            if v_crush > 0.0 {
                // Quantize amplitude
                let levels = 2.0 + (1.0 - v_crush) * 16.0; // 2 to 18 levels
                processed = (processed * levels).round() / levels;
            }

            *sample = processed * env_val * v_vol;
        }
    }
}