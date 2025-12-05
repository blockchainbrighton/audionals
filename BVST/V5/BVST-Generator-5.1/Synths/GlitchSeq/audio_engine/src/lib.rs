use wasm_bindgen::prelude::*;
use bvst_lib::{Param, Curve, dsp::{self, Oscillator, NoiseGen, Adsr, Svf, WaveType}};

#[wasm_bindgen]
pub struct BvstSynth {
    sample_rate: f32,
    noise: NoiseGen,
    osc_mod: Oscillator,
    filter: Svf,
    env: Adsr,
    
    p_crush: Param,
    p_rate: Param,
    p_vol: Param,
    
    curr_freq: f32, // Affects FM rate
    gate: bool,
    glitch_mode: bool, // From "Slide" param
}

#[wasm_bindgen]
impl BvstSynth {
    pub fn new(sample_rate: f32) -> BvstSynth {
        BvstSynth {
            sample_rate,
            noise: NoiseGen::new(),
            osc_mod: Oscillator::new(sample_rate),
            filter: Svf::new(sample_rate),
            env: Adsr::new(sample_rate),
            
            p_crush: Param::new(Curve::Linear { min: 0.0, max: 1.0 }, 0.0),
            p_rate: Param::new(Curve::Linear { min: 1.0, max: 50.0 }, 10.0),
            p_vol: Param::new(Curve::Squared { min: 0.0, max: 1.0 }, 0.5),
            
            curr_freq: 440.0,
            gate: false,
            glitch_mode: false,
        }
    }

    pub fn set_param(&mut self, id: u32, value: f32) {
        match id {
            1 => self.p_crush.set(value),
            2 => self.p_rate.set(value),
            3 => self.p_vol.set(value),
            
            20 => self.curr_freq = value,
            22 => self.glitch_mode = value > 0.5, // "Slide" = Glitch Mode
            23 => {
                self.gate = value > 0.5;
                self.env.d = 0.2; // Short bursts
                self.env.trigger(self.gate);
            },
            _ => {}
        }
    }

    pub fn process(&mut self, output: &mut [f32]) {
        for sample in output.iter_mut() {
            let v_crush = self.p_crush.process();
            let v_rate = self.p_rate.process();
            let v_vol = self.p_vol.process();
            
            let env_val = self.env.next();
            
            // FM Noise
            // Modulate noise amplitude with high speed Osc
            let mod_freq = if self.glitch_mode { self.curr_freq * 2.0 } else { self.curr_freq * 0.5 };
            let modulator = self.osc_mod.next_simple(mod_freq, WaveType::Square);
            
            let mut noise = self.noise.next();
            
            // Gated by modulator
            noise *= if modulator > 0.0 { 1.0 } else { 0.0 };
            
            // Filter
            let cut = 500.0 + (v_rate * 100.0) + (env_val * 2000.0);
            let filtered = self.filter.process(noise, cut, 2.0);
            
            // Bitcrush
            let mut out = filtered;
            if v_crush > 0.0 {
                let bits = 1.0 + (1.0 - v_crush) * 10.0;
                out = (out * bits).round() / bits;
            }
            
            *sample = out * env_val * v_vol;
        }
    }
}