use wasm_bindgen::prelude::*;
use bvst_lib::{Param, Curve, dsp::{self, Oscillator, Svf, Adsr, Delay, WaveType}};
use web_sys::console;

#[wasm_bindgen]
pub struct BvstSynth {
    sample_rate: f32,
    
    osc1: Oscillator,
    osc2: Oscillator,
    filter: Svf,
    env: Adsr,
    delay: Delay,
    
    // Params
    p_osc_mix: Param, // Saw/Pulse mix
    p_pw: Param,
    p_detune: Param,
    
    p_cut: Param,
    p_res: Param,
    p_env_amt: Param,
    
    p_dec: Param,
    p_rel: Param,
    
    p_delay_time: Param,
    p_delay_mix: Param,
    p_vol: Param,
    
    curr_freq: f32,
    
    // Debug
    log_timer: usize,
}

#[wasm_bindgen]
impl BvstSynth {
    pub fn new(sample_rate: f32) -> BvstSynth {
        // console::log_1(&"ArpOne: Initialized".into());
        BvstSynth {
            sample_rate,
            osc1: Oscillator::new(sample_rate),
            osc2: Oscillator::new(sample_rate),
            filter: Svf::new(sample_rate),
            env: Adsr::new(sample_rate),
            delay: Delay::new(sample_rate, 1.0),
            
            p_osc_mix: Param::new(Curve::Linear{min:0.,max:1.}, 0.5),
            p_pw: Param::new(Curve::Linear{min:0.1,max:0.9}, 0.5),
            p_detune: Param::new(Curve::Linear{min:1.0,max:1.02}, 1.005),
            
            p_cut: Param::new(Curve::Exponential{min:50.,max:10000.}, 2000.),
            p_res: Param::new(Curve::Linear{min:0.,max:8.}, 2.0),
            p_env_amt: Param::new(Curve::Linear{min:0.,max:5000.}, 2000.),
            
            p_dec: Param::new(Curve::Linear{min:0.05,max:2.0}, 0.3),
            p_rel: Param::new(Curve::Linear{min:0.05,max:2.0}, 0.3),
            
            p_delay_time: Param::new(Curve::Linear{min:0.,max:0.8}, 0.3),
            p_delay_mix: Param::new(Curve::Linear{min:0.,max:0.6}, 0.3),
            p_vol: Param::new(Curve::Squared{min:0.,max:1.}, 0.5),
            
            curr_freq: 440.0,
            log_timer: 0,
        }
    }

    pub fn set_param(&mut self, id: u32, value: f32) {
        match id {
            1 => self.p_osc_mix.set(value),
            2 => self.p_pw.set(value),
            3 => self.p_detune.set(value),
            
            4 => self.p_cut.set(value),
            5 => self.p_res.set(value),
            6 => self.p_env_amt.set(value),
            
            7 => self.p_dec.set(value),
            8 => self.p_rel.set(value),
            
            9 => self.p_delay_time.set(value),
            10 => self.p_delay_mix.set(value),
            11 => self.p_vol.set(value),
            
            // Trigger
            128 => self.note_on(value),
            129 => self.note_off(),
            
            // Legacy
            26 => self.curr_freq = value,
            27 => if value > 0.5 { self.trigger_env() } else { self.note_off() },
            
            _ => {}
        }
    }
    
    fn note_on(&mut self, midi: f32) {
        if midi.is_nan() { return; }
        // console::log_1(&format!("Note On: {}", midi).into());
        self.curr_freq = dsp::mtof(midi);
        self.trigger_env();
    }
    
    fn trigger_env(&mut self) {
        self.env.a = 0.005; // Snap
        self.env.s = 0.0;   // Pluck
        self.env.trigger(true);
        self.osc1.reset();
        self.osc2.reset();
    }
    
    fn note_off(&mut self) {
        self.env.trigger(false);
    }

    pub fn process(&mut self, output: &mut [f32]) {
        // Hard cap cutoff to avoid explosion
        let max_cut = 18000.0; 
        
        for sample in output.iter_mut() {
            // Params
            let mix = self.p_osc_mix.process();
            let pw = self.p_pw.process();
            let det = self.p_detune.process();
            let cut_base = self.p_cut.process();
            let res = self.p_res.process();
            let env_amt = self.p_env_amt.process();
            let dec = self.p_dec.process();
            let rel = self.p_rel.process();
            let d_time = self.p_delay_time.process();
            let d_mix = self.p_delay_mix.process();
            let vol = self.p_vol.process();
            
            // Env
            self.env.d = dec; self.env.r = rel;
            let env_val = self.env.next();
            
            // Osc
            let o1 = self.osc1.next_simple(self.curr_freq, WaveType::Saw);
            let o2 = self.osc2.next(self.curr_freq * det, WaveType::Pulse, pw);
            
            let mut raw = o1 * (1.0 - mix) + o2 * mix;
            if !raw.is_finite() { raw = 0.0; } // Pre-filter safety
            
            // Filter
            let cut_target = cut_base + (env_val * env_amt);
            let cut = dsp::clamp(cut_target, 20.0, max_cut);
            
            let filtered = self.filter.process(raw, cut, res);
            
            let amp_out = filtered * env_val;
            
            // Delay
            let wet = self.delay.process(amp_out, d_time, 0.4, d_mix);
            
            *sample = wet * vol;
            
            // Output Safety Check & Reset
            if !sample.is_finite() {
                *sample = 0.0;
                // Reset state to recover from explosion
                self.filter.reset();
                self.delay.clear(); 
                self.osc1.reset();
                self.osc2.reset();
                
                // console::log_1(&"ArpOne: NaN detected! Resetting.".into());
            }
            
            /*
            self.log_timer += 1;
            if self.log_timer > 44100 {
                self.log_timer = 0;
                console::log_1(&format!("Status: Freq={} Env={} Out={}", self.curr_freq, env_val, *sample).into());
            }
            */
        }
    }
}
