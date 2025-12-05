use wasm_bindgen::prelude::*;
use bvst_lib::{Param, Curve, dsp::{self, Oscillator, NoiseGen, Svf, Adsr, Delay, WaveType}};

// --- CONSTANTS ---
const MAX_VOICES: usize = 4;

// --- VOICE ARCHITECTURE ---
#[derive(Clone)]
struct Voice {
    active: bool,
    note: u32,     // MIDI note number
    velocity: f32,
    
    // Sources
    osc1: Oscillator,
    osc2: Oscillator,
    noise: NoiseGen,
    
    // Modulators
    lfo: Oscillator,
    env_amp: Adsr,
    env_mod: Adsr,
    
    // Filter
    filter: Svf,
    
    // State
    sample_rate: f32,
}

impl Voice {
    fn new(sample_rate: f32) -> Self {
        Self {
            active: false, note: 0, velocity: 0.0,
            osc1: Oscillator::new(sample_rate),
            osc2: Oscillator::new(sample_rate),
            noise: NoiseGen::new(),
            lfo: Oscillator::new(sample_rate),
            env_amp: Adsr::new(sample_rate),
            env_mod: Adsr::new(sample_rate),
            filter: Svf::new(sample_rate),
            sample_rate,
        }
    }

    fn trigger(&mut self, note: u32, vel: f32) {
        self.active = true;
        self.note = note;
        self.velocity = vel;
        
        // Reset phases if "Retrigger" is desired, otherwise free-run
        // self.osc1.reset(); 
        // self.osc2.reset();
        
        // Reset Envelopes
        self.env_amp.trigger(true);
        self.env_mod.trigger(true);
    }

    fn release(&mut self) {
        self.env_amp.trigger(false);
        self.env_mod.trigger(false);
    }

    fn process(&mut self, params: &EngineParams) -> f32 {
        if !self.active { return 0.0; }

        // 1. Modulators
        let env_a = self.env_amp.next();
        let env_m = self.env_mod.next();
        let lfo = self.lfo.next_simple(params.lfo_rate, params.lfo_wave); // LFO wave? Default Sine

        // Check if voice finished
        if env_a < 0.0001 && !self.env_amp.is_active() {
            self.active = false;
            return 0.0;
        }

        // 2. Pitch Logic
        // Base freq
        let base_freq = 440.0 * 2.0_f32.powf((self.note as f32 - 69.0) / 12.0);
        
        // LFO Pitch Mod
        let lfo_pitch = lfo * params.lfo_to_pitch * 12.0; // +/- 1 octave range
        
        // Env Pitch Mod (Simple linear FM)
        let env_pitch = env_m * params.env_to_pitch * 1000.0;

        let f1 = base_freq * 2.0_f32.powf((params.osc1_semi + params.osc1_fine + lfo_pitch) / 12.0) + env_pitch;
        let f2 = base_freq * 2.0_f32.powf((params.osc2_semi + params.osc2_fine + lfo_pitch) / 12.0) + env_pitch;

        // 3. Oscillators
        // FM: Osc2 modulates Osc1 Phase? Or simple mix? 
        // Implementing Simple Mix + RingMod for now.
        let o1 = self.osc1.next(f1, params.osc1_wave, params.osc1_pw);
        let o2 = self.osc2.next(f2, params.osc2_wave, params.osc2_pw);
        let n = self.noise.next();

        let mut mix = (o1 * params.mix_osc1) + (o2 * params.mix_osc2) + (n * params.mix_noise);
        
        // 4. Filter
        // Cutoff Mod
        let lfo_cut = lfo * params.lfo_to_cut * 2000.0;
        let env_cut = env_m * params.env_to_cut * 5000.0;
        let cut = dsp::clamp(params.cut + lfo_cut + env_cut, 20.0, 20000.0);
        
        let filt_out = self.filter.process(mix, cut, params.res);
        
        // 5. Amp
        let mut out = filt_out * env_a * self.velocity;
        
        // 6. Drive (Per voice or global? Per voice is richer)
        if params.drive > 0.0 {
            out *= 1.0 + (params.drive * 5.0);
            out = out.tanh();
        }

        out
    }
}

