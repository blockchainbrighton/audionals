use wasm_bindgen::prelude::*;
use bvst_lib::{bvst_plugin, Param, Curve, dsp::{self, Delay, Svf}};
use std::f32::consts::PI;

bvst_plugin! {
    struct BvstSynth {
        delay_l: Delay,
        delay_r: Delay,
        tone: Svf,
        lfo_phase: f32,
    }

    init_fields (sample_rate) {
        delay_l = Delay::new(sample_rate, 2.0),
        delay_r = Delay::new(sample_rate, 2.0),
        tone = Svf::new(sample_rate),
        lfo_phase = 0.0
    }

    params {
        1: p_time     = Linear(0.0, 1.0, 0.35),
        2: p_feedback = Linear(0.0, 0.95, 0.35), 
        3: p_mix      = Linear(0.0, 1.0, 0.5),
        4: p_tone     = Exponential(200.0, 12000.0, 2500.0),
        5: p_drive    = Linear(0.0, 1.0, 0.2),
        6: p_width    = Linear(0.0, 0.05, 0.01),
    }

    impl BvstSynth {
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
}