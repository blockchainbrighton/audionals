use std::f32::consts::PI;

#[derive(Clone, Copy, PartialEq)]
pub enum WaveType {
    Sin,
    Saw,
    Square,
    Pulse,
    Tri,
    Noise,
}

#[derive(Clone)]
pub struct Oscillator {
    phase: f32,
    sample_rate: f32,
    seed: u32,
}

impl Oscillator {
    pub fn new(sample_rate: f32) -> Self {
        Self { phase: 0.0, sample_rate, seed: 12345 }
    }

    pub fn reset(&mut self) {
        self.phase = 0.0;
    }

    pub fn next_simple(&mut self, freq: f32, shape: WaveType) -> f32 {
        let inc = freq / self.sample_rate;
        self.phase = (self.phase + inc).fract(); // Use fract() for better wrapping
        
        match shape {
            WaveType::Sin => (self.phase * 2.0 * PI).sin(),
            WaveType::Saw => 2.0 * self.phase - 1.0,
            WaveType::Square => if self.phase < 0.5 { 1.0 } else { -1.0 },
            WaveType::Pulse => if self.phase < 0.25 { 1.0 } else { -1.0 },
            WaveType::Tri => {
                let x = self.phase * 4.0;
                if x < 2.0 { x - 1.0 } else { 3.0 - x }
            },
            WaveType::Noise => {
                self.seed = self.seed.wrapping_mul(1103515245).wrapping_add(12345);
                let val = (self.seed >> 16) & 0x7FFF;
                (val as f32 / 32768.0) * 2.0 - 1.0
            }, 
        }
    }

    pub fn next_pulse(&mut self, freq: f32, width: f32) -> f32 {
        let inc = freq / self.sample_rate;
        self.phase = (self.phase + inc).fract();
        let w = width.max(0.01).min(0.99);
        if self.phase < w { 1.0 } else { -1.0 }
    }

    // Fast polynomial sine approximation (smoother/faster than libm sin)
    pub fn next_fast(&mut self, freq: f32, shape: WaveType) -> f32 {
        if let WaveType::Sin = shape {
             let inc = freq / self.sample_rate;
             self.phase = (self.phase + inc).fract();
             let _x = self.phase * 2.0 - 1.0; // -1 to 1
             // Parabolic approx: 4x(1-abs(x)) is rough.
             // Bhaskara I approximation? 
             // Let's stick to system sin for accuracy unless profiling shows bottleneck.
             // But let's optimize the other shapes slightly.
             (self.phase * 2.0 * PI).sin()
        } else {
             self.next_simple(freq, shape)
        }
    }
}

#[derive(Clone)]
pub struct NoiseGen {
    seed: u32,
}

impl NoiseGen {
    pub fn new() -> Self {
        Self { seed: 12345 }
    }
    
    pub fn next(&mut self) -> f32 {
        self.seed = self.seed.wrapping_mul(1103515245).wrapping_add(12345);
        let val = (self.seed >> 16) & 0x7FFF;
        (val as f32 / 32768.0) * 2.0 - 1.0
    }
}

#[derive(Clone)]
pub struct Svf {
    ic1eq: f32,
    ic2eq: f32,
    sample_rate: f32,
}

impl Svf {
    pub fn new(sample_rate: f32) -> Self {
        Self { ic1eq: 0.0, ic2eq: 0.0, sample_rate }
    }
    
    pub fn reset(&mut self) {
        self.ic1eq = 0.0;
        self.ic2eq = 0.0;
    }

    // Returns (Lowpass, Highpass, Bandpass, Notch)
    pub fn process_multimode(&mut self, input: f32, cutoff: f32, q: f32) -> (f32, f32, f32, f32) {
        let g = (PI * cutoff / self.sample_rate).tan();
        let k = 1.0 / q;
        let a1 = 1.0 / (1.0 + g * (g + k));
        let a2 = g * a1;
        let a3 = g * a2;
        
        let v3 = input - self.ic2eq;
        let v1 = a1 * self.ic1eq + a2 * v3; // BP
        let v2 = self.ic2eq + a2 * self.ic1eq + a3 * v3; // LP
        
        self.ic1eq = 2.0 * v1 - self.ic1eq;
        self.ic2eq = 2.0 * v2 - self.ic2eq;
        
        let lp = v2;
        let bp = v1;
        let hp = input - k * bp - lp;
        let notch = input - k * bp;
        
        (lp, hp, bp, notch)
    }

