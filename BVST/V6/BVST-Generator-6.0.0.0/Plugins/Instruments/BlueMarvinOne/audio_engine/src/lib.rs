use wasm_bindgen::prelude::*;
use bvst_lib::{bvst_plugin, Param, Curve, dsp::{self, Oscillator, Svf, Adsr, WaveType, FilterMode}};

const MAX_VOICES: usize = 8;
const BLOCK_SIZE: usize = 32;

#[derive(Clone)]
struct Voice {
    active: bool,
    note: u32,
    velocity: f32,
    osc1: Oscillator,
    osc2: Oscillator,
    filter: Svf,
    env: Adsr,
    sample_rate: f32,
}

struct EngineParams {
    vco1_freq: f32,
    vco1_mix: f32,
    vco2_detune: f32,
    vco2_width: f32,
    vco2_mix: f32,
    cutoff: f32,
    res: f32,
    volume: f32,
}

impl Voice {
    fn new(sample_rate: f32) -> Self {
        Self {
            active: false, note: 0, velocity: 0.0,
            osc1: Oscillator::new(sample_rate),
            osc2: Oscillator::new(sample_rate),
            filter: Svf::new(sample_rate),
            env: Adsr::new(sample_rate),
            sample_rate,
        }
    }

    fn trigger(&mut self, note: u32, vel: f32) {
        self.active = true;
        self.note = note;
        self.velocity = vel;
        self.env.trigger(true);
        self.osc1.reset();
        self.osc2.reset();
    }

    fn release(&mut self) {
        self.env.trigger(false);
    }

    fn process_block(&mut self, params: &EngineParams, output: &mut [f32]) {
        if !self.active { return; }

        let env_val = self.env.next();
        if env_val < 0.0001 && !self.env.is_active() {
            self.active = false;
            return;
        }

        let base_freq = dsp::mtof(self.note as f32);
        let f1 = base_freq * 2.0_f32.powf(params.vco1_freq / 12.0);
        let f2 = base_freq * 2.0_f32.powf(params.vco2_detune / 100.0);
        let coeffs = self.filter.calc_coeffs(params.cutoff, params.res);
        let vol = env_val * self.velocity * params.volume;

        for out in output.iter_mut() {
            let s1 = self.osc1.next(f1, WaveType::Saw, 0.0);
            let s2 = self.osc2.next(f2, WaveType::Pulse, params.vco2_width);
            let mix = (s1 * params.vco1_mix) + (s2 * params.vco2_mix);
            let filtered = self.filter.process_with_coeffs(mix, &coeffs, FilterMode::LowPass);
            *out += filtered * vol;
        }
    }
}

bvst_plugin! {
    struct BvstSynth {
        voices: Vec<Voice>,
    }

    init_fields (sample_rate) {
        voices = (0..MAX_VOICES).map(|_| Voice::new(sample_rate)).collect()
    }

    params {
        1:  p_vco1_freq   = Linear(-24.0, 24.0, 0.0),
        2:  p_vco1_mix    = Linear(0.0, 1.0, 0.8),
        3:  p_vco2_detune = Linear(-50.0, 50.0, 5.0),
        4:  p_vco2_width  = Linear(0.0, 0.9, 0.5),
        5:  p_vco2_mix    = Linear(0.0, 1.0, 0.6),
        6:  p_cutoff      = Exponential(100.0, 10000.0, 2000.0),
        7:  p_res         = Linear(0.0, 10.0, 5.0),
        8:  p_env_a       = Exponential(0.001, 2.0, 0.05),
        9:  p_env_d       = Exponential(0.01, 2.0, 0.2),
        10: p_env_s       = Linear(0.0, 1.0, 0.5),
        11: p_env_r       = Exponential(0.01, 4.0, 0.3),
        12: p_vol         = Linear(0.0, 1.0, 0.7),
    }

    impl BvstSynth {
        fn custom_param(&mut self, id: u32, value: f32) {
            match id {
                128 => self.note_on(value as u32, 1.0),
                129 => self.note_off(value as u32),
                _ => {}
            }
        }

        pub fn process(&mut self, _input_l: &[f32], _input_r: &[f32], output_l: &mut [f32], output_r: &mut [f32]) {
             let params = EngineParams {
                vco1_freq: self.p_vco1_freq.process(),
                vco1_mix: self.p_vco1_mix.process(),
                vco2_detune: self.p_vco2_detune.process(),
                vco2_width: self.p_vco2_width.process(),
                vco2_mix: self.p_vco2_mix.process(),
                cutoff: self.p_cutoff.process(),
                res: self.p_res.process(),
                volume: self.p_vol.process(),
            };

            let a = self.p_env_a.process();
            let d = self.p_env_d.process();
            let s = self.p_env_s.process();
            let r = self.p_env_r.process();

            for v in &mut self.voices {
                v.env.a = a;
                v.env.d = d;
                v.env.s = s;
                v.env.r = r;
            }

            for x in output_l.iter_mut() { *x = 0.0; }
            for x in output_r.iter_mut() { *x = 0.0; }

            let mut block_idx = 0;
            while block_idx < output_l.len() {
                let end = (block_idx + BLOCK_SIZE).min(output_l.len());
                let mut mix_buf = [0.0; BLOCK_SIZE];
                
                for voice in &mut self.voices {
                    voice.process_block(&params, &mut mix_buf[0..(end - block_idx)]);
                }

                for (i, val) in mix_buf[0..(end - block_idx)].iter().enumerate() {
                    output_l[block_idx + i] = *val;
                    output_r[block_idx + i] = *val;
                }
                
                block_idx += BLOCK_SIZE;
            }
        }

        fn note_on(&mut self, note: u32, velocity: f32) {
            for v in &mut self.voices {
                if !v.active {
                    v.trigger(note, velocity);
                    return;
                }
            }
            if let Some(v) = self.voices.get_mut(0) {
                 v.trigger(note, velocity);
            }
        }

        fn note_off(&mut self, note: u32) {
            for v in &mut self.voices {
                if v.active && v.note == note {
                    v.release();
                }
            }
        }
    }
}