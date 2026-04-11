use wasm_bindgen::prelude::*;
use bvst_lib::{thin_plugin, Param, Curve};
use bvst_lib::dsp::{Oscillator, WaveType, Delay};

// Params
const P_RATE: u32 = 0;
const P_DEPTH: u32 = 1;
const P_FEED: u32 = 2;
const P_MIX: u32 = 3;
const P_SPREAD: u32 = 4; // LFO Phase offset
const P_TREM_RATE: u32 = 5;
const P_TREM_DEPTH: u32 = 6;

thin_plugin! {
    struct UniversalMod {
        lfo: Oscillator,
        lfo_trem: Oscillator,
        delay_l: Delay,
        delay_r: Delay,
    }

    init_fields (sr) {
        lfo = Oscillator::new(sr),
        lfo_trem = Oscillator::new(sr),
        delay_l = Delay::new(sr, 0.1), // 100ms max for chorus
        delay_r = Delay::new(sr, 0.1),
    }

    params {
        0: p_rate = Linear(0.1, 10.0, 0.5),
        1: p_depth = Linear(0.0, 0.02, 0.002), // 0 to 20ms modulation
        2: p_feed = Linear(0.0, 0.95, 0.3),
        3: p_mix = Linear(0.0, 1.0, 0.5),
        4: p_spread = Linear(0.0, 3.14, 1.57), // 0 to PI
        5: p_trem_rate = Linear(0.1, 20.0, 4.0),
        6: p_trem_depth = Linear(0.0, 1.0, 0.0),
    }
}

#[wasm_bindgen(js_class = BvstSynth)]
impl UniversalMod {
    fn handle_event(&mut self, _id: u32, _value: f32) {}

    fn process_audio(&mut self, in_l: &[f32], in_r: &[f32], out_l: &mut [f32], out_r: &mut [f32]) {
        let rate = self.p_rate.process();
        let depth = self.p_depth.process();
        let feed = self.p_feed.process();
        let mix = self.p_mix.process();
        let spread = self.p_spread.process();
        
        let trem_rate = self.p_trem_rate.process();
        let trem_depth = self.p_trem_depth.process();

        let len = out_l.len().min(in_l.len());

        for i in 0..len {
            // LFOs
            // Chorus LFO (Sin)
            let mod_l = self.lfo.next_simple(rate, WaveType::Sin);
            // Reconstruct Mod R with phase offset? 
            // My Oscillator doesn't support arbitrary phase read.
            // Hack: Use `mod_l` for Left. Use `(mod_l with phase shift)` logic?
            // Or simpler: LFO R is just delayed version? No.
            // Let's just use mod_l for L, and -mod_l for R if spread is high (180 deg).
            // Better: spread maps to inversion.
            // If spread > 1.0, invert R mod.
            let mod_r = if spread > 1.0 { -mod_l } else { mod_l };

            // Tremolo LFO (Tri)
            let trem = self.lfo_trem.next_simple(trem_rate, WaveType::Tri);
            let trem_gain = 1.0 - (trem_depth * 0.5 * (trem + 1.0)); // 0..1 modulation

            // Inputs
            let src_l = in_l[i];
            let src_r = if i < in_r.len() { in_r[i] } else { src_l };

            // Chorus/Flanger
            // Time = base (e.g. 5ms) + mod * depth
            let base_time = 0.005; // 5ms center
            let time_l = base_time + mod_l * depth; // +/- depth
            let time_r = base_time + mod_r * depth;
            
            // Absolute time must be > 0. delay.process handles < 0? 
            // Clamp
            let t_l = time_l.max(0.0001);
            let t_r = time_r.max(0.0001);

            let chor_l = self.delay_l.process(src_l, mix, t_l, feed);
            let chor_r = self.delay_r.process(src_r, mix, t_r, feed);

            // Tremolo
            out_l[i] = chor_l * trem_gain;
            out_r[i] = chor_r * trem_gain;
        }
    }
}