    // Legacy helper for just LP
    pub fn process(&mut self, input: f32, cutoff: f32, q: f32) -> f32 {
        self.process_multimode(input, cutoff, q).0
    }
}

#[derive(Clone)]
pub struct Adsr {
    pub a: f32,
    pub d: f32,
    pub s: f32,
    pub r: f32,
    state: u8, // 0:Idle, 1:A, 2:D, 3:S, 4:R
    pub val: f32,
    sample_rate: f32,
    // Coeffs
    coef_a: f32,
    coef_d: f32,
    coef_r: f32,
}

impl Adsr {
    pub fn new(sample_rate: f32) -> Self {
        Self { 
            a: 0.1, d: 0.1, s: 1.0, r: 0.1, 
            state: 0, val: 0.0, sample_rate,
            coef_a: 0.0, coef_d: 0.0, coef_r: 0.0
        }
    }
    
    fn calc_coef(time: f32, sample_rate: f32) -> f32 {
        if time <= 0.0 { return 1.0; }
        // Exponential approach: exp(-1 / (time * rate))
        // Reaches ~63% in time t.
        // For ADSR we usually want 1-exp decay.
        // Simple one-pole coef:
        (-1.0 / (time * sample_rate)).exp()
    }
    
    // Updates coefficients based on current A/D/R values
    pub fn update_coefs(&mut self) {
        // We use a target-based approach: val = val * coef + target * (1-coef)
        self.coef_a = Self::calc_coef(self.a, self.sample_rate);
        self.coef_d = Self::calc_coef(self.d, self.sample_rate);
        self.coef_r = Self::calc_coef(self.r, self.sample_rate);
    }

    pub fn set_adsr(&mut self, a: f32, d: f32, s: f32, r: f32) {
        let needs_update = (a - self.a).abs() > 1e-6 || (d - self.d).abs() > 1e-6 || (r - self.r).abs() > 1e-6;
        self.a = a;
        self.d = d;
        self.s = s;
        self.r = r;
        if needs_update {
            self.update_coefs();
        }
    }
    
    pub fn trigger(&mut self, on: bool) {
        if on {
            self.state = 1; // Attack
            self.update_coefs();
        } else {
            if self.state != 0 {
                self.state = 4; // Release
                self.update_coefs();
            }
        }
    }
    
    pub fn is_active(&self) -> bool {
        self.state != 0
    }

    pub fn next(&mut self) -> f32 {
        match self.state {
            0 => { self.val = 0.0; },
            1 => {
                // Attack: Target 1.5 (overshoot) to make it snappier, clamp at 1.0
                // Or standard: val += (1.0 - val) * (1 - coef)
                let coef = self.coef_a;
                self.val = 1.0 + (self.val - 1.0) * coef;
                if self.val >= 0.999 { self.val = 1.0; self.state = 2; }
            },
            2 => {
                // Decay: Target S
                let coef = self.coef_d;
                self.val = self.s + (self.val - self.s) * coef;
                if (self.val - self.s).abs() < 0.001 { self.val = self.s; self.state = 3; }
            },
            3 => { 
                // If sustain is effectively zero, treat this as an AD envelope and stop.
                if self.s <= 0.0001 {
                    self.val = 0.0;
                    self.state = 0;
                } else {
                    self.val = self.s;
                }
                // Allow Sustain parameter to change live
                // self.val = self.val * 0.9 + self.s * 0.1; 
            },
            4 => {
                // Release: Target 0
                let coef = self.coef_r;
                self.val = self.val * coef;
                if self.val < 0.001 { self.val = 0.0; self.state = 0; }
            },
            _ => {}
        }
        self.val
    }
}

pub fn mtof(midi: f32) -> f32 {
    440.0 * 2.0_f32.powf((midi - 69.0) / 12.0)
}

pub fn clamp(v: f32, min: f32, max: f32) -> f32 {
    v.max(min).min(max)
}

#[derive(Clone)]
pub struct Sampler {
    pub buffer: Vec<f32>,
    pub phase: f32,
    pub loop_start: usize,
    pub loop_end: usize,
    pub is_looping: bool,
    pub reverse: bool,
    playing: bool,
    sample_rate: f32,
}

