use wasm_bindgen::prelude::*;
use bvst_lib::{bvst_plugin, Param, Curve, dsp::{self, Oscillator, Svf, Adsr, NoiseGen, WaveType}};
use std::f32::consts::PI;

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

bvst_plugin! {
    struct BvstSynth {
        voices: Vec<Voice>,
        voice_cursor: usize,
        filter: Svf,
        noise: NoiseGen,
        lfo_phase: f32,
    }

    init_fields (sample_rate) {
        voices = (0..8).map(|_| Voice::new(sample_rate)).collect(),
        voice_cursor = 0,
        filter = Svf::new(sample_rate),
        noise = NoiseGen::new(),
        lfo_phase = 0.0
    }

    params {
        1:  p_mix       = Linear(0.0, 1.0, 0.4),
        2:  p_detune    = Linear(0.0, 20.0, 6.0),
        3:  p_noise     = Linear(0.0, 0.3, 0.05),
        4:  p_cutoff    = Exponential(80.0, 12000.0, 1800.0),
        5:  p_res       = Linear(0.2, 1.5, 0.4),
        6:  p_env_amt   = Linear(0.0, 4000.0, 1500.0),
        7:  p_amp_a     = Exponential(0.002, 0.2, 0.01),
        8:  p_amp_r     = Exponential(0.02, 1.0, 0.2),
        9:  p_filt_a    = Exponential(0.005, 0.3, 0.02),
        10: p_filt_r    = Exponential(0.02, 1.0, 0.3),
        11: p_lfo_rate  = Exponential(0.1, 8.0, 1.0),
        12: p_lfo_depth = Linear(0.0, 2000.0, 500.0),
        13: p_glide     = Linear(0.0, 0.3, 0.02),
    }

    impl BvstSynth {
        fn custom_param(&mut self, id: u32, value: f32) {
            match id {
                128 => self.note_on(value),
                129 => self.note_off(value),
                _ => {}
            }
        }

        pub fn process(&mut self, output: &mut [f32]) {
            for sample in output.iter_mut() {
                let mix = self.p_mix.process();
                let detune_cents = self.p_detune.process();
                let detune_ratio = 2.0_f32.powf(detune_cents / 1200.0);
                let noise_level = self.p_noise.process();
                let cutoff_base = self.p_cutoff.process();
                let res = self.p_res.process();
                let env_amt = self.p_env_amt.process();
                let amp_a = self.p_amp_a.process();
                let amp_r = self.p_amp_r.process();
                
                // Keep these processing to consume param state, though unused in logic
                let _filt_a = self.p_filt_a.process();
                let _filt_r = self.p_filt_r.process();
                
                let lfo_rate = self.p_lfo_rate.process();
                let lfo_depth = self.p_lfo_depth.process();
                let glide = self.p_glide.process();

                let lfo_inc = lfo_rate / self.sample_rate;
                self.lfo_phase = (self.lfo_phase + lfo_inc) % 1.0;
                let lfo_val = (self.lfo_phase * 2.0 * PI).sin();

                let glide_coef = if glide <= 0.0001 { 1.0 } else { (1.0 / (glide * self.sample_rate)).min(1.0) };

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

                let noise_val = self.noise.next() * noise_level;
                
                // Use max_env for filter modulation (original logic)
                let cutoff_target = cutoff_base + env_amt * max_env + lfo_val * lfo_depth;
                let cutoff = dsp::clamp(cutoff_target, 80.0, 14000.0);
                
                let filtered = self.filter.process(voice_sum + noise_val, cutoff, res);

                let mut out = filtered * 0.4;
                if !out.is_finite() { out = 0.0; self.filter.reset(); }
                *sample = out;
            }
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
