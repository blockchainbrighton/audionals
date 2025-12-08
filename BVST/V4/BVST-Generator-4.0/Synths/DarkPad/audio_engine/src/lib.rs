use wasm_bindgen::prelude::*;
use bvst_lib::{Param, Curve, dsp::{self, Oscillator, Svf, Adsr, Delay, WaveType}};

#[wasm_bindgen]
pub struct BvstSynth {
    sample_rate: f32,
    osc1: Oscillator,
    osc2: Oscillator,
    filter: Svf,
    env: Adsr,
    delay: Delay,
    
    // Params
    p_detune: Param,
    p_cut: Param,
    p_res: Param,
    p_attack: Param,
    p_release: Param,
    p_delay_mix: Param,
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
            filter: Svf::new(sample_rate),
            env: Adsr::new(sample_rate),
            delay: Delay::new(sample_rate, 1.0), // 1 sec max
            
            p_detune: Param::new(Curve::Linear { min: 0.0, max: 0.05 }, 0.01),
            p_cut: Param::new(Curve::Exponential { min: 50.0, max: 10000.0 }, 800.0),
            p_res: Param::new(Curve::Linear { min: 0.0, max: 5.0 }, 0.5),
            p_attack: Param::new(Curve::Linear { min: 0.1, max: 5.0 }, 1.5),
            p_release: Param::new(Curve::Linear { min: 0.1, max: 5.0 }, 2.0),
            p_delay_mix: Param::new(Curve::Linear { min: 0.0, max: 0.8 }, 0.5),
            p_vol: Param::new(Curve::Squared { min: 0.0, max: 1.0 }, 0.5),
            
            curr_freq: 220.0,
            gate: false,
        }
    }

    pub fn set_param(&mut self, id: u32, value: f32) {
        match id {
            1 => self.p_detune.set(value),
            2 => self.p_cut.set(value),
            3 => self.p_res.set(value),
            4 => { self.p_attack.set(value); self.env.a = value; },
            5 => { self.p_release.set(value); self.env.r = value; },
            6 => self.p_delay_mix.set(value),
            7 => self.p_vol.set(value),
            
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
            let v_det = self.p_detune.process();
            let v_cut = self.p_cut.process();
            let v_res = self.p_res.process();
            let v_dmix = self.p_delay_mix.process();
            let v_vol = self.p_vol.process();
            
            let env_val = self.env.next();
            
            // Dual Saw
            let f1 = self.curr_freq * (1.0 - v_det);
            let f2 = self.curr_freq * (1.0 + v_det);
            
            let o1 = self.osc1.next_simple(f1, WaveType::Saw);
            let o2 = self.osc2.next_simple(f2, WaveType::Saw);
            
            let mix = (o1 + o2) * 0.5;
            
            // Filter
            let filtered = self.filter.process(mix, v_cut, v_res);
            
            // Amp
            let amped = filtered * env_val;
            
            // Delay (Pad Effect)
            let final_out = self.delay.process(amped, 0.5, v_dmix); // Fixed 500ms delay
            
            *sample = final_out * v_vol;
        }
    }
}