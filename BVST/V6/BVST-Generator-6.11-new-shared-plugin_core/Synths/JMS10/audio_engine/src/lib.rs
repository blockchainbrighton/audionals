use wasm_bindgen::prelude::*;
use bvst_lib::{bvst_plugin, Param, Curve, dsp::{self, Oscillator, NoiseGen, Svf, Adsr, WaveType, FilterMode}};

bvst_plugin! {
    struct BvstSynth {
        osc: Oscillator,
        noise: NoiseGen,
        filter: Svf,
        lfo: Oscillator,
        env: Adsr,
        
        p_wave: f32,
        p_octave: f32,
        p_mg_wave: f32,
        
        base_freq: f32, curr_freq: f32, gate: bool,
        target_freq: f32,
    }

    init_fields (sample_rate) {
        osc = Oscillator::new(sample_rate),
        noise = NoiseGen::new(),
        filter = Svf::new(sample_rate),
        lfo = Oscillator::new(sample_rate),
        env = Adsr::new(sample_rate),
        
        p_wave = 1.0, p_octave = 0.0, p_mg_wave = 0.0,
        
        base_freq = 440.0, curr_freq = 440.0, gate = false, target_freq = 440.0
    }

    params {
        3: p_pwm        = Linear(0.0, 1.0, 0.5),
        4: p_cut        = Exponential(20.0, 20000.0, 1000.0),
        5: p_peak       = Linear(0.0, 10.0, 2.0),
        6: p_eg_amt     = Linear(-5000.0, 5000.0, 0.0),
        7: p_mg_amt     = Linear(0.0, 5000.0, 0.0),
        
        8: p_mg_rate    = Exponential(0.1, 50.0, 5.0),
        10: p_mg_vco_amt = Linear(0.0, 12.0, 0.0),
        
        11: p_att       = Linear(0.001, 3.0, 0.01),
        12: p_dec       = Linear(0.001, 3.0, 0.4),
        13: p_sus       = Linear(0.0, 1.0, 0.5),
        14: p_rel       = Linear(0.001, 5.0, 0.5),
        
        15: p_vol       = Squared(0.0, 1.0, 0.5),
        16: p_glide     = Linear(0.0, 1.0, 0.0),
    }

    impl BvstSynth {
        fn custom_param(&mut self, id: u32, value: f32) {
            match id {
                1 => self.p_wave = value,
                2 => self.p_octave = value,
                9 => self.p_mg_wave = value,
                
                26 => self.target_freq = value,
                27 => {
                    self.gate = value > 0.5;
                    self.env.trigger(self.gate);
                    if self.p_glide.get() <= 0.001 && self.gate {
                         self.curr_freq = self.target_freq;
                    }
                },
                _ => {}
            }
        }

        pub fn process(&mut self, output: &mut [f32]) {
            for sample in output.iter_mut() {
                // Update params
                let pwm = self.p_pwm.process();
                let cut_base = self.p_cut.process();
                let res = self.p_peak.process();
                let eg_to_cut = self.p_eg_amt.process();
                let mg_to_cut = self.p_mg_amt.process();
                let mg_rate = self.p_mg_rate.process();
                let mg_to_pitch = self.p_mg_vco_amt.process();
                let vol = self.p_vol.process();
                let glide = self.p_glide.process();
                
                // Env
                self.env.a = self.p_att.process();
                self.env.d = self.p_dec.process();
                self.env.s = self.p_sus.process();
                self.env.r = self.p_rel.process();
                
                // Glide
                if glide > 0.0 {
                    let diff = self.target_freq - self.curr_freq;
                    self.curr_freq += diff * (1.0 / (glide * self.sample_rate * 0.5 + 1.0));
                } else {
                    self.curr_freq = self.target_freq;
                }
                
                // LFO
                let mg_w = if self.p_mg_wave < 0.5 { WaveType::Triangle } else { WaveType::Square };
                let mg_val = self.lfo.next_simple(mg_rate, mg_w);
                
                // Osc
                let pitch_mod = mg_val * mg_to_pitch; 
                let freq = self.curr_freq * 2.0_f32.powf((self.p_octave + pitch_mod) / 12.0);
                
                let sig = if self.p_wave > 2.5 { 
                    self.noise.next()
                } else {
                    let w = match self.p_wave as i32 {
                        0 => WaveType::Triangle,
                        1 => WaveType::Saw,
                        _ => WaveType::Pulse,
                    };
                    self.osc.next(freq, w, pwm)
                };
                
                // Filter
                let eg_val = self.env.next();
                let cut_mod = cut_base + (eg_val * eg_to_cut) + (mg_val * mg_to_cut);
                let cut = dsp::clamp(cut_mod, 20.0, 20000.0);
                
                let drive_sig = sig * 1.5; 
                let mut filtered = self.filter.process(drive_sig, cut, res);
                
                // VCA
                filtered *= eg_val * vol;
                
                *sample = filtered.tanh();
            }
        }
    }
}