use wasm_bindgen::prelude::*;
use bvst_lib::{Param, Curve, dsp::{self, Delay}};
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
    lfo_phase: f32,
    p_rate: Param,
    p_depth: Param,
    p_mix: Param,
    p_feedback: Param,
    p_stereo: Param,
    p_tilt: Param,
}

#[wasm_bindgen]
impl BvstSynth {
    pub fn new(sample_rate: f32) -> Self {
        Self {
            sample_rate,
            delay_l: Delay::new(sample_rate, 0.06),
            delay_r: Delay::new(sample_rate, 0.06),
            lfo_phase: 0.0,
            p_rate: Param::new(Curve::Exponential { min: 0.05, max: 5.0 }, to_norm(0.5, 0.05, 5.0)),
            p_depth: Param::new(Curve::Linear { min: 0.0, max: 0.02 }, to_norm(0.008, 0.0, 0.02)),
            p_mix: Param::new(Curve::Linear { min: 0.0, max: 1.0 }, 0.5),
            p_feedback: Param::new(Curve::Linear { min: -0.7, max: 0.7 }, to_norm(0.1, -0.7, 0.7)),
            p_stereo: Param::new(Curve::Linear { min: 0.0, max: 180.0 }, to_norm(90.0, 0.0, 180.0)),
            p_tilt: Param::new(Curve::Linear { min: -1.0, max: 1.0 }, to_norm(0.0, -1.0, 1.0)),
        }
    }

    pub fn set_param(&mut self, id: u32, value: f32) {
        match id {
            1 => self.p_rate.set(to_norm(value, 0.05, 5.0)),
            2 => self.p_depth.set(to_norm(value, 0.0, 0.02)),
            3 => self.p_mix.set(to_norm(value, 0.0, 1.0)),
            4 => self.p_feedback.set(to_norm(value, -0.7, 0.7)),
            5 => self.p_stereo.set(to_norm(value, 0.0, 180.0)),
            6 => self.p_tilt.set(to_norm(value, -1.0, 1.0)),
            _ => {}
        }
    }

    pub fn process(&mut self, input: &[f32], output: &mut [f32]) {
        for (i, sample) in output.iter_mut().enumerate() {
            let dry = input.get(i).copied().unwrap_or(0.0);

            let rate = self.p_rate.process();
            let depth = self.p_depth.process();
            let mix = self.p_mix.process().clamp(0.0, 1.0);
            let fb = self.p_feedback.process();
            let stereo_deg = self.p_stereo.process();
            let tilt = self.p_tilt.process();

            let phase_inc = rate / self.sample_rate;
            self.lfo_phase = (self.lfo_phase + phase_inc) % 1.0;

            let phase_r = (self.lfo_phase + stereo_deg / 360.0) % 1.0;
            let mod_l = (self.lfo_phase * 2.0 * PI).sin();
            let mod_r = (phase_r * 2.0 * PI).sin();

            // Small fixed base delay prevents zero-time feedback spikes
            let time_l = (0.01 + mod_l * depth).max(0.0005);
            let time_r = (0.01 + mod_r * depth).max(0.0005);

            let delayed_l = self.delay_l.process(dry, time_l, fb, 1.0);
            let delayed_r = self.delay_r.process(dry, time_r, fb, 1.0);

            // Simple tilt EQ: bias highs or lows
            let emphasized = dry + (dry * tilt * 0.2);
            let wet = (delayed_l + delayed_r) * 0.5;
            let out = dsp::lerp(emphasized, wet, mix);

            *sample = out;
        }
    }
}