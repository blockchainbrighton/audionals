use wasm_bindgen::prelude::*;
use bvst_lib::{bvst_plugin, Param, Curve, dsp::{self, Oscillator, NoiseGen, Svf, Adsr, WaveType}};

// --- VOICE STRUCTS ---

#[derive(Clone)]
struct Kick {
    osc: Oscillator,
    env_amp: Adsr,
    env_pitch: Adsr,
    sample_rate: f32,
}
impl Kick {
    fn new(sample_rate: f32) -> Self {
        let mut k = Self {
            osc: Oscillator::new(sample_rate),
            env_amp: Adsr::new(sample_rate),
            env_pitch: Adsr::new(sample_rate),
            sample_rate,
        };
        k.env_amp.a = 0.001; k.env_amp.s = 0.0; k.env_amp.r = 0.001;
        k.env_pitch.a = 0.001; k.env_pitch.s = 0.0; k.env_pitch.r = 0.001;
        k
    }
    fn trigger(&mut self, dec: f32) {
        self.env_amp.d = dec;
        self.env_pitch.d = dec * 0.3;
        self.env_amp.trigger(true);
        self.env_pitch.trigger(true);
        self.osc.reset();
    }
    fn process(&mut self, tune: f32, click: f32) -> f32 {
        if self.env_amp.state == dsp::EnvState::Sustain { self.env_amp.trigger(false); self.env_pitch.trigger(false); }
        
        let env_a = self.env_amp.next();
        let env_p = self.env_pitch.next();
        
        if env_a < 0.00001 { return 0.0; }
        
        let freq = tune * (1.0 + env_p * 4.0);
        let sig = self.osc.next_simple(freq, WaveType::Sine);
        let t = if env_a > 0.9 { click } else { 0.0 };
        
        (sig + t) * env_a
    }
}

#[derive(Clone)]
struct Snare {
    osc: Oscillator,
    noise: NoiseGen,
    filter: Svf,
    env: Adsr,
    sample_rate: f32,
}
impl Snare {
    fn new(sample_rate: f32) -> Self {
        let mut s = Self {
            osc: Oscillator::new(sample_rate),
            noise: NoiseGen::new(),
            filter: Svf::new(sample_rate),
            env: Adsr::new(sample_rate),
            sample_rate
        };
        s.env.a = 0.001; s.env.s = 0.0; s.env.r = 0.001;
        s
    }
    fn trigger(&mut self, dec: f32) {
        self.env.d = dec;
        self.env.trigger(true);
    }
    fn process(&mut self, tone: f32, snappy: f32) -> f32 {
        if self.env.state == dsp::EnvState::Sustain { self.env.trigger(false); }
        let env = self.env.next();
        if env < 0.00001 { return 0.0; }
        
        let body = self.osc.next_simple(180.0, WaveType::Triangle);
        let n = self.noise.next();
        let _hp = self.filter.process(n, tone + 1000.0, 0.5); 
        
        let mix = body * (1.0 - snappy) + n * snappy;
        mix * env
    }
}

#[derive(Clone)]
struct Hat {
    noise: NoiseGen,
    filter: Svf,
    env: Adsr,
    sample_rate: f32,
}
impl Hat {
    fn new(sample_rate: f32) -> Self {
        let mut h = Self {
            noise: NoiseGen::new(),
            filter: Svf::new(sample_rate),
            env: Adsr::new(sample_rate),
            sample_rate
        };
        h.env.a = 0.001; h.env.s = 0.0; h.env.r = 0.001;
        h
    }
    fn trigger(&mut self, dec: f32) {
        self.env.d = dec;
        self.env.trigger(true);
    }
    fn process(&mut self, color: f32) -> f32 {
        if self.env.state == dsp::EnvState::Sustain { self.env.trigger(false); }
        let env = self.env.next();
        if env < 0.00001 { return 0.0; }
        
        let n = self.noise.next();
        let sig = self.filter.process_mode(n, color, 1.0, dsp::FilterMode::HighPass);
        sig * env
    }
}

