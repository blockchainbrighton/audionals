use wasm_bindgen::prelude::*;
use bvst_lib::{Param, Curve, dsp::{self, Oscillator, NoiseGen, Svf, Adsr, FilterMode, WaveType}};

#[wasm_bindgen]
pub struct BvstSynth {
    sample_rate: f32,
    osc: Oscillator,
    noise: NoiseGen,
    lfo: Oscillator,
    filter: Svf,
    env: Adsr,
    
    // Params
    p_mode: f32, // 0=LP, 1=HP, 2=BP, 3=Notch
    p_cut: Param,
    p_res: Param,
    p_lfo_rate: Param,
    p_lfo_depth: Param,
    p_noise_mix: Param,
    p_osc_mix: Param,
    p_vol: Param,
    
    curr_freq: f32,
    gate: bool,
}

#[wasm_bindgen]
impl BvstSynth {
    pub fn new(sample_rate: f32) -> BvstSynth {
        BvstSynth {
            sample_rate,
            osc: Oscillator::new(sample_rate),
            noise: NoiseGen::new(),
            lfo: Oscillator::new(sample_rate),
            filter: Svf::new(sample_rate),
            env: Adsr::new(sample_rate),
            
            p_mode: 0.0,
            p_cut: Param::new(Curve::Exponential { min: 40.0, max: 15000.0 }, 1000.0),
            p_res: Param::new(Curve::Linear { min: 0.0, max: 10.0 }, 2.0),
            p_lfo_rate: Param::new(Curve::Exponential { min: 0.1, max: 20.0 }, 1.0),
            p_lfo_depth: Param::new(Curve::Linear { min: 0.0, max: 5000.0 }, 0.0),
            p_noise_mix: Param::new(Curve::Linear { min: 0.0, max: 1.0 }, 0.5),
            p_osc_mix: Param::new(Curve::Linear { min: 0.0, max: 1.0 }, 0.5),
            p_vol: Param::new(Curve::Squared { min: 0.0, max: 1.0 }, 0.5),
            
            curr_freq: 110.0, gate: false,
        }
    }

    pub fn set_param(&mut self, id: u32, value: f32) {
        match id {
            1 => self.p_mode = value,
            2 => self.p_cut.set(value),
            3 => self.p_res.set(value),
            4 => self.p_lfo_rate.set(value),
            5 => self.p_lfo_depth.set(value),
            6 => self.p_osc_mix.set(value),
            7 => self.p_noise_mix.set(value),
            8 => self.p_vol.set(value),
            
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
            // Params
            let v_cut = self.p_cut.process();
            let v_res = self.p_res.process();
            let v_lrate = self.p_lfo_rate.process();
            let v_ldepth = self.p_lfo_depth.process();
            let v_osc = self.p_osc_mix.process();
            let v_noise = self.p_noise_mix.process();
            let v_vol = self.p_vol.process();
            
            let env_val = self.env.next();
            
            // Sources
            let o = self.osc.next_simple(self.curr_freq, WaveType::Saw);
            let n = self.noise.next();
            let raw = (o * v_osc) + (n * v_noise);
            
            // LFO Mod
            let lfo_val = self.lfo.next_simple(v_lrate, WaveType::Sine);
            let mod_amt = lfo_val * v_ldepth;
            
            // Filter
            let cut = dsp::clamp(v_cut + mod_amt, 20.0, 20000.0);
            let mode = FilterMode::from(self.p_mode);
            
            let filtered = self.filter.process_mode(raw, cut, v_res, mode);
            
            *sample = filtered * env_val * v_vol;
        }
    }
}
