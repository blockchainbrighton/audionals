use wasm_bindgen::prelude::*;
use bvst_lib::{Param, Curve};
use bvst_lib::dsp::{self, Oscillator, Svf, Adsr, Delay, Reverb, WaveType};

#[derive(Clone)]
struct Voice {
    active: bool, note: u8,
    osc1: Oscillator, osc2: Oscillator, sub: Oscillator,
    amp_env: Adsr, filt_env: Adsr, filter: Svf,
    curr_freq: f32, target_freq: f32,
    velocity: f32,
}

impl Voice {
    fn new(sr: f32) -> Self {
        Self {
            active: false, note: 0,
            osc1: Oscillator::new(sr), osc2: Oscillator::new(sr), sub: Oscillator::new(sr),
            amp_env: Adsr::new(sr), filt_env: Adsr::new(sr), filter: Svf::new(sr),
            curr_freq: 440.0, target_freq: 440.0,
            velocity: 0.0,
        }
    }
    fn trigger(&mut self, note: u8, vel: f32) {
        self.note = note;
        self.velocity = vel;
        self.active = true;
        self.target_freq = 440.0 * 2.0_f32.powf((note as f32 - 69.0) / 12.0);
        if !self.amp_env.is_active() { self.curr_freq = self.target_freq; }
        self.amp_env.trigger(true);
        self.filt_env.trigger(true);
    }
    fn release(&mut self) {
        self.amp_env.trigger(false);
        self.filt_env.trigger(false);
    }
    fn process(&mut self, _sr: f32, vals: &ProcessedParams) -> f32 {
        if !self.active { return 0.0; }
        
        if vals.glide > 0.0 {
            let diff = self.target_freq - self.curr_freq;
            // Simple lerp for glide frame-by-frame approx
            self.curr_freq += diff * (0.005 / (vals.glide + 0.001));
        } else {
            self.curr_freq = self.target_freq;
        }
        
        let env_a = self.amp_env.next();
        let env_f = self.filt_env.next();
        
        if env_a <= 0.0 && !self.amp_env.is_active() {
            self.active = false;
            return 0.0;
        }
        
        let detune = 2.0_f32.powf((vals.detune - 0.5) * 0.1);
        
        let w = WaveType::from(vals.osc_type);
        let o1 = self.osc1.next(self.curr_freq, w, vals.pwm);
        let o2 = self.osc2.next(self.curr_freq * detune, w, vals.pwm);
        let sub = self.sub.next(self.curr_freq * 0.5, WaveType::Square, 0.5);
        
        let raw = (o1 + o2) * 0.5 * (1.0 - vals.osc_mix) + (o2 * vals.osc_mix) + sub * vals.sub_level;
        // Actually logic above for mix is arbitrary, let's just mix them.
        
        let cut = dsp::clamp(vals.cutoff + env_f * vals.filt_env_amt, 20.0, 18000.0);
        let filtered = self.filter.process(raw, cut, vals.res);
        
        filtered * env_a * self.velocity
    }
}

struct ProcessedParams {
    detune: f32, sub_level: f32, pwm: f32, glide: f32,
    cutoff: f32, res: f32, filt_env_amt: f32, osc_mix: f32, osc_type: f32,
}

struct Params {
    detune: Param, sub_level: Param, pwm: Param, glide: Param,
    cutoff: Param, res: Param, filt_env_amt: Param,
    osc_mix: Param, 
    delay_wet: Param, delay_time: Param, reverb_wet: Param, vol: Param,
}

#[wasm_bindgen]
pub struct BvstSynth {
    sample_rate: f32,
    voices: Vec<Voice>,
    params: Params,
    delay: Delay,
    reverb: Reverb,
    next_vel: f32,
    osc_type: f32,
}

