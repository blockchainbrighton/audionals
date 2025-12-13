use wasm_bindgen::prelude::*;
use bvst_lib::{thin_plugin, Param, Curve};

// Params
const P_THRESH: u32 = 0;
const P_RATIO: u32 = 1;
const P_ATTACK: u32 = 2;
const P_RELEASE: u32 = 3;
const P_KNEE: u32 = 4;
const P_MAKEUP: u32 = 5;
const P_MIX: u32 = 6;

#[derive(Clone)]
struct Compressor {
    envelope: f32,
    sample_rate: f32,
}

impl Compressor {
    fn new(sample_rate: f32) -> Self {
        Self { envelope: 0.0, sample_rate }
    }

    fn process(&mut self, input: f32, thresh_db: f32, ratio: f32, att_ms: f32, rel_ms: f32, knee: f32) -> f32 {
        let abs_in = input.abs();
        
        // Envelope Follower (Simple 1-pole)
        // Attack/Release coefficients
        let att_coef = (-1.0 / (0.001 * att_ms * self.sample_rate)).exp();
        let rel_coef = (-1.0 / (0.001 * rel_ms * self.sample_rate)).exp();
        
        let target = abs_in;
        let coef = if target > self.envelope { att_coef } else { rel_coef };
        self.envelope = target + (self.envelope - target) * coef;
        
        // Convert to dB
        let env_db = if self.envelope > 0.000001 { 20.0 * self.envelope.log10() } else { -100.0 };
        
        // Gain Computer
        // Compressor: Ratio > 1. Reduction happens above threshold.
        // Expander/Gate: Ratio < 1 (e.g. 0.5 means 1:2 expansion? No, usually Ratio is defined as Input:Output change)
        // Standard definition: Ratio 4 means 4dB input over thresh -> 1dB output over thresh.
        // Slope = 1 / Ratio.
        
        // Let's implement standard Compressor logic.
        // Ratio 1.0 = 1:1 (No change)
        // Ratio 2.0 = 2:1
        // Ratio 0.5 = Expander? Or Gate?
        // Let's stick to Compressor/Limiter for this "Dynamics" plugin to keep it simple.
        
        let slope = 1.0 / ratio;
        let overshoot = env_db - thresh_db;
        
        let mut gain_db = 0.0;
        
        if overshoot > 0.0 {
            // Above threshold
            // Soft Knee?
            if knee > 0.0 && overshoot < knee {
                // Interpolate
                // Simplified soft knee
                let x = (overshoot + knee) / (2.0 * knee);
                gain_db = slope * (overshoot - knee) + overshoot; // Approximation?
                // Standard soft knee is complex.
                // Let's do hard knee for now.
                gain_db = overshoot * (slope - 1.0);
            } else {
                gain_db = overshoot * (slope - 1.0);
            }
        }
        
        // Gain reduction is negative dB
        let gain = 10.0_f32.powf(gain_db / 20.0);
        gain
    }
}

thin_plugin! {
    struct UniversalDynamics {
        comp_l: Compressor,
        comp_r: Compressor,
    }

    init_fields (sr) {
        comp_l = Compressor::new(sr),
        comp_r = Compressor::new(sr),
    }

    params {
        0: p_thresh = Linear(-60.0, 0.0, -12.0),
        1: p_ratio = Linear(1.0, 20.0, 4.0),
        2: p_attack = Linear(0.1, 100.0, 10.0),
        3: p_release = Linear(10.0, 1000.0, 100.0),
        4: p_knee = Linear(0.0, 12.0, 0.0),
        5: p_makeup = Linear(0.0, 24.0, 0.0),
        6: p_mix = Linear(0.0, 1.0, 1.0),
    }
}

#[wasm_bindgen(js_class = BvstSynth)]
impl UniversalDynamics {
    fn handle_event(&mut self, _id: u32, _value: f32) {}

    fn process_audio(&mut self, in_l: &[f32], in_r: &[f32], out_l: &mut [f32], out_r: &mut [f32]) {
        let thresh = self.p_thresh.process();
        let ratio = self.p_ratio.process();
        let att = self.p_attack.process();
        let rel = self.p_release.process();
        let knee = self.p_knee.process();
        let makeup_db = self.p_makeup.process();
        let mix = self.p_mix.process();
        
        let makeup = 10.0_f32.powf(makeup_db / 20.0);

        let len = out_l.len().min(in_l.len());

        for i in 0..len {
            let dry_l = in_l[i];
            let dry_r = if i < in_r.len() { in_r[i] } else { dry_l };
            
            // Stereo Link? Or Dual Mono?
            // Dual Mono for now.
            let gr_l = self.comp_l.process(dry_l, thresh, ratio, att, rel, knee);
            let gr_r = self.comp_r.process(dry_r, thresh, ratio, att, rel, knee);
            
            let wet_l = dry_l * gr_l * makeup;
            let wet_r = dry_r * gr_r * makeup;
            
            out_l[i] = dry_l * (1.0 - mix) + wet_l * mix;
            out_r[i] = dry_r * (1.0 - mix) + wet_r * mix;
        }
    }
}