#[derive(Clone)]
struct Bass {
    osc: Oscillator,
    filter: Svf,
    env: Adsr,
    sample_rate: f32,
    note: f32,
}
impl Bass {
    fn new(sample_rate: f32) -> Self {
        let mut b = Self {
            osc: Oscillator::new(sample_rate),
            filter: Svf::new(sample_rate),
            env: Adsr::new(sample_rate),
            sample_rate,
            note: 55.0,
        };
        b.env.a = 0.01; b.env.s = 0.0; b.env.r = 0.01;
        b
    }
    fn trigger(&mut self, freq: f32, dec: f32) {
        self.note = freq;
        self.env.d = dec;
        self.env.trigger(true);
    }
    fn process(&mut self, cut: f32, res: f32) -> f32 {
        if self.env.state == dsp::EnvState::Sustain { self.env.trigger(false); }
        let env = self.env.next();
        
        let sig = self.osc.next_simple(self.note, WaveType::Saw);
        let cut_mod = dsp::clamp(cut + (env * 2000.0), 20.0, 10000.0);
        let filtered = self.filter.process(sig, cut_mod, res);
        
        filtered * env
    }
}

bvst_plugin! {
    struct BvstSynth {
        kick: Kick, snare: Snare, hat: Hat, bass: Bass,
        bass_note_param: f32,
    }
    
    init_fields (sample_rate) {
        kick = Kick::new(sample_rate),
        snare = Snare::new(sample_rate),
        hat = Hat::new(sample_rate),
        bass = Bass::new(sample_rate),
        bass_note_param = 36.0
    }
    
    params {
        1: p_mix_k = Linear(0.0, 1.0, 0.8),
        2: p_mix_s = Linear(0.0, 1.0, 0.6),
        3: p_mix_h = Linear(0.0, 1.0, 0.4),
        4: p_mix_b = Linear(0.0, 1.0, 0.7),
        
        5: p_k_tune = Linear(40.0, 100.0, 50.0),
        6: p_k_dec  = Linear(0.1, 0.8, 0.4),
        
        7: p_s_tone = Linear(0.0, 1.0, 0.5),
        8: p_s_dec  = Linear(0.05, 0.4, 0.2),
        
        9: p_h_col  = Exponential(1000.0, 10000.0, 5000.0),
        10: p_h_dec = Linear(0.02, 0.3, 0.05),
        
        11: p_b_cut = Exponential(100.0, 2000.0, 500.0),
        12: p_b_dec = Linear(0.1, 1.0, 0.3),
        // 13 is custom (bass note)
    }
    
    impl BvstSynth {
        fn custom_param(&mut self, id: u32, value: f32) {
             match id {
                 13 => self.bass_note_param = value,
                 128 => self.trigger_note(value as u32),
                 _ => {}
             }
        }
        
        fn trigger_note(&mut self, note: u32) {
            if note >= 48 {
                let freq = if note == 48 { 
                    dsp::mtof(self.bass_note_param) 
                } else {
                    dsp::mtof(note as f32)
                };
                self.bass.trigger(freq, self.p_b_dec.process()); 
                return;
            }
            match note {
                36 => self.kick.trigger(self.p_k_dec.process()),
                38 => self.snare.trigger(self.p_s_dec.process()),
                42 => self.hat.trigger(self.p_h_dec.process()),
                _ => {}
            }
        }
        
        pub fn process(&mut self, output: &mut [f32]) {
             for sample in output.iter_mut() {
                 let k_tune = self.p_k_tune.process();
                 let s_tone = self.p_s_tone.process();
                 let h_col = self.p_h_col.process();
                 let b_cut = self.p_b_cut.process();
                 
                 let mk = self.p_mix_k.process();
                 let ms = self.p_mix_s.process();
                 let mh = self.p_mix_h.process();
                 let mb = self.p_mix_b.process();
                 
                 let k = self.kick.process(k_tune, 0.5);
                 let s = self.snare.process(200.0, s_tone);
                 let h = self.hat.process(h_col);
                 let b = self.bass.process(b_cut, 1.0);
                 
                 *sample = k*mk + s*ms + h*mh + b*mb;
             }
        }
    }
}