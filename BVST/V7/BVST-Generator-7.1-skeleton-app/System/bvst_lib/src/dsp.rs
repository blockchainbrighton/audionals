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
        self.phase = (self.phase + inc) % 1.0;
        
        match shape {
            WaveType::Sin => (self.phase * 2.0 * PI).sin(),
            WaveType::Saw => 2.0 * self.phase - 1.0,
            WaveType::Square => if self.phase < 0.5 { 1.0 } else { -1.0 },
            WaveType::Pulse => if self.phase < 0.25 { 1.0 } else { -1.0 }, // Fixed width for simple
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
        // Simple LCG
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

    pub fn process(&mut self, input: f32, cutoff: f32, q: f32) -> f32 {
        let g = (PI * cutoff / self.sample_rate).tan();
        let k = 1.0 / q;
        let a1 = 1.0 / (1.0 + g * (g + k));
        let a2 = g * a1;
        let a3 = g * a2;
        
        let v3 = input - self.ic2eq;
        let v1 = a1 * self.ic1eq + a2 * v3;
        let v2 = self.ic2eq + a2 * self.ic1eq + a3 * v3;
        
        self.ic1eq = 2.0 * v1 - self.ic1eq;
        self.ic2eq = 2.0 * v2 - self.ic2eq;
        
        // Lowpass output
        v2
    }
}

#[derive(Clone)]
pub struct Adsr {
    pub a: f32,
    pub d: f32,
    pub s: f32,
    pub r: f32,
    state: u8, // 0:Idle, 1:A, 2:D, 3:S, 4:R
    val: f32,
    sample_rate: f32,
}

impl Adsr {
    pub fn new(sample_rate: f32) -> Self {
        Self { a: 0.1, d: 0.1, s: 1.0, r: 0.1, state: 0, val: 0.0, sample_rate }
    }
    
    pub fn trigger(&mut self, on: bool) {
        if on {
            self.state = 1; // Attack
        } else {
            if self.state != 0 {
                self.state = 4; // Release
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
                let inc = 1.0 / (self.a * self.sample_rate + 1.0);
                self.val += inc;
                if self.val >= 1.0 { self.val = 1.0; self.state = 2; }
            },
            2 => {
                let inc = (1.0 - self.s) / (self.d * self.sample_rate + 1.0);
                self.val -= inc;
                if self.val <= self.s { self.val = self.s; self.state = 3; }
            },
            3 => { self.val = self.s; },
            4 => {
                let inc = self.val / (self.r * self.sample_rate + 1.0);
                self.val -= inc;
                if self.val <= 0.0001 { self.val = 0.0; self.state = 0; }
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
pub struct Drive {
    // Simple Tanh
}

impl Drive {
    pub fn new() -> Self { Self {} }
    pub fn process(&self, input: f32, amount: f32) -> f32 {
        // Amount 0..1
        // boost signal then saturate
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
        
        // Simple read pointer
        let read_pos_f = self.pos as f32 - delay_samples;
        let mut read_idx = read_pos_f as i32;
        if read_idx < 0 { read_idx += self.buffer.len() as i32; }
        let read_idx = read_idx as usize;
        
        // Linear interpolation could be added here, but nearest neighbor for now for simplicity/speed
        let delayed = self.buffer[read_idx];
        
        let out = input + delayed * mix;
        
        // Write back with feedback
        let feedback_val = delayed * feedback + input;
        self.buffer[self.pos] = feedback_val;
        
        self.pos += 1;
        if self.pos >= self.buffer.len() { self.pos = 0; }
        
        out
    }
}
