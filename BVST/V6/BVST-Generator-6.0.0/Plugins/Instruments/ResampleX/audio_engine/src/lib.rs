use wasm_bindgen::prelude::*;
use bvst_lib::{Param, Curve, dsp::{self, Sampler, Svf, Adsr, Delay}};

const BLOCK_SIZE: usize = 32;

// --- PARAMETER MAPPING ---
// 0: Play Speed
// 1: Loop Start
// 2: Loop End
// 3: Loop Enable
// 4: Bit Depth (1.0 - 16.0)
// 5: Sample Rate Redux (1.0 - 50.0 factor)
// 10: Filter Cutoff
// 11: Filter Res
// 12: Filter Mode
// 20: Amp Attack
// 21: Amp Release
// 22: Drive
// 23: Delay Send

#[derive(Clone)]
struct Voice {
    active: bool,
    note: u32,
    velocity: f32,
    sampler: Sampler,
    filter: Svf,
    env: Adsr,
    sample_rate: f32,
    seek_pos: f32,
    
    // Resampler State
    phaser: f32,
    last_sample: f32,
}

impl Voice {
    fn new(sample_rate: f32) -> Self {
        Self {
            active: false,
            note: 0, 
            velocity: 0.0,
            sampler: Sampler::new(sample_rate),
            filter: Svf::new(sample_rate),
            env: Adsr::new(sample_rate),
            sample_rate,
            seek_pos: -1.0,
            phaser: 0.0,
            last_sample: 0.0,
        }
    }

    fn trigger(&mut self, note: u32, vel: f32) {
        self.active = true;
        self.note = note;
        self.velocity = vel;
        self.sampler.trigger();
        if self.seek_pos >= 0.0 {
            self.sampler.seek(self.seek_pos);
            self.seek_pos = -1.0;
        }
        self.env.trigger(true);
    }

    fn release(&mut self) {
        self.env.trigger(false);
    }

    fn force_stop(&mut self) {
        self.active = false;
        self.env.state = dsp::EnvState::Idle;
        self.env.level = 0.0;
    }

    fn process_block(&mut self, params: &EngineParams, output: &mut [f32]) {
        if !self.active { return; }

        let env_val = self.env.next();
        if env_val < 0.0001 && !self.env.is_active() {
            self.active = false;
            return;
        }

        // Pitch Calc
        let note_ratio = 2.0_f32.powf((self.note as f32 - 60.0) / 12.0);
        let total_speed = params.speed * note_ratio;
        let freq = 261.63 * total_speed;

        // Filter Coeffs
        let cut = params.cut.clamp(20.0, 20000.0);
        let coeffs = self.filter.calc_coeffs(cut, params.res);

        // Loop Points
        let total_len = self.sampler.buffer.len();
        if total_len > 0 {
            self.sampler.loop_start = (params.loop_start * total_len as f32) as usize;
            let mut end = (params.loop_end * total_len as f32) as usize;
            if end <= self.sampler.loop_start { end = self.sampler.loop_start + 1; }
            if end > total_len { end = total_len; }
            self.sampler.loop_end = end;
            self.sampler.is_looping = params.loop_enabled;
        }

        // Bit Crush Helper
        let steps = 2.0_f32.powf(params.bits);
        let step_inv = 1.0 / steps;

        for out_sample in output.iter_mut() {
            // Redux (Sample Rate Reduction)
            self.phaser += 1.0;
            if self.phaser >= params.redux {
                self.phaser -= params.redux;
                
                // Get new sample
                let mut raw = self.sampler.process(freq);
                
                // Bit Crush
                if params.bits < 16.0 {
                    raw = (raw * steps).floor() * step_inv;
                }
                
                self.last_sample = raw;
            }
            
            let mut processed = self.last_sample;

            // Filter
            let mode = if params.filt_mode < 0.5 { dsp::FilterMode::LowPass }
                      else if params.filt_mode < 1.5 { dsp::FilterMode::HighPass }
                      else { dsp::FilterMode::BandPass };
            
            processed = self.filter.process_with_coeffs(processed, &coeffs, mode);

            // Drive
            if params.drive > 0.0 {
                processed *= 1.0 + params.drive * 4.0;
                processed = processed.tanh();
            }

            *out_sample += processed * env_val * self.velocity;
        }
    }
}

struct EngineParams {
    speed: f32,
    loop_start: f32, loop_end: f32, loop_enabled: bool,
    bits: f32, redux: f32,
    cut: f32, res: f32, filt_mode: f32,
    att: f32, rel: f32,
    drive: f32, delay_send: f32,
}

impl EngineParams {
    fn default() -> Self {
        Self {
            speed: 1.0,
            loop_start: 0.0, loop_end: 1.0, loop_enabled: false,
            bits: 16.0, redux: 1.0,
            cut: 20000.0, res: 0.5, filt_mode: 0.0,
            att: 0.01, rel: 0.5,
            drive: 0.0, delay_send: 0.0
        }
    }
}

#[wasm_bindgen]
pub struct BvstSynth {
    params: EngineParams,
    voice: Voice,
    delay: Delay,
    p_cut: Param,
    block_out: Vec<f32>,
}

#[wasm_bindgen]
impl BvstSynth {
    pub fn new(sample_rate: f32) -> BvstSynth {
        BvstSynth {
            params: EngineParams::default(),
            voice: Voice::new(sample_rate),
            delay: Delay::new(sample_rate, 1.0),
            p_cut: Param::new(Curve::Exponential{min:20., max:20000.}, 20000.0),
            block_out: vec![0.0; BLOCK_SIZE],
        }
    }

    pub fn load_sample(&mut self, data: &[f32]) {
        self.voice.sampler.load(data);
    }

    pub fn set_param(&mut self, id: u32, value: f32) {
        match id {
            0 => self.params.speed = value,
            1 => self.params.loop_start = value,
            2 => self.params.loop_end = value,
            3 => self.params.loop_enabled = value > 0.5,
            
            4 => self.params.bits = value,
            5 => self.params.redux = value,

            10 => self.p_cut.set(value),
            11 => self.params.res = value,
            12 => self.params.filt_mode = value,
            
            20 => { self.params.att = value; self.voice.env.a = value; },
            21 => { self.params.rel = value; self.voice.env.r = value; },
            22 => self.params.drive = value,
            23 => self.params.delay_send = value,
            
            30 => {
                self.voice.seek_pos = value;
                if self.voice.active {
                    self.voice.sampler.seek(value);
                    self.voice.seek_pos = -1.0;
                }
            },

            128 => self.voice.trigger(value as u32, 1.0),
            129 => self.voice.release(),
            130 => self.voice.force_stop(),
            
            _ => {}
        }
    }

    pub fn process(&mut self, _in_l: &[f32], _in_r: &[f32], output_l: &mut [f32], output_r: &mut [f32]) {
        let len = output_l.len();
        for chunk_start in (0..len).step_by(BLOCK_SIZE) {
            let chunk_end = (chunk_start + BLOCK_SIZE).min(len);
            let chunk_len = chunk_end - chunk_start;

            self.params.cut = self.p_cut.process();
            for i in 0..chunk_len { self.block_out[i] = 0.0; }
            
            let sub_out = &mut self.block_out[0..chunk_len];
            self.voice.process_block(&self.params, sub_out);

            for i in 0..chunk_len {
                let dry = sub_out[i];
                let wet = self.delay.process(dry, 0.4, 0.5, self.params.delay_send);
                output_l[chunk_start+i] = wet;
                if (chunk_start+i) < output_r.len() {
                    output_r[chunk_start+i] = wet;
                }
            }
        }
    }
}
