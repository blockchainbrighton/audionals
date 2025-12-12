use wasm_bindgen::prelude::*;
use bvst_lib::{bvst_plugin, Param, Curve, dsp::{self, Oscillator, Svf, Adsr, WaveType, FilterMode}};

// --- CONSTANTS ---
const MAX_VOICES: usize = 6;
const BLOCK_SIZE: usize = 32;

// --- VOICE ---
#[derive(Clone)]
struct Voice {
    active: bool,
    note: u32,
    velocity: f32,
    
    // Sources
    osc1: Oscillator,
    osc2: Oscillator,
    osc3: Oscillator,
    
    // Filters (2x SVF for 24dB slope)
    filter1: Svf,
    filter2: Svf,
    
    // Envelopes
    env_filter: Adsr,
    env_amp: Adsr,
    
    sample_rate: f32,
}

impl Voice {
    fn new(sample_rate: f32) -> Self {
        Self {
            active: false, note: 0, velocity: 0.0,
            osc1: Oscillator::new(sample_rate),
            osc2: Oscillator::new(sample_rate),
            osc3: Oscillator::new(sample_rate),
            filter1: Svf::new(sample_rate),
            filter2: Svf::new(sample_rate),
            env_filter: Adsr::new(sample_rate),
            env_amp: Adsr::new(sample_rate),
            sample_rate,
        }
    }

    fn trigger(&mut self, note: u32, vel: f32) {
        self.active = true;
        self.note = note;
        self.velocity = vel;
        self.env_filter.trigger(true);
        self.env_amp.trigger(true);
        self.osc1.reset();
        self.osc2.reset();
        self.osc3.reset();
    }

    fn release(&mut self) {
        self.env_filter.trigger(false);
        self.env_amp.trigger(false);
    }

    fn process_block(&mut self, params: &EngineParams, output: &mut [f32]) {
        if !self.active { return; }

        let env_f = self.env_filter.next();
        let env_a = self.env_amp.next();

        if env_a < 0.0001 && !self.env_amp.is_active() {
            self.active = false;
            return;
        }

        let base_freq = dsp::mtof(self.note as f32);
        let f1 = base_freq * 2.0_f32.powf(params.osc1_coarse / 12.0 + params.osc1_fine / 1200.0);
        let f2 = base_freq * 2.0_f32.powf(params.osc2_coarse / 12.0 + params.osc2_fine / 1200.0);
        let f3 = base_freq * 2.0_f32.powf(params.osc3_coarse / 12.0 + params.osc3_fine / 1200.0);

        let mod_cut = params.cutoff + (env_f * params.filter_env_amt);
        let final_cut = mod_cut.clamp(20.0, 20000.0);
        
        let coeffs = self.filter1.calc_coeffs(final_cut, params.res);

        for out in output.iter_mut() {
            let o1 = self.osc1.next(f1, WaveType::from(params.osc1_wave), 0.5);
            let o2 = self.osc2.next(f2, WaveType::from(params.osc2_wave), 0.5);
            let o3 = self.osc3.next(f3, WaveType::from(params.osc3_wave), 0.5);

            let mix = (o1 * params.mix1) + (o2 * params.mix2) + (o3 * params.mix3);

            let f1_out = self.filter1.process_with_coeffs(mix, &coeffs, FilterMode::LowPass);
            let f2_out = self.filter2.process_with_coeffs(f1_out, &coeffs, FilterMode::LowPass);

            *out += f2_out * env_a * params.volume * self.velocity;
        }
    }
}

// --- PARAMS ---
struct EngineParams {
    osc1_wave: f32, osc1_coarse: f32, osc1_fine: f32,
    osc2_wave: f32, osc2_coarse: f32, osc2_fine: f32,
    osc3_wave: f32, osc3_coarse: f32, osc3_fine: f32,
    mix1: f32, mix2: f32, mix3: f32,
    cutoff: f32, res: f32, filter_env_amt: f32,
    volume: f32,
}

