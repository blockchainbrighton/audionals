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

    pub fn unmap(&self, real_val: f32) -> f32 {
        match self {
            Curve::Linear { min, max } => (real_val - min) / (max - min),
            Curve::Exponential { min, max } => {
                let safe_min = if *min < 0.001 { 0.001 } else { *min };
                let safe_val = real_val.max(safe_min);
                (safe_val / safe_min).ln() / (max / safe_min).ln()
            },
            Curve::Squared { min, max } => ((real_val - min) / (max - min)).sqrt(),
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
        let val_norm = curve.unmap(initial_val).clamp(0.0, 1.0);
        Self {
            val_norm,
            val_smoothed: val_norm,
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
    pub struct Oscillator { pub phase: f32, pub sample_rate: f32, rng_state: u32 }
    impl Oscillator {
        pub fn new(sample_rate: f32) -> Self { Self { phase: 0.0, sample_rate, rng_state: 12345 } }
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
                    self.rng_state = self.rng_state.wrapping_mul(1664525).wrapping_add(1013904223);
                    (self.rng_state as f32 / u32::MAX as f32) * 2.0 - 1.0
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
    #[derive(Clone, Copy)]
    pub struct SvfCoeffs { pub g: f32, pub k: f32, pub a1: f32, pub a2: f32, pub a3: f32 }

    #[derive(Clone)]
    pub struct Svf { pub ic1: f32, pub ic2: f32, pub sample_rate: f32 }
    impl Svf {
        pub fn new(sample_rate: f32) -> Self { Self { ic1: 0.0, ic2: 0.0, sample_rate } }
        pub fn reset(&mut self) { self.ic1 = 0.0; self.ic2 = 0.0; }
        
        pub fn calc_coeffs(&self, cutoff: f32, res: f32) -> SvfCoeffs {
            let g = (PI * (cutoff / self.sample_rate)).tan();
            let k = 1.0 / clamp(res, 0.1, 10.0);
            let a1 = 1.0 / (1.0 + g * (g + k));
            let a2 = g * a1;
            let a3 = g * a2;
            SvfCoeffs { g, k, a1, a2, a3 }
        }

        pub fn process_with_coeffs(&mut self, input: f32, c: &SvfCoeffs, mode: FilterMode) -> f32 {
            let v3 = input - self.ic2;
            let v1 = c.a1 * self.ic1 + c.a2 * v3;
            let v2 = self.ic2 + c.a2 * self.ic1 + c.a3 * v3;
            
            self.ic1 = 2.0 * v1 - self.ic1;
            self.ic2 = 2.0 * v2 - self.ic2;
            
            match mode {
                FilterMode::LowPass => v2,
                FilterMode::BandPass => v1,
                FilterMode::HighPass => input - c.k * v1 - v2,
                FilterMode::Notch => input - c.k * v1,
            }
        }

        // Legacy single-mode process (LowPass) - kept for compatibility but slow
        pub fn process(&mut self, input: f32, cutoff: f32, res: f32) -> f32 {
            let c = self.calc_coeffs(cutoff, res);
            self.process_with_coeffs(input, &c, FilterMode::LowPass)
        }
        
        // Multi-mode process - slow
        pub fn process_mode(&mut self, input: f32, cutoff: f32, res: f32, mode: FilterMode) -> f32 {
            let c = self.calc_coeffs(cutoff, res);
            self.process_with_coeffs(input, &c, mode)
        }
    }

    // --- DELAY (Generic) ---
    pub struct Delay { 
        buffer: Vec<f32>, 
        pos: usize, 
        len: usize,
        sample_rate: f32 
    }
    impl Delay {
        pub fn new(sample_rate: f32, max_seconds: f32) -> Self {
            let len = (sample_rate * max_seconds) as usize;
            Self { buffer: vec![0.0; len], pos: 0, len, sample_rate }
        }
        pub fn clear(&mut self) {
            for x in self.buffer.iter_mut() { *x = 0.0; }
            self.pos = 0;
        }
        pub fn process(&mut self, input: f32, time_s: f32, feedback: f32, wet: f32) -> f32 {
            let delay_samps = (time_s * self.sample_rate).max(1.0) as usize; 
            let read_pos = (self.pos + self.len - delay_samps) % self.len;
            let delayed = self.buffer[read_pos];
            
            let new_val = input + (delayed * feedback);
            self.buffer[self.pos] = new_val;
            
            self.pos += 1;
            if self.pos >= self.len { self.pos = 0; }
            
            lerp(input, delayed, wet)
        }
        // Raw read/write for custom algos
        pub fn read_at(&self, offset: usize) -> f32 {
            let r = (self.pos + self.len - offset) % self.len;
            self.buffer[r]
        }
        pub fn push(&mut self, val: f32) {
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

    // --- REVERB (Improved - Freeverb-ish) ---
    // 4 Parallel Combs -> 2 Series AllPasses
    pub struct Reverb { 
        // Combs
        c1: Delay, c2: Delay, c3: Delay, c4: Delay,
        // AllPasses
        ap1: AllPass, ap2: AllPass,
        // State
        sample_rate: f32,
        d1: f32, d2: f32, d3: f32, d4: f32 // Damping state for combs
    }
    impl Reverb {
        pub fn new(sample_rate: f32) -> Self {
            // Tuning based on Freeverb (scaled for 44.1k roughly, but adaptive)
            let ms = sample_rate / 1000.0;
            Self { 
                c1: Delay::new(sample_rate, 0.04), // ~30-40ms
                c2: Delay::new(sample_rate, 0.04),
                c3: Delay::new(sample_rate, 0.04),
                c4: Delay::new(sample_rate, 0.04),
                ap1: AllPass::new((5.0 * ms) as usize), // ~5ms
                ap2: AllPass::new((1.7 * ms) as usize), // ~1.7ms
                sample_rate,
                d1: 0.0, d2: 0.0, d3: 0.0, d4: 0.0
            }
        }
        pub fn clear(&mut self) {
            self.c1.clear(); self.c2.clear(); self.c3.clear(); self.c4.clear();
            self.ap1.clear(); self.ap2.clear();
            self.d1 = 0.0; self.d2 = 0.0; self.d3 = 0.0; self.d4 = 0.0;
        }
        
        // Helper for Comb+Lowpass
        fn process_comb(delay: &mut Delay, state: &mut f32, input: f32, len: usize, feedback: f32, damp: f32) -> f32 {
            let output = delay.read_at(len);
            // Simple One-Pole Lowpass for damping
            *state = output * (1.0 - damp) + *state * damp;
            
            delay.push(input + *state * feedback);
            output
        }

        pub fn process(&mut self, input: f32, wet: f32, size: f32) -> f32 {
            // Parameters
            let feedback = 0.7 + (size * 0.28); // 0.7 to 0.98
            let damp = 0.2 + (1.0 - size) * 0.3;
            let ms = self.sample_rate / 1000.0;
            
            // Parallel Combs
            // Fixed relative times for stereo width/density
            let o1 = Self::process_comb(&mut self.c1, &mut self.d1, input, (29.7 * ms) as usize, feedback, damp);
            let o2 = Self::process_comb(&mut self.c2, &mut self.d2, input, (37.1 * ms) as usize, feedback, damp);
            let o3 = Self::process_comb(&mut self.c3, &mut self.d3, input, (41.1 * ms) as usize, feedback, damp);
            let o4 = Self::process_comb(&mut self.c4, &mut self.d4, input, (43.7 * ms) as usize, feedback, damp);
            
            let sum = (o1 + o2 + o3 + o4) * 0.25;
            
            // Series AllPasses
            let a1 = self.ap1.process(sum);
            let a2 = self.ap2.process(a1);
            
            lerp(input, a2, wet)
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

    // --- SAMPLER ---
    #[derive(Clone)]
    pub struct Sampler {
        pub buffer: Vec<f32>,
        pub phase: f32,
        pub sample_rate: f32,
        pub loop_start: usize,
        pub loop_end: usize,
        pub is_looping: bool,
        pub is_playing: bool,
        pub base_freq: f32, 
    }

    impl Sampler {
        pub fn new(sample_rate: f32) -> Self {
            Self {
                buffer: Vec::new(),
                phase: 0.0,
                sample_rate,
                loop_start: 0,
                loop_end: 0,
                is_looping: false,
                is_playing: false,
                base_freq: 261.63, // C4 default
            }
        }

        pub fn load(&mut self, data: &[f32]) {
            self.buffer = data.to_vec();
            self.loop_start = 0;
            self.loop_end = self.buffer.len();
            self.phase = 0.0;
            self.is_playing = false;
        }

        pub fn trigger(&mut self) {
            if !self.buffer.is_empty() {
                self.phase = 0.0;
                self.is_playing = true;
            }
        }

        pub fn seek(&mut self, norm_pos: f32) {
            if self.buffer.is_empty() { return; }
            let len = self.buffer.len() as f32;
            self.phase = (norm_pos * len).clamp(0.0, len - 1.0);
        }

        pub fn process(&mut self, freq: f32) -> f32 {
            if !self.is_playing || self.buffer.is_empty() {
                return 0.0;
            }

            // Rate = Target / Base
            let rate = if self.base_freq > 0.0 { freq / self.base_freq } else { 1.0 };
            
            // Linear Interpolation
            let pos = self.phase;
            let idx = pos as usize;
            let frac = pos - idx as f32;

            // Boundary checks
            if idx >= self.buffer.len() {
                if self.is_looping {
                    // Should have wrapped in the phase calc, but safety check:
                    self.phase = self.loop_start as f32;
                    return self.buffer[self.loop_start]; 
                } else {
                    self.is_playing = false;
                    return 0.0;
                }
            }

            let s1 = self.buffer[idx];
            let s2 = if idx + 1 < self.buffer.len() { 
                self.buffer[idx + 1] 
            } else {
                if self.is_looping { self.buffer[self.loop_start] } else { 0.0 }
            };

            let out = s1 + frac * (s2 - s1);

            // Advance phase
            self.phase += rate;

            // Handle Loop / End
            // Use loop_end if set, else buffer len
            let end_point = if self.loop_end > 0 && self.loop_end <= self.buffer.len() {
                self.loop_end as f32
            } else {
                self.buffer.len() as f32
            };

            if self.phase >= end_point {
                if self.is_looping {
                    let rem = self.phase - end_point;
                    self.phase = self.loop_start as f32 + rem;
                } else {
                    self.is_playing = false;
                    self.phase = 0.0;
                }
            }

            out
        }
    }
}

// --- MACROS ---
#[macro_export]
macro_rules! bvst_plugin {
    (
        struct $name:ident {
            $($field_name:ident : $field_type:ty),* $(,)?
        }
        init_fields ($sr_var:ident) {
            $($init_field_name:ident = $init_field_expr:expr),* $(,)?
        }

        params {
            $($id:literal : $p_name:ident = $curve:ident ( $min:expr, $max:expr, $def:expr )),* $(,)?
        }

        impl $impl_name:ident {
            $($rest_impl:tt)*
        }
    ) => {
        #[wasm_bindgen]
        pub struct $name {
            $sr_var: f32, // Use the captured sample_rate variable name here
            $($field_name: $field_type,)*
            $($p_name: Param,)*
        }

        #[wasm_bindgen]
        impl $name {
            pub fn new($sr_var: f32) -> Self {
                Self {
                    $sr_var, // Use the captured sample_rate variable name here
                    $($init_field_name: $init_field_expr,)*
                    $($p_name: Param::new(Curve::$curve { min: $min, max: $max }, $def),)*
                }
            }

            pub fn set_param(&mut self, id: u32, value: f32) {
                match id {
                    $($id => self.$p_name.set(value),)*
                    _ => self.custom_param(id, value),
                }
            }
            
            $($rest_impl)*
        }
    };
}