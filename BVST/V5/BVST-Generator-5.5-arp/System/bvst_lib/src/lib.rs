#[derive(Clone, Copy)]
pub enum Curve {
    Linear { min: f32, max: f32 },
    Exponential { min: f32, max: f32 },
    Squared { min: f32, max: f32 },
}

impl Curve {
    pub fn map(&self, norm_val: f32) -> f32 {
        let v = norm_val.clamp(0.0, 1.0);
        match self {
            Curve::Linear { min, max } => min + v * (max - min),
            Curve::Exponential { min, max } => {
                let safe_min = if *min < 0.001 { 0.001 } else { *min };
                safe_min * (max / safe_min).powf(v)
            },
            Curve::Squared { min, max } => min + (v * v) * (max - min),
        }
    }
}

pub struct Param {
    pub val_norm: f32,
    pub val_smoothed: f32,
    smoothing_factor: f32,
    curve: Curve,
}

impl Param {
    pub fn new(curve: Curve, initial_val: f32) -> Self {
        Self {
            val_norm: initial_val,
            val_smoothed: initial_val,
            smoothing_factor: 0.005, 
            curve,
        }
    }
    pub fn set_smooth(&mut self, factor: f32) { self.smoothing_factor = factor; }
    pub fn set(&mut self, val: f32) { self.val_norm = val.clamp(0.0, 1.0); }
    #[inline]
    pub fn process(&mut self) -> f32 {
        self.val_smoothed += (self.val_norm - self.val_smoothed) * self.smoothing_factor;
        self.curve.map(self.val_smoothed)
    }
    pub fn get(&self) -> f32 { self.curve.map(self.val_smoothed) }
}

pub mod dsp {
    use std::f32::consts::PI;

    // --- UTILS ---
    #[inline]
    pub fn clamp(v: f32, min: f32, max: f32) -> f32 { if v < min { min } else if v > max { max } else { v } }
    #[inline]
    pub fn lerp(a: f32, b: f32, t: f32) -> f32 { a + (b - a) * t }
    #[inline]
    pub fn mtof(n: f32) -> f32 { 440.0 * 2.0_f32.powf((n - 69.0) / 12.0) }
    #[inline]
    pub fn db_to_lin(db: f32) -> f32 { 10.0_f32.powf(db / 20.0) }

    // --- WAVETYPE ---
    #[derive(Copy, Clone, PartialEq)]
    pub enum WaveType { Sine = 0, Saw = 1, Square = 2, Pulse = 3, Triangle = 4, Noise = 5 }
    impl From<f32> for WaveType {
        fn from(v: f32) -> Self {
            match v as i32 {
                0 => WaveType::Sine, 1 => WaveType::Saw, 2 => WaveType::Square, 
                3 => WaveType::Pulse, 4 => WaveType::Triangle, 5 => WaveType::Noise,
                _ => WaveType::Saw,
            }
        }
    }

    // --- OSCILLATOR ---
    #[derive(Clone)]
    pub struct Oscillator { pub phase: f32, pub sample_rate: f32 }
    impl Oscillator {
        pub fn new(sample_rate: f32) -> Self { Self { phase: 0.0, sample_rate } }
        pub fn reset(&mut self) { self.phase = 0.0; }
        
        pub fn next(&mut self, freq: f32, wave: WaveType, pwm: f32) -> f32 {
            let increment = freq / self.sample_rate;
            self.phase += increment;
            if self.phase > 1.0 { self.phase -= 1.0; }

            match wave {
                WaveType::Sine => (self.phase * 2.0 * PI).sin(),
                WaveType::Saw => 2.0 * self.phase - 1.0,
                WaveType::Square => if self.phase < 0.5 { 1.0 } else { -1.0 },
                WaveType::Pulse => if self.phase < pwm { 1.0 } else { -1.0 },
                WaveType::Triangle => {
                    let mut t = -1.0 + (2.0 * self.phase) * 2.0;
                    if t > 1.0 { t = 2.0 - t; }
                    t
                },
                WaveType::Noise => {
                     0.0 
                }
            }
        }

        pub fn next_simple(&mut self, freq: f32, wave: WaveType) -> f32 {
            self.next(freq, wave, 0.5)
        }
    }

