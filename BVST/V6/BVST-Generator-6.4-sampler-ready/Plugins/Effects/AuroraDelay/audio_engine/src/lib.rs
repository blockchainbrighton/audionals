use wasm_bindgen::prelude::*;
use bvst_lib::{Param, Curve, dsp::{self, Delay, Svf}};
use std::f32::consts::PI;

fn to_norm(val: f32, min: f32, max: f32) -> f32 {
    if max <= min { return 0.0; }
    ((val - min) / (max - min)).clamp(0.0, 1.0)
}

#[wasm_bindgen]
pub struct BvstSynth {
    sample_rate: f32,
    delay_l: Delay,
    delay_r: Delay,
    tone: Svf,
    lfo_phase: f32,

    p_time: Param,
    p_feedback: Param,
    p_mix: Param,
    p_tone: Param,
    p_drive: Param,
    p_width: Param,
}

#[wasm_bindgen]
impl BvstSynth {
    pub fn new(sample_rate: f32) -> Self {
        Self {
            sample_rate,
            delay_l: Delay::new(sample_rate, 2.0),
            delay_r: Delay::new(sample_rate, 2.0),
            tone: Svf::new(sample_rate),
            lfo_phase: 0.0,
            p_time: Param::new(Curve::Linear { min: 0.0, max: 1.0 }, 0.35),
            p_feedback: Param::new(Curve::Linear { min: 0.0, max: 0.95 }, to_norm(0.35, 0.0, 0.95)),
            p_mix: Param::new(Curve::Linear { min: 0.0, max: 1.0 }, 0.5),
            p_tone: Param::new(Curve::Exponential { min: 200.0, max: 12000.0 }, 0.5),
            p_drive: Param::new(Curve::Linear { min: 0.0, max: 1.0 }, 0.2),
            p_width: Param::new(Curve::Linear { min: 0.0, max: 0.05 }, to_norm(0.01, 0.0, 0.05)),
        }
    }

    pub fn set_param(&mut self, id: u32, value: f32) {
        match id {
            1 => self.p_time.set(to_norm(value, 0.0, 1.0)),
            2 => self.p_feedback.set(to_norm(value, 0.0, 0.95)),
            3 => self.p_mix.set(to_norm(value, 0.0, 1.0)),
            4 => self.p_tone.set(to_norm(value, 200.0, 12000.0)),
            5 => self.p_drive.set(to_norm(value, 0.0, 1.0)),
            6 => self.p_width.set(to_norm(value, 0.0, 0.05)),
            _ => {}
        }
    }

    pub fn process(&mut self, input: &[f32], output: &mut [f32]) {
        let phase_inc = (0.1 / self.sample_rate) * 2.0 * PI;

        for (i, sample) in output.iter_mut().enumerate() {
            let input_sample = input.get(i).copied().unwrap_or(0.0);

            // Params (smoothed)
            let base_time = self.p_time.process();
            let fb = self.p_feedback.process().clamp(0.0, 0.98);
            let mix = self.p_mix.process().clamp(0.0, 1.0);
            let tone = self.p_tone.process();
            let drive = self.p_drive.process();
            let width = self.p_width.process();

            // Soft saturation into tone filter
            let driven = (input_sample * (1.0 + drive * 4.0)).tanh();
            let filtered = self.tone.process(driven, tone, 0.7);

            // Gentle modulation for stereo smear (summed to mono)
            let mod_amt = (self.lfo_phase).sin() * width;
            let t_l = (base_time + mod_amt).max(0.0);
            let t_r = (base_time - mod_amt).max(0.0);

            let wet_l = self.delay_l.process(filtered, t_l, fb, mix);
            let wet_r = self.delay_r.process(filtered, t_r, fb, mix);

            let mut out = 0.5 * (wet_l + wet_r);
            if !out.is_finite() {
                out = 0.0;
                self.delay_l.clear();
                self.delay_r.clear();
                self.tone.reset();
            }
            *sample = out;

            self.lfo_phase += phase_inc;
            if self.lfo_phase > 2.0 * PI { self.lfo_phase -= 2.0 * PI; }
        }
    }
}
