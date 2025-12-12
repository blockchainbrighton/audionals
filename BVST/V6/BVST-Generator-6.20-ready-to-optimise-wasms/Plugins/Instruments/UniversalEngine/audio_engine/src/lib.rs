use wasm_bindgen::prelude::*;
use bvst_lib::{Param, Curve, dsp::{self, Oscillator, Svf, Adsr, NoiseGen, WaveType}};
use std::f32::consts::PI;

fn to_norm(val: f32, min: f32, max: f32) -> f32 {
    if max <= min { return 0.0; }
    ((val - min) / (max - min)).clamp(0.0, 1.0)
}

#[derive(Clone)]
struct Voice {
    osc1: Oscillator,
    osc2: Oscillator,
    env: Adsr,
    freq: f32,
    target_freq: f32,
    gate: bool,
}

impl Voice {
    fn new(sample_rate: f32) -> Self {
        Self {
            osc1: Oscillator::new(sample_rate),
            osc2: Oscillator::new(sample_rate),
            env: Adsr::new(sample_rate),
            freq: 440.0,
            target_freq: 440.0,
            gate: false,
        }
    }
}

#[wasm_bindgen]
pub struct BvstSynth {
    sample_rate: f32,
    voices: Vec<Voice>,
    voice_cursor: usize,
    filter: Svf,
    noise: NoiseGen,
    lfo_phase: f32,

    p_mix: Param,
    p_detune: Param,
    p_noise: Param,
    p_cutoff: Param,
    p_res: Param,
    p_env_amt: Param,
    p_amp_a: Param,
    p_amp_r: Param,
    p_filt_a: Param,
    p_filt_r: Param,
    p_lfo_rate: Param,
    p_lfo_depth: Param,
    p_glide: Param,
}

#[wasm_bindgen]
impl BvstSynth {
    pub fn new(sample_rate: f32) -> Self {
        let mut voices = Vec::new();
        for _ in 0..8 {
            voices.push(Voice::new(sample_rate));
        }

        Self {
            sample_rate,
            voices,
            voice_cursor: 0,
            filter: Svf::new(sample_rate),
            noise: NoiseGen::new(),
            lfo_phase: 0.0,
            p_mix: Param::new(Curve::Linear { min: 0.0, max: 1.0 }, 0.4),
            p_detune: Param::new(Curve::Linear { min: 0.0, max: 20.0 }, to_norm(6.0, 0.0, 20.0)),
            p_noise: Param::new(Curve::Linear { min: 0.0, max: 0.3 }, to_norm(0.05, 0.0, 0.3)),
            p_cutoff: Param::new(Curve::Exponential { min: 80.0, max: 12000.0 }, to_norm(1800.0, 80.0, 12000.0)),
            p_res: Param::new(Curve::Linear { min: 0.2, max: 1.5 }, to_norm(0.4, 0.2, 1.5)),
            p_env_amt: Param::new(Curve::Linear { min: 0.0, max: 4000.0 }, to_norm(1500.0, 0.0, 4000.0)),
            p_amp_a: Param::new(Curve::Exponential { min: 0.002, max: 0.2 }, to_norm(0.01, 0.002, 0.2)),
            p_amp_r: Param::new(Curve::Exponential { min: 0.02, max: 1.0 }, to_norm(0.2, 0.02, 1.0)),
            p_filt_a: Param::new(Curve::Exponential { min: 0.005, max: 0.3 }, to_norm(0.02, 0.005, 0.3)),
            p_filt_r: Param::new(Curve::Exponential { min: 0.02, max: 1.0 }, to_norm(0.3, 0.02, 1.0)),
            p_lfo_rate: Param::new(Curve::Exponential { min: 0.1, max: 8.0 }, to_norm(1.0, 0.1, 8.0)),
            p_lfo_depth: Param::new(Curve::Linear { min: 0.0, max: 2000.0 }, to_norm(500.0, 0.0, 2000.0)),
            p_glide: Param::new(Curve::Linear { min: 0.0, max: 0.3 }, to_norm(0.02, 0.0, 0.3)),
        }
    }

