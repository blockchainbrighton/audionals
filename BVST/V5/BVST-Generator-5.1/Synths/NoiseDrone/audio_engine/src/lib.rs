use wasm_bindgen::prelude::*;
use bvst_lib::{Param, Curve, dsp::{self, NoiseGen, Oscillator, Svf, WaveType}};

#[wasm_bindgen]
pub struct BvstSynth {
    sample_rate: f32,
    noise: NoiseGen,
    lfo: Oscillator,
    filter: Svf,
    
    // Params
    p_lfo_rate: Param,
    p_lfo_depth: Param,
    p_cutoff: Param,
    p_res: Param,
    p_dist: Param,
    p_vol: Param,
    
    gate: bool,
}

#[wasm_bindgen]
impl BvstSynth {
    pub fn new(sample_rate: f32) -> BvstSynth {
        BvstSynth {
            sample_rate,
            noise: NoiseGen::new(),
            lfo: Oscillator::new(sample_rate),
            filter: Svf::new(sample_rate),
            
            p_lfo_rate: Param::new(Curve::Linear { min: 0.1, max: 10.0 }, 1.0),
            p_lfo_depth: Param::new(Curve::Linear { min: 0.0, max: 5000.0 }, 1000.0),
            p_cutoff: Param::new(Curve::Exponential { min: 50.0, max: 5000.0 }, 1000.0),
            p_res: Param::new(Curve::Linear { min: 0.0, max: 8.0 }, 4.0),
            p_dist: Param::new(Curve::Linear { min: 0.0, max: 1.0 }, 0.2),
            p_vol: Param::new(Curve::Squared { min: 0.0, max: 1.0 }, 0.5),
            
            gate: false,
        }
    }

    pub fn set_param(&mut self, id: u32, value: f32) {
        match id {
            1 => self.p_lfo_rate.set(value),
            2 => self.p_lfo_depth.set(value),
            3 => self.p_cutoff.set(value),
            4 => self.p_res.set(value),
            5 => self.p_dist.set(value),
            6 => self.p_vol.set(value),
            
            27 => self.gate = value > 0.5,
            _ => {}
        }
    }

    pub fn process(&mut self, output: &mut [f32]) {
        for sample in output.iter_mut() {
            if !self.gate {
                *sample = 0.0;
                continue;
            }

            let v_rate = self.p_lfo_rate.process();
            let v_depth = self.p_lfo_depth.process();
            let v_cut = self.p_cutoff.process();
            let v_res = self.p_res.process();
            let v_dist = self.p_dist.process();
            let v_vol = self.p_vol.process();
            
            let raw_noise = self.noise.next();
            
            // LFO Mod
            let lfo_val = self.lfo.next_simple(v_rate, WaveType::Sine);
            let mod_cut = dsp::clamp(v_cut + (lfo_val * v_depth), 20.0, 15000.0);
            
            let mut filtered = self.filter.process(raw_noise, mod_cut, v_res);
            
            // Distortion
            if v_dist > 0.0 {
                filtered *= 1.0 + (v_dist * 10.0);
                filtered = filtered.tanh();
            }
            
            *sample = filtered * v_vol;
        }
    }
}