bvst_plugin! {
    struct BvstSynth {
        voices: Vec<Voice>,
    }

    init_fields (sample_rate) {
        voices = (0..MAX_VOICES).map(|_| Voice::new(sample_rate)).collect()
    }

    params {
        1:  p_osc1_wave   = Linear(0.0, 5.0, 1.0), // Saw
        2:  p_osc1_coarse = Linear(-24.0, 24.0, 0.0),
        3:  p_osc1_fine   = Linear(-100.0, 100.0, 0.0),
        
        4:  p_osc2_wave   = Linear(0.0, 5.0, 2.0), // Square
        5:  p_osc2_coarse = Linear(-24.0, 24.0, 0.0),
        6:  p_osc2_fine   = Linear(-100.0, 100.0, 0.0),
        
        7:  p_osc3_wave   = Linear(0.0, 5.0, 1.0),
        8:  p_osc3_coarse = Linear(-36.0, 12.0, -12.0),
        9:  p_osc3_fine   = Linear(-100.0, 100.0, 0.0),
        
        10: p_mix1        = Linear(0.0, 1.0, 0.7),
        11: p_mix2        = Linear(0.0, 1.0, 0.7),
        12: p_mix3        = Linear(0.0, 1.0, 0.0),
        
        13: p_cutoff      = Exponential(20.0, 12000.0, 2000.0),
        14: p_res         = Linear(0.0, 25.0, 0.0),
        15: p_env_amt     = Linear(0.0, 5000.0, 1500.0),
        
        16: p_adsr_a      = Exponential(0.001, 2.0, 0.01),
        17: p_adsr_d      = Exponential(0.01, 2.0, 0.2),
        18: p_adsr_s      = Linear(0.0, 1.0, 0.2),
        19: p_adsr_r      = Exponential(0.01, 5.0, 0.2),
        
        20: p_ar_a        = Exponential(0.001, 2.0, 0.01),
        21: p_ar_r        = Exponential(0.01, 5.0, 0.1),
        
        22: p_vol         = Linear(0.0, 1.0, 0.8),
    }

    impl BvstSynth {
        fn custom_param(&mut self, id: u32, value: f32) {
            match id {
                128 => self.note_on(value as u32, 1.0),
                129 => self.note_off(value as u32),
                _ => {}
            }
        }

        pub fn process(&mut self, _input_l: &[f32], _input_r: &[f32], output_l: &mut [f32], output_r: &mut [f32]) {
            // Update Params
            let params = EngineParams {
                osc1_wave: self.p_osc1_wave.process(),
                osc1_coarse: self.p_osc1_coarse.process(),
                osc1_fine: self.p_osc1_fine.process(),
                osc2_wave: self.p_osc2_wave.process(),
                osc2_coarse: self.p_osc2_coarse.process(),
                osc2_fine: self.p_osc2_fine.process(),
                osc3_wave: self.p_osc3_wave.process(),
                osc3_coarse: self.p_osc3_coarse.process(),
                osc3_fine: self.p_osc3_fine.process(),
                mix1: self.p_mix1.process(),
                mix2: self.p_mix2.process(),
                mix3: self.p_mix3.process(),
                cutoff: self.p_cutoff.process(),
                res: self.p_res.process(),
                filter_env_amt: self.p_env_amt.process(),
                volume: self.p_vol.process(),
            };

            let adsr_a = self.p_adsr_a.process();
            let adsr_d = self.p_adsr_d.process();
            let adsr_s = self.p_adsr_s.process();
            let adsr_r = self.p_adsr_r.process();

            let ar_a = self.p_ar_a.process();
            let ar_r = self.p_ar_r.process();
            
            for v in &mut self.voices {
                v.env_filter.a = adsr_a;
                v.env_filter.d = adsr_d;
                v.env_filter.s = adsr_s;
                v.env_filter.r = adsr_r;

                v.env_amp.a = ar_a;
                v.env_amp.d = 0.01; // AR only has A/R, so D/S are fixed
                v.env_amp.s = 1.0;
                v.env_amp.r = ar_r;
            }

            for x in output_l.iter_mut() { *x = 0.0; }
            for x in output_r.iter_mut() { *x = 0.0; }

            let mut block_idx = 0;
            while block_idx < output_l.len() {
                let end = (block_idx + BLOCK_SIZE).min(output_l.len());
                let mut mix_buf = [0.0; BLOCK_SIZE];
                
                for voice in &mut self.voices {
                    voice.process_block(&params, &mut mix_buf[0..(end - block_idx)]);
                }

                for (i, val) in mix_buf[0..(end - block_idx)].iter().enumerate() {
                    output_l[block_idx + i] = *val;
                    output_r[block_idx + i] = *val;
                }
                
                block_idx += BLOCK_SIZE;
            }
        }

        fn note_on(&mut self, note: u32, velocity: f32) {
            for v in &mut self.voices {
                if !v.active {
                    v.trigger(note, velocity);
                    return;
                }
            }
            if let Some(v) = self.voices.get_mut(0) {
                 v.trigger(note, velocity);
            }
        }

        fn note_off(&mut self, note: u32) {
            for v in &mut self.voices {
                if v.active && v.note == note {
                    v.release();
                }
            }
        }
    }
}
            5 => self.p_osc2_coarse.set(to_norm(value, -24.0, 24.0)),
            6 => self.p_osc2_fine.set(to_norm(value, -100.0, 100.0)),
            
            7 => self.p_osc3_wave.set(to_norm(value, 0.0, 5.0)),
            8 => self.p_osc3_coarse.set(to_norm(value, -36.0, 12.0)),
            9 => self.p_osc3_fine.set(to_norm(value, -100.0, 100.0)),
            
            10 => self.p_mix1.set(to_norm(value, 0.0, 1.0)),
            11 => self.p_mix2.set(to_norm(value, 0.0, 1.0)),
            12 => self.p_mix3.set(to_norm(value, 0.0, 1.0)),
            
            13 => self.p_cutoff.set(to_norm(value, 20.0, 12000.0)),
            14 => self.p_res.set(to_norm(value, 0.0, 25.0)),
            15 => self.p_env_amt.set(to_norm(value, 0.0, 5000.0)),
            
            16 => self.p_adsr_a.set(to_norm(value, 0.001, 2.0)),
            17 => self.p_adsr_d.set(to_norm(value, 0.01, 2.0)),
            18 => self.p_adsr_s.set(to_norm(value, 0.0, 1.0)),
            19 => self.p_adsr_r.set(to_norm(value, 0.01, 5.0)),
            
            20 => self.p_ar_a.set(to_norm(value, 0.001, 2.0)),
            21 => self.p_ar_r.set(to_norm(value, 0.01, 5.0)),
            
            22 => self.p_vol.set(to_norm(value, 0.0, 1.0)),
            
            // MIDI HANDLING
            128 => self.note_on(value as u32, 1.0),
            129 => self.note_off(value as u32),

            _ => {}
        }
    }

    pub fn process(&mut self, _input_l: &[f32], _input_r: &[f32], output_l: &mut [f32], output_r: &mut [f32]) {
        let params = EngineParams {
            osc1_wave: self.p_osc1_wave.process(), osc1_coarse: self.p_osc1_coarse.process(), osc1_fine: self.p_osc1_fine.process(),
            osc2_wave: self.p_osc2_wave.process(), osc2_coarse: self.p_osc2_coarse.process(), osc2_fine: self.p_osc2_fine.process(),
            osc3_wave: self.p_osc3_wave.process(), osc3_coarse: self.p_osc3_coarse.process(), osc3_fine: self.p_osc3_fine.process(),
            mix1: self.p_mix1.process(), mix2: self.p_mix2.process(), mix3: self.p_mix3.process(),
            cutoff: self.p_cutoff.process(), res: self.p_res.process(), filter_env_amt: self.p_env_amt.process(),
            volume: self.p_vol.process(),
        };

        // Envelopes
        let fa = self.p_adsr_a.process(); let fd = self.p_adsr_d.process(); let fs = self.p_adsr_s.process(); let fr = self.p_adsr_r.process();
        let aa = self.p_ar_a.process(); let ar = self.p_ar_r.process();

        for v in &mut self.voices {
            v.env_filter.a = fa; v.env_filter.d = fd; v.env_filter.s = fs; v.env_filter.r = fr;
            v.env_amp.a = aa; v.env_amp.d = 0.0; v.env_amp.s = 1.0; v.env_amp.r = ar; // AR means Sustain=100% until release
        }

        // Clear output
        output_l.fill(0.0);
        output_r.fill(0.0);

        // Process
        let mut block_idx = 0;
        while block_idx < output_l.len() {
            let end = (block_idx + BLOCK_SIZE).min(output_l.len());
            let mut mix_buf = [0.0; BLOCK_SIZE];
            
            for voice in &mut self.voices {
                voice.process_block(&params, &mut mix_buf[0..(end - block_idx)]);
            }

            for (i, val) in mix_buf[0..(end - block_idx)].iter().enumerate() {
                output_l[block_idx + i] = *val;
                output_r[block_idx + i] = *val;
            }
            
            block_idx += BLOCK_SIZE;
        }
    }

    pub fn note_on(&mut self, note: u32, velocity: f32) {
        for v in &mut self.voices {
            if !v.active { v.trigger(note, velocity); return; }
        }
        self.voices[0].trigger(note, velocity);
    }
    
    pub fn note_off(&mut self, note: u32) {
        for v in &mut self.voices {
            if v.active && v.note == note { v.release(); }
        }
    }
}