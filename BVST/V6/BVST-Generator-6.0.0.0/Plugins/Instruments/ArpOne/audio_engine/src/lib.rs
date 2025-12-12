use wasm_bindgen::prelude::*;
use bvst_lib::{thin_plugin, Param, Curve, dsp::{self, Oscillator, Svf, Adsr, Delay, WaveType}};

thin_plugin! {
    struct BvstSynth {
        osc1: Oscillator,
        osc2: Oscillator,
        filter: Svf,
        env: Adsr,
        delay: Delay,
        
        curr_freq: f32,
    }

    init_fields (sample_rate) {
        osc1 = Oscillator::new(sample_rate),
        osc2 = Oscillator::new(sample_rate),
        filter = Svf::new(sample_rate),
        env = Adsr::new(sample_rate),
        delay = Delay::new(sample_rate, 1.0),
        
        curr_freq = 440.0
    }

    params {
        1: p_osc_mix    = Linear(0.0, 1.0, 0.5),
        2: p_pw         = Linear(0.1, 0.9, 0.5),
        3: p_detune     = Linear(1.0, 1.02, 1.005),
        
        4: p_cut        = Exponential(50.0, 10000.0, 2000.0),
        5: p_res        = Linear(0.0, 8.0, 2.0),
        6: p_env_amt    = Linear(0.0, 5000.0, 2000.0),
        
        7: p_dec        = Linear(0.05, 2.0, 0.3),
        8: p_rel        = Linear(0.05, 2.0, 0.3),
        
        9: p_delay_time = Linear(0.0, 0.8, 0.3),
        10: p_delay_mix = Linear(0.0, 0.6, 0.3),
        11: p_vol       = Squared(0.0, 1.0, 0.25),
    }
}

// User Implementation of Logic
impl BvstSynth {
    fn process_audio(&mut self, _in_l: &[f32], _in_r: &[f32], out_l: &mut [f32], out_r: &mut [f32]) {
        let max_cut = 18000.0;
        let len = out_l.len();
        
        for i in 0..len {
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
            if !raw.is_finite() { raw = 0.0; }
            
            // Filter
            let cut_target = cut_base + (env_val * env_amt);
            let cut = dsp::clamp(cut_target, 20.0, max_cut);
            
            let filtered = self.filter.process(raw, cut, res);
            
            let amp_out = filtered * env_val;
            
            // Delay
            let wet = self.delay.process(amp_out, d_time, 0.4, d_mix);
            
            let final_val = wet * vol;
            
            // Output Safety
            let safe = if final_val.is_finite() { final_val } else { 0.0 };
            
            out_l[i] = safe;
            if i < out_r.len() { out_r[i] = safe; }
        }
        
        // Reset if unstable
        if !out_l[0].is_finite() {
            self.filter.reset();
            self.delay.clear();
            self.osc1.reset();
        }
    }

    fn handle_event(&mut self, id: u32, value: f32) {
        match id {
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
}