use wasm_bindgen::prelude::*;
use bvst_lib::{Param, Curve, dsp};

fn to_norm(val: f32, min: f32, max: f32) -> f32 {
    if max <= min { return 0.0; }
    ((val - min) / (max - min)).clamp(0.0, 1.0)
}

#[wasm_bindgen]
pub struct BvstSynth {
    sample_rate: f32,
    env: f32,
    p_thresh: Param,
    p_ratio: Param,
    p_attack: Param,
    p_release: Param,
    p_mix: Param,
    p_makeup: Param,
    p_sc_hpf: Param,
    sc_state: f32,
}

#[wasm_bindgen]
impl BvstSynth {
    pub fn new(sample_rate: f32) -> Self {
        Self {
            sample_rate,
            env: 0.0,
            p_thresh: Param::new(Curve::Linear { min: -50.0, max: 0.0 }, to_norm(-18.0, -50.0, 0.0)),
            p_ratio: Param::new(Curve::Linear { min: 2.0, max: 10.0 }, to_norm(4.0, 2.0, 10.0)),
            p_attack: Param::new(Curve::Exponential { min: 0.001, max: 0.05 }, to_norm(0.01, 0.001, 0.05)),
            p_release: Param::new(Curve::Exponential { min: 0.05, max: 0.8 }, to_norm(0.2, 0.05, 0.8)),
            p_mix: Param::new(Curve::Linear { min: 0.0, max: 1.0 }, 0.5),
            p_makeup: Param::new(Curve::Linear { min: 0.0, max: 12.0 }, to_norm(3.0, 0.0, 12.0)),
            p_sc_hpf: Param::new(Curve::Exponential { min: 20.0, max: 200.0 }, to_norm(80.0, 20.0, 200.0)),
            sc_state: 0.0,
        }
    }

    pub fn set_param(&mut self, id: u32, value: f32) {
        match id {
            1 => self.p_thresh.set(to_norm(value, -50.0, 0.0)),
            2 => self.p_ratio.set(to_norm(value, 2.0, 10.0)),
            3 => self.p_attack.set(to_norm(value, 0.001, 0.05)),
            4 => self.p_release.set(to_norm(value, 0.05, 0.8)),
            5 => self.p_mix.set(to_norm(value, 0.0, 1.0)),
            6 => self.p_makeup.set(to_norm(value, 0.0, 12.0)),
            7 => self.p_sc_hpf.set(to_norm(value, 20.0, 200.0)),
            _ => {}
        }
    }

    pub fn process(&mut self, input: &[f32], output: &mut [f32]) {
        let mut peak_guard: f32 = 0.0;
        for (i, sample) in output.iter_mut().enumerate() {
            let raw = input.get(i).copied().unwrap_or(0.0);

            let thresh = self.p_thresh.process();
            let ratio = self.p_ratio.process().max(1.0);
            let attack = self.p_attack.process().max(0.0001);
            let release = self.p_release.process().max(0.01);
            let mix = self.p_mix.process().clamp(0.0, 1.0);
            let makeup_db = self.p_makeup.process();
            let sc_freq = self.p_sc_hpf.process();

            // Sidechain HPF (single pole)
            let alpha = (2.0 * std::f32::consts::PI * sc_freq / self.sample_rate).min(0.99);
            self.sc_state += alpha * (raw - self.sc_state);
            let detect = raw - self.sc_state;

            // Detector envelope
            let input_abs = detect.abs();
            let att_coef = (-1.0 / (attack * self.sample_rate)).exp();
            let rel_coef = (-1.0 / (release * self.sample_rate)).exp();
            if input_abs > self.env { self.env = att_coef * self.env + (1.0 - att_coef) * input_abs; }
            else { self.env = rel_coef * self.env + (1.0 - rel_coef) * input_abs; }

            let env_db = if self.env > 0.000001 { 20.0 * self.env.log10() } else { -96.0 };
            let gain_db = if env_db > thresh { (thresh - env_db) * (1.0 - 1.0 / ratio) } else { 0.0 };
            let gain_lin = dsp::db_to_lin(gain_db + makeup_db);

            let comp = raw * gain_lin;
            let out = dsp::lerp(raw, comp, mix);
            peak_guard = peak_guard.max(out.abs());

            *sample = out;
        }

        if !peak_guard.is_finite() || peak_guard > 10.0 {
            self.env = 0.0;
            self.sc_state = 0.0;
        }
    }
}
