use wasm_bindgen::prelude::*;

use bvst_lib::{Param};
use bvst_lib::dsp::{
    Oscillator, WaveType, Svf, Adsr, Delay, Drive, NoiseGen, Sampler, mtof, clamp,
};

// ------------------------
// Shared helpers / types
// ------------------------

fn norm_id(s: &str) -> String {
    s.trim().to_ascii_lowercase()
}

enum Engine {
    UniversalSynth(UniversalSynth),
    UniversalFX(UniversalFX),
    UniversalMod(UniversalMod),
    UniversalDynamics(UniversalDynamics),
    PrimarySourceEnhancer(PrimarySourceEnhancer),
    UniversalUtility(UniversalUtility),
    UniversalSampler(UniversalSampler),
}

impl Engine {
    fn set_param(&mut self, id: u32, value: f32) {
        match self {
            Engine::UniversalSynth(e) => e.set_param(id, value),
            Engine::UniversalFX(e) => e.set_param(id, value),
            Engine::UniversalMod(e) => e.set_param(id, value),
            Engine::UniversalDynamics(e) => e.set_param(id, value),
            Engine::PrimarySourceEnhancer(e) => e.set_param(id, value),
            Engine::UniversalUtility(e) => e.set_param(id, value),
            Engine::UniversalSampler(e) => e.set_param(id, value),
        }
    }

    fn process(&mut self, in_l: &[f32], in_r: &[f32], out_l: &mut [f32], out_r: &mut [f32]) {
        match self {
            Engine::UniversalSynth(e) => e.process(in_l, in_r, out_l, out_r),
            Engine::UniversalFX(e) => e.process(in_l, in_r, out_l, out_r),
            Engine::UniversalMod(e) => e.process(in_l, in_r, out_l, out_r),
            Engine::UniversalDynamics(e) => e.process(in_l, in_r, out_l, out_r),
            Engine::PrimarySourceEnhancer(e) => e.process(in_l, in_r, out_l, out_r),
            Engine::UniversalUtility(e) => e.process(in_l, in_r, out_l, out_r),
            Engine::UniversalSampler(e) => e.process(in_l, in_r, out_l, out_r),
        }
    }

    fn note_on(&mut self, note: f32, velocity: f32) {
        match self {
            Engine::UniversalSynth(e) => e.note_on(note, velocity),
            Engine::UniversalSampler(e) => e.note_on(note, velocity),
            _ => {}
        }
    }

    fn note_off(&mut self, note: f32) {
        match self {
            Engine::UniversalSynth(e) => e.note_off(note),
            Engine::UniversalSampler(e) => e.note_off(note),
            _ => {}
        }
    }

    fn midi_cc(&mut self, _cc: f32, _value: f32) {
        // Reserved for future models.
    }

    fn load_sample(&mut self, data: &[f32]) {
        if let Engine::UniversalSampler(e) = self {
            e.load_sample(data);
        }
    }

    fn get_descriptor(&self) -> &'static str {
        match self {
            Engine::UniversalSynth(_) => UNIVERSAL_SYNTH_DESCRIPTOR,
            Engine::UniversalFX(_) => UNIVERSAL_FX_DESCRIPTOR,
            Engine::UniversalMod(_) => UNIVERSAL_MOD_DESCRIPTOR,
            Engine::UniversalDynamics(_) => UNIVERSAL_DYNAMICS_DESCRIPTOR,
            Engine::PrimarySourceEnhancer(_) => PRIMARY_SOURCE_ENHANCER_DESCRIPTOR,
            Engine::UniversalUtility(_) => UNIVERSAL_UTILITY_DESCRIPTOR,
            Engine::UniversalSampler(_) => UNIVERSAL_SAMPLER_DESCRIPTOR,
        }
    }
}

// ------------------------
// Public WASM API (single shared "BvstSynth")
// ------------------------

#[wasm_bindgen(js_name = BvstSynth)]
pub struct BvstSynth {
    engine: Engine,
    plugin_id: String,
    sample_rate: f32,
}

#[wasm_bindgen(js_class = BvstSynth)]
impl BvstSynth {
    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: f32, plugin_id: String) -> Self {
        let plugin_norm = norm_id(&plugin_id);

        // Routing by plugin ID/name. Keep this table tolerant to aliases.
        let engine = match plugin_norm.as_str() {
            "universalsynth" | "mother" | "mothersynth" | "synth" | "bammono" | "bassline303" | "techbass" | "celestialpad" | "morphfilter" | "arptone" | "arpone" | "jms10" => Engine::UniversalSynth(UniversalSynth::new(sample_rate)),
            "universalfx" | "fx" | "effect" | "auroradelay" => Engine::UniversalFX(UniversalFX::new(sample_rate)),
            "universalmod" | "mod" | "modulation" | "orbitalchorus" => Engine::UniversalMod(UniversalMod::new(sample_rate)),
            "universaldynamics" | "dynamics" | "gluebuscomp" => Engine::UniversalDynamics(UniversalDynamics::new(sample_rate)),
            "primarysourceenhancer" | "pse" => Engine::PrimarySourceEnhancer(PrimarySourceEnhancer::new(sample_rate)),
            "universalutility" | "utility" | "gainpanscope" => Engine::UniversalUtility(UniversalUtility::new(sample_rate)),
            "universalsampler" | "sampler" | "cosmosampler" | "graincloud" | "slicemaster" | "resamplex" => Engine::UniversalSampler(UniversalSampler::new(sample_rate, plugin_norm.as_str())),
            // Safe default: passthrough utility (won't panic, still produces valid output).
            _ => Engine::UniversalUtility(UniversalUtility::new(sample_rate)),
        };

        Self { engine, plugin_id, sample_rate }
    }

    pub fn set_param(&mut self, id: u32, value: f32) {
        self.engine.set_param(id, value);
    }

    pub fn process(&mut self, in_l: &[f32], in_r: &[f32], out_l: &mut [f32], out_r: &mut [f32]) {
        self.engine.process(in_l, in_r, out_l, out_r);
    }

    pub fn note_on(&mut self, note: f32, velocity: f32) {
        self.engine.note_on(note, velocity);
    }

    pub fn note_off(&mut self, note: f32) {
        self.engine.note_off(note);
    }

    pub fn midi_cc(&mut self, cc: f32, value: f32) {
        self.engine.midi_cc(cc, value);
    }

    pub fn get_descriptor(&self) -> String {
        self.engine.get_descriptor().to_string()
    }

    // Optional capabilities (kept stable so all plugin types can rely on the same ABI).
    // These can be expanded to real per-engine serialization later.
    pub fn get_state(&self) -> Vec<f32> {
        Vec::new()
    }

    pub fn set_state(&mut self, _state: &[f32]) {}

    pub fn load_sample(&mut self, data: &[f32]) {
        self.engine.load_sample(data);
    }

    pub fn get_plugin_id(&self) -> String {
        self.plugin_id.clone()
    }

    pub fn get_sample_rate(&self) -> f32 {
        self.sample_rate
    }
}

