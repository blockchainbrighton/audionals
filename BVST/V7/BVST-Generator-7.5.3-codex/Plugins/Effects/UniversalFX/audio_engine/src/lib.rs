use wasm_bindgen::prelude::*;
use bvst_lib::{thin_plugin, Param, Curve};
use bvst_lib::dsp::{Oscillator, WaveType, Svf, Delay, Drive, clamp};

// Params
const P_DRIVE: u32 = 0;
const P_FILT_CUT: u32 = 1;
const P_FILT_RES: u32 = 2;
const P_LFO_RATE: u32 = 3;
const P_LFO_DEPTH: u32 = 4;
const P_DLY_TIME: u32 = 5;
const P_DLY_FEED: u32 = 6;
const P_DLY_MIX: u32 = 7;
const P_GLOBAL_MIX: u32 = 8;

thin_plugin! {
    struct UniversalFX {
        drive: Drive,
        filter_l: Svf,
        filter_r: Svf,
        lfo: Oscillator,
        delay_l: Delay,
        delay_r: Delay,
    }

    init_fields (sr) {
        drive = Drive::new(),
        filter_l = Svf::new(sr),
        filter_r = Svf::new(sr),
        lfo = Oscillator::new(sr),
        delay_l = Delay::new(sr, 2.0),
        delay_r = Delay::new(sr, 2.0),
    }

    params {
        0: p_drive = Linear(0.0, 1.0, 0.0),
        1: p_filt_cut = Exponential(20.0, 20000.0, 5000.0),
        2: p_filt_res = Linear(0.5, 10.0, 0.7),
        3: p_lfo_rate = Linear(0.1, 10.0, 1.0),
        4: p_lfo_depth = Linear(0.0, 1.0, 0.0),
        5: p_dly_time = Linear(0.0, 1.0, 0.3),
        6: p_dly_feed = Linear(0.0, 0.95, 0.4),
        7: p_dly_mix = Linear(0.0, 1.0, 0.3),
        8: p_global_mix = Linear(0.0, 1.0, 1.0),
    }
}

#[wasm_bindgen(js_class = BvstSynth)]
impl UniversalFX {
    // No note_on/off needed for pure FX, but we can keep empty impls or omit them.
    // The unified loader checks for existence.
    
    fn handle_event(&mut self, _id: u32, _value: f32) {
        // No MIDI events handling needed for this simple FX
    }

    fn process_audio(&mut self, in_l: &[f32], in_r: &[f32], out_l: &mut [f32], out_r: &mut [f32]) {
        // Param processing (per block for efficiency, or per sample if needed)
        
        let drive_amt = self.p_drive.process();
        let cutoff_base = self.p_filt_cut.process();
        let res = self.p_filt_res.process();
        let lfo_rate = self.p_lfo_rate.process();
        let lfo_depth = self.p_lfo_depth.process();
        let dly_time = self.p_dly_time.process();
        let dly_feed = self.p_dly_feed.process();
        let dly_mix_amt = self.p_dly_mix.process();
        let global_mix = self.p_global_mix.process();

        // Safe loop limit
        let len = out_l.len().min(in_l.len());

        for i in 0..len {
            // 1. Input
            let mut left = in_l[i];
            let mut right = if i < in_r.len() { in_r[i] } else { left };
            let dry_l = left;
            let dry_r = right;

            // 2. Drive
            if drive_amt > 0.001 {
                left = self.drive.process(left, drive_amt);
                right = self.drive.process(right, drive_amt);
            }

            // 3. Filter + LFO
            // LFO generates -1 to 1.
            // Depth maps to frequency deviation.
            let lfo_val = self.lfo.next_simple(lfo_rate, WaveType::Sin);
            let mod_amt = lfo_val * lfo_depth * 2000.0; // +/- 2000Hz
            let mut cut = cutoff_base + mod_amt;
            cut = clamp(cut, 20.0, 20000.0);

            left = self.filter_l.process(left, cut, res);
            right = self.filter_r.process(right, cut, res);

            // 4. Delay (Stereo with offset for width)
            // Offset right channel time slightly for width if desired, or just same time.
            // Let's do simple stereo.
            let dl = self.delay_l.process(left, dly_mix_amt, dly_time, dly_feed);
            // Ping pong? Or just offset? Let's add 10ms offset to right if time > 0
            let r_time = if dly_time > 0.01 { dly_time + 0.01 } else { 0.0 };
            let dr = self.delay_r.process(right, dly_mix_amt, r_time, dly_feed);
            
            left = dl;
            right = dr;

            // 5. Global Mix
            out_l[i] = dry_l * (1.0 - global_mix) + left * global_mix;
            out_r[i] = dry_r * (1.0 - global_mix) + right * global_mix;
        }
    }
}
