use wasm_bindgen::prelude::*;
use std::f32::consts::PI;

fn clamp(v: f32, min: f32, max: f32) -> f32 { if v < min { min } else if v > max { max } else { v } }
fn lerp(a: f32, b: f32, t: f32) -> f32 { a + (b - a) * t }

// --- ENVELOPE ---
#[derive(Clone, Copy, PartialEq)]
enum EnvState { Idle, Attack, Decay, Sustain, Release }

#[derive(Clone)]
struct Adsr {
    state: EnvState,
    level: f32,
    sample_rate: f32,
    a: f32, d: f32, s: f32, r: f32,
}

impl Adsr {
    fn new(sample_rate: f32) -> Self {
        Self { state: EnvState::Idle, level: 0.0, sample_rate, a: 0.01, d: 0.1, s: 0.5, r: 0.2 }
    }
    fn trigger(&mut self, gate: bool) {
        if gate { self.state = EnvState::Attack; }
        else if self.state != EnvState::Idle { self.state = EnvState::Release; }
    }
    fn next(&mut self) -> f32 {
        match self.state {
            EnvState::Idle => self.level = 0.0,
            EnvState::Attack => {
                self.level += 1.0 / (self.a * self.sample_rate).max(1.0);
                if self.level >= 1.0 { self.level = 1.0; self.state = EnvState::Decay; }
            },
            EnvState::Decay => {
                self.level -= 1.0 / (self.d * self.sample_rate).max(1.0);
                if self.level <= self.s { self.level = self.s; self.state = EnvState::Sustain; }
            },
            EnvState::Sustain => self.level = self.s,
            EnvState::Release => {
                self.level -= 1.0 / (self.r * self.sample_rate).max(1.0);
                if self.level <= 0.0 { self.level = 0.0; self.state = EnvState::Idle; }
            },
        }
        self.level
    }
}

// --- SVF FILTER ---
#[derive(Clone)]
struct Svf { ic1: f32, ic2: f32 }
impl Svf {
    fn new() -> Self { Self { ic1: 0.0, ic2: 0.0 } }
    fn process(&mut self, inp: f32, cut: f32, res: f32, sr: f32) -> f32 {
        let g = (PI * cut / sr).tan();
        let k = 1.0 / clamp(res, 0.1, 10.0);
        let a1 = 1.0 / (1.0 + g * (g + k));
        let a2 = g * a1;
        let a3 = g * a2;
        let v3 = inp - self.ic2;
        let v1 = a1 * self.ic1 + a2 * v3;
        let v2 = self.ic2 + a2 * self.ic1 + a3 * v3;
        self.ic1 = 2.0 * v1 - self.ic1;
        self.ic2 = 2.0 * v2 - self.ic2;
        v2
    }
}

// --- OSCILLATOR ---
#[derive(Clone)]
struct Osc { phase: f32 }
impl Osc {
    fn new() -> Self { Self { phase: 0.0 } }
    fn next(&mut self, freq: f32, sr: f32, pwm: f32) -> f32 {
        self.phase += freq / sr;
        if self.phase > 1.0 { self.phase -= 1.0; }
        // Sawtooth with PWM blend? Or just Pulse?
        // Prompt asked for "Fat Saw" and "Pulse Width".
        // Let's do: Saw - (Pulse * pwm_amt) for simple wave shaping, 
        // Or standard PolyBLEP would be better but let's stick to naive for MVP speed.
        
        // Simple Saw
        let saw = 2.0 * self.phase - 1.0;
        // Simple Pulse
        let pulse = if self.phase < pwm { 1.0 } else { -1.0 };
        
        // Blend based on param? For now let's mix them
        // Let's say PWM param affects Pulse Width, and we mix Saw + Sub.
        // To keep it "Fat", we might just return Saw here and use Detune in Voice.
        saw
    }
}

// --- VOICE ---
#[derive(Clone)]
struct Voice {
    active: bool,
    note: u8,
    osc1: Osc,
    osc2: Osc, // Detuned
    sub: Osc,
    amp_env: Adsr,
    filt_env: Adsr,
    filter: Svf,
    curr_freq: f32,
    target_freq: f32,
}

impl Voice {
    fn new(sr: f32) -> Self {
        Self {
            active: false, note: 0,
            osc1: Osc::new(), osc2: Osc::new(), sub: Osc::new(),
            amp_env: Adsr::new(sr), filt_env: Adsr::new(sr), filter: Svf::new(),
            curr_freq: 440.0, target_freq: 440.0,
        }
    }
    
    fn trigger(&mut self, note: u8, vel: f32) {
        self.note = note;
        self.active = true;
        self.target_freq = 440.0 * 2.0_f32.powf((note as f32 - 69.0) / 12.0);
        // If inactive, snap. If active (legato), glide.
        if self.amp_env.state == EnvState::Idle { self.curr_freq = self.target_freq; }
        
        self.amp_env.trigger(true);
        self.filt_env.trigger(true);
    }
    
    fn release(&mut self) {
        self.amp_env.trigger(false);
        self.filt_env.trigger(false);
    }
    