// ------------------------
// Engine: UniversalSynth
// ------------------------

// Special event params
const P_NOTE: u32 = 128;
const P_GATE: u32 = 129;

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

    current_note: f32,
    gate: bool,
    velocity: f32,

    p_osc1_wave: Param,
    p_osc1_tune: Param,
    p_osc1_mix: Param,

    p_osc2_wave: Param,
    p_osc2_tune: Param,
    p_osc2_detune: Param,
    p_osc2_mix: Param,

    p_noise_mix: Param,
    p_drive: Param,

    p_filt_cutoff: Param,
    p_filt_res: Param,
    p_filt_mode: Param,
    p_filt_env: Param,

    p_amp_a: Param,
    p_amp_d: Param,
    p_amp_s: Param,
    p_amp_r: Param,

    p_filt_a: Param,
    p_filt_d: Param,
    p_filt_s: Param,
    p_filt_r: Param,

    p_lfo_rate: Param,
    p_lfo_depth: Param,
    p_lfo_target: Param,
    p_lfo_wave: Param,

    p_dly_time: Param,
    p_dly_feed: Param,
    p_dly_mix: Param,

    p_master: Param,
}

impl UniversalSynth {
    fn new(sr: f32) -> Self {
        let mut env_amp = Adsr::new(sr);
        let mut env_filt = Adsr::new(sr);
        env_amp.update_coefs();
        env_filt.update_coefs();

        Self {
            osc1: Oscillator::new(sr),
            osc2: Oscillator::new(sr),
            noise: NoiseGen::new(),
            lfo: Oscillator::new(sr),
            filter: Svf::new(sr),
            env_amp,
            env_filt,
            delay: Delay::new(sr, 2.0),
            drive: Drive::new(),

            current_note: 60.0,
            gate: false,
            velocity: 0.0,

            p_osc1_wave: Param::new(0.0, 3.0, 1.0, sr),
            p_osc1_tune: Param::new(-24.0, 24.0, 0.0, sr),
            p_osc1_mix: Param::new(0.0, 1.0, 0.8, sr),

            p_osc2_wave: Param::new(0.0, 3.0, 2.0, sr),
            p_osc2_tune: Param::new(-24.0, 24.0, 0.0, sr),
            p_osc2_detune: Param::new(0.0, 0.5, 0.05, sr),
            p_osc2_mix: Param::new(0.0, 1.0, 0.0, sr),

            p_noise_mix: Param::new(0.0, 1.0, 0.0, sr),
            p_drive: Param::new(0.0, 1.0, 0.0, sr),

            p_filt_cutoff: Param::new(20.0, 20000.0, 20000.0, sr),
            p_filt_res: Param::new(0.5, 10.0, 0.7, sr),
            p_filt_mode: Param::new(0.0, 3.0, 0.0, sr),
            p_filt_env: Param::new(-1.0, 1.0, 0.0, sr),

            p_amp_a: Param::new(0.001, 2.0, 0.01, sr),
            p_amp_d: Param::new(0.001, 2.0, 0.1, sr),
            p_amp_s: Param::new(0.0, 1.0, 0.8, sr),
            p_amp_r: Param::new(0.001, 5.0, 0.2, sr),

            p_filt_a: Param::new(0.001, 2.0, 0.01, sr),
            p_filt_d: Param::new(0.001, 2.0, 0.2, sr),
            p_filt_s: Param::new(0.0, 1.0, 0.5, sr),
            p_filt_r: Param::new(0.001, 5.0, 0.2, sr),

            p_lfo_rate: Param::new(0.1, 20.0, 1.0, sr),
            p_lfo_depth: Param::new(0.0, 1.0, 0.0, sr),
            p_lfo_target: Param::new(0.0, 2.0, 0.0, sr),
            p_lfo_wave: Param::new(0.0, 3.0, 0.0, sr),

            p_dly_time: Param::new(0.0, 1.0, 0.3, sr),
            p_dly_feed: Param::new(0.0, 0.95, 0.0, sr),
            p_dly_mix: Param::new(0.0, 1.0, 0.0, sr),

            p_master: Param::new(0.0, 2.0, 0.8, sr),
        }
    }

    fn note_on(&mut self, note: f32, velocity: f32) {
        self.current_note = note;
        self.velocity = velocity;
        self.gate = true;
        self.env_amp.trigger(true);
        self.env_filt.trigger(true);
        self.osc1.reset();
        self.osc2.reset();
        self.lfo.reset();
    }

