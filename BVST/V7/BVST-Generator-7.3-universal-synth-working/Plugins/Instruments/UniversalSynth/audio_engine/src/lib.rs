use wasm_bindgen::prelude::*;
use bvst_lib::{thin_plugin, Param, Curve};
use bvst_lib::dsp::{Oscillator, WaveType, Svf, Adsr, Delay, Drive, NoiseGen, mtof, clamp};

// Parameter Constants
const P_OSC1_WAVE: u32 = 0;
const P_OSC1_TUNE: u32 = 1;
const P_OSC1_MIX: u32 = 2;

const P_OSC2_WAVE: u32 = 4;
const P_OSC2_TUNE: u32 = 5;
const P_OSC2_DETUNE: u32 = 6;
const P_OSC2_MIX: u32 = 7;

const P_NOISE_MIX: u32 = 8;
const P_DRIVE: u32 = 9;

const P_FILT_CUTOFF: u32 = 10;
const P_FILT_RES: u32 = 11;
const P_FILT_MODE: u32 = 12;
const P_FILT_ENV: u32 = 13;

const P_AMP_A: u32 = 14;
const P_AMP_D: u32 = 15;
const P_AMP_S: u32 = 16;
const P_AMP_R: u32 = 17;

const P_FILT_A: u32 = 18;
const P_FILT_D: u32 = 19;
const P_FILT_S: u32 = 20;
const P_FILT_R: u32 = 21;

const P_LFO_RATE: u32 = 22;
const P_LFO_DEPTH: u32 = 23;
const P_LFO_TARGET: u32 = 24; // 0=None, 1=Cutoff, 2=Pitch
const P_LFO_WAVE: u32 = 25;

const P_DLY_TIME: u32 = 26;
const P_DLY_FEED: u32 = 27;
const P_DLY_MIX: u32 = 28;

const P_MASTER: u32 = 29;

// Special
const P_NOTE: u32 = 128;
const P_GATE: u32 = 129;

thin_plugin! {
    struct UniversalSynth {
        osc1: Oscillator,
        osc2: Oscillator,
        noise: NoiseGen,
        lfo: Oscillator,
        filter: Svf,
        env_amp: Adsr,
        env_filt: Adsr,
        delay: Delay,
        drive: Drive,
        
        // State
        current_note: f32,
        gate: bool,
        velocity: f32,
    }

    init_fields (sr) {
        osc1 = Oscillator::new(sr),
        osc2 = Oscillator::new(sr),
        noise = NoiseGen::new(),
        lfo = Oscillator::new(sr),
        filter = Svf::new(sr),
        env_amp = Adsr::new(sr),
        env_filt = Adsr::new(sr),
        delay = Delay::new(sr, 2.0),
        drive = Drive::new(),
        
        current_note = 60.0,
        gate = false,
        velocity = 0.0,
    }

    params {
        // Osc 1
        0: p_osc1_wave = Linear(0.0, 3.0, 1.0), // Saw default
        1: p_osc1_tune = Linear(-24.0, 24.0, 0.0),
        2: p_osc1_mix = Linear(0.0, 1.0, 0.8),

        // Osc 2
        4: p_osc2_wave = Linear(0.0, 3.0, 2.0), // Square default
        5: p_osc2_tune = Linear(-24.0, 24.0, 0.0),
        6: p_osc2_detune = Linear(0.0, 0.5, 0.05),
        7: p_osc2_mix = Linear(0.0, 1.0, 0.0),

        // Mix/Drive
        8: p_noise_mix = Linear(0.0, 1.0, 0.0),
        9: p_drive = Linear(0.0, 1.0, 0.0),

        // Filter
        10: p_filt_cutoff = Exponential(20.0, 20000.0, 20000.0),
        11: p_filt_res = Linear(0.5, 10.0, 0.7),
        12: p_filt_mode = Linear(0.0, 3.0, 0.0), // LP
        13: p_filt_env = Linear(-1.0, 1.0, 0.0),

        // Amp Env
        14: p_amp_a = Linear(0.001, 2.0, 0.01),
        15: p_amp_d = Linear(0.001, 2.0, 0.1),
        16: p_amp_s = Linear(0.0, 1.0, 0.8),
        17: p_amp_r = Linear(0.001, 5.0, 0.2),

        // Filt Env
        18: p_filt_a = Linear(0.001, 2.0, 0.01),
        19: p_filt_d = Linear(0.001, 2.0, 0.2),
        20: p_filt_s = Linear(0.0, 1.0, 0.5),
        21: p_filt_r = Linear(0.001, 5.0, 0.2),

        // LFO
        22: p_lfo_rate = Linear(0.1, 20.0, 1.0),
        23: p_lfo_depth = Linear(0.0, 1.0, 0.0),
        24: p_lfo_target = Linear(0.0, 2.0, 0.0), // 0=None, 1=Cutoff, 2=Pitch
        25: p_lfo_wave = Linear(0.0, 3.0, 0.0), // Sin

        // Delay
        26: p_dly_time = Linear(0.0, 1.0, 0.3),
        27: p_dly_feed = Linear(0.0, 0.95, 0.0),
        28: p_dly_mix = Linear(0.0, 1.0, 0.0),

        // Master
        29: p_master = Linear(0.0, 2.0, 0.8),
    }
}

