use wasm_bindgen::prelude::*;
use bvst_lib::{bvst_plugin, Param, Curve, dsp};

bvst_plugin! {
    struct BvstSynth {
        env: f32,
        sc_state: f32,
    }

    init_fields (sample_rate) {
        env = 0.0,
        sc_state = 0.0
    }

    params {
        1: p_thresh  = Linear(-50.0, 0.0, -18.0),
        2: p_ratio   = Linear(2.0, 10.0, 4.0),
        3: p_attack  = Exponential(0.001, 0.05, 0.01),
        4: p_release = Exponential(0.05, 0.8, 0.2),
        5: p_mix     = Linear(0.0, 1.0, 0.5),
        6: p_makeup  = Linear(0.0, 12.0, 3.0),
        7: p_sc_hpf  = Exponential(20.0, 200.0, 80.0),
    }

    impl BvstSynth {
        fn custom_param(&mut self, _id: u32, _val: f32) {}

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
}