use wasm_bindgen::prelude::*;
use bvst_lib::{bvst_plugin, Param, Curve, dsp::{self, Oscillator, Svf, Adsr, Reverb, Delay, WaveType}};

const VOICES: usize = 4;

#[derive(Clone)]
struct Voice {
    active: bool,
    note: u32,
    osc1: Oscillator,
    osc2: Oscillator,
    filter: Svf,
    env: Adsr,
    lfo_pwm: Oscillator,
}

impl Voice {
    fn new(sample_rate: f32) -> Self {
        Self {
            active: false, note: 0,
            osc1: Oscillator::new(sample_rate),
            osc2: Oscillator::new(sample_rate),
            filter: Svf::new(sample_rate),
            env: Adsr::new(sample_rate),
            lfo_pwm: Oscillator::new(sample_rate),
        }
    }
    
    fn trigger(&mut self, note: u32) {
        self.active = true;
        self.note = note;
        self.env.trigger(true);
    }
    
    fn release(&mut self) {
        self.env.trigger(false);
    }
    
    fn process(&mut self, params: &SynthParams, sample_rate: f32) -> f32 {
        if !self.active { return 0.0; }
        
        let env_val = self.env.next();
        if env_val < 0.0001 && !self.env.is_active() {
            self.active = false;
            return 0.0;
        }
        
        let freq = 440.0 * 2.0_f32.powf((self.note as f32 - 69.0) / 12.0);
        let pwm = 0.5 + 0.4 * self.lfo_pwm.next_simple(params.pwm_rate, WaveType::Triangle);
        let f2 = freq * params.detune; 
        
        let o1 = self.osc1.next_simple(freq, WaveType::Saw);
        let o2 = self.osc2.next(f2, WaveType::Pulse, pwm);
        let mix = (o1 + o2) * 0.5;
        
        let cut = dsp::clamp(params.cutoff + (env_val * params.env_amt), 20.0, 18000.0);
        let filtered = self.filter.process(mix, cut, 0.5);
        
        filtered * env_val
    }
}

struct SynthParams {
    cutoff: f32, env_amt: f32,
    pwm_rate: f32, detune: f32,
}

bvst_plugin! {
    struct BvstSynth {
        voices: Vec<Voice>,
        chorus_lfo: Oscillator,
        chorus_delay: Delay,
        reverb: Reverb,
    }

    init_fields (sample_rate) {
        voices = (0..VOICES).map(|_| Voice::new(sample_rate)).collect(),
        chorus_lfo = Oscillator::new(sample_rate),
        chorus_delay = Delay::new(sample_rate, 0.05),
        reverb = Reverb::new(sample_rate)
    }

    params {
        1: p_cut        = Exponential(200.0, 10000.0, 2000.0),
        2: p_env_amt    = Linear(0.0, 5000.0, 1000.0),
        3: p_pwm_rate   = Linear(0.1, 5.0, 0.5),
        4: p_detune     = Linear(1.0, 1.05, 1.01),
        5: p_chorus_mix = Linear(0.0, 1.0, 0.5),
        6: p_verb_mix   = Linear(0.0, 0.8, 0.3),
        7: p_vol        = Squared(0.0, 1.0, 0.5),
        8: p_att        = Linear(0.01, 3.0, 1.0),
        9: p_rel        = Linear(0.1, 5.0, 2.0),
    }

    impl BvstSynth {
        fn custom_param(&mut self, id: u32, value: f32) {
            match id {
                128 => self.note_on(value as u32),
                129 => self.note_off(value as u32),
                
                // Legacy
                26 => self.note_on(((12.0 * (value / 440.0).log2() + 69.0) as u32)),
                27 => if value < 0.5 { self.all_notes_off() },
                _ => {}
            }
        }
        
        fn note_on(&mut self, note: u32) {
            for v in &mut self.voices {
                if !v.active { v.trigger(note); return; }
            }
            self.voices[0].trigger(note);
        }
        
        fn note_off(&mut self, note: u32) {
            for v in &mut self.voices {
                if v.active && v.note == note { v.release(); }
            }
        }
        
        fn all_notes_off(&mut self) {
            for v in &mut self.voices { v.release(); }
        }

        pub fn process(&mut self, output: &mut [f32]) {
            for sample in output.iter_mut() {
                // Update params
                let params = SynthParams {
                    cutoff: self.p_cut.process(),
                    env_amt: self.p_env_amt.process(),
                    pwm_rate: self.p_pwm_rate.process(),
                    detune: self.p_detune.process(),
                };
                
                let c_mix = self.p_chorus_mix.process();
                let v_mix = self.p_verb_mix.process();
                let vol = self.p_vol.process();
                let a = self.p_att.process();
                let r = self.p_rel.process();
                
                // Update Voice Envs
                for v in &mut self.voices { v.env.a = a; v.env.r = r; v.env.d = a; v.env.s = 0.8; }

                // Sum
                let mut sum = 0.0;
                for v in &mut self.voices {
                    sum += v.process(&params, self.sample_rate);
                }
                
                // FX
                let lfo = self.chorus_lfo.next_simple(0.5, WaveType::Sine);
                let delay_time = 0.010 + (0.005 * (lfo * 0.5 + 0.5)); 
                let chorus_sig = self.chorus_delay.process(sum, delay_time, 0.0, 1.0);
                let chorused = dsp::lerp(sum, chorus_sig, c_mix);
                let wet = self.reverb.process(chorused, v_mix, 0.85);
                
                *sample = wet * vol;
            }
        }
    }
}