// --- PARAMETER STRUCT ---
// Holds the "Patch" state. Decoupled from voices.
struct EngineParams {
    // Osc 1
    osc1_wave: WaveType, osc1_semi: f32, osc1_fine: f32, osc1_pw: f32,
    // Osc 2
    osc2_wave: WaveType, osc2_semi: f32, osc2_fine: f32, osc2_pw: f32,
    // Mixer
    mix_osc1: f32, mix_osc2: f32, mix_noise: f32,
    // Filter
    cut: f32, res: f32,
    // LFO
    lfo_rate: f32, lfo_wave: WaveType, lfo_to_pitch: f32, lfo_to_cut: f32,
    // Envelopes (ADSR)
    env_amp_a: f32, env_amp_d: f32, env_amp_s: f32, env_amp_r: f32,
    env_mod_a: f32, env_mod_d: f32, env_mod_s: f32, env_mod_r: f32,
    env_to_pitch: f32, env_to_cut: f32,
    // Master
    drive: f32,
}

impl EngineParams {
    fn default() -> Self {
        Self {
            osc1_wave: WaveType::Saw, osc1_semi: 0.0, osc1_fine: 0.0, osc1_pw: 0.5,
            osc2_wave: WaveType::Square, osc2_semi: 0.0, osc2_fine: 0.0, osc2_pw: 0.5,
            mix_osc1: 1.0, mix_osc2: 0.0, mix_noise: 0.0,
            cut: 20000.0, res: 0.5,
            lfo_rate: 1.0, lfo_wave: WaveType::Sine, lfo_to_pitch: 0.0, lfo_to_cut: 0.0,
            env_amp_a: 0.01, env_amp_d: 0.1, env_amp_s: 1.0, env_amp_r: 0.1,
            env_mod_a: 0.01, env_mod_d: 0.1, env_mod_s: 1.0, env_mod_r: 0.1,
            env_to_pitch: 0.0, env_to_cut: 0.0,
            drive: 0.0,
        }
    }
}

// --- MAIN EXPORT ---
#[wasm_bindgen]
pub struct BvstSynth {
    params: EngineParams,
    voices: Vec<Voice>,
    delay: Delay,
    
    // Global Params
    p_delay_time: Param,
    p_delay_mix: Param,
    p_vol: Param,
    
    // Params Helper
    p_cut_smooth: Param,
}

#[wasm_bindgen]
impl BvstSynth {
    pub fn new(sample_rate: f32) -> BvstSynth {
        let mut voices = Vec::with_capacity(MAX_VOICES);
        for _ in 0..MAX_VOICES {
            voices.push(Voice::new(sample_rate));
        }

        BvstSynth {
            params: EngineParams::default(),
            voices,
            delay: Delay::new(sample_rate, 1.0),
            
            p_delay_time: Param::new(Curve::Linear{min:0.,max:1.}, 0.3),
            p_delay_mix: Param::new(Curve::Linear{min:0.,max:0.8}, 0.0),
            p_vol: Param::new(Curve::Squared{min:0.,max:1.}, 0.5),
            
            p_cut_smooth: Param::new(Curve::Exponential{min:20.,max:20000.}, 20000.0),
        }
    }

