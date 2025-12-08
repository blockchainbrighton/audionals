use wasm_bindgen::prelude::*;
use bvst_lib::{Param, Curve, dsp::{self, Oscillator, Svf, Adsr, Reverb, Delay, WaveType}};

// Polyphony constant
const VOICES: usize = 4;

#[derive(Clone)]
struct Voice {
    active: bool,
    note: u32,
    osc1: Oscillator,
    osc2: Oscillator,
    filter: Svf,
    env: Adsr,
    lfo_pwm: Oscillator,
}

impl Voice {
    fn new(sample_rate: f32) -> Self {
        Self {
            active: false, note: 0,
            osc1: Oscillator::new(sample_rate),
            osc2: Oscillator::new(sample_rate),
            filter: Svf::new(sample_rate),
            env: Adsr::new(sample_rate),
            lfo_pwm: Oscillator::new(sample_rate),
        }
    }
    
    fn trigger(&mut self, note: u32) {
        self.active = true;
        self.note = note;
        self.env.trigger(true);
    }
    
    fn release(&mut self) {
        self.env.trigger(false);
    }
    
    fn process(&mut self, params: &SynthParams, sample_rate: f32) -> f32 {
        if !self.active { return 0.0; }
        
        let env_val = self.env.next();
        if env_val < 0.0001 && !self.env.is_active() {
            self.active = false;
            return 0.0;
        }
        
        let freq = 440.0 * 2.0_f32.powf((self.note as f32 - 69.0) / 12.0);
        
        // PWM LFO
        let pwm = 0.5 + 0.4 * self.lfo_pwm.next_simple(params.pwm_rate, WaveType::Triangle);
        
        // Osc 1 (Saw) & Osc 2 (Pulse with PWM)
        // Detune Osc 2 slightly
        let f2 = freq * params.detune; 
        
        let o1 = self.osc1.next_simple(freq, WaveType::Saw);
        let o2 = self.osc2.next(f2, WaveType::Pulse, pwm);
        
        let mix = (o1 + o2) * 0.5;
        
        // Filter (Lowpass)
        let cut = dsp::clamp(params.cutoff + (env_val * params.env_amt), 20.0, 18000.0);
        let filtered = self.filter.process(mix, cut, 0.5);
        
        filtered * env_val
    }
}

struct SynthParams {
    cutoff: f32, env_amt: f32,
    pwm_rate: f32, detune: f32,
    chorus_rate: f32, chorus_depth: f32,
    verb_mix: f32, verb_size: f32,
    vol: f32,
    
    // Env
    att: f32, dec: f32, sus: f32, rel: f32,
}

#[wasm_bindgen]
pub struct BvstSynth {
    voices: Vec<Voice>,
    params: SynthParams,
    
    // Global FX
    chorus_lfo: Oscillator,
    chorus_delay: Delay, // Short delay for chorus
    reverb: Reverb,
    
    // Param Objects
    p_cut: Param, p_env_amt: Param,
    p_pwm_rate: Param, p_detune: Param,
    p_chorus_mix: Param, p_verb_mix: Param,
    p_vol: Param,
    p_att: Param, p_rel: Param,
    
    sample_rate: f32,
}

