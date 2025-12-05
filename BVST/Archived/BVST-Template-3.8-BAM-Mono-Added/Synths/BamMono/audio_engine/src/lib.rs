use wasm_bindgen::prelude::*;
use std::f32::consts::PI;

// --- UTILS ---
fn clamp(v: f32, min: f32, max: f32) -> f32 {
    if v < min { min } else if v > max { max } else { v }
}

// --- OSCILLATOR ---
#[derive(Copy, Clone, PartialEq)]
enum WaveType {
    Saw = 0,
    Square = 1,
    Pulse = 2,
    Triangle = 3,
    Noise = 4, // Internal use
}

impl From<f32> for WaveType {
    fn from(v: f32) -> Self {
        match v as i32 {
            0 => WaveType::Saw,
            1 => WaveType::Square,
            2 => WaveType::Pulse,
            3 => WaveType::Triangle,
            _ => WaveType::Saw,
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
            WaveType::Saw => 2.0 * self.phase - 1.0,
            WaveType::Square => if self.phase < 0.5 { 1.0 } else { -1.0 },
            WaveType::Pulse => if self.phase < 0.25 { 1.0 } else { -1.0 }, // Fixed 25% pulse
            WaveType::Triangle => {
                let mut t = -1.0 + (2.0 * self.phase) * 2.0;
                if t > 1.0 { t = 2.0 - t; }
                t
            },
            WaveType::Noise => 0.0, // Handled separately
        }
    }
}

// --- LCG NOISE ---
struct NoiseGen {
    seed: u32,
}
impl NoiseGen {
    fn next(&mut self) -> f32 {
        self.seed = self.seed.wrapping_mul(1664525).wrapping_add(1013904223);
        (self.seed as f32 / u32::MAX as f32) * 2.0 - 1.0
    }
}

// --- ADSR ENVELOPE ---
#[derive(Clone, Copy, PartialEq)]
enum EnvState { Idle, Attack, Decay, Sustain, Release }

struct Adsr {
    state: EnvState,
    level: f32,
    sample_rate: f32,
    a: f32, d: f32, s: f32, r: f32,
}

impl Adsr {
    fn new(sample_rate: f32) -> Self {
        Self {
            state: EnvState::Idle,
            level: 0.0,
            sample_rate,
            a: 0.01, d: 0.1, s: 1.0, r: 0.1,
        }
    }

    fn trigger(&mut self, gate: bool) {
        if gate {
            if let EnvState::Idle | EnvState::Release = self.state {
                self.state = EnvState::Attack;
            }
        } else {
            if self.state != EnvState::Idle {
                self.state = EnvState::Release;
            }
        }
    }

    fn next(&mut self) -> f32 {
        match self.state {
            EnvState::Idle => { self.level = 0.0; },
            EnvState::Attack => {
                let step = 1.0 / (self.a * self.sample_rate).max(1.0);
                self.level += step;
                if self.level >= 1.0 {
                    self.level = 1.0;
                    self.state = EnvState::Decay;
                }
            },
            EnvState::Decay => {
                let step = 1.0 / (self.d * self.sample_rate).max(1.0);
                self.level -= step;
                if self.level <= self.s {
                    self.level = self.s;
                    self.state = EnvState::Sustain;
                }
            },
            EnvState::Sustain => {
                self.level = self.s;
            },
            EnvState::Release => {
                let step = 1.0 / (self.r * self.sample_rate).max(1.0);
                self.level -= step;
                if self.level <= 0.0 {
                    self.level = 0.0;
                    self.state = EnvState::Idle;
                }
            },
        }
        self.level
    }
}

// --- SVF FILTER ---
struct SvfFilter {
    ic1eq: f32,
    ic2eq: f32,
    sample_rate: f32,
}

impl SvfFilter {
    fn new(sample_rate: f32) -> Self {
        Self { ic1eq: 0.0, ic2eq: 0.0, sample_rate }
    }

