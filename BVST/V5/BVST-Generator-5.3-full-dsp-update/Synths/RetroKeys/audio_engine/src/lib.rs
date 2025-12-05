use wasm_bindgen::prelude::*;
use bvst_lib::{Param, Curve, dsp::{self, Oscillator, Svf, Adsr, WaveType}};

#[wasm_bindgen]
pub struct BvstSynth {
    sample_rate: f32,
    osc_carrier: Oscillator,
    osc_modulator: Oscillator,
    lfo_tremolo: Oscillator,
    env: Adsr,
    filter: Svf,
    
    // Params
    p_fm_amt: Param,
    p_trem_rate: Param,
    p_trem_depth: Param,
    p_tone: Param, // Filter Cutoff
    p_decay: Param,
    p_vol: Param,
    
    curr_freq: f32,
    gate: bool,
}

#[wasm_bindgen]
impl BvstSynth {
    pub fn new(sample_rate: f32) -> BvstSynth {
        BvstSynth {
            sample_rate,
            osc_carrier: Oscillator::new(sample_rate),
            osc_modulator: Oscillator::new(sample_rate),
            lfo_tremolo: Oscillator::new(sample_rate),
            env: Adsr::new(sample_rate),
            filter: Svf::new(sample_rate),
            
            p_fm_amt: Param::new(Curve::Linear { min: 0.0, max: 500.0 }, 100.0),
            p_trem_rate: Param::new(Curve::Exponential { min: 0.5, max: 15.0 }, 4.0),
            p_trem_depth: Param::new(Curve::Linear { min: 0.0, max: 0.8 }, 0.0),
            p_tone: Param::new(Curve::Exponential { min: 200.0, max: 10000.0 }, 2000.0),
            p_decay: Param::new(Curve::Linear { min: 0.1, max: 3.0 }, 1.0),
            p_vol: Param::new(Curve::Squared { min: 0.0, max: 1.0 }, 0.5),
            
            curr_freq: 440.0,
            gate: false,
        }
    }

    pub fn set_param(&mut self, id: u32, value: f32) {
        match id {
            1 => self.p_fm_amt.set(value),
            2 => self.p_trem_rate.set(value),
            3 => self.p_trem_depth.set(value),
            4 => self.p_tone.set(value),
            5 => self.p_decay.set(value),
            6 => self.p_vol.set(value),
            
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
            let v_fm = self.p_fm_amt.process();
            let v_trem_rate = self.p_trem_rate.process();
            let v_trem_depth = self.p_trem_depth.process();
            let v_tone = self.p_tone.process();
            let v_decay = self.p_decay.process();
            let v_vol = self.p_vol.process();
            
            // Update Env
            self.env.d = v_decay;
            let env_val = self.env.next();
            
            // LFO
            let trem_osc = self.lfo_tremolo.next_simple(v_trem_rate, WaveType::Sine);
            let tremolo = 1.0 - (v_trem_depth * (trem_osc * 0.5 + 0.5));

            // FM
            // Modulator is fixed ratio (e.g., 2.0 for bell/tine sound, or 14.0 for grit)
            // Electric piano usually close ratio like 1:1 or 1:4
            let mod_out = self.osc_modulator.next_simple(self.curr_freq * 4.0, WaveType::Sine);
            
            let carrier_freq = self.curr_freq + (mod_out * v_fm);
            let signal = self.osc_carrier.next_simple(carrier_freq, WaveType::Sine);
            
            // Filter (Tone)
            let filtered = self.filter.process(signal, v_tone, 0.0); // Low resonance
            
            *sample = filtered * env_val * tremolo * v_vol;
        }
    }
}