    pub fn set_param(&mut self, id: u32, value: f32) {
        match id {
            1 => self.p_mix.set(to_norm(value, 0.0, 1.0)),
            2 => self.p_detune.set(to_norm(value, 0.0, 20.0)),
            3 => self.p_noise.set(to_norm(value, 0.0, 0.3)),
            4 => self.p_cutoff.set(to_norm(value, 80.0, 12000.0)),
            5 => self.p_res.set(to_norm(value, 0.2, 1.5)),
            6 => self.p_env_amt.set(to_norm(value, 0.0, 4000.0)),
            7 => self.p_amp_a.set(to_norm(value, 0.002, 0.2)),
            8 => self.p_amp_r.set(to_norm(value, 0.02, 1.0)),
            9 => self.p_filt_a.set(to_norm(value, 0.005, 0.3)),
            10 => self.p_filt_r.set(to_norm(value, 0.02, 1.0)),
            11 => self.p_lfo_rate.set(to_norm(value, 0.1, 8.0)),
            12 => self.p_lfo_depth.set(to_norm(value, 0.0, 2000.0)),
            13 => self.p_glide.set(to_norm(value, 0.0, 0.3)),
            128 => self.note_on(value),
            129 => self.note_off(value),
            _ => {}
        }
    }

    pub fn process(&mut self, output: &mut [f32]) {
        let mix = self.p_mix.process();
        let detune_cents = self.p_detune.process();
        let detune_ratio = 2.0_f32.powf(detune_cents / 1200.0);
        let noise_level = self.p_noise.process();
        let cutoff_base = self.p_cutoff.process();
        let res = self.p_res.process();
        let env_amt = self.p_env_amt.process();
        let amp_a = self.p_amp_a.process();
        let amp_r = self.p_amp_r.process();
        let filt_a = self.p_filt_a.process();
        let filt_r = self.p_filt_r.process();
        let lfo_rate = self.p_lfo_rate.process();
        let lfo_depth = self.p_lfo_depth.process();
        let glide = self.p_glide.process();

        let glide_coef = if glide <= 0.0001 { 1.0 } else { (1.0 / (glide * self.sample_rate)).min(1.0) };
        let lfo_inc = lfo_rate / self.sample_rate;

        for sample in output.iter_mut() {
            self.lfo_phase = (self.lfo_phase + lfo_inc) % 1.0;
            let lfo_val = (self.lfo_phase * 2.0 * PI).sin();

            let mut voice_sum = 0.0;
            let mut max_env: f32 = 0.0;

            for voice in self.voices.iter_mut() {
                if !voice.env.is_active() && !voice.gate { continue; }

                if glide > 0.0 {
                    voice.freq += (voice.target_freq - voice.freq) * glide_coef;
                } else {
                    voice.freq = voice.target_freq;
                }

                voice.env.a = amp_a;
                voice.env.d = 0.06;
                voice.env.s = 0.75;
                voice.env.r = amp_r;

                let env_val = voice.env.next();
                max_env = max_env.max(env_val);

                let o1 = voice.osc1.next_simple(voice.freq, WaveType::Saw);
                let o2 = voice.osc2.next_simple(voice.freq * detune_ratio, WaveType::Square);
                let voice_out = (o1 * (1.0 - mix) + o2 * mix) * env_val;

                voice_sum += voice_out;

                if !voice.env.is_active() { voice.gate = false; }
            }

            let noise = self.noise.next() * noise_level;
            let filter_env = max_env;
            let cutoff_target = cutoff_base + env_amt * filter_env + lfo_val * lfo_depth;
            let cutoff = dsp::clamp(cutoff_target, 80.0, 14000.0);
            let filtered = self.filter.process(voice_sum + noise, cutoff, res);

            let mut out = filtered * 0.4;
            if !out.is_finite() { out = 0.0; self.filter.reset(); }
            *sample = out;
        }
    }
}

impl BvstSynth {
    fn note_on(&mut self, midi: f32) {
        if midi.is_nan() { return; }
        let freq = dsp::mtof(midi);
        let idx = self.voice_cursor % self.voices.len();
        self.voice_cursor = (self.voice_cursor + 1) % self.voices.len();
        if let Some(v) = self.voices.get_mut(idx) {
            v.freq = freq;
            v.target_freq = freq;
            v.gate = true;
            v.env.trigger(true);
            v.osc1.reset();
            v.osc2.reset();
        }
    }

    fn note_off(&mut self, midi: f32) {
        if midi.is_nan() { return; }
        let freq = dsp::mtof(midi);
        for v in self.voices.iter_mut() {
            if (v.target_freq - freq).abs() < 1.0 {
                v.gate = false;
                v.env.trigger(false);
            }
        }
    }
}