impl Sampler {
    pub fn new(sample_rate: f32) -> Self {
        Self {
            buffer: Vec::new(),
            phase: 0.0,
            loop_start: 0,
            loop_end: 0,
            is_looping: false,
            reverse: false,
            playing: false,
            sample_rate,
        }
    }

    pub fn load(&mut self, data: &[f32]) {
        self.buffer.clear();
        self.buffer.extend_from_slice(data);

        self.loop_start = 0;
        self.loop_end = self.buffer.len();
        self.phase = 0.0;
        self.playing = false;
    }

    pub fn trigger(&mut self) {
        if self.buffer.is_empty() {
            self.playing = false;
            self.phase = 0.0;
            return;
        }

        self.playing = true;
        self.phase = if self.reverse {
            let end = self.loop_end.min(self.buffer.len());
            if end == 0 { 0.0 } else { (end - 1) as f32 }
        } else {
            self.loop_start.min(self.buffer.len().saturating_sub(1)) as f32
        };
    }

    pub fn stop(&mut self) {
        self.playing = false;
    }

    pub fn is_playing(&self) -> bool {
        self.playing
    }

    pub fn seek(&mut self, pos_norm: f32) {
        if self.buffer.is_empty() {
            self.phase = 0.0;
            return;
        }
        let n = self.buffer.len().saturating_sub(1) as f32;
        self.phase = clamp(pos_norm, 0.0, 1.0) * n;
    }

    pub fn set_loop_norm(&mut self, start_norm: f32, end_norm: f32, enabled: bool) {
        let len = self.buffer.len();
        if len == 0 {
            self.loop_start = 0;
            self.loop_end = 0;
            self.is_looping = false;
            return;
        }

        let start = (clamp(start_norm, 0.0, 1.0) * len as f32) as usize;
        let mut end = (clamp(end_norm, 0.0, 1.0) * len as f32) as usize;

        let start = start.min(len - 1);
        if end <= start + 1 {
            end = (start + 1).min(len);
        }
        end = end.min(len);

        self.loop_start = start;
        self.loop_end = end;
        self.is_looping = enabled;
    }

    pub fn process(&mut self, rate: f32) -> f32 {
        if !self.playing || self.buffer.is_empty() {
            return 0.0;
        }

        let len = self.buffer.len();
        let loop_start_i = self.loop_start.min(len - 1);
        let loop_end_i = self.loop_end.clamp(loop_start_i + 1, len);
        let idx0 = self.phase.floor() as i32;
        let frac = self.phase - idx0 as f32;

        let i0 = idx0.clamp(0, (len as i32) - 1) as usize;
        let i1 = (i0 + 1).min(len - 1);

        let s0 = self.buffer[i0];
        let s1 = self.buffer[i1];
        let out = s0 + (s1 - s0) * frac;

        let step = rate.abs().max(0.0);
        if self.reverse {
            self.phase -= step;
        } else {
            self.phase += step;
        }

        let loop_start = loop_start_i as f32;
        let loop_end = loop_end_i as f32;

        if self.is_looping && loop_end > loop_start + 1.0 {
            if !self.reverse && self.phase >= loop_end {
                let over = self.phase - loop_end;
                let loop_len = loop_end - loop_start;
                self.phase = loop_start + over.rem_euclid(loop_len);
            } else if self.reverse && self.phase < loop_start {
                let under = loop_start - self.phase;
                let loop_len = loop_end - loop_start;
                self.phase = loop_end - under.rem_euclid(loop_len);
            }
        } else {
            // One-shot playback should still respect the selected region (loop_start..loop_end)
            // even when looping is disabled.
            if (!self.reverse && self.phase >= loop_end) || (self.reverse && self.phase < loop_start) {
                self.playing = false;
            }
        }

        out
    }

    pub fn sample_rate(&self) -> f32 {
        self.sample_rate
    }
}

#[derive(Clone)]
pub struct Drive {
    // Simple Tanh
}

impl Drive {
    pub fn new() -> Self { Self {} }
    pub fn process(&self, input: f32, amount: f32) -> f32 {
        let drive = 1.0 + amount * 10.0;
        (input * drive).tanh()
    }
}

#[derive(Clone)]
pub struct Delay {
    buffer: Vec<f32>,
    pos: usize,
    sample_rate: f32,
}

impl Delay {
    pub fn new(sample_rate: f32, max_time_sec: f32) -> Self {
        let size = (sample_rate * max_time_sec) as usize;
        Self {
            buffer: vec![0.0; size],
            pos: 0,
            sample_rate,
        }
    }
    
