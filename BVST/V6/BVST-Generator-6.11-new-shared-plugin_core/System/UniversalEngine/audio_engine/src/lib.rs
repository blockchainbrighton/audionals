use wasm_bindgen::prelude::*;
use bvst_lib::{Param, Curve, dsp::{self, Oscillator, NoiseGen, Svf, SvfCoeffs, Adsr, Delay, WaveType}};

// --- CONSTANTS ---
const MAX_VOICES: usize = 4;
const BLOCK_SIZE: usize = 32;

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
        self.env_amp.trigger(true);
        self.env_mod.trigger(true);
    }

    fn release(&mut self) {
        self.env_amp.trigger(false);
        self.env_mod.trigger(false);
    }

    // Optimized Block Processing
    // Calculates Control Rate (LFO, Envs, Filter Coeffs) once per block
    // Then runs Audio Rate loop
    fn process_block(&mut self, params: &EngineParams, input: &[f32], output: &mut [f32]) {
        if !self.active { return; }

        // --- CONTROL RATE (Once per block) ---
        let env_a = self.env_amp.next(); // Stepped Envelope
        let env_m = self.env_mod.next();
        let lfo = self.lfo.next_simple(params.lfo_rate, params.lfo_wave);

        if env_a < 0.0001 && !self.env_amp.is_active() {
            self.active = false;
            return;
        }

        // Pitch
        let base_freq = 440.0 * 2.0_f32.powf((self.note as f32 - 69.0) / 12.0);
        let lfo_pitch = lfo * params.lfo_to_pitch * 12.0;
        let env_pitch = env_m * params.env_to_pitch * 1000.0;
        
        // Pre-calc frequencies for this block
        let f1 = base_freq * 2.0_f32.powf((params.osc1_semi + params.osc1_fine + lfo_pitch) / 12.0) + env_pitch;
        let f2 = base_freq * 2.0_f32.powf((params.osc2_semi + params.osc2_fine + lfo_pitch) / 12.0) + env_pitch;

        // Filter Coeffs
        let lfo_cut = lfo * params.lfo_to_cut * 2000.0;
        let env_cut = env_m * params.env_to_cut * 5000.0;
        let cut = dsp::clamp(params.cut + lfo_cut + env_cut, 20.0, 20000.0);
        
        // Calculate expensive tan() only once here!
        let filter_coeffs = self.filter.calc_coeffs(cut, params.res);

        // --- AUDIO RATE LOOP ---
        for (i, out_sample) in output.iter_mut().enumerate() {
            let in_sample = if i < input.len() { input[i] } else { 0.0 };
            
            // Oscillators (must run per sample to maintain phase continuity)
            let o1 = self.osc1.next(f1, params.osc1_wave, params.osc1_pw);
            let o2 = self.osc2.next(f2, params.osc2_wave, params.osc2_pw);
            let n = self.noise.next();

            let mix = (o1 * params.mix_osc1) + (o2 * params.mix_osc2) + (n * params.mix_noise) + (in_sample * params.mix_input);
            
            // Filter using pre-calced coeffs
            let filt_out = self.filter.process_with_coeffs(mix, &filter_coeffs, dsp::FilterMode::LowPass);
            
            let mut val = filt_out * env_a * self.velocity;
            
            if params.drive > 0.0 {
                val *= 1.0 + (params.drive * 5.0);
                val = val.tanh();
            }
            
            // Accumulate to output buffer (polyphony sum)
            *out_sample += val;
        }
    }
}

// --- PARAMETER STRUCT ---
struct EngineParams {
    osc1_wave: WaveType, osc1_semi: f32, osc1_fine: f32, osc1_pw: f32,
    osc2_wave: WaveType, osc2_semi: f32, osc2_fine: f32, osc2_pw: f32,
    mix_osc1: f32, mix_osc2: f32, mix_noise: f32, mix_input: f32,
    cut: f32, res: f32,
    lfo_rate: f32, lfo_wave: WaveType, lfo_to_pitch: f32, lfo_to_cut: f32,
    env_amp_a: f32, env_amp_d: f32, env_amp_s: f32, env_amp_r: f32,
    env_mod_a: f32, env_mod_d: f32, env_mod_s: f32, env_mod_r: f32,
    env_to_pitch: f32, env_to_cut: f32,
    drive: f32,
}