    fn note_off(&mut self, note: f32) {
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

    fn set_param(&mut self, id: u32, value: f32) {
        match id {
            0 => self.p_osc1_wave.set(value),
            1 => self.p_osc1_tune.set(value),
            2 => self.p_osc1_mix.set(value),
            4 => self.p_osc2_wave.set(value),
            5 => self.p_osc2_tune.set(value),
            6 => self.p_osc2_detune.set(value),
            7 => self.p_osc2_mix.set(value),
            8 => self.p_noise_mix.set(value),
            9 => self.p_drive.set(value),
            10 => self.p_filt_cutoff.set(value),
            11 => self.p_filt_res.set(value),
            12 => self.p_filt_mode.set(value),
            13 => self.p_filt_env.set(value),
            14 => self.p_amp_a.set(value),
            15 => self.p_amp_d.set(value),
            16 => self.p_amp_s.set(value),
            17 => self.p_amp_r.set(value),
            18 => self.p_filt_a.set(value),
            19 => self.p_filt_d.set(value),
            20 => self.p_filt_s.set(value),
            21 => self.p_filt_r.set(value),
            22 => self.p_lfo_rate.set(value),
            23 => self.p_lfo_depth.set(value),
            24 => self.p_lfo_target.set(value),
            25 => self.p_lfo_wave.set(value),
            26 => self.p_dly_time.set(value),
            27 => self.p_dly_feed.set(value),
            28 => self.p_dly_mix.set(value),
            29 => self.p_master.set(value),
            _ => {}
        }
        self.handle_event(id, value);
    }

    fn get_wave_type(val: f32) -> WaveType {
        let v = val.round() as u32;
        match v {
            0 => WaveType::Sin,
            1 => WaveType::Saw,
            2 => WaveType::Square,
            3 => WaveType::Pulse,
            _ => WaveType::Sin,
        }
    }

    fn process(&mut self, _in_l: &[f32], _in_r: &[f32], out_l: &mut [f32], out_r: &mut [f32]) {
        self.env_amp.set_adsr(
            self.p_amp_a.process(),
            self.p_amp_d.process(),
            self.p_amp_s.process(),
            self.p_amp_r.process(),
        );

        self.env_filt.set_adsr(
            self.p_filt_a.process(),
            self.p_filt_d.process(),
            self.p_filt_s.process(),
            self.p_filt_r.process(),
        );

        let lfo_rate = self.p_lfo_rate.process();
        let lfo_depth = self.p_lfo_depth.process();
        let lfo_shape = Self::get_wave_type(self.p_lfo_wave.process());
        let lfo_target = self.p_lfo_target.process().round() as u32;

        let tune1 = self.p_osc1_tune.process();
        let shape1 = Self::get_wave_type(self.p_osc1_wave.process());
        let osc1_mix = self.p_osc1_mix.process();

        let tune2 = self.p_osc2_tune.process();
        let detune2 = self.p_osc2_detune.process();
        let shape2 = Self::get_wave_type(self.p_osc2_wave.process());
        let osc2_mix = self.p_osc2_mix.process();

        let noise_mix = self.p_noise_mix.process();
        let drive_amt = self.p_drive.process();

        let cutoff_base = self.p_filt_cutoff.process();
        let res = self.p_filt_res.process();
        let mode = self.p_filt_mode.process().round() as u32;
        let env_amt = self.p_filt_env.process();

        let time = self.p_dly_time.process();
        let feed = self.p_dly_feed.process();
        let dly_mix = self.p_dly_mix.process();

        let master = self.p_master.process();

        for i in 0..out_l.len() {
            let amp_val = self.env_amp.next();
            let filt_env_val = self.env_filt.next();

            let lfo_val = self.lfo.next_simple(lfo_rate, lfo_shape) * lfo_depth;

            let mut pitch_mod = 0.0;
            let mut cut_mod = 0.0;
            if lfo_target == 1 {
                cut_mod += lfo_val * 2000.0;
            }
            if lfo_target == 2 {
                pitch_mod += lfo_val * 12.0;
            }

            let base_pitch = self.current_note + pitch_mod;

            let freq1 = mtof(base_pitch + tune1);
            let sig1 = self.osc1.next_fast(freq1, shape1) * osc1_mix;

            let freq2 = mtof(base_pitch + tune2 + detune2);
            let sig2 = self.osc2.next_fast(freq2, shape2) * osc2_mix;

            let sig_noise = self.noise.next() * noise_mix;

            let mut mix = sig1 + sig2 + sig_noise;
            if drive_amt > 0.01 {
                mix = self.drive.process(mix, drive_amt);
            }

            let mut cutoff = cutoff_base + cut_mod;
            cutoff += filt_env_val * env_amt * 5000.0;
            cutoff = clamp(cutoff, 20.0, 20000.0);

            let (lp, hp, bp, notch) = self.filter.process_multimode(mix, cutoff, res);
            let filt_out = match mode {
                0 => lp,
                1 => hp,
                2 => bp,
                _ => notch,
            };

            let final_sig = filt_out * amp_val * self.velocity * master;
            let wet = self.delay.process(final_sig, dly_mix, time, feed);

            out_l[i] = wet;
            out_r[i] = wet;
        }
    }
}

// ------------------------
// Engine: UniversalFX
// ------------------------

struct UniversalFX {
    drive: Drive,
    filter_l: Svf,
    filter_r: Svf,
    lfo: Oscillator,
    delay_l: Delay,
    delay_r: Delay,

    p_drive: Param,
    p_filt_cut: Param,
    p_filt_res: Param,
    p_lfo_rate: Param,
    p_lfo_depth: Param,
    p_dly_time: Param,
    p_dly_feed: Param,
    p_dly_mix: Param,
    p_global_mix: Param,
}

impl UniversalFX {
    fn new(sr: f32) -> Self {
        Self {
            drive: Drive::new(),
            filter_l: Svf::new(sr),
            filter_r: Svf::new(sr),
            lfo: Oscillator::new(sr),
            delay_l: Delay::new(sr, 2.0),
            delay_r: Delay::new(sr, 2.0),

            p_drive: Param::new(0.0, 1.0, 0.0, sr),
            p_filt_cut: Param::new(20.0, 20000.0, 5000.0, sr),
            p_filt_res: Param::new(0.5, 10.0, 0.7, sr),
            p_lfo_rate: Param::new(0.1, 10.0, 1.0, sr),
            p_lfo_depth: Param::new(0.0, 1.0, 0.0, sr),
            p_dly_time: Param::new(0.0, 1.0, 0.3, sr),
            p_dly_feed: Param::new(0.0, 0.95, 0.4, sr),
            p_dly_mix: Param::new(0.0, 1.0, 0.3, sr),
            p_global_mix: Param::new(0.0, 1.0, 1.0, sr),
        }
    }