    pub fn process(&mut self, input: f32, mix: f32, time_sec: f32, feedback: f32) -> f32 {
        if mix <= 0.0 { return input; }
        
        let delay_samples = (time_sec * self.sample_rate).max(1.0).min(self.buffer.len() as f32 - 1.0);
        
        // Linear Interpolation
        let read_pos_f = self.pos as f32 - delay_samples;
        let mut read_idx_i = read_pos_f.floor() as i32;
        let frac = read_pos_f - read_idx_i as f32;
        
        while read_idx_i < 0 { read_idx_i += self.buffer.len() as i32; }
        let read_idx = read_idx_i as usize;
        let next_idx = if read_idx + 1 >= self.buffer.len() { 0 } else { read_idx + 1 };
        
        let s1 = self.buffer[read_idx];
        let s2 = self.buffer[next_idx];
        let delayed = s1 + frac * (s2 - s1);
        
        let out = input + delayed * mix;
        
        let feedback_val = delayed * feedback + input;
        self.buffer[self.pos] = feedback_val; // saturate?
        
        self.pos += 1;
        if self.pos >= self.buffer.len() { self.pos = 0; }
        
        out
    }
}

#[derive(Clone)]
struct Comb {
    buf: Vec<f32>,
    idx: usize,
    feedback: f32,
}

impl Comb {
    fn new(len: usize, feedback: f32) -> Self {
        Self { buf: vec![0.0; len.max(1)], idx: 0, feedback }
    }

    fn set_feedback(&mut self, fb: f32) {
        self.feedback = fb;
    }

    fn process(&mut self, input: f32) -> f32 {
        let out = self.buf[self.idx];
        self.buf[self.idx] = input + out * self.feedback;
        self.idx += 1;
        if self.idx >= self.buf.len() { self.idx = 0; }
        out
    }
}

#[derive(Clone)]
struct Allpass {
    buf: Vec<f32>,
    idx: usize,
    feedback: f32,
}

impl Allpass {
    fn new(len: usize, feedback: f32) -> Self {
        Self { buf: vec![0.0; len.max(1)], idx: 0, feedback }
    }

    fn process(&mut self, input: f32) -> f32 {
        let buf_out = self.buf[self.idx];
        let out = -input + buf_out;
        self.buf[self.idx] = input + buf_out * self.feedback;
        self.idx += 1;
        if self.idx >= self.buf.len() { self.idx = 0; }
        out
    }
}

#[derive(Clone)]
pub struct Reverb {
    combs: Vec<Comb>,
    allpasses: Vec<Allpass>,
    sample_rate: f32,
}

impl Reverb {
    pub fn new(sample_rate: f32) -> Self {
        // Small Schroeder-style reverb tuned for low CPU / small code size.
        let comb_secs = [0.0297, 0.0371, 0.0411, 0.0437];
        let ap_secs = [0.0050, 0.0017];

        let mut combs = Vec::new();
        for &t in &comb_secs {
            combs.push(Comb::new((sample_rate * t) as usize, 0.75));
        }

        let mut allpasses = Vec::new();
        for &t in &ap_secs {
            allpasses.push(Allpass::new((sample_rate * t) as usize, 0.5));
        }

        Self { combs, allpasses, sample_rate }
    }

    pub fn reset(&mut self) {
        for c in &mut self.combs {
            c.buf.fill(0.0);
            c.idx = 0;
        }
        for a in &mut self.allpasses {
            a.buf.fill(0.0);
            a.idx = 0;
        }
    }

    pub fn process(&mut self, input: f32, mix: f32, decay: f32) -> f32 {
        let mix = mix.max(0.0).min(1.0);
        if mix <= 0.0001 { return input; }

        // Map decay into a stable comb feedback range.
        let fb = decay.max(0.0).min(0.98) * 0.85 + 0.1;
        for c in &mut self.combs {
            c.set_feedback(fb);
        }

        let mut wet = 0.0;
        for c in &mut self.combs {
            wet += c.process(input);
        }
        wet *= 0.25;

        for a in &mut self.allpasses {
            wet = a.process(wet);
        }

        input * (1.0 - mix) + wet * mix
    }

    pub fn sample_rate(&self) -> f32 {
        self.sample_rate
    }
}
