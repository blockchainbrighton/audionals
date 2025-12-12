use wasm_bindgen::prelude::*;
use bvst_lib::{bvst_plugin, Param, Curve, dsp::{self, Oscillator, Svf, Adsr, WaveType}};

bvst_plugin! {
    struct BvstSynth {
        osc: Oscillator,
        sub: Oscillator,
        filter: Svf,
        filter2: Svf, // cascade for steeper slope
        env: Adsr,
        
        target_freq: f32,
        curr_freq: f32,
        gate: bool,
        accent_active: bool,
        slide_active: bool,
    }

    init_fields (sample_rate) {
        osc = Oscillator::new(sample_rate),
        sub = Oscillator::new(sample_rate),
        filter = Svf::new(sample_rate),
        filter2 = Svf::new(sample_rate),
        env = Adsr::new(sample_rate),
        
        target_freq = 110.0, curr_freq = 110.0,
        gate = false, accent_active = false, slide_active = false
    }

    params {
        1: p_wave    = Linear(0.0, 1.0, 0.0), // 0=Saw, 1=Square
        2: p_sub_vol = Linear(0.0, 1.0, 0.0),
        3: p_cut     = Exponential(20.0, 20000.0, 632.0),
        4: p_res     = Linear(0.0, 10.0, 2.0),
        5: p_env_mod = Linear(0.0, 1.0, 0.5),
        6: p_decay   = Linear(0.1, 2.0, 0.86),
        7: p_accent  = Linear(0.0, 1.0, 0.5),
        8: p_drive   = Linear(0.0, 1.0, 0.0),
        9: p_glide   = Linear(0.0, 0.5, 0.05),
        15: p_vol    = Squared(0.0, 1.0, 0.25),
    }

    impl BvstSynth {
        fn custom_param(&mut self, id: u32, value: f32) {
            match id {
                20 => self.target_freq = value, // Note Freq
                21 => self.accent_active = value > 0.5,
                22 => self.slide_active = value > 0.5,
                23 => { // Gate
                    self.gate = value > 0.5;
                    if self.gate {
                        if !self.slide_active {
                            self.curr_freq = self.target_freq;
                            self.env.trigger(true);
                        }
                        // Retrigger env
                        self.env.trigger(true);
                    } else {
                        self.env.trigger(false);
                    }
                },
                _ => {}
            }
        }

        pub fn process(&mut self, output: &mut [f32]) {
            for sample in output.iter_mut() {
                // Process Params
                let v_decay = self.p_decay.process();
                let v_glide = self.p_glide.process();
                let v_cut = self.p_cut.process();
                let v_res = self.p_res.process();
                let v_env_mod = self.p_env_mod.process();
                let v_accent = self.p_accent.process();
                let v_drive = self.p_drive.process();
                let v_vol = self.p_vol.process();
                let v_sub_vol = self.p_sub_vol.process();
                
                // Switch (Param now)
                let v_wave = self.p_wave.process();

                // Glide
                if v_glide > 0.0 {
                    let diff = self.target_freq - self.curr_freq;
                    self.curr_freq += diff * (1.0 / (v_glide * self.sample_rate * 0.5 + 1.0));
                } else {
                    self.curr_freq = self.target_freq;
                }
                
                // Env
                self.env.d = v_decay;
                let env_val = self.env.next();
                
                // Osc
                let w = if v_wave < 0.5 { WaveType::Saw } else { WaveType::Square };
                let osc_out = self.osc.next(self.curr_freq, w, 0.5);
                let sub_out = self.sub.next(self.curr_freq * 0.5, WaveType::Square, 0.5);
                
                let raw = osc_out + sub_out * v_sub_vol;
                
                // Filter Logic
                let mod_amt = v_env_mod * 8000.0;
                let accent_boost = if self.accent_active { v_accent * 4000.0 } else { 0.0 };
                
                let cut_val = v_cut + (env_val * (mod_amt + accent_boost));
                let nyquist = (self.sample_rate * 0.45).min(20000.0);
                let cut = dsp::clamp(cut_val, 20.0, nyquist);
                
                let mut res = v_res;
                if self.accent_active { res += v_accent * 5.0; }
                
                let stage1 = self.filter.process(raw, cut, res);
                let mut sig = self.filter2.process(stage1, cut, res);
                
                // Drive
                if v_drive > 0.0 {
                    sig *= 1.0 + v_drive * 5.0;
                    sig = sig.tanh();
                }
                
                // Amp
                let mut amp = env_val; 
                if self.accent_active { amp *= 1.5; }
                
                *sample = sig * amp * v_vol;
            }
        }
    }
}