    fn set_param(&mut self, id: u32, value: f32) {
        match id {
            0 => self.p_drive.set(value),
            1 => self.p_filt_cut.set(value),
            2 => self.p_filt_res.set(value),
            3 => self.p_lfo_rate.set(value),
            4 => self.p_lfo_depth.set(value),
            5 => self.p_dly_time.set(value),
            6 => self.p_dly_feed.set(value),
            7 => self.p_dly_mix.set(value),
            8 => self.p_global_mix.set(value),
            _ => {}
        }
    }

    fn process(&mut self, in_l: &[f32], in_r: &[f32], out_l: &mut [f32], out_r: &mut [f32]) {
        let drive_amt = self.p_drive.process();
        let cutoff_base = self.p_filt_cut.process();
        let res = self.p_filt_res.process();
        let lfo_rate = self.p_lfo_rate.process();
        let lfo_depth = self.p_lfo_depth.process();
        let dly_time = self.p_dly_time.process();
        let dly_feed = self.p_dly_feed.process();
        let dly_mix_amt = self.p_dly_mix.process();
        let global_mix = self.p_global_mix.process();

        let len = out_l.len().min(in_l.len());
        for i in 0..len {
            let mut left = in_l[i];
            let mut right = if i < in_r.len() { in_r[i] } else { left };
            let dry_l = left;
            let dry_r = right;

            if drive_amt > 0.001 {
                left = self.drive.process(left, drive_amt);
                right = self.drive.process(right, drive_amt);
            }

            let lfo_val = self.lfo.next_simple(lfo_rate, WaveType::Sin);
            let mod_amt = lfo_val * lfo_depth * 2000.0;
            let mut cut = cutoff_base + mod_amt;
            cut = clamp(cut, 20.0, 20000.0);

            left = self.filter_l.process(left, cut, res);
            right = self.filter_r.process(right, cut, res);

            let dl = self.delay_l.process(left, dly_mix_amt, dly_time, dly_feed);
            let r_time = if dly_time > 0.01 { dly_time + 0.01 } else { 0.0 };
            let dr = self.delay_r.process(right, dly_mix_amt, r_time, dly_feed);

            left = dl;
            right = dr;

            out_l[i] = dry_l * (1.0 - global_mix) + left * global_mix;
            out_r[i] = dry_r * (1.0 - global_mix) + right * global_mix;
        }
    }
}

// ------------------------
// Engine: UniversalMod
// ------------------------

struct UniversalMod {
    lfo: Oscillator,
    lfo_trem: Oscillator,
    delay_l: Delay,
    delay_r: Delay,

    p_rate: Param,
    p_depth: Param,
    p_feed: Param,
    p_mix: Param,
    p_spread: Param,
    p_trem_rate: Param,
    p_trem_depth: Param,
}

impl UniversalMod {
    fn new(sr: f32) -> Self {
        Self {
            lfo: Oscillator::new(sr),
            lfo_trem: Oscillator::new(sr),
            delay_l: Delay::new(sr, 0.1),
            delay_r: Delay::new(sr, 0.1),

            p_rate: Param::new(0.1, 10.0, 0.5, sr),
            p_depth: Param::new(0.0, 0.02, 0.002, sr),
            p_feed: Param::new(0.0, 0.95, 0.3, sr),
            p_mix: Param::new(0.0, 1.0, 0.5, sr),
            p_spread: Param::new(0.0, 3.14, 1.57, sr),
            p_trem_rate: Param::new(0.1, 20.0, 4.0, sr),
            p_trem_depth: Param::new(0.0, 1.0, 0.0, sr),
        }
    }

    fn set_param(&mut self, id: u32, value: f32) {
        match id {
            0 => self.p_rate.set(value),
            1 => self.p_depth.set(value),
            2 => self.p_feed.set(value),
            3 => self.p_mix.set(value),
            4 => self.p_spread.set(value),
            5 => self.p_trem_rate.set(value),
            6 => self.p_trem_depth.set(value),
            _ => {}
        }
    }

    fn process(&mut self, in_l: &[f32], in_r: &[f32], out_l: &mut [f32], out_r: &mut [f32]) {
        let rate = self.p_rate.process();
        let depth = self.p_depth.process();
        let feed = self.p_feed.process();
        let mix = self.p_mix.process();
        let spread = self.p_spread.process();

        let trem_rate = self.p_trem_rate.process();
        let trem_depth = self.p_trem_depth.process();

        let len = out_l.len().min(in_l.len());
        for i in 0..len {
            let mod_l = self.lfo.next_simple(rate, WaveType::Sin);
            let mod_r = if spread > 1.0 { -mod_l } else { mod_l };

            let trem = self.lfo_trem.next_simple(trem_rate, WaveType::Tri);
            let trem_gain = 1.0 - (trem_depth * 0.5 * (trem + 1.0));

            let src_l = in_l[i];
            let src_r = if i < in_r.len() { in_r[i] } else { src_l };

            let base_time = 0.005;
            let time_l = base_time + mod_l * depth;
            let time_r = base_time + mod_r * depth;

            let t_l = time_l.max(0.0001);
            let t_r = time_r.max(0.0001);

            let chor_l = self.delay_l.process(src_l, mix, t_l, feed);
            let chor_r = self.delay_r.process(src_r, mix, t_r, feed);

            out_l[i] = chor_l * trem_gain;
            out_r[i] = chor_r * trem_gain;
        }
    }
}

// ------------------------
// Engine: UniversalDynamics
// ------------------------

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
        let att_coef = (-1.0 / (0.001 * att_ms * self.sample_rate)).exp();
        let rel_coef = (-1.0 / (0.001 * rel_ms * self.sample_rate)).exp();

        let target = abs_in;
        let coef = if target > self.envelope { att_coef } else { rel_coef };
        self.envelope = target + (self.envelope - target) * coef;

        let env_db = if self.envelope > 0.000001 { 20.0 * self.envelope.log10() } else { -100.0 };
        let slope = 1.0 / ratio;
        let overshoot = env_db - thresh_db;

