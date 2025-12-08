use wasm_bindgen::prelude::*;
use std::f32::consts::PI;

// --- Simple Oscillator ---
#[derive(Copy, Clone)]
enum WaveType {
    Sine = 0,
    Saw = 1,
    Square = 2,
}

impl From<f32> for WaveType {
    fn from(v: f32) -> Self {
        match v as i32 {
            0 => WaveType::Sine,
            1 => WaveType::Saw,
            2 => WaveType::Square,
            _ => WaveType::Sine,
        }
    }
}

struct Oscillator {
    phase: f32,
    sample_rate: f32,
}

impl Oscillator {
    fn new(sample_rate: f32) -> Self {
        Self { phase: 0.0, sample_rate }
    }

    fn next(&mut self, freq: f32, wave: WaveType) -> f32 {
        let increment = freq / self.sample_rate;
        self.phase += increment;
        if self.phase > 1.0 { self.phase -= 1.0; }

        match wave {
            WaveType::Sine => (self.phase * 2.0 * PI).sin(),
            WaveType::Saw => 2.0 * self.phase - 1.0,
            WaveType::Square => if self.phase < 0.5 { 1.0 } else { -1.0 },
        }
    }
}

// --- Envelope (Simple AR) ---
struct Envelope {
    level: f32,
    attack: f32,
    release: f32,
    sample_rate: f32,
}

impl Envelope {
    fn new(sample_rate: f32) -> Self {
        Self { level: 0.0, attack: 0.01, release: 0.2, sample_rate }
    }

    fn next(&mut self, gate: bool) -> f32 {
        let target = if gate { 1.0 } else { 0.0 };
        let coeff = if gate {
            1.0 / (self.attack * self.sample_rate)
        } else {
            1.0 / (self.release * self.sample_rate)
        };
        
        if self.level < target {
            self.level += coeff;
            if self.level > target { self.level = target; }
        } else {
            self.level -= coeff;
            if self.level < target { self.level = target; }
        }
        self.level
    }
}

#[wasm_bindgen]
pub struct BvstSynth {
    osc: Oscillator,
    env: Envelope,
    
    // Params
    freq: f32,
    gate: bool,
    wave_type: WaveType,
}

#[wasm_bindgen]
impl BvstSynth {
    pub fn new(sample_rate: f32) -> BvstSynth {
        BvstSynth {
            osc: Oscillator::new(sample_rate),
            env: Envelope::new(sample_rate),
            freq: 440.0,
            gate: false,
            wave_type: WaveType::Sine,
        }
    }

    pub fn set_param(&mut self, id: u32, value: f32) {
        match id {
            0 => self.freq = value,
            1 => self.gate = value > 0.5,
            2 => self.wave_type = WaveType::from(value),
            // Removed cutoff (ID 3) and resonance (ID 4)
            _ => {}
        }
    }

    pub fn process(&mut self, output: &mut [f32]) {
        for sample in output.iter_mut() {
            let env_val = self.env.next(self.gate);
            
            if env_val < 0.0001 && !self.gate {
                *sample = 0.0;
                continue; 
            }

            let raw = self.osc.next(self.freq, self.wave_type);
            
            *sample = raw * env_val * 0.5; 
        }
    }
}
