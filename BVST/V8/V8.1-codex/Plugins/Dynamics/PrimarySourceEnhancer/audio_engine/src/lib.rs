use wasm_bindgen::prelude::*;
use bvst_lib::{thin_plugin, Param, Curve};
use bvst_lib::dsp::{Svf, clamp};

// Params
const P_THRESH: u32 = 0;
const P_RANGE: u32 = 1;
const P_ATTACK: u32 = 2;
const P_RELEASE: u32 = 3;
const P_HOLD: u32 = 4;
const P_HPF: u32 = 5;
const P_LPF: u32 = 6;

#[derive(Clone)]
struct Enhancer {
    envelope: f32,
    current_gain: f32,
    hold_timer: usize,
    filter_h: Svf,
    filter_l: Svf,
    sample_rate: f32,
}

impl Enhancer {
    fn new(sample_rate: f32) -> Self {
        Self { 
            envelope: 0.0, 
            current_gain: 1.0, 
            hold_timer: 0,
            filter_h: Svf::new(sample_rate),
            filter_l: Svf::new(sample_rate),
            sample_rate 
        }
    }

    fn process(&mut self, input: f32, thresh_db: f32, range_db: f32, att_ms: f32, rel_ms: f32, hold_ms: f32, hpf: f32, lpf: f32) -> f32 {
        // 1. Detector Path
        // Filter the control signal to focus on voice
        let mut det = input;
        det = self.filter_h.process(det, hpf, 0.707); // HPF
        // Svf.process returns LP by default.
        // Wait, Svf.process in `bvst_lib` returns Lowpass?
        // Let's check `dsp.rs` I updated.
        // `pub fn process(&mut self, input: f32, cutoff: f32, q: f32) -> f32 { self.process_multimode(input, cutoff, q).0 }`
        // .0 is LP.
        // I need HP!
        // I should use `process_multimode`.
        
        // Refactoring to use multimode for HPF
        let (_, hp, _, _) = self.filter_h.process_multimode(input, hpf, 0.707);
        det = hp;
        
        let (lp, _, _, _) = self.filter_l.process_multimode(det, lpf, 0.707);
        det = lp;
        
        let abs_in = det.abs();
        
        // Envelope Follower (Fast Attack for detection)
        // Detect envelope of the filtered signal
        let det_att = (-1.0 / (0.001 * 5.0 * self.sample_rate)).exp(); // Fixed 5ms detection attack
        let det_rel = (-1.0 / (0.001 * 50.0 * self.sample_rate)).exp(); // Fixed 50ms detection release
        
        let target = abs_in;
        let coef = if target > self.envelope { det_att } else { det_rel };
        self.envelope = target + (self.envelope - target) * coef;
        
        let env_db = if self.envelope > 0.000001 { 20.0 * self.envelope.log10() } else { -100.0 };
        
        // 2. Gain Computer
        let mut target_gain_db = 0.0;
        
        if env_db < thresh_db {
            // Below threshold -> Attenuate
            // But check Hold
            if self.hold_timer > 0 {
                self.hold_timer -= 1;
                target_gain_db = 0.0; // Hold open
            } else {
                // Attenuate towards Range
                // Soft knee?
                // Simple: gain = (env - thresh) * ratio?
                // PSE Logic: Linear reduction down to floor.
                // Let's just switch to Range if below? No, that's a hard gate.
                // Expander: 
                target_gain_db = (env_db - thresh_db) * 2.0; // 1:2 expansion
                if target_gain_db < range_db { target_gain_db = range_db; }
            }
        } else {
            // Above threshold -> Open
            target_gain_db = 0.0;
            // Reset Hold
            let hold_samples = (hold_ms * 0.001 * self.sample_rate) as usize;
            self.hold_timer = hold_samples;
        }
        
        // 3. Ballistics (Attack/Release on the GAIN, not the envelope)
        // This ensures smooth opening/closing
        let g_att_coef = (-1.0 / (0.001 * att_ms * self.sample_rate)).exp();
        let g_rel_coef = (-1.0 / (0.001 * rel_ms * self.sample_rate)).exp();
        
        // If target < current (closing), use Release. If target > current (opening), use Attack.
        // Wait, gain_db is negative.
        // 0.0 (Open) > -12.0 (Closed).
        // Opening (Closed -> Open): Target > Current. Use Attack.
        // Closing (Open -> Closed): Target < Current. Use Release.
        
        let g_coef = if target_gain_db > self.current_gain { g_att_coef } else { g_rel_coef };
        // Wait, standard gate ballistics:
        // Attack = Time to Open.
        // Release = Time to Close.
        
        // current_gain starts at 0.0 (Open) or -60 (Closed).
        // Let's track linear gain to avoid log math in loop?
        // Converting db to linear for smoothing is smoother.
        
        let target_linear = 10.0_f32.powf(target_gain_db / 20.0);
        let gl_att = (-1.0 / (0.001 * att_ms * self.sample_rate)).exp();
        let gl_rel = (-1.0 / (0.001 * rel_ms * self.sample_rate)).exp();
        
        let gl_coef = if target_linear > self.current_gain { gl_att } else { gl_rel };
        
        self.current_gain = target_linear + (self.current_gain - target_linear) * gl_coef;
        
        // 4. Apply
        input * self.current_gain
    }
}

thin_plugin! {
    struct PrimarySourceEnhancer {
        enhancer_l: Enhancer,
        enhancer_r: Enhancer,
    }

    init_fields (sr) {
        enhancer_l = Enhancer::new(sr),
        enhancer_r = Enhancer::new(sr),
    }

    params {
        0: p_thresh = Linear(-60.0, 0.0, -30.0),
        1: p_range = Linear(-60.0, 0.0, -12.0), // Max attenuation
        2: p_attack = Linear(0.1, 100.0, 5.0),
        3: p_release = Linear(10.0, 1000.0, 200.0),
        4: p_hold = Linear(0.0, 500.0, 50.0),
        5: p_hpf = Exponential(20.0, 1000.0, 100.0),
        6: p_lpf = Exponential(1000.0, 20000.0, 10000.0),
    }
}

#[wasm_bindgen(js_class = BvstSynth)]
impl PrimarySourceEnhancer {
    fn handle_event(&mut self, _id: u32, _value: f32) {}

    fn process_audio(&mut self, in_l: &[f32], in_r: &[f32], out_l: &mut [f32], out_r: &mut [f32]) {
        let thresh = self.p_thresh.process();
        let range = self.p_range.process();
        let att = self.p_attack.process();
        let rel = self.p_release.process();
        let hold = self.p_hold.process();
        let hpf = self.p_hpf.process();
        let lpf = self.p_lpf.process();

        let len = out_l.len().min(in_l.len());

        for i in 0..len {
            let dry_l = in_l[i];
            let dry_r = if i < in_r.len() { in_r[i] } else { dry_l };
            
            // Stereo Linked? Or Dual Mono?
            // PSE is often Dual Mono to handle bleed independently.
            
            out_l[i] = self.enhancer_l.process(dry_l, thresh, range, att, rel, hold, hpf, lpf);
            out_r[i] = self.enhancer_r.process(dry_r, thresh, range, att, rel, hold, hpf, lpf);
        }
    }
}