    // --- NOISE GEN ---
    #[derive(Clone)]
    pub struct NoiseGen { seed: u32 }
    impl NoiseGen {
        pub fn new() -> Self { Self { seed: 12345 } }
        pub fn next(&mut self) -> f32 {
            self.seed = self.seed.wrapping_mul(1664525).wrapping_add(1013904223);
            (self.seed as f32 / u32::MAX as f32) * 2.0 - 1.0
        }
    }

    // --- ADSR ---
    #[derive(Clone, Copy, PartialEq)]
    pub enum EnvState { Idle, Attack, Decay, Sustain, Release }
    
    #[derive(Clone)]
    pub struct Adsr {
        pub state: EnvState, pub level: f32, pub sample_rate: f32,
        pub a: f32, pub d: f32, pub s: f32, pub r: f32,
    }
    impl Adsr {
        pub fn new(sample_rate: f32) -> Self {
            Self { state: EnvState::Idle, level: 0.0, sample_rate, a: 0.01, d: 0.1, s: 1.0, r: 0.1 }
        }
        pub fn trigger(&mut self, gate: bool) {
            if gate {
                self.state = EnvState::Attack;
            } else {
                if self.state != EnvState::Idle { self.state = EnvState::Release; }
            }
        }
        pub fn next(&mut self) -> f32 {
            match self.state {
                EnvState::Idle => { self.level = 0.0; },
                EnvState::Attack => {
                    let step = 1.0 / (self.a * self.sample_rate).max(1.0);
                    self.level += step;
                    if self.level >= 1.0 { self.level = 1.0; self.state = EnvState::Decay; }
                },
                EnvState::Decay => {
                    let step = 1.0 / (self.d * self.sample_rate).max(1.0);
                    self.level -= step;
                    if self.level <= self.s { self.level = self.s; self.state = EnvState::Sustain; }
                },
                EnvState::Sustain => { self.level = self.s; },
                EnvState::Release => {
                    let step = 1.0 / (self.r * self.sample_rate).max(1.0);
                    self.level -= step;
                    if self.level <= 0.0 { self.level = 0.0; self.state = EnvState::Idle; }
                },
            }
            self.level
        }

        pub fn is_active(&self) -> bool { self.state != EnvState::Idle }
    }

    // --- FILTER MODES ---
    #[derive(Copy, Clone, PartialEq)]
    pub enum FilterMode { LowPass = 0, HighPass = 1, BandPass = 2, Notch = 3 }
    impl From<f32> for FilterMode {
        fn from(v: f32) -> Self {
            match v as i32 {
                0 => FilterMode::LowPass, 1 => FilterMode::HighPass,
                2 => FilterMode::BandPass, 3 => FilterMode::Notch,
                _ => FilterMode::LowPass,
            }
        }
    }

    // --- SVF FILTER ---
    #[derive(Clone)]
    pub struct Svf { pub ic1: f32, pub ic2: f32, pub sample_rate: f32 }
    impl Svf {
        pub fn new(sample_rate: f32) -> Self { Self { ic1: 0.0, ic2: 0.0, sample_rate } }
        pub fn reset(&mut self) { self.ic1 = 0.0; self.ic2 = 0.0; }
        
        // Legacy single-mode process (LowPass)
        pub fn process(&mut self, input: f32, cutoff: f32, res: f32) -> f32 {
            self.process_mode(input, cutoff, res, FilterMode::LowPass)
        }
        
        // Multi-mode process
        pub fn process_mode(&mut self, input: f32, cutoff: f32, res: f32, mode: FilterMode) -> f32 {
            let g = (PI * (cutoff / self.sample_rate)).tan();
            let k = 1.0 / clamp(res, 0.1, 10.0);
            let a1 = 1.0 / (1.0 + g * (g + k));
            let a2 = g * a1;
            let a3 = g * a2;
            let v3 = input - self.ic2;
            let v1 = a1 * self.ic1 + a2 * v3;
            let v2 = self.ic2 + a2 * self.ic1 + a3 * v3;
            
            self.ic1 = 2.0 * v1 - self.ic1;
            self.ic2 = 2.0 * v2 - self.ic2;
            
            match mode {
                FilterMode::LowPass => v2,
                FilterMode::BandPass => v1,
                FilterMode::HighPass => input - k * v1 - v2,
                FilterMode::Notch => input - k * v1,
            }
        }
    }

