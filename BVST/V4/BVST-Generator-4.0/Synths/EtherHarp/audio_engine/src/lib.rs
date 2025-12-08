use wasm_bindgen::prelude::*;
use bvst_lib::{Param, Curve, dsp::{self, Oscillator, Svf, Adsr, Delay, WaveType}};

#[wasm_bindgen]
pub struct BvstSynth {
    sample_rate: f32,
    osc1: Oscillator,
    osc2: Oscillator,
    env: Adsr,
    delay: Delay,
    
    p_decay: Param,
    p_delay_mix: Param,
    p_fm: Param,
    p_vol: Param,
    
    curr_freq: f32,
    gate: bool,
}

#[wasm_bindgen]
impl BvstSynth {
    pub fn new(sample_rate: f32) -> BvstSynth {
        BvstSynth {
            sample_rate,
            osc1: Oscillator::new(sample_rate),
            osc2: Oscillator::new(sample_rate),
            env: Adsr::new(sample_rate),
            delay: Delay::new(sample_rate, 0.5),
            
            p_decay: Param::new(Curve::Linear { min: 0.1, max: 2.0 }, 0.5),
            p_delay_mix: Param::new(Curve::Linear { min: 0.0, max: 0.6 }, 0.3),
            p_fm: Param::new(Curve::Linear { min: 0.0, max: 200.0 }, 0.0),
            p_vol: Param::new(Curve::Squared { min: 0.0, max: 1.0 }, 0.5),
            
            curr_freq: 440.0,
            gate: false,
        }
    }

    pub fn set_param(&mut self, id: u32, value: f32) {
        match id {
            1 => self.p_decay.set(value),
            2 => self.p_delay_mix.set(value),
            3 => self.p_fm.set(value),
            4 => self.p_vol.set(value),
            
            20 => self.curr_freq = value,
            23 => {
                self.gate = value > 0.5;
                self.env.d = self.p_decay.get(); 
                self.env.r = self.p_decay.get(); // Pluck style
                self.env.trigger(self.gate);
            },
            _ => {}
        }
    }

    pub fn process(&mut self, output: &mut [f32]) {
        for sample in output.iter_mut() {
            let v_d_mix = self.p_delay_mix.process();
            let v_fm = self.p_fm.process();
            let v_vol = self.p_vol.process();
            
            let env_val = self.env.next();
            
            // Simple FM: Osc2 -> Osc1
            let mod_sig = self.osc2.next_simple(self.curr_freq * 2.0, WaveType::Sine);
            let car_freq = self.curr_freq + (mod_sig * v_fm);
            let sig = self.osc1.next_simple(car_freq, WaveType::Triangle);
            
            let plucky = sig * env_val;
            
            // Ping Pong Delay Sim (just mono delay)
            let wet = self.delay.process(plucky, 0.3, v_d_mix); // ~300ms
            
            *sample = wet * v_vol;
        }
    }
}