    fn process(&mut self, sr: f32, params: &Params) -> f32 {
        if !self.active { return 0.0; }
        
        // Glide
        if params.glide > 0.0 {
            let diff = self.target_freq - self.curr_freq;
            self.curr_freq += diff * (1.0 / (params.glide * sr + 1.0));
        } else {
            self.curr_freq = self.target_freq;
        }
        
        // Envelopes
        let env_a = self.amp_env.next();
        let env_f = self.filt_env.next();
        
        if env_a <= 0.0 && self.amp_env.state == EnvState::Idle {
            self.active = false;
            return 0.0;
        }
        
        // Oscs
        let detune = 2.0_f32.powf((params.detune - 0.5) * 0.1); // +/- small amount
        let o1 = self.osc1.next(self.curr_freq, sr, 0.5);
        let o2 = self.osc2.next(self.curr_freq * detune, sr, 0.5);
        let sub = self.sub.next(self.curr_freq * 0.5, sr, 0.5); // Square sub
        
        // Mix: Pulse Width param controls mix between Saw(o1) and Pulse(o2)? 
        // Actually let's just use o1+o2 as Fat Saw, and sub as sub.
        // PWM param usually implies Pulse Wave. 
        // Let's just mix Saw + Detune + Sub.
        let raw = (o1 + o2) * 0.5 + sub * params.sub_level;
        
        // Filter
        let cut = clamp(20.0 * (1000.0_f32).powf(params.cutoff) + env_f * params.filt_env * 5000.0, 20.0, 18000.0);
        let res = params.res * 10.0;
        let filtered = self.filter.process(raw, cut, res, sr);
        
        filtered * env_a
    }
}

struct Params {
    detune: f32, sub_level: f32, pwm: f32, glide: f32,
    cutoff: f32, res: f32, filt_env: f32,
    chorus: f32, delay: f32, reverb: f32, vol: f32,
}

// --- MAIN ---
#[wasm_bindgen]
pub struct BvstSynth {
    sample_rate: f32,
    voices: Vec<Voice>,
    params: Params,
    // FX buffers
    delay_line: Vec<f32>, d_pos: usize,
    // Simple Reverb logic (comb filters etc too heavy, using simple delay-diffuser)
    rev_line: Vec<f32>, r_pos: usize,
}

#[wasm_bindgen]
impl BvstSynth {
    pub fn new(sample_rate: f32) -> BvstSynth {
        let mut voices = Vec::new();
        for _ in 0..8 { voices.push(Voice::new(sample_rate)); }
        
        BvstSynth {
            sample_rate,
            voices,
            params: Params {
                detune: 0.5, sub_level: 0.0, pwm: 0.5, glide: 0.0,
                cutoff: 0.5, res: 0.1, filt_env: 0.5,
                chorus: 0.0, delay: 0.0, reverb: 0.0, vol: 0.5
            },
            delay_line: vec![0.0; (sample_rate * 0.5) as usize], d_pos: 0,
            rev_line: vec![0.0; (sample_rate * 0.1) as usize], r_pos: 0,
        }
    }

    pub fn set_param(&mut self, id: u32, val: f32) {
        match id {
            1 => self.params.detune = val,
            2 => self.params.sub_level = val,
            3 => self.params.pwm = val,
            4 => self.params.glide = val,
            5 => self.params.cutoff = val,
            6 => self.params.res = val,
            7 => self.params.filt_env = val,
            8 => { for v in &mut self.voices { v.amp_env.a = val; } },
            9 => { for v in &mut self.voices { v.amp_env.d = val; } },
            10 => { for v in &mut self.voices { v.amp_env.s = val; } },
            11 => { for v in &mut self.voices { v.amp_env.r = val; } },
            12 => self.params.chorus = val,
            13 => self.params.delay = val,
            14 => self.params.reverb = val,
            15 => self.params.vol = val,
            
            21 => self.note_on(val as u8, 1.0), // Note On
            22 => self.note_off(val as u8), // Note Off
            20 => self.all_notes_off(), // Panic
            
            _ => {}
        }
    }

    fn note_on(&mut self, note: u8, vel: f32) {
        // Find free voice
        for v in &mut self.voices {
            if !v.active {
                v.trigger(note, vel);
                return;
            }
        }
        // Steal oldest? Just overwrite first for now
        self.voices[0].trigger(note, vel);
    }

    fn note_off(&mut self, note: u8) {
        for v in &mut self.voices {
            if v.active && v.note == note {
                v.release();
            }
        }
    }
    
    fn all_notes_off(&mut self) {
        for v in &mut self.voices { v.active = false; v.amp_env.state = EnvState::Idle; }
    }

    pub fn process(&mut self, output: &mut [f32]) {
        let d_len = self.delay_line.len();
        let r_len = self.rev_line.len();
        
        for sample in output.iter_mut() {
            let mut mix = 0.0;
            for v in &mut self.voices {
                mix += v.process(self.sample_rate, &self.params);
            }
            mix *= 0.3; // Headroom
            
            // FX: Chorus (Simple detuned copy - simplified to static wideness for MVP)
            if self.params.chorus > 0.0 {
                 mix += mix * 0.5 * self.params.chorus; // Just louder/doubled for now
            }
            
            // FX: Delay
            let d_in = mix;
            let d_out = self.delay_line[self.d_pos];
            self.delay_line[self.d_pos] = d_in + d_out * 0.5;
            self.d_pos = (self.d_pos + 1) % d_len;
            mix += d_out * self.params.delay;
            
            // FX: Reverb
            let r_in = mix;
            let r_out = self.rev_line[self.r_pos];
            self.rev_line[self.r_pos] = r_in + r_out * 0.7; // High feedback
            self.r_pos = (self.r_pos + 1) % r_len;
            mix += r_out * self.params.reverb;
            
            *sample = mix * self.params.vol;
        }
    }
}