#[wasm_bindgen]
impl BvstSynth {
    pub fn new(sample_rate: f32) -> BvstSynth {
        let mut voices = Vec::with_capacity(VOICES);
        for _ in 0..VOICES { voices.push(Voice::new(sample_rate)); }
        
        BvstSynth {
            voices,
            params: SynthParams { 
                cutoff: 2000.0, env_amt: 1000.0, pwm_rate: 0.5, detune: 1.01,
                chorus_rate: 0.5, chorus_depth: 0.002,
                verb_mix: 0.3, verb_size: 0.8, vol: 0.5,
                att: 1.0, dec: 2.0, sus: 0.5, rel: 2.0,
            },
            chorus_lfo: Oscillator::new(sample_rate),
            chorus_delay: Delay::new(sample_rate, 0.05), // 50ms max
            reverb: Reverb::new(sample_rate),
            
            p_cut: Param::new(Curve::Exponential{min:200.,max:10000.}, 2000.),
            p_env_amt: Param::new(Curve::Linear{min:0.,max:5000.}, 1000.),
            p_pwm_rate: Param::new(Curve::Linear{min:0.1,max:5.}, 0.5),
            p_detune: Param::new(Curve::Linear{min:1.0,max:1.05}, 1.01),
            p_chorus_mix: Param::new(Curve::Linear{min:0.,max:1.}, 0.5),
            p_verb_mix: Param::new(Curve::Linear{min:0.,max:0.8}, 0.3),
            p_vol: Param::new(Curve::Squared{min:0.,max:1.}, 0.5),
            p_att: Param::new(Curve::Linear{min:0.01,max:3.0}, 1.0),
            p_rel: Param::new(Curve::Linear{min:0.1,max:5.0}, 2.0),
            
            sample_rate,
        }
    }

    pub fn set_param(&mut self, id: u32, value: f32) {
        match id {
            1 => self.p_cut.set(value),
            2 => self.p_env_amt.set(value),
            3 => self.p_pwm_rate.set(value),
            4 => self.p_detune.set(value), // Scaled 0-1 to 1.0-1.05 in param? No, define param correctly.
            
            5 => self.p_chorus_mix.set(value),
            6 => self.p_verb_mix.set(value),
            7 => self.p_vol.set(value),
            
            8 => self.p_att.set(value),
            9 => self.p_rel.set(value),
            
            128 => self.note_on(value as u32),
            129 => self.note_off(value as u32),
            
            // Legacy
            26 => self.note_on(((12.0 * (value / 440.0).log2() + 69.0) as u32)),
            27 => if value < 0.5 { self.all_notes_off() },
            
            _ => {}
        }
    }
    
    fn note_on(&mut self, note: u32) {
        // Steal oldest or empty
        for v in &mut self.voices {
            if !v.active { v.trigger(note); return; }
        }
        self.voices[0].trigger(note);
    }
    
    fn note_off(&mut self, note: u32) {
        for v in &mut self.voices {
            if v.active && v.note == note { v.release(); }
        }
    }
    
    fn all_notes_off(&mut self) {
        for v in &mut self.voices { v.release(); }
    }

    pub fn process(&mut self, output: &mut [f32]) {
        for sample in output.iter_mut() {
            // 1. Update Params
            self.params.cutoff = self.p_cut.process();
            self.params.env_amt = self.p_env_amt.process();
            self.params.pwm_rate = self.p_pwm_rate.process();
            self.params.detune = self.p_detune.process();
            let c_mix = self.p_chorus_mix.process();
            let v_mix = self.p_verb_mix.process();
            let vol = self.p_vol.process();
            
            // Update Env settings on voices (simple)
            let a = self.p_att.process();
            let r = self.p_rel.process();
            for v in &mut self.voices { v.env.a = a; v.env.r = r; v.env.d = a; v.env.s = 0.8; }

            // 2. Voice Sum
            let mut sum = 0.0;
            for v in &mut self.voices {
                sum += v.process(&self.params, self.sample_rate);
            }
            
            // 3. Chorus (Modulated Delay)
            // Time modulates between 10ms and 15ms
            let lfo = self.chorus_lfo.next_simple(0.5, WaveType::Sine);
            let delay_time = 0.010 + (0.005 * (lfo * 0.5 + 0.5)); 
            let chorus_sig = self.chorus_delay.process(sum, delay_time, 0.0, 1.0); // Full wet delay
            
            let chorused = dsp::lerp(sum, chorus_sig, c_mix);
            
            // 4. Reverb
            let wet = self.reverb.process(chorused, v_mix, 0.85);
            
            *sample = wet * vol;
        }
    }
}
