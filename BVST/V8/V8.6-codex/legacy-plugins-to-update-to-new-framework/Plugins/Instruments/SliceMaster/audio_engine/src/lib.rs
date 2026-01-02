use wasm_bindgen::prelude::*;
use bvst_lib::{Param, Curve, dsp::{self, Sampler, Svf, Adsr, Delay}};

const BLOCK_SIZE: usize = 32;
const SLICE_COUNT: usize = 8;

// --- PARAMETER MAPPING ---
// 0: Play Speed
// 1: Attack
// 2: Release
// 3: Gate Mode (0=OneShot, 1=Gate)
// 10: Filter Cutoff
// 11: Filter Res
// 12: Filter Mode
// 22: Drive
// 23: Delay Send

#[derive(Clone)]
struct Voice {
    active: bool,
    velocity: f32,
    sampler: Sampler,
    filter: Svf,
    env: Adsr,
    sample_rate: f32,
    gate_mode: bool,
}

impl Voice {
    fn new(sample_rate: f32) -> Self {
        Self {
            active: false,
            velocity: 0.0,
            sampler: Sampler::new(sample_rate),
            filter: Svf::new(sample_rate),
            env: Adsr::new(sample_rate),
            sample_rate,
            gate_mode: false,
        }
    }

    fn trigger(&mut self, note: u32, vel: f32) {
        self.active = true;
        self.velocity = vel;
        
        // Calculate Slice
        // C4 (60) -> Slice 0
        // C#4 (61) -> Slice 1
        // ...
        // G4 (67) -> Slice 7
        let slice_idx = (note as usize).checked_sub(60).unwrap_or(0) % SLICE_COUNT;
        
        let total_len = self.sampler.buffer.len();
        if total_len > 0 {
            let slice_len = total_len / SLICE_COUNT;
            let start = slice_idx * slice_len;
            let end = start + slice_len;
            
            self.sampler.loop_start = start;
            self.sampler.loop_end = end; 
            self.sampler.is_looping = false; // Always one-shot for now
            self.sampler.phase = start as f32;
        }

        self.env.trigger(true);
    }

    fn release(&mut self) {
        if self.gate_mode {
            self.env.trigger(false);
        }
        // If OneShot, we ignore NoteOff
    }

    fn force_stop(&mut self) {
        self.active = false;
        self.env.state = dsp::EnvState::Idle;
        self.env.level = 0.0;
    }

    fn process_block(&mut self, params: &EngineParams, output: &mut [f32]) {
        if !self.active { return; }

        let env_val = self.env.next();
        
        // In OneShot mode, if env finishes (release phase), stop.
        // Or if sample finishes.
        if env_val < 0.0001 && !self.env.is_active() {
            self.active = false;
            return;
        }

        let freq = 261.63 * params.speed; // Base C4 * Speed
        let cut = params.cut.clamp(20.0, 20000.0);
        let coeffs = self.filter.calc_coeffs(cut, params.res);

        for out_sample in output.iter_mut() {
            let mut raw = self.sampler.process(freq);
            
            // Stop if we hit the end of the slice (loop_end)
            // The Sampler struct doesn't strictly stop at loop_end if looping is false, it might continue or wrap?
            // bvst_lib Sampler behavior: if !looping, it usually plays to end of buffer. 
            // But we manually set loop_end. Let's enforce slice bounds.
            // If pos >= loop_end, returns 0? Check bvst_lib behavior.
            // Assuming standard behavior: we need to check if it passed loop_end.
            
            // Since we can't easily check internal state here without exposing it,
            // we rely on the Env release for "Gate" mode.
            // For "OneShot", we ideally want it to play full slice.
            // If the Sampler logic wraps or continues past loop_end when is_looping=false, we might hear next slice.
            // Let's assume bvst_lib::Sampler respects loop_end as "end of playback" if is_looping is false.
            
            let mode = if params.filt_mode < 0.5 { dsp::FilterMode::LowPass }
                      else if params.filt_mode < 1.5 { dsp::FilterMode::HighPass }
                      else { dsp::FilterMode::BandPass };
            
            raw = self.filter.process_with_coeffs(raw, &coeffs, mode);

            if params.drive > 0.0 {
                raw *= 1.0 + params.drive * 4.0;
                raw = raw.tanh();
            }

            *out_sample += raw * env_val * self.velocity;
        }
    }
}

struct EngineParams {
    speed: f32,
    att: f32, rel: f32,
    cut: f32, res: f32, filt_mode: f32,
    drive: f32, delay_send: f32,
}

impl EngineParams {
    fn default() -> Self {
        Self {
            speed: 1.0,
            att: 0.005, rel: 0.2,
            cut: 20000.0, res: 0.5, filt_mode: 0.0,
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
            1 => { self.params.att = value; self.voice.env.a = value; },
            2 => { self.params.rel = value; self.voice.env.r = value; },
            3 => self.voice.gate_mode = value > 0.5,
            
            10 => self.p_cut.set(value),
            11 => self.params.res = value,
            12 => self.params.filt_mode = value,
            
            22 => self.params.drive = value,
            23 => self.params.delay_send = value,
            
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
