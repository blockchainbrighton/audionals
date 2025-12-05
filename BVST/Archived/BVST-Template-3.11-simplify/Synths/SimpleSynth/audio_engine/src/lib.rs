use wasm_bindgen::prelude::*;
use bvst_lib::{Param, Curve, dsp::{Oscillator, Adsr, WaveType}};

#[wasm_bindgen]
pub struct BvstSynth {
    osc: Oscillator,
    env: Adsr,
    p_freq: Param,
    gate: bool,
    wave_type: WaveType,
}

#[wasm_bindgen]
impl BvstSynth {
    pub fn new(sample_rate: f32) -> BvstSynth {
        let mut env = Adsr::new(sample_rate);
        env.a = 0.01;
        env.d = 0.0;
        env.s = 1.0; // Sustain at full level for AR behavior
        env.r = 0.2;

        BvstSynth {
            osc: Oscillator::new(sample_rate),
            env,
            p_freq: Param::new(Curve::Linear{min:0.,max:2000.}, 440.0),
            gate: false,
            wave_type: WaveType::Sine,
        }
    }

    pub fn set_param(&mut self, id: u32, value: f32) {
        match id {
            0 => self.p_freq.set(value), 
            1 => { 
                self.gate = value > 0.5;
                self.env.trigger(self.gate);
            },
            2 => self.wave_type = WaveType::from(value),
            _ => {}
        }
    }

    pub fn process(&mut self, output: &mut [f32]) {
        for sample in output.iter_mut() {
            let env_val = self.env.next();
            if env_val < 0.0001 && !self.gate { *sample = 0.0; continue; }
            
            let freq = self.p_freq.process();
            let raw = self.osc.next(freq, self.wave_type, 0.5);
            *sample = raw * env_val * 0.5; 
        }
    }
}