use wasm_bindgen::prelude::*;
use bvst_lib::{Param, Curve, dsp};

fn to_norm(val: f32, min: f32, max: f32) -> f32 {
    if max <= min { return 0.0; }
    ((val - min) / (max - min)).clamp(0.0, 1.0)
}

#[wasm_bindgen]
pub struct BvstSynth {
    p_gain: Param,
    p_pan: Param,
    mono: bool,
    clip_guard: bool,
    rms_accum: f32,
    rms_count: usize,
    peak: f32,
    tilt_state: f32,
}

#[wasm_bindgen]
impl BvstSynth {
    pub fn new(_sample_rate: f32) -> Self {
        Self {
            p_gain: Param::new(Curve::Linear { min: -24.0, max: 24.0 }, to_norm(0.0, -24.0, 24.0)),
            p_pan: Param::new(Curve::Linear { min: -1.0, max: 1.0 }, 0.5),
            mono: true,
            clip_guard: true,
            rms_accum: 0.0,
            rms_count: 0,
            peak: 0.0,
            tilt_state: 0.0,
        }
    }

    pub fn set_param(&mut self, id: u32, value: f32) {
        match id {
            1 => self.p_gain.set(to_norm(value, -24.0, 24.0)),
            2 => self.p_pan.set(to_norm(value, -1.0, 1.0)),
            3 => self.mono = value >= 0.5,
            4 => self.clip_guard = value >= 0.5,
            _ => {}
        }
    }

    pub fn process(&mut self, input: &[f32], output: &mut [f32]) {
        for (i, sample) in output.iter_mut().enumerate() {
            let inp = input.get(i).copied().unwrap_or(0.0);

            let gain_db = self.p_gain.process();
            let pan = self.p_pan.process();
            let gain = dsp::db_to_lin(gain_db);

            // Mono fold if requested (here it simply passes mono through)
            let mut val = if self.mono { inp } else { inp };

            // Simple tilt EQ driven by pan to give sense of motion even in mono
            let alpha = 0.05;
            self.tilt_state += alpha * (val - self.tilt_state);
            let high = val - self.tilt_state;
            val += high * pan * 0.3;

            val *= gain;

            if self.clip_guard {
                val = val.tanh();
            }

            self.peak = self.peak.max(val.abs());
            self.rms_accum += val * val;
            self.rms_count += 1;

            *sample = val;
        }

        if self.rms_count > 2048 {
            self.rms_accum = 0.0;
            self.rms_count = 0;
            self.peak = 0.0;
        }
    }
}