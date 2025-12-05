use wasm_bindgen::prelude::*;
use std::f32::consts::PI;

// --- UTILS ---
fn clamp(v: f32, min: f32, max: f32) -> f32 {
    if v < min { min } else if v > max { max } else { v }
}

fn lerp(a: f32, b: f32, t: f32) -> f32 {
    a + (b - a) * t
}

// --- OSCILLATOR ---
#[derive(Copy, Clone, PartialEq)]
enum WaveType {
    Saw = 0,
    Square = 1,
    Triangle = 2,
}

impl From<f32> for WaveType {
    fn from(v: f32) -> Self {
        match v as i32 {
            0 => WaveType::Saw,
            1 => WaveType::Square,
            2 => WaveType::Triangle,
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
            WaveType::Triangle => {
                let mut t = -1.0 + (2.0 * self.phase) * 2.0;
                if t > 1.0 { t = 2.0 - t; }
                t
            },
        }
    }
}

// --- ENVELOPE ---
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
            state: EnvState::Idle, level: 0.0, sample_rate,
            a: 0.01, d: 0.1, s: 1.0, r: 0.1,
        }
    }

    fn trigger(&mut self, gate: bool) {
        if gate {
            if self.state == EnvState::Idle || self.state == EnvState::Release {
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
}

// --- SVF FILTER ---
struct SvfFilter {
    ic1eq: f32, ic2eq: f32, sample_rate: f32,
}

impl SvfFilter {
    fn new(sample_rate: f32) -> Self { Self { ic1eq: 0.0, ic2eq: 0.0, sample_rate } }
    fn next(&mut self, input: f32, cutoff: f32, q: f32) -> f32 {
        let g = (PI * (cutoff / self.sample_rate)).tan();
        let k = 1.0 / clamp(q, 0.1, 10.0);
        let a1 = 1.0 / (1.0 + g * (g + k));
        let a2 = g * a1;
        let a3 = g * a2;
        let v3 = input - self.ic2eq;
        let v1 = a1 * self.ic1eq + a2 * v3;
        let v2 = self.ic2eq + a2 * self.ic1eq + a3 * v3;
        self.ic1eq = 2.0 * v1 - self.ic1eq;
        self.ic2eq = 2.0 * v2 - self.ic2eq;
        v2
    }
}

// --- DELAY ---
struct Delay {
    buffer: Vec<f32>, pos: usize, len: usize,
}
impl Delay {
    fn new(sample_rate: f32) -> Self {
        let len = (sample_rate * 1.0) as usize; // Max 1s
        Self { buffer: vec![0.0; len], pos: 0, len }
    }
    fn next(&mut self, input: f32, time_norm: f32, wet: f32) -> f32 {
        let delay_samps = (time_norm * (self.sample_rate() * 0.8)).max(1.0) as usize;
        let read_pos = (self.pos + self.len - delay_samps) % self.len;
        let delayed = self.buffer[read_pos];
        
        let new_val = input + (delayed * 0.4); // 40% feedback fixed
        self.buffer[self.pos] = new_val;
        
        self.pos += 1;
        if self.pos >= self.len { self.pos = 0; }
        
        lerp(input, delayed, wet)
    }
    fn sample_rate(&self) -> f32 { self.len as f32 } // Hacky access
}

// --- REVERB (Simple Schroeder-ish Allpass Loop) ---
struct Reverb {
    // Simplified: Just a long delay with high feedback for now to save code space
    buffer: Vec<f32>, pos: usize, len: usize,
}
impl Reverb {
    fn new(sample_rate: f32) -> Self {
        let len = (sample_rate * 0.15) as usize; // 150ms loop
        Self { buffer: vec![0.0; len], pos: 0, len }
    }
    fn next(&mut self, input: f32, wet: f32) -> f32 {
        let read_pos = self.pos;
        let delayed = self.buffer[read_pos];
        
        // High feedback diffusion
        let new_val = input + (delayed * 0.7);
        self.buffer[self.pos] = new_val;
        
        self.pos += 1;
        if self.pos >= self.len { self.pos = 0; }
        
        lerp(input, delayed, wet)
    }
}


#[wasm_bindgen]
pub struct BvstSynth {
    sample_rate: f32,
    
    osc: Oscillator,
    sub_osc: Oscillator,
    lfo: Oscillator,
    
    amp_env: Adsr,
    filt_env: Adsr,
    filter: SvfFilter,
    
    delay: Delay,
    reverb: Reverb,
    
    // Params
    p_cutoff: f32, p_res: f32, p_drive: f32,
    p_env_amt: f32,
    p_lfo_rate: f32, p_lfo_depth: f32,
    p_glide: f32,
    p_detune: f32,
    p_osc_mix: f32,
    p_sub_level: f32,
    
    p_delay_wet: f32, p_delay_time: f32,
    p_reverb_wet: f32,
    
    p_osc_type: WaveType,
    
    // State
    base_freq: f32,
    curr_freq: f32,
    gate: bool,
    velocity: f32,
    pitch_bend: f32,
    mod_wheel: f32,
}

#[wasm_bindgen]
impl BvstSynth {
    pub fn new(sample_rate: f32) -> BvstSynth {
        BvstSynth {
            sample_rate,
            osc: Oscillator::new(sample_rate),
            sub_osc: Oscillator::new(sample_rate),
            lfo: Oscillator::new(sample_rate),
            amp_env: Adsr::new(sample_rate),
            filt_env: Adsr::new(sample_rate),
            filter: SvfFilter::new(sample_rate),
            delay: Delay::new(sample_rate),
            reverb: Reverb::new(sample_rate),
            
            p_cutoff: 0.8, p_res: 0.1, p_drive: 0.2,
            p_env_amt: 0.5,
            p_lfo_rate: 0.5, p_lfo_depth: 0.0,
            p_glide: 0.1,
            p_detune: 0.5,
            p_osc_mix: 0.5,
            p_sub_level: 0.0,
            p_delay_wet: 0.0, p_delay_time: 0.2,
            p_reverb_wet: 0.0,
            p_osc_type: WaveType::Saw,
            
            base_freq: 440.0, curr_freq: 440.0,
            gate: false, velocity: 1.0,
            pitch_bend: 0.0, mod_wheel: 0.0,
        }
    }

    pub fn set_param(&mut self, id: u32, value: f32) {
        match id {
            0 => self.p_cutoff = value,
            1 => self.p_res = value,
            2 => self.p_drive = value,
            
            3 => self.amp_env.a = value,
            4 => self.amp_env.d = value,
            5 => self.amp_env.s = value,
            6 => self.amp_env.r = value,
            
            7 => self.p_env_amt = value,
            
            8 => self.p_lfo_rate = value,
            9 => self.p_lfo_depth = value,
            10 => self.p_glide = value,
            11 => self.p_detune = value,
            12 => self.p_osc_mix = value,
            13 => self.p_sub_level = value,
            
            14 => self.p_delay_wet = value,
            15 => self.p_delay_time = value,
            16 => self.p_reverb_wet = value,
            // 17 Width (Ignored in Mono)
            
            18 => self.p_osc_type = WaveType::from(value),
            
            19 => { // Freq
                self.base_freq = value;
                if self.p_glide == 0.0 { self.curr_freq = value; }
            },
            20 => { // Gate
                self.gate = value > 0.5;
                self.amp_env.trigger(self.gate);
                self.filt_env.trigger(self.gate);
            },
            21 => self.velocity = value,
            22 => self.pitch_bend = value,
            23 => self.mod_wheel = value,
            
            _ => {}
        }
    }

    pub fn process(&mut self, output: &mut [f32]) {
        for sample in output.iter_mut() {
            // 1. LFO
            let lfo_val = self.lfo.next(self.p_lfo_rate * 20.0, WaveType::Triangle);
            
            // 2. Pitch
            if self.p_glide > 0.0 {
                 let diff = self.base_freq - self.curr_freq;
                 let step = diff * (1.0 / (self.p_glide * self.sample_rate * 0.5 + 1.0));
                 self.curr_freq += step;
            } else {
                 self.curr_freq = self.base_freq;
            }
            
            let bend_factor = 2.0_f32.powf(self.pitch_bend * 2.0 / 12.0); // 2 semitones
            let lfo_pitch_mod = 2.0_f32.powf(lfo_val * self.p_lfo_depth * 0.1); // Slight vibrato
            let final_freq = self.curr_freq * bend_factor * lfo_pitch_mod;
            
            // 3. Osc
            // Detune logic: detune spreads main osc slightly? Or just detune param?
            // Let's use p_detune (0-1) to be +/- 50 cents
            let detune_cents = (self.p_detune - 0.5) * 100.0;
            let detune_factor = 2.0_f32.powf(detune_cents / 1200.0);
            
            let osc_out = self.osc.next(final_freq * detune_factor, self.p_osc_type);
            let sub_out = self.sub_osc.next(final_freq * 0.5, WaveType::Square); // Sub is Square -1oct
            
            // Mix (oscMix here will act as a crossfade or just level? JS used Chorus. Let's just use it as Osc Level)
            // Wait, standard mix usually means Osc1 vs Osc2. Here we have 1 Osc.
            // Let's make p_osc_mix be a "Chorus" effect simulation (Vibrato delay).
            // Actually simpler: Just Volume for now.
            let mix = osc_out + (sub_out * self.p_sub_level);
            
            // 4. Filter
            let env_f = self.filt_env.next();
            // Map 0-1 cutoff to 20-12000 Hz exponentially
            let cut_base = 20.0 * (600.0_f32).powf(self.p_cutoff); // 12000/20 = 600
            let env_mod = env_f * self.p_env_amt * 5000.0;
            let drive_mod = self.p_drive * 2000.0; // Drive opens filter more?
            let final_cut = clamp(cut_base + env_mod + drive_mod, 20.0, 18000.0);
            
            let mut filt_out = self.filter.next(mix, final_cut, self.p_res * 10.0);
            
            // Drive (Distortion)
            if self.p_drive > 0.0 {
                filt_out = filt_out * (1.0 + self.p_drive * 5.0);
                filt_out = filt_out.tanh();
            }
            
            // 5. Amp
            let env_a = self.amp_env.next();
            let mut out = filt_out * env_a * self.velocity;
            
            // 6. FX
            let d_out = self.delay.next(out, self.p_delay_time, self.p_delay_wet);
            out = lerp(out, d_out, self.p_delay_wet);
            
            let r_out = self.reverb.next(out, self.p_reverb_wet);
            out = lerp(out, r_out, self.p_reverb_wet);
            
            *sample = out * 0.5; // Master gain
        }
    }
}