#[wasm_bindgen]
impl BvstSynth {
    pub fn new(sample_rate: f32) -> BvstSynth {
        let mut voices = Vec::new();
        for _ in 0..8 { voices.push(Voice::new(sample_rate)); }
        
        BvstSynth {
            sample_rate,
            voices,
            params: Params {
                detune: Param::new(Curve::Linear{min:0.,max:1.}, 0.5),
                sub_level: Param::new(Curve::Linear{min:0.,max:1.}, 0.0),
                pwm: Param::new(Curve::Linear{min:0.1,max:0.9}, 0.5),
                glide: Param::new(Curve::Linear{min:0.,max:0.5}, 0.0),
                cutoff: Param::new(Curve::Exponential{min:20.,max:12000.}, 0.5),
                res: Param::new(Curve::Linear{min:0.1,max:10.}, 0.1),
                filt_env_amt: Param::new(Curve::Linear{min:0.,max:5000.}, 2500.0),
                osc_mix: Param::new(Curve::Linear{min:0.,max:1.}, 0.5),
                delay_wet: Param::new(Curve::Linear{min:0.,max:1.}, 0.0),
                delay_time: Param::new(Curve::Linear{min:0.,max:1.}, 0.2),
                reverb_wet: Param::new(Curve::Linear{min:0.,max:1.}, 0.0),
                vol: Param::new(Curve::Squared{min:0.,max:1.}, 0.5),
            },
            delay: Delay::new(sample_rate, 1.0),
            reverb: Reverb::new(sample_rate),
            next_vel: 1.0,
            osc_type: 0.0,
        }
    }

    pub fn set_param(&mut self, id: u32, val: f32) {
        match id {
            0 => self.params.cutoff.set(val),
            1 => self.params.res.set(val),
            2 => {}, // Drive (not impl)
            3 => { for v in &mut self.voices { v.amp_env.a = val; } },
            4 => { for v in &mut self.voices { v.amp_env.d = val; } },
            5 => { for v in &mut self.voices { v.amp_env.s = val; } },
            6 => { for v in &mut self.voices { v.amp_env.r = val; } },
            7 => self.params.filt_env_amt.set(val),
            8 => {}, // LFO Rate
            9 => {}, // LFO Depth
            10 => self.params.glide.set(val),
            11 => self.params.detune.set(val),
            12 => self.params.osc_mix.set(val),
            13 => self.params.sub_level.set(val),
            14 => self.params.delay_wet.set(val),
            15 => self.params.delay_time.set(val),
            16 => self.params.reverb_wet.set(val),
            18 => self.osc_type = val,
            
            21 => self.note_on(val as u8, self.next_vel),
            22 => self.note_off(val as u8),
            20 => self.all_notes_off(),
            25 => self.next_vel = val,
            _ => {}
        }
    }

    fn note_on(&mut self, note: u8, vel: f32) {
        for v in &mut self.voices {
            if !v.active { v.trigger(note, vel); return; }
        }
        // Steal first
        self.voices[0].trigger(note, vel);
    }
    fn note_off(&mut self, note: u8) {
        for v in &mut self.voices {
            if v.active && v.note == note { v.release(); }
        }
    }
    fn all_notes_off(&mut self) {
        for v in &mut self.voices { v.active = false; }
    }

    pub fn process(&mut self, output: &mut [f32]) {
        for sample in output.iter_mut() {
            let vals = ProcessedParams {
                detune: self.params.detune.process(),
                sub_level: self.params.sub_level.process(),
                pwm: self.params.pwm.process(),
                glide: self.params.glide.process(),
                cutoff: self.params.cutoff.process(),
                res: self.params.res.process(),
                filt_env_amt: self.params.filt_env_amt.process(),
                osc_mix: self.params.osc_mix.process(),
                osc_type: self.osc_type,
            };
            let v_d_wet = self.params.delay_wet.process();
            let v_d_time = self.params.delay_time.process();
            let v_r_wet = self.params.reverb_wet.process();
            let v_vol = self.params.vol.process();

            let mut mix = 0.0;
            for v in &mut self.voices {
                mix += v.process(self.sample_rate, &vals);
            }
            mix *= 0.25;

            let d_out = self.delay.process(mix, v_d_time, v_d_wet);
            mix = d_out;
            
            let r_out = self.reverb.process(mix, v_r_wet);
            mix = r_out;
            
            *sample = mix * v_vol;
        }
    }
}