        let mut gain_db = 0.0;
        if overshoot > 0.0 {
            if knee > 0.0 && overshoot < knee {
                gain_db = overshoot * (slope - 1.0);
            } else {
                gain_db = overshoot * (slope - 1.0);
            }
        }

        10.0_f32.powf(gain_db / 20.0)
    }
}

struct UniversalDynamics {
    comp_l: Compressor,
    comp_r: Compressor,

    p_thresh: Param,
    p_ratio: Param,
    p_attack: Param,
    p_release: Param,
    p_knee: Param,
    p_makeup: Param,
    p_mix: Param,
}

impl UniversalDynamics {
    fn new(sr: f32) -> Self {
        Self {
            comp_l: Compressor::new(sr),
            comp_r: Compressor::new(sr),

            p_thresh: Param::new(-60.0, 0.0, -12.0, sr),
            p_ratio: Param::new(1.0, 20.0, 4.0, sr),
            p_attack: Param::new(0.1, 100.0, 10.0, sr),
            p_release: Param::new(10.0, 1000.0, 100.0, sr),
            p_knee: Param::new(0.0, 12.0, 0.0, sr),
            p_makeup: Param::new(0.0, 24.0, 0.0, sr),
            p_mix: Param::new(0.0, 1.0, 1.0, sr),
        }
    }

    fn set_param(&mut self, id: u32, value: f32) {
        match id {
            0 => self.p_thresh.set(value),
            1 => self.p_ratio.set(value),
            2 => self.p_attack.set(value),
            3 => self.p_release.set(value),
            4 => self.p_knee.set(value),
            5 => self.p_makeup.set(value),
            6 => self.p_mix.set(value),
            _ => {}
        }
    }

    fn process(&mut self, in_l: &[f32], in_r: &[f32], out_l: &mut [f32], out_r: &mut [f32]) {
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

            let gr_l = self.comp_l.process(dry_l, thresh, ratio, att, rel, knee);
            let gr_r = self.comp_r.process(dry_r, thresh, ratio, att, rel, knee);

            let wet_l = dry_l * gr_l * makeup;
            let wet_r = dry_r * gr_r * makeup;

            out_l[i] = dry_l * (1.0 - mix) + wet_l * mix;
            out_r[i] = dry_r * (1.0 - mix) + wet_r * mix;
        }
    }
}

// ------------------------
// Engine: PrimarySourceEnhancer
// ------------------------

#[derive(Clone)]
struct Enhancer {
    current_gain: f32,
    sample_rate: f32,
    hold_samples: i32,
}

impl Enhancer {
    fn new(sample_rate: f32) -> Self {
        Self { current_gain: 1.0, sample_rate, hold_samples: 0 }
    }

    fn process(&mut self, input: f32, thresh_db: f32, range_db: f32, att_ms: f32, rel_ms: f32, hold_ms: f32, _hpf: f32, _lpf: f32) -> f32 {
        let abs_in = input.abs().max(1e-9);
        let env_db = 20.0 * abs_in.log10();

        let mut target_gain_db = 0.0;
        if env_db < thresh_db {
            target_gain_db = range_db;
        }

        if target_gain_db < 0.0 {
            if self.hold_samples > 0 {
                self.hold_samples -= 1;
            } else {
                self.hold_samples = ((hold_ms * 0.001) * self.sample_rate) as i32;
            }
        } else {
            self.hold_samples = 0;
        }

        let target_linear = 10.0_f32.powf(target_gain_db / 20.0);
        let gl_att = (-1.0 / (0.001 * att_ms * self.sample_rate)).exp();
        let gl_rel = (-1.0 / (0.001 * rel_ms * self.sample_rate)).exp();
        let gl_coef = if target_linear > self.current_gain { gl_att } else { gl_rel };
        self.current_gain = target_linear + (self.current_gain - target_linear) * gl_coef;

        input * self.current_gain
    }
}

struct PrimarySourceEnhancer {
    enhancer_l: Enhancer,
    enhancer_r: Enhancer,

    p_thresh: Param,
    p_range: Param,
    p_attack: Param,
    p_release: Param,
    p_hold: Param,
    p_hpf: Param,
    p_lpf: Param,
}

impl PrimarySourceEnhancer {
    fn new(sr: f32) -> Self {
        Self {
            enhancer_l: Enhancer::new(sr),
            enhancer_r: Enhancer::new(sr),

            p_thresh: Param::new(-60.0, 0.0, -30.0, sr),
            p_range: Param::new(-60.0, 0.0, -12.0, sr),
            p_attack: Param::new(0.1, 100.0, 5.0, sr),
            p_release: Param::new(10.0, 1000.0, 200.0, sr),
            p_hold: Param::new(0.0, 500.0, 50.0, sr),
            p_hpf: Param::new(20.0, 1000.0, 100.0, sr),
            p_lpf: Param::new(1000.0, 20000.0, 10000.0, sr),
        }
    }

    fn set_param(&mut self, id: u32, value: f32) {
        match id {
            0 => self.p_thresh.set(value),
            1 => self.p_range.set(value),
            2 => self.p_attack.set(value),
            3 => self.p_release.set(value),
            4 => self.p_hold.set(value),
            5 => self.p_hpf.set(value),
            6 => self.p_lpf.set(value),
            _ => {}
        }
    }

    fn process(&mut self, in_l: &[f32], in_r: &[f32], out_l: &mut [f32], out_r: &mut [f32]) {
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
            out_l[i] = self.enhancer_l.process(dry_l, thresh, range, att, rel, hold, hpf, lpf);
            out_r[i] = self.enhancer_r.process(dry_r, thresh, range, att, rel, hold, hpf, lpf);
        }
    }
}

// ------------------------
// Engine: UniversalUtility
// ------------------------

struct UniversalUtility {
    osc: Oscillator,
    noise: NoiseGen,

    p_tone_type: Param,
    p_tone_freq: Param,
    p_tone_gain: Param,
    p_in_gain: Param,
    p_pan: Param,
    p_width: Param,
    p_phase_l: Param,
    p_phase_r: Param,
}