    // --- DELAY (Generic) ---
    pub struct Delay { 
        buffer: Vec<f32>, 
        pos: usize, 
        len: usize 
    }
    impl Delay {
        pub fn new(sample_rate: f32, max_seconds: f32) -> Self {
            let len = (sample_rate * max_seconds) as usize;
            Self { buffer: vec![0.0; len], pos: 0, len }
        }
        pub fn clear(&mut self) {
            for x in self.buffer.iter_mut() { *x = 0.0; }
            self.pos = 0;
        }
        pub fn process(&mut self, input: f32, time_s: f32, feedback: f32, wet: f32) -> f32 {
            let delay_samps = (time_s * 44100.0).max(1.0) as usize; 
            let read_pos = (self.pos + self.len - delay_samps) % self.len;
            let delayed = self.buffer[read_pos];
            
            let new_val = input + (delayed * feedback);
            self.buffer[self.pos] = new_val;
            
            self.pos += 1;
            if self.pos >= self.len { self.pos = 0; }
            
            lerp(input, delayed, wet)
        }
        pub fn read(&self, delay_samples: usize) -> f32 {
            let r = (self.pos + self.len - delay_samples) % self.len;
            self.buffer[r]
        }
        pub fn write(&mut self, val: f32) {
            self.buffer[self.pos] = val;
            self.pos += 1;
            if self.pos >= self.len { self.pos = 0; }
        }
    }

    // --- ALLPASS FILTER (for Reverb/Phaser) ---
    pub struct AllPass {
        buffer: Vec<f32>, pos: usize, len: usize,
    }
    impl AllPass {
        pub fn new(size_samples: usize) -> Self {
            Self { buffer: vec![0.0; size_samples], pos: 0, len: size_samples }
        }
        pub fn clear(&mut self) {
            for x in self.buffer.iter_mut() { *x = 0.0; }
            self.pos = 0;
        }
        pub fn process(&mut self, input: f32) -> f32 {
            let delayed = self.buffer[self.pos];
            let z = input - 0.5 * delayed;
            self.buffer[self.pos] = z;
            self.pos += 1;
            if self.pos >= self.len { self.pos = 0; }
            delayed + 0.5 * z
        }
    }

    // --- REVERB (Improved) ---
    pub struct Reverb { 
        d1: Delay, d2: Delay, d3: Delay, d4: Delay,
        sample_rate: f32
    }
    impl Reverb {
        pub fn new(sample_rate: f32) -> Self {
            Self { 
                d1: Delay::new(sample_rate, 0.1),
                d2: Delay::new(sample_rate, 0.11),
                d3: Delay::new(sample_rate, 0.13),
                d4: Delay::new(sample_rate, 0.17),
                sample_rate 
            }
        }
        pub fn clear(&mut self) {
            self.d1.clear(); self.d2.clear(); self.d3.clear(); self.d4.clear();
        }
        pub fn process(&mut self, input: f32, wet: f32, size: f32) -> f32 {
            let s = size * 0.05;
            let o1 = self.d1.process(input, 0.029 + s, 0.7, 1.0);
            let o2 = self.d2.process(input, 0.037 + s, 0.71, 1.0);
            let o3 = self.d3.process(input, 0.041 + s, 0.73, 1.0);
            let o4 = self.d4.process(input, 0.043 + s, 0.75, 1.0);
            
            let dense = (o1 + o2 + o3 + o4) * 0.25;
            lerp(input, dense, wet)
        }
    }

    // --- COMPRESSOR ---
    pub struct Compressor {
        pub sample_rate: f32,
        env: f32,
        gain: f32,
    }
    impl Compressor {
        pub fn new(sample_rate: f32) -> Self {
            Self { sample_rate, env: 0.0, gain: 1.0 }
        }
        pub fn process(&mut self, input: f32, thresh_db: f32, ratio: f32, attack: f32, release: f32) -> f32 {
            let abs_in = input.abs();
            let att_coef = (-1.0 / (attack * self.sample_rate)).exp();
            let rel_coef = (-1.0 / (release * self.sample_rate)).exp();
            
            if abs_in > self.env {
                self.env = att_coef * self.env + (1.0 - att_coef) * abs_in;
            } else {
                self.env = rel_coef * self.env + (1.0 - rel_coef) * abs_in;
            }
            
            let env_db = if self.env > 0.000001 { 20.0 * self.env.log10() } else { -96.0 };
            let mut gain_db = 0.0;
            
            if env_db > thresh_db {
                gain_db = (thresh_db - env_db) * (1.0 - 1.0/ratio);
            }
            
            let target_gain = db_to_lin(gain_db);
            input * target_gain
        }
    }
}