impl EngineParams {
    fn default() -> Self {
        Self {
            osc1_wave: WaveType::Saw, osc1_semi: 0.0, osc1_fine: 0.0, osc1_pw: 0.5,
            osc2_wave: WaveType::Square, osc2_semi: 0.0, osc2_fine: 0.0, osc2_pw: 0.5,
            mix_osc1: 1.0, mix_osc2: 0.0, mix_noise: 0.0, mix_input: 0.0,
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
    p_delay_feedback: Param,
    p_vol: Param,
    p_cut_smooth: Param,
    
    // Scratch buffers for block processing
    block_in_l: Vec<f32>,
    block_in_r: Vec<f32>, // Reserved for stereo input processing
    block_out_l: Vec<f32>,
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
            p_delay_feedback: Param::new(Curve::Linear{min:0.,max:0.95}, 0.4),
            p_vol: Param::new(Curve::Squared{min:0.,max:1.}, 0.5),
            p_cut_smooth: Param::new(Curve::Exponential{min:20.,max:20000.}, 20000.0),
            
            block_in_l: vec![0.0; BLOCK_SIZE],
            block_in_r: vec![0.0; BLOCK_SIZE],
            block_out_l: vec![0.0; BLOCK_SIZE],
        }
    }

    pub fn set_param(&mut self, id: u32, value: f32) {
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
            23 => self.params.mix_input = value, 
            
            // FILTER
            30 => self.p_cut_smooth.set(value), 
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
            74 => self.p_delay_feedback.set(value),
            
            // PERFORMANCE
            26 => { // Legacy Freq
                let note = (12.0 * (value / 440.0).log2() + 69.0) as u32;
                if !self.voices[0].active { self.voices[0].trigger(note, 1.0); }
                else { self.voices[0].note = note; }
            },
            27 => { // Legacy Gate
                 if value <= 0.5 { self.voices[0].release(); }
            },
            128 => self.note_on(value as u32, 1.0),
            129 => self.note_off(value as u32),
            
            _ => {}
        }
    }
    
    fn update_envs(&mut self) {
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
        for v in &mut self.voices {
            if v.active && v.note == note { v.trigger(note, vel); return; }
        }
        for v in &mut self.voices {
            if !v.active { v.trigger(note, vel); return; }
        }
        self.voices[0].trigger(note, vel);
    }

    fn note_off(&mut self, note: u32) {
        for v in &mut self.voices {
            if v.active && v.note == note { v.release(); }
        }
    }

    // STEREO PROCESS with Control Rate Block Processing
    pub fn process(&mut self, input_l: &[f32], input_r: &[f32], output_l: &mut [f32], output_r: &mut [f32]) {
        let len = output_l.len();
        
        // Iterate in Blocks
        for chunk_start in (0..len).step_by(BLOCK_SIZE) {
            let chunk_end = (chunk_start + BLOCK_SIZE).min(len);
            let chunk_len = chunk_end - chunk_start;
            
            // 1. Global Control Updates (Once per block)
            self.params.cut = self.p_cut_smooth.process();
            let d_time = self.p_delay_time.process();
            let d_mix = self.p_delay_mix.process();
            let d_fb = self.p_delay_feedback.process();
            let vol = self.p_vol.process();

            // 2. Prepare Block Buffers
            // Zero out the accumulator for this block
            for i in 0..chunk_len { self.block_out_l[i] = 0.0; }
            
            // Copy inputs to scratch (handle bounds)
            for i in 0..chunk_len {
                 self.block_in_l[i] = if (chunk_start + i) < input_l.len() { input_l[chunk_start + i] } else { 0.0 };
                 // self.block_in_r[i] = ... (UniversalEngine is mono-voice, stereo-FX currently, but ready for stereo in)
            }

            // 3. Process Voices (Accumulate into block_out_l)
            let sub_in_l = &self.block_in_l[0..chunk_len];
            let sub_out_l = &mut self.block_out_l[0..chunk_len];
            
            for v in &mut self.voices {
                v.process_block(&self.params, sub_in_l, sub_out_l);
            }

            // 4. Global FX (Delay) & Output Write
            // Delay processes per-sample in the loop, but we can run it on the block buffer
            for i in 0..chunk_len {
                let dry = sub_out_l[i];
                let wet = self.delay.process(dry, d_time, d_fb, d_mix);
                let final_val = wet * vol;
                
                // Write to Main Output
                output_l[chunk_start + i] = final_val;
                // Mono -> Stereo copy (Delay is mono for now, but could be dual)
                if (chunk_start + i) < output_r.len() {
                     output_r[chunk_start + i] = final_val;
                }
            }
        }
    }
}

