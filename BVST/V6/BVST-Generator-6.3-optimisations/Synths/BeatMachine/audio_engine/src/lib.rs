use wasm_bindgen::prelude::*;
use bvst_lib::{Param, Curve, dsp::{self, Oscillator, NoiseGen, Svf, Adsr, WaveType}};

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
        // Hardcoded Kick Envelope Settings
        k.env_amp.a = 0.001; k.env_amp.s = 0.0; k.env_amp.r = 0.001;
        k.env_pitch.a = 0.001; k.env_pitch.s = 0.0; k.env_pitch.r = 0.001;
        k
    }
    fn trigger(&mut self, dec: f32) {
        self.env_amp.d = dec;
        self.env_pitch.d = dec * 0.3; // Pitch drops faster
        self.env_amp.trigger(true);
        self.env_pitch.trigger(true);
        self.osc.reset();
    }
    fn process(&mut self, tune: f32, click: f32) -> f32 {
        // Auto release when sustain reached
        if self.env_amp.state == dsp::EnvState::Sustain { self.env_amp.trigger(false); self.env_pitch.trigger(false); }
        
        let env_a = self.env_amp.next();
        let env_p = self.env_pitch.next();
        
        if env_a < 0.00001 { return 0.0; }
        
        let freq = tune * (1.0 + env_p * 4.0); // Sweep
        let sig = self.osc.next_simple(freq, WaveType::Sine);
        
        // Click is usually high freq burst, here just initial transient boost
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
        
        // Tone (Body)
        let body = self.osc.next_simple(180.0, WaveType::Triangle);
        
        // Snap (Noise)
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

// --- MAIN SYNTH ---

#[wasm_bindgen]
pub struct BvstSynth {
    kick: Kick,
    snare: Snare,
    hat: Hat,
    bass: Bass,
    
    // Params
    p_mix_k: Param, p_mix_s: Param, p_mix_h: Param, p_mix_b: Param,
    
    p_k_tune: Param, p_k_dec: Param,
    p_s_tone: Param, p_s_dec: Param,
    p_h_col: Param, p_h_dec: Param,
    p_b_cut: Param, p_b_dec: Param,
    
    bass_note_param: f32, // Stores current bass note setting (0-12 or Midi)
}

#[wasm_bindgen]
impl BvstSynth {
    pub fn new(sample_rate: f32) -> BvstSynth {
        BvstSynth {
            kick: Kick::new(sample_rate),
            snare: Snare::new(sample_rate),
            hat: Hat::new(sample_rate),
            bass: Bass::new(sample_rate),
            
            p_mix_k: Param::new(Curve::Linear{min:0.,max:1.}, 0.8),
            p_mix_s: Param::new(Curve::Linear{min:0.,max:1.}, 0.6),
            p_mix_h: Param::new(Curve::Linear{min:0.,max:1.}, 0.4),
            p_mix_b: Param::new(Curve::Linear{min:0.,max:1.}, 0.7),
            
            p_k_tune: Param::new(Curve::Linear{min:40.,max:100.}, 50.),
            p_k_dec: Param::new(Curve::Linear{min:0.1,max:0.8}, 0.4),
            
            p_s_tone: Param::new(Curve::Linear{min:0.,max:1.}, 0.5),
            p_s_dec: Param::new(Curve::Linear{min:0.05,max:0.4}, 0.2),
            
            p_h_col: Param::new(Curve::Exponential{min:1000.,max:10000.}, 5000.),
            p_h_dec: Param::new(Curve::Linear{min:0.02,max:0.3}, 0.05),
            
            p_b_cut: Param::new(Curve::Exponential{min:100.,max:2000.}, 500.),
            p_b_dec: Param::new(Curve::Linear{min:0.1,max:1.0}, 0.3),
            
            bass_note_param: 36.0, // C1 default
        }
    }

    pub fn set_param(&mut self, id: u32, value: f32) {
        match id {
            // Mix
            1 => self.p_mix_k.set(value),
            2 => self.p_mix_s.set(value),
            3 => self.p_mix_h.set(value),
            4 => self.p_mix_b.set(value),
            
            // Kick
            5 => self.p_k_tune.set(value),
            6 => self.p_k_dec.set(value),
            
            // Snare
            7 => self.p_s_tone.set(value), // Snappy mix actually
            8 => self.p_s_dec.set(value),
            
            // Hat
            9 => self.p_h_col.set(value),
            10 => self.p_h_dec.set(value),
            
            // Bass
            11 => self.p_b_cut.set(value),
            12 => self.p_b_dec.set(value),
            13 => self.bass_note_param = value, // Pitch Control
            
            // Triggers
            128 => self.trigger_note(value as u32),
            
            _ => {}
        }
    }
    
    fn trigger_note(&mut self, note: u32) {
        // Mappings
        // 36 (C1) = Kick
        // 38 (D1) = Snare
        // 42 (F#1) = Hat
        // 48 (C2) = Bass (Fixed) or Bass Note
        
        // Bass: If note >= 48, trigger bass with that note
        if note >= 48 {
            let freq = dsp::mtof(note as f32);
            self.bass.trigger(freq, self.p_b_dec.get());
            return;
        }
        
        // Drums
        match note {
            36 => self.kick.trigger(self.p_k_dec.get()),
            38 => self.snare.trigger(self.p_s_dec.get()),
            42 => self.hat.trigger(self.p_h_dec.get()),
            _ => {} // Map others if needed
        }
    }

    pub fn process(&mut self, output: &mut [f32]) {
        for sample in output.iter_mut() {
            // Params Process
            // (Optimization: Only process params every N samples? For now per sample is fine)
            let k_tune = self.p_k_tune.process();
            let k_dec = self.p_k_dec.process();
            // Update dec params? Usually set on trigger, but dynamic is cool
            
            let s_snap = self.p_s_tone.process();
            let h_col = self.p_h_col.process();
            let b_cut = self.p_b_cut.process();
            
            // Process Voices
            let k = self.kick.process(k_tune, 0.5);
            let s = self.snare.process(200.0, s_snap);
            let h = self.hat.process(h_col);
            let b = self.bass.process(b_cut, 1.0);
            
            // Mix
            let mix = (k * self.p_mix_k.process()) + 
                      (s * self.p_mix_s.process()) + 
                      (h * self.p_mix_h.process()) + 
                      (b * self.p_mix_b.process());
            
            *sample = mix;
        }
    }
}
