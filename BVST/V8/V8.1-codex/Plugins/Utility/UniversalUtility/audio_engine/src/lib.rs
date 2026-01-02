use wasm_bindgen::prelude::*;
use bvst_lib::{thin_plugin, Param, Curve};
use bvst_lib::dsp::{Oscillator, WaveType, NoiseGen};
use std::f32::consts::PI;

// Params
const P_TONE_TYPE: u32 = 0;
const P_TONE_FREQ: u32 = 1;
const P_TONE_GAIN: u32 = 2;
const P_IN_GAIN: u32 = 3;
const P_PAN: u32 = 4;
const P_WIDTH: u32 = 5;
const P_PHASE_L: u32 = 6;
const P_PHASE_R: u32 = 7;

thin_plugin! {
    struct UniversalUtility {
        osc: Oscillator,
        noise: NoiseGen,
    }

    init_fields (sr) {
        osc = Oscillator::new(sr),
        noise = NoiseGen::new(),
    }

    params {
        0: p_tone_type = Linear(0.0, 3.0, 0.0), // Off
        1: p_tone_freq = Exponential(20.0, 20000.0, 440.0),
        2: p_tone_gain = Linear(0.0, 1.0, 0.5),
        3: p_in_gain = Linear(0.0, 2.0, 1.0),
        4: p_pan = Linear(-1.0, 1.0, 0.0),
        5: p_width = Linear(0.0, 2.0, 1.0),
        6: p_phase_l = Linear(0.0, 1.0, 0.0),
        7: p_phase_r = Linear(0.0, 1.0, 0.0),
    }
}

#[wasm_bindgen(js_class = BvstSynth)]
impl UniversalUtility {
    fn handle_event(&mut self, _id: u32, _value: f32) {}

    fn process_audio(&mut self, in_l: &[f32], in_r: &[f32], out_l: &mut [f32], out_r: &mut [f32]) {
        let tone_type = self.p_tone_type.process() as u32;
        let tone_freq = self.p_tone_freq.process();
        let tone_gain = self.p_tone_gain.process();
        let in_gain = self.p_in_gain.process();
        let pan = self.p_pan.process();
        let width = self.p_width.process();
        let ph_l = if self.p_phase_l.process() > 0.5 { -1.0 } else { 1.0 };
        let ph_r = if self.p_phase_r.process() > 0.5 { -1.0 } else { 1.0 };

        let len = out_l.len().min(in_l.len());

        for i in 0..len {
            // 1. Tone Gen
            let tone = if tone_type == 0 {
                0.0
            } else if tone_type == 1 {
                self.osc.next_simple(tone_freq, WaveType::Sin)
            } else if tone_type == 2 {
                self.noise.next()
            } else {
                self.osc.next_simple(tone_freq, WaveType::Saw)
            };

            // 2. Input + Tone
            let mut l = in_l[i] * in_gain + tone * tone_gain;
            let mut r = if i < in_r.len() { in_r[i] } else { in_l[i] } * in_gain + tone * tone_gain;

            // 3. Width (Mid/Side)
            if (width - 1.0).abs() > 0.01 {
                let mid = (l + r) * 0.5;
                let side = (l - r) * 0.5;
                let side_w = side * width;
                l = mid + side_w;
                r = mid - side_w;
            }

            // 4. Pan (Linear Power or const power? Simple linear for utility)
            // L = input * ((1-pan)/2)? No.
            // Pan -1: L=1, R=0. Pan 0: L=1, R=1? No, -3dB usually.
            // Simple balance:
            let pan_l = (1.0 - pan).min(1.0).max(0.0); // if pan=1 (R), pan_l=0. if pan=-1 (L), pan_l=1 (clamped).
            // Actually standard balance: 
            // if pan < 0: L=1, R=1+pan. 
            // if pan > 0: L=1-pan, R=1.
            let gain_l = if pan > 0.0 { 1.0 - pan } else { 1.0 };
            let gain_r = if pan < 0.0 { 1.0 + pan } else { 1.0 };
            
            l *= gain_l;
            r *= gain_r;

            // 5. Phase
            l *= ph_l;
            r *= ph_r;

            out_l[i] = l;
            out_r[i] = r;
        }
    }
}