impl UniversalUtility {
    fn new(sr: f32) -> Self {
        Self {
            osc: Oscillator::new(sr),
            noise: NoiseGen::new(),

            p_tone_type: Param::new(0.0, 3.0, 0.0, sr),
            p_tone_freq: Param::new(20.0, 20000.0, 440.0, sr),
            p_tone_gain: Param::new(0.0, 1.0, 0.5, sr),
            p_in_gain: Param::new(0.0, 2.0, 1.0, sr),
            p_pan: Param::new(-1.0, 1.0, 0.0, sr),
            p_width: Param::new(0.0, 2.0, 1.0, sr),
            p_phase_l: Param::new(0.0, 1.0, 0.0, sr),
            p_phase_r: Param::new(0.0, 1.0, 0.0, sr),
        }
    }

    fn set_param(&mut self, id: u32, value: f32) {
        match id {
            0 => self.p_tone_type.set(value),
            1 => self.p_tone_freq.set(value),
            2 => self.p_tone_gain.set(value),
            3 => self.p_in_gain.set(value),
            4 => self.p_pan.set(value),
            5 => self.p_width.set(value),
            6 => self.p_phase_l.set(value),
            7 => self.p_phase_r.set(value),
            _ => {}
        }
    }

    fn process(&mut self, in_l: &[f32], in_r: &[f32], out_l: &mut [f32], out_r: &mut [f32]) {
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
            let tone = if tone_type == 0 {
                0.0
            } else if tone_type == 1 {
                self.osc.next_simple(tone_freq, WaveType::Sin)
            } else if tone_type == 2 {
                self.noise.next()
            } else {
                self.osc.next_simple(tone_freq, WaveType::Saw)
            };

            let mut l = in_l[i] * in_gain + tone * tone_gain;
            let mut r = if i < in_r.len() { in_r[i] } else { in_l[i] } * in_gain + tone * tone_gain;

            if (width - 1.0).abs() > 0.01 {
                let mid = (l + r) * 0.5;
                let side = (l - r) * 0.5;
                let side_w = side * width;
                l = mid + side_w;
                r = mid - side_w;
            }

            let gain_l = if pan > 0.0 { 1.0 - pan } else { 1.0 };
            let gain_r = if pan < 0.0 { 1.0 + pan } else { 1.0 };

            l *= gain_l;
            r *= gain_r;

            l *= ph_l;
            r *= ph_r;

            out_l[i] = l;
            out_r[i] = r;
        }
    }
}

// ------------------------
// Engine: UniversalSampler
// ------------------------

#[derive(Clone, Copy)]
enum SamplerMode {
    Playback,
    Slice,
    Granular,
    Resample,
}

#[derive(Clone, Copy)]
struct Grain {
    active: bool,
    pos: f32,
    inc: f32,
    life: f32,
    total_life: f32,
    amp: f32,
    pan: f32,
}

struct Lcg {
    seed: u32,
}

impl Lcg {
    fn new(seed: u32) -> Self { Self { seed } }
    fn next_f32(&mut self) -> f32 {
        self.seed = self.seed.wrapping_mul(1664525).wrapping_add(1013904223);
        (self.seed as f32) / (u32::MAX as f32)
    }
    fn range(&mut self, min: f32, max: f32) -> f32 {
        min + (max - min) * self.next_f32()
    }
}

const GRAIN_COUNT: usize = 8;

struct Granulator {
    grains: [Grain; GRAIN_COUNT],
    rng: Lcg,
    sample_rate: f32,
    spawn_accum: f32,
}

impl Granulator {
    fn new(sample_rate: f32) -> Self {
        Self {
            grains: [Grain { active: false, pos: 0.0, inc: 1.0, life: 0.0, total_life: 1.0, amp: 0.25, pan: 0.5 }; GRAIN_COUNT],
            rng: Lcg::new(12345),
            sample_rate,
            spawn_accum: 0.0,
        }
    }

    fn reset(&mut self) {
        for g in self.grains.iter_mut() {
            g.active = false;
            g.life = 0.0;
        }
        self.spawn_accum = 0.0;
    }

    fn process(&mut self, buf: &[f32], params: &SamplerParams) -> (f32, f32) {
        let total = buf.len() as f32;
        if total <= 1.0 { return (0.0, 0.0); }

        // Density = grains / second.
        let density = params.density_hz.clamp(1.0, 100.0);
        let samples_per_spawn = self.sample_rate / density;
        self.spawn_accum += 1.0;
        if self.spawn_accum >= samples_per_spawn {
            self.spawn_accum -= samples_per_spawn;
            self.spawn_grain(total, params);
        }

        let mut l = 0.0;
        let mut r = 0.0;

        for g in self.grains.iter_mut() {
            if !g.active { continue; }

            let idx = g.pos.floor() as i32;
            let frac = g.pos - (idx as f32);
            let i0 = idx.clamp(0, (buf.len() as i32) - 1) as usize;
            let i1 = (i0 + 1).min(buf.len() - 1);
            let s0 = buf[i0];
            let s1 = buf[i1];
            let s = s0 + (s1 - s0) * frac;

            let p = 1.0 - (g.life / g.total_life).clamp(0.0, 1.0);
            let win = if p < 0.5 { p * 2.0 } else { (1.0 - p) * 2.0 };
            let v = s * win * g.amp;

            l += v * (1.0 - g.pan);
            r += v * g.pan;

            g.pos += g.inc;
            g.life -= 1.0;

            if g.life <= 0.0 || g.pos < 0.0 || g.pos >= total {
                g.active = false;
            }
        }

        (l, r)
    }

    fn spawn_grain(&mut self, total_samples: f32, params: &SamplerParams) {
        for g in self.grains.iter_mut() {
            if g.active { continue; }
            g.active = true;

            let center = params.pos_norm.clamp(0.0, 1.0) * (total_samples - 1.0);
            let spread = params.spread_norm.clamp(0.0, 1.0) * total_samples * 0.5;
            let start = center + self.rng.range(-spread, spread);
            g.pos = start.clamp(0.0, total_samples - 2.0);

            let dur_ms = params.size_ms.clamp(10.0, 500.0);
            let dur_samples = (dur_ms / 1000.0) * self.sample_rate;
            g.life = dur_samples.max(64.0);
            g.total_life = g.life;

            let speed = params.speed.max(0.0);
            g.inc = if params.reverse { -speed } else { speed };

            g.amp = 0.35;
            g.pan = self.rng.range(0.1, 0.9);
            return;
        }
    }
}