    pub fn set_param(&mut self, id: u32, value: f32) {
        // MAPPING STANDARD:
        // 0-9: Osc 1
        // 10-19: Osc 2
        // 20-29: Mixer
        // 30-39: Filter
        // 40-49: Amp Env
        // 50-59: Mod Env
        // 60-69: LFO
        // 70-79: FX (Drive, Delay)
        // 100+: Performance (Notes)

        match id {
            // OSC 1
            0 => self.params.osc1_wave = WaveType::from(value),
            1 => self.params.osc1_semi = value,
            2 => self.params.osc1_fine = value,
            3 => self.params.osc1_pw = value,
            
            // OSC 2
            10 => self.params.osc2_wave = WaveType::from(value),
            11 => self.params.osc2_semi = value,
            12 => self.params.osc2_fine = value,
            13 => self.params.osc2_pw = value,
            
            // MIXER
            20 => self.params.mix_osc1 = value,
            21 => self.params.mix_osc2 = value,
            22 => self.params.mix_noise = value,
            
            // FILTER
            30 => self.p_cut_smooth.set(value), // Smoothed
            31 => self.params.res = value,
            32 => self.params.env_to_cut = value,
            33 => self.params.lfo_to_cut = value,
            
            // AMP ENV
            40 => { self.params.env_amp_a = value; self.update_envs(); },
            41 => { self.params.env_amp_d = value; self.update_envs(); },
            42 => { self.params.env_amp_s = value; self.update_envs(); },
            43 => { self.params.env_amp_r = value; self.update_envs(); },
            
            // MOD ENV
            50 => { self.params.env_mod_a = value; self.update_envs(); },
            51 => { self.params.env_mod_d = value; self.update_envs(); },
            52 => { self.params.env_mod_s = value; self.update_envs(); },
            53 => { self.params.env_mod_r = value; self.update_envs(); },
            54 => self.params.env_to_pitch = value,
            
            // LFO
            60 => self.params.lfo_rate = value,
            61 => self.params.lfo_wave = WaveType::from(value),
            62 => self.params.lfo_to_pitch = value,
            
            // FX
            70 => self.params.drive = value,
            71 => self.p_delay_time.set(value),
            72 => self.p_delay_mix.set(value),
            73 => self.p_vol.set(value),
            
            // NOTE HANDLING
            // 26 = Note Freq (Legacy), 27 = Gate. 
            // New Standard: 
            // 128 = Note On (Val = MIDI Note)
            // 129 = Note Off (Val = MIDI Note)
            
            // Legacy Monophonic support (for old sequencers)
            20 | 26 => { // Freq -> convert to note approx?
                // Just trigger Voice 0
                let note = (12.0 * (value / 440.0).log2() + 69.0) as u32;
                if !self.voices[0].active { self.voices[0].trigger(note, 1.0); }
                else { self.voices[0].note = note; } // Slide
            },
            23 | 27 => { // Gate
                if value > 0.5 { /* Handled by Freq usually */ } 
                else { self.voices[0].release(); }
            },
            
            // Polyphonic Support
            128 => { // Note On
                let note = value as u32;
                self.note_on(note, 1.0);
            },
            129 => { // Note Off
                let note = value as u32;
                self.note_off(note);
            },
            
            _ => {}
        }
    }
    
    fn update_envs(&mut self) {
        // Propagate ADSR changes to active voices instantly
        for v in &mut self.voices {
            v.env_amp.a = self.params.env_amp_a;
            v.env_amp.d = self.params.env_amp_d;
            v.env_amp.s = self.params.env_amp_s;
            v.env_amp.r = self.params.env_amp_r;
            
            v.env_mod.a = self.params.env_mod_a;
            v.env_mod.d = self.params.env_mod_d;
            v.env_mod.s = self.params.env_mod_s;
            v.env_mod.r = self.params.env_mod_r;
        }
    }

    fn note_on(&mut self, note: u32, vel: f32) {
        // Voice Stealing: Find inactive, else steal oldest (simplest: just round robin or first found)
        // 1. Try find same note (retrigger)
        for v in &mut self.voices {
            if v.active && v.note == note {
                v.trigger(note, vel);
                return;
            }
        }
        // 2. Find inactive
        for v in &mut self.voices {
            if !v.active {
                v.trigger(note, vel);
                return;
            }
        }
        // 3. Steal (just take index 0 for now, cyclic logic is better but complex for this snippet)
        self.voices[0].trigger(note, vel);
    }

    fn note_off(&mut self, note: u32) {
        for v in &mut self.voices {
            if v.active && v.note == note {
                v.release();
            }
        }
    }

    pub fn process(&mut self, output: &mut [f32]) {
        for sample in output.iter_mut() {
            // Process Global Params
            self.params.cut = self.p_cut_smooth.process();
            let d_time = self.p_delay_time.process();
            let d_mix = self.p_delay_mix.process();
            let vol = self.p_vol.process();
            
            // Sum Voices
            let mut sum = 0.0;
            for v in &mut self.voices {
                sum += v.process(&self.params);
            }
            
            // Global FX
            let wet = self.delay.process(sum, d_time, d_mix);
            
            *sample = wet * vol;
        }
    }
}