    fn next(&mut self, input: f32, cutoff: f32, q: f32) -> f32 {
        let g = (PI * (cutoff / self.sample_rate)).tan();
        let k = 1.0 / clamp(q, 0.1, 10.0); // Q from 0.1 to 10
        let a1 = 1.0 / (1.0 + g * (g + k));
        let a2 = g * a1;
        let a3 = g * a2;
        
        let v3 = input - self.ic2eq;
        let v1 = a1 * self.ic1eq + a2 * v3;
        let v2 = self.ic2eq + a2 * self.ic1eq + a3 * v3;
        
        self.ic1eq = 2.0 * v1 - self.ic1eq;
        self.ic2eq = 2.0 * v2 - self.ic2eq;
        
        v2 // Lowpass output
    }
}

// --- DELAY ---
struct SimpleDelay {
    buffer: Vec<f32>,
    pos: usize,
    len: usize,
}

impl SimpleDelay {
    fn new(sample_rate: f32, ms: f32) -> Self {
        let len = (sample_rate * (ms / 1000.0)) as usize;
        Self {
            buffer: vec![0.0; len],
            pos: 0,
            len,
        }
    }

    fn next(&mut self, input: f32, feedback: f32) -> f32 {
        if self.len == 0 { return input; }
        
        let out = self.buffer[self.pos];
        let new_val = input + (out * feedback);
        self.buffer[self.pos] = new_val;
        
        self.pos += 1;
        if self.pos >= self.len { self.pos = 0; }
        
        out
    }
}


// --- MAIN SYNTH STRUCT ---
#[wasm_bindgen]
pub struct BvstSynth {
    sample_rate: f32,
    
    // Components
    osc1: Oscillator,
    osc2: Oscillator,
    noise: NoiseGen,
    lfo: Oscillator, // Reusing osc for LFO
    
    amp_env: Adsr,
    filt_env: Adsr,
    
    filter: SvfFilter,
    delay: SimpleDelay,
    
    // Params
    // Osc
    p_o1_wave: WaveType, p_o1_oct: f32, p_o1_tune: f32,
    p_o2_wave: WaveType, p_o2_oct: f32, p_o2_tune: f32,
    
    // Mix
    p_mix1: f32, p_mix2: f32, p_mix_noise: f32,
    
    // Filt
    p_cut: f32, p_res: f32, p_filt_env_amt: f32,
    
    // Mod
    p_lfo_rate: f32, p_lfo_amt: f32, p_glide: f32,
    
    // FX
    p_dist: f32, p_delay_wet: f32, p_vol: f32,
    
    // Performance
    base_freq: f32,
    curr_freq: f32, // For glide
    gate: bool,
    velocity: f32,
}

#[wasm_bindgen]
impl BvstSynth {
    pub fn new(sample_rate: f32) -> BvstSynth {
        BvstSynth {
            sample_rate,
            osc1: Oscillator::new(sample_rate),
            osc2: Oscillator::new(sample_rate),
            noise: NoiseGen { seed: 12345 },
            lfo: Oscillator::new(sample_rate),
            
            amp_env: Adsr::new(sample_rate),
            filt_env: Adsr::new(sample_rate),
            filter: SvfFilter::new(sample_rate),
            delay: SimpleDelay::new(sample_rate, 300.0), // Fixed 300ms for now
            
            p_o1_wave: WaveType::Saw, p_o1_oct: 0.0, p_o1_tune: 0.0,
            p_o2_wave: WaveType::Square, p_o2_oct: -1.0, p_o2_tune: 7.0, // Detuned default
            
            p_mix1: 1.0, p_mix2: 0.5, p_mix_noise: 0.0,
            
            p_cut: 2000.0, p_res: 1.0, p_filt_env_amt: 2000.0,
            
            p_lfo_rate: 5.0, p_lfo_amt: 0.0, p_glide: 0.0,
            
            p_dist: 0.0, p_delay_wet: 0.0, p_vol: 0.5,
            
            base_freq: 440.0, curr_freq: 440.0,
            gate: false, velocity: 1.0,
        }
    }