#[derive(Clone, Copy)]
struct SamplerParams {
    speed: f32,
    loop_start: f32,
    loop_end: f32,
    loop_enabled: bool,
    reverse: bool,

    pos_norm: f32,
    spread_norm: f32,
    density_hz: f32,
    size_ms: f32,

    bits: f32,
    redux: f32,

    cutoff: f32,
    res: f32,
    filt_mode: u32,

    attack: f32,
    release: f32,
    gain: f32,
    drive: f32,
}

impl SamplerParams {
    fn default() -> Self {
        Self {
            speed: 1.0,
            loop_start: 0.0,
            loop_end: 1.0,
            loop_enabled: false,
            reverse: false,

            pos_norm: 0.5,
            spread_norm: 0.1,
            density_hz: 20.0,
            size_ms: 120.0,

            bits: 16.0,
            redux: 1.0,

            cutoff: 20000.0,
            res: 0.7,
            filt_mode: 0,

            attack: 0.005,
            release: 0.25,
            gain: 0.8,
            drive: 0.0,
        }
    }
}

struct UniversalSampler {
    mode: SamplerMode,
    sampler: Sampler,
    env: Adsr,
    filter: Svf,
    drive: Drive,

    current_note: f32,
    seq_note: f32,
    velocity: f32,

    // Slice mode state
    slice_start: usize,
    slice_end: usize,

    // Granular state
    gran: Granulator,

    // Resample state
    redux_phase: f32,
    held: f32,

    // Smoothed / unified params
    p_speed: Param,
    p_loop_start: Param,
    p_loop_end: Param,
    p_loop_enable: Param,
    p_reverse: Param,

    p_pos: Param,
    p_spread: Param,
    p_density: Param,
    p_size_ms: Param,

    p_bits: Param,
    p_redux: Param,

    p_cut: Param,
    p_res: Param,
    p_filt_mode: Param,

    p_attack: Param,
    p_release: Param,
    p_gain: Param,
    p_drive: Param,

    params: SamplerParams,
}

impl UniversalSampler {
    fn new(sr: f32, plugin_norm: &str) -> Self {
        let mode = match plugin_norm {
            "graincloud" => SamplerMode::Granular,
            "slicemaster" => SamplerMode::Slice,
            "resamplex" => SamplerMode::Resample,
            _ => SamplerMode::Playback,
        };

        let mut env = Adsr::new(sr);
        env.set_adsr(0.005, 0.01, 1.0, 0.25);

        Self {
            mode,
            sampler: Sampler::new(sr),
            env,
            filter: Svf::new(sr),
            drive: Drive::new(),

            current_note: 60.0,
            seq_note: 60.0,
            velocity: 0.0,

            slice_start: 0,
            slice_end: 0,

            gran: Granulator::new(sr),

            redux_phase: 0.0,
            held: 0.0,

            p_speed: Param::new(0.0, 4.0, 1.0, sr),
            p_loop_start: Param::new(0.0, 1.0, 0.0, sr),
            p_loop_end: Param::new(0.0, 1.0, 1.0, sr),
            p_loop_enable: Param::new(0.0, 1.0, 0.0, sr),
            p_reverse: Param::new(0.0, 1.0, 0.0, sr),

            p_pos: Param::new(0.0, 1.0, 0.5, sr),
            p_spread: Param::new(0.0, 1.0, 0.1, sr),
            p_density: Param::new(1.0, 100.0, 20.0, sr),
            p_size_ms: Param::new(10.0, 500.0, 120.0, sr),

            p_bits: Param::new(1.0, 16.0, 16.0, sr),
            p_redux: Param::new(1.0, 50.0, 1.0, sr),

            p_cut: Param::new(20.0, 20000.0, 20000.0, sr),
            p_res: Param::new(0.5, 10.0, 0.7, sr),
            p_filt_mode: Param::new(0.0, 3.0, 0.0, sr),

            p_attack: Param::new(0.001, 2.0, 0.005, sr),
            p_release: Param::new(0.001, 5.0, 0.25, sr),
            p_gain: Param::new(0.0, 2.0, 0.8, sr),
            p_drive: Param::new(0.0, 1.0, 0.0, sr),

            params: SamplerParams::default(),
        }
    }

    fn load_sample(&mut self, data: &[f32]) {
        self.sampler.load(data);
        self.gran.reset();
        self.redux_phase = 0.0;
        self.held = 0.0;

        // Keep slice defaults valid.
        let n = self.sampler.buffer.len();
        self.slice_start = 0;
        self.slice_end = n;
    }

    fn note_on(&mut self, note: f32, velocity: f32) {
        self.current_note = note;
        self.seq_note = note;
        self.velocity = velocity.clamp(0.0, 1.0);

        if let SamplerMode::Slice = self.mode {
            let total = self.sampler.buffer.len();
            if total >= 8 {
                let slice_count = 8usize;
                let slice_len = (total / slice_count).max(1);
                let n = (note as i32).saturating_sub(60) as usize;
                let slice_idx = n % slice_count;
                let start = (slice_idx * slice_len).min(total.saturating_sub(1));
                let end = ((start + slice_len).min(total)).max(start + 1);
                self.slice_start = start;
                self.slice_end = end;

                self.sampler.loop_start = start;
                self.sampler.loop_end = end;
                self.sampler.is_looping = false;
                self.sampler.trigger();
            } else {
                self.sampler.trigger();
            }
        } else {
            self.sampler.trigger();
        }

        self.env.trigger(true);
    }

    fn note_off(&mut self, _note: f32) {
        self.env.trigger(false);
    }