#[wasm_bindgen(js_class = BvstSynth)]
impl UniversalSynth {
    pub fn note_on(&mut self, note: f32, velocity: f32) {
        self.current_note = note;
        self.velocity = velocity;
        self.gate = true;
        self.env_amp.trigger(true);
        self.env_filt.trigger(true);
        self.osc1.reset();
        self.osc2.reset();
        self.lfo.reset();
    }

    pub fn note_off(&mut self, note: f32) {
        if (self.current_note - note).abs() < 0.1 {
            self.gate = false;
            self.env_amp.trigger(false);
            self.env_filt.trigger(false);
        }
    }

    fn handle_event(&mut self, id: u32, value: f32) {
        if id == P_NOTE {
            self.current_note = value;
        } else if id == P_GATE {
            let gate_on = value > 0.5;
            if gate_on && !self.gate {
                self.note_on(self.current_note, value); 
            } else if !gate_on && self.gate {
                self.note_off(self.current_note);
            }
        }
    }

    fn process_audio(&mut self, _in_l: &[f32], _in_r: &[f32], out_l: &mut [f32], out_r: &mut [f32]) {
        for i in 0..out_l.len() {
            // 1. Envelopes
            self.env_amp.a = self.p_amp_a.process();
            self.env_amp.d = self.p_amp_d.process();
            self.env_amp.s = self.p_amp_s.process();
            self.env_amp.r = self.p_amp_r.process();
            let amp_val = self.env_amp.next();

            self.env_filt.a = self.p_filt_a.process();
            self.env_filt.d = self.p_filt_d.process();
            self.env_filt.s = self.p_filt_s.process();
            self.env_filt.r = self.p_filt_r.process();
            let filt_env_val = self.env_filt.next();

            // 2. LFO
            let lfo_rate = self.p_lfo_rate.process();
            let lfo_depth = self.p_lfo_depth.process();
            let lfo_wave_val = self.p_lfo_wave.process();
            let lfo_shape = self.get_wave_type(lfo_wave_val);
            let lfo_val = self.lfo.next_simple(lfo_rate, lfo_shape) * lfo_depth;

            // 3. Modulation Targets
            let lfo_target = self.p_lfo_target.process() as u32;
            let mut pitch_mod = 0.0;
            let mut cut_mod = 0.0;
            
            if lfo_target == 1 { cut_mod += lfo_val * 2000.0; } // +/- 2000Hz
            if lfo_target == 2 { pitch_mod += lfo_val * 12.0; } // +/- 12 semitones

            // 4. Oscillators
            let base_pitch = self.current_note + pitch_mod;
            
            // Osc 1
            let tune1 = self.p_osc1_tune.process();
            let freq1 = mtof(base_pitch + tune1);
            let shape1_val = self.p_osc1_wave.process();
            let shape1 = self.get_wave_type(shape1_val);
            let sig1 = self.osc1.next_fast(freq1, shape1) * self.p_osc1_mix.process();

            // Osc 2
            let tune2 = self.p_osc2_tune.process();
            let detune2 = self.p_osc2_detune.process(); // 0 to 0.5 (semitone?)
            let freq2 = mtof(base_pitch + tune2 + detune2);
            let shape2_val = self.p_osc2_wave.process();
            let shape2 = self.get_wave_type(shape2_val);
            let sig2 = self.osc2.next_fast(freq2, shape2) * self.p_osc2_mix.process();

            // Noise
            let sig_noise = self.noise.next() * self.p_noise_mix.process();

            // Mix & Drive
            let mut mix = sig1 + sig2 + sig_noise;
            let drive_amt = self.p_drive.process();
            if drive_amt > 0.01 {
                mix = self.drive.process(mix, drive_amt);
            }

            // 5. Filter
            let mut cutoff = self.p_filt_cutoff.process() + cut_mod;
            let res = self.p_filt_res.process();
            let mode = self.p_filt_mode.process() as u32;
            let env_amt = self.p_filt_env.process();
            
            // Apply Envelope
            cutoff += filt_env_val * env_amt * 5000.0;
            cutoff = clamp(cutoff, 20.0, 20000.0);
            
            let (lp, hp, bp, notch) = self.filter.process_multimode(mix, cutoff, res);
            let filt_out = match mode {
                0 => lp,
                1 => hp,
                2 => bp,
                _ => notch,
            };

            // 6. Amp
            let final_sig = filt_out * amp_val * self.velocity * self.p_master.process();

            // 7. Delay
            let time = self.p_dly_time.process();
            let feed = self.p_dly_feed.process();
            let dly_mix = self.p_dly_mix.process();
            
            let wet = self.delay.process(final_sig, dly_mix, time, feed);
            
            out_l[i] = wet;
            out_r[i] = wet; 
        }
    }

    fn get_wave_type(&self, val: f32) -> WaveType {
        let v = val.round() as u32;
        match v {
            0 => WaveType::Sin,
            1 => WaveType::Saw,
            2 => WaveType::Square,
            3 => WaveType::Pulse,
            _ => WaveType::Sin,
        }
    }
}