    pub fn set_param(&mut self, id: u32, value: f32) {
        match id {
            // OSC 1
            0 => self.p_o1_wave = WaveType::from(value),
            1 => self.p_o1_oct = value,
            2 => self.p_o1_tune = value, // Cents
            
            // OSC 2
            3 => self.p_o2_wave = WaveType::from(value),
            4 => self.p_o2_oct = value,
            5 => self.p_o2_tune = value,
            
            // MIX
            6 => self.p_mix1 = value,
            7 => self.p_mix2 = value,
            8 => self.p_mix_noise = value,
            
            // FILTER
            9 => self.p_cut = value,
            10 => self.p_res = value + 0.1, // ensure non-zero
            11 => self.p_filt_env_amt = value,
            
            // AMP ENV
            12 => self.amp_env.a = value,
            13 => self.amp_env.d = value,
            14 => self.amp_env.s = value,
            15 => self.amp_env.r = value,
            
            // FILT ENV
            16 => self.filt_env.a = value,
            17 => self.filt_env.d = value,
            18 => self.filt_env.s = value,
            19 => self.filt_env.r = value,
            
            // MOD
            20 => self.p_lfo_rate = value,
            21 => self.p_lfo_amt = value,
            22 => self.p_glide = value,
            
            // FX
            23 => self.p_dist = value,
            24 => self.p_delay_wet = value,
            25 => self.p_vol = value,
            
            // PERF
            26 => {
                self.base_freq = value;
                if self.p_glide == 0.0 { self.curr_freq = value; }
            },
            27 => {
                self.gate = value > 0.5;
                self.amp_env.trigger(self.gate);
                self.filt_env.trigger(self.gate);
            },
            28 => self.velocity = value,
            
            _ => {}
        }
    }

    pub fn process(&mut self, output: &mut [f32]) {
        for sample in output.iter_mut() {
            // 0. Glide
            if self.p_glide > 0.0 {
                let diff = self.base_freq - self.curr_freq;
                // Simple exp approach: move 10% per buffer? No, per sample is too slow for linear, need exp
                // Simple linear approximation for MVP:
                let step = diff * (1.0 / (self.p_glide * self.sample_rate + 1.0));
                self.curr_freq += step;
            } else {
                self.curr_freq = self.base_freq;
            }

            // 1. Modulators
            let lfo_val = self.lfo.next(self.p_lfo_rate, WaveType::Triangle); // -1 to 1
            let env_a = self.amp_env.next();
            let env_f = self.filt_env.next();
            
            if env_a < 0.0001 && !self.gate {
                *sample = 0.0;
                continue;
            }
            
            // 2. Oscillators
            // Cents to Ratio: 2^(cents/1200)
            let detune1 = 2.0_f32.powf(self.p_o1_tune / 1200.0);
            let freq1 = self.curr_freq * 2.0_f32.powf(self.p_o1_oct) * detune1;
            
            let detune2 = 2.0_f32.powf(self.p_o2_tune / 1200.0);
            let freq2 = self.curr_freq * 2.0_f32.powf(self.p_o2_oct) * detune2;
            
            let o1 = self.osc1.next(freq1, self.p_o1_wave);
            let o2 = self.osc2.next(freq2, self.p_o2_wave);
            let ns = self.noise.next();
            
            // 3. Mixer
            let mix = (o1 * self.p_mix1) + (o2 * self.p_mix2) + (ns * self.p_mix_noise);
            
            // 4. Filter
            let mut cut = self.p_cut + (env_f * self.p_filt_env_amt) + (lfo_val * self.p_lfo_amt);
            cut = clamp(cut, 20.0, 15000.0);
            let filtered = self.filter.next(mix, cut, self.p_res);
            
            // 5. Distortion (Simple soft clip)
            let mut wet = filtered;
            if self.p_dist > 0.0 {
                 wet = wet * (1.0 + self.p_dist * 5.0);
                 wet = wet.tanh();
            }
            
            // 6. VCA
            let mut out = wet * env_a * self.velocity; // Vel sensitive
            
            // 7. Delay
            let d_out = self.delay.next(out, 0.5); // fixed feedback 0.5
            out = out + (d_out * self.p_delay_wet);

            // 8. Master Vol
            *sample = out * self.p_vol;
        }
    }
}