    fn set_param(&mut self, id: u32, value: f32) {
        match id {
            // Shared sampler surface (IDs chosen to match patch control IDs).
            0 => self.p_speed.set(value),
            1 => self.p_loop_start.set(value),
            2 => self.p_loop_end.set(value),
            3 => self.p_loop_enable.set(value),
            4 => self.p_reverse.set(value),
            5 => {
                self.p_pos.set(value);
                if !matches!(self.mode, SamplerMode::Granular) {
                    self.sampler.seek(value);
                }
            }
            6 => self.p_spread.set(value),
            7 => self.p_density.set(value),
            8 => self.p_size_ms.set(value),

            9 => self.p_bits.set(value),
            10 => self.p_redux.set(value),

            11 => self.p_cut.set(value),
            12 => self.p_res.set(value),
            13 => self.p_filt_mode.set(value),

            20 => self.p_attack.set(value),
            21 => self.p_release.set(value),
            22 => self.p_gain.set(value),
            23 => self.p_drive.set(value),

            // Seek (waveform scrub)
            30 => self.sampler.seek(value),

            // Sequencer compatibility (step sequencer sends param IDs, not NOTE_ON events).
            128 => {
                self.seq_note = value;
                if self.env.is_active() {
                    self.note_on(self.seq_note, 1.0);
                }
            }
            129 => {
                if value > 0.5 {
                    self.note_on(self.seq_note, 1.0);
                } else {
                    self.note_off(self.seq_note);
                }
            }

            _ => {}
        }
    }

    fn process(&mut self, _in_l: &[f32], _in_r: &[f32], out_l: &mut [f32], out_r: &mut [f32]) {
        let len = out_l.len().min(out_r.len());
        for i in 0..len {
            out_l[i] = 0.0;
            out_r[i] = 0.0;
        }

        self.params.speed = self.p_speed.process().max(0.0);
        self.params.loop_start = self.p_loop_start.process();
        self.params.loop_end = self.p_loop_end.process();
        self.params.loop_enabled = self.p_loop_enable.process() > 0.5;
        self.params.reverse = self.p_reverse.process() > 0.5;

        self.params.pos_norm = self.p_pos.process();
        self.params.spread_norm = self.p_spread.process();
        self.params.density_hz = self.p_density.process();
        self.params.size_ms = self.p_size_ms.process();

        self.params.bits = self.p_bits.process();
        self.params.redux = self.p_redux.process().max(1.0);

        self.params.cutoff = self.p_cut.process();
        self.params.res = self.p_res.process();
        self.params.filt_mode = self.p_filt_mode.process().round().clamp(0.0, 3.0) as u32;

        self.params.attack = self.p_attack.process();
        self.params.release = self.p_release.process();
        self.params.gain = self.p_gain.process();
        self.params.drive = self.p_drive.process();

        self.env.set_adsr(self.params.attack, 0.01, 1.0, self.params.release);

        if self.sampler.buffer.is_empty() {
            return;
        }

        self.sampler.reverse = self.params.reverse;

        if let SamplerMode::Slice = self.mode {
            if self.slice_end > self.slice_start && self.slice_end <= self.sampler.buffer.len() {
                self.sampler.loop_start = self.slice_start;
                self.sampler.loop_end = self.slice_end;
                self.sampler.is_looping = false;
            }
        } else {
            self.sampler.set_loop_norm(self.params.loop_start, self.params.loop_end, self.params.loop_enabled);
        }

        let note_ratio = 2.0_f32.powf((self.current_note - 60.0) / 12.0);
        let rate = (self.params.speed * note_ratio).max(0.0);

        for i in 0..len {
            let env = self.env.next();
            if env <= 0.000001 && !self.env.is_active() {
                self.sampler.stop();
                break;
            }

            let (mut l, mut r) = match self.mode {
                SamplerMode::Granular => self.gran.process(&self.sampler.buffer, &self.params),
                SamplerMode::Resample => {
                    if self.redux_phase <= 0.0 {
                        let mut s = self.sampler.process(rate);

                        let bits = self.params.bits.clamp(1.0, 16.0);
                        let steps = 2.0_f32.powf(bits).max(2.0);
                        let inv = 1.0 / steps;
                        s = (s * steps).floor() * inv;

                        self.held = s;
                        self.redux_phase = self.params.redux.max(1.0);
                    }
                    self.redux_phase -= 1.0;
                    (self.held, self.held)
                }
                _ => {
                    let s = self.sampler.process(rate);
                    (s, s)
                }
            };

            if self.params.drive > 0.01 {
                l = self.drive.process(l, self.params.drive);
                r = self.drive.process(r, self.params.drive);
            }

            let cutoff = clamp(self.params.cutoff, 20.0, 20000.0);
            let (lp, hp, bp, notch) = self.filter.process_multimode((l + r) * 0.5, cutoff, self.params.res);
            let f = match self.params.filt_mode {
                0 => lp,
                1 => hp,
                2 => bp,
                _ => notch,
            };
            l = f;
            r = f;

            out_l[i] = l * env * self.velocity * self.params.gain;
            out_r[i] = r * env * self.velocity * self.params.gain;
        }
    }
}

// ------------------------
// Descriptors (minimal JSON strings)
// ------------------------

const UNIVERSAL_SYNTH_DESCRIPTOR: &str = r#"{"name":"UniversalSynth","type":"Instrument","params":30}"#;
const UNIVERSAL_FX_DESCRIPTOR: &str = r#"{"name":"UniversalFX","type":"Effect","params":9}"#;
const UNIVERSAL_MOD_DESCRIPTOR: &str = r#"{"name":"UniversalMod","type":"Effect","params":7}"#;
const UNIVERSAL_DYNAMICS_DESCRIPTOR: &str = r#"{"name":"UniversalDynamics","type":"Effect","params":7}"#;
const PRIMARY_SOURCE_ENHANCER_DESCRIPTOR: &str = r#"{"name":"PrimarySourceEnhancer","type":"Effect","params":7}"#;
const UNIVERSAL_UTILITY_DESCRIPTOR: &str = r#"{"name":"UniversalUtility","type":"Effect","params":8}"#;
const UNIVERSAL_SAMPLER_DESCRIPTOR: &str = r#"{"name":"UniversalSampler","type":"Instrument","params":24}"#;
