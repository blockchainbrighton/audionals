use wasm_bindgen::prelude::*;
use bvst_lib::{bvst_plugin, Param, Curve, dsp::{self, Oscillator, Svf, Adsr, Compressor, WaveType}};

bvst_plugin! {
    struct BvstSynth {
        osc_c: Oscillator,
        osc_m: Oscillator,
        env_amp: Adsr,
        env_mod: Adsr,
        filter: Svf,
        comp: Compressor,
        
        curr_freq: f32,
        gate: bool,
    }

    init_fields (sample_rate) { // Pass sample_rate as the variable name
        osc_c = Oscillator::new(sample_rate),
        osc_m = Oscillator::new(sample_rate),
        env_amp = Adsr::new(sample_rate),
        env_mod = Adsr::new(sample_rate),
        filter = Svf::new(sample_rate),
        comp = Compressor::new(sample_rate),
        
        curr_freq = 55.0,
        gate = false
    }

    params {
        1: p_fm_amt     = Linear(0.0, 1000.0, 500.0),
        2: p_mod_ratio  = Linear(0.5, 4.0, 1.0),
        3: p_cut        = Exponential(50.0, 5000.0, 800.0),
        4: p_dec        = Linear(0.1, 1.0, 0.3),
        5: p_drive      = Linear(0.0, 1.0, 0.2),
        6: p_comp_thresh = Linear(-40.0, 0.0, -10.0),
        7: p_vol        = Squared(0.0, 1.0, 0.6),
    }

    impl BvstSynth {
        // Custom param handler for non-standard ID logic (like MIDI notes)
        fn custom_param(&mut self, id: u32, value: f32) {
            match id {
                26 => self.curr_freq = value,
                27 => {
                    self.gate = value > 0.5;
                    self.env_amp.trigger(self.gate);
                    self.env_mod.trigger(self.gate);
                },
                _ => {}
            }
        }

        pub fn process(&mut self, output: &mut [f32]) {
            for sample in output.iter_mut() {
                // Params
                let v_fm = self.p_fm_amt.process();
                let v_ratio = self.p_mod_ratio.process();
                let v_cut = self.p_cut.process();
                let v_dec = self.p_dec.process();
                let v_drive = self.p_drive.process();
                let v_thresh = self.p_comp_thresh.process();
                let v_vol = self.p_vol.process();
                
                // Sync Envs
                self.env_amp.d = v_dec;
                self.env_mod.d = v_dec * 0.8; 
                
                let env_a = self.env_amp.next();
                let env_m = self.env_mod.next();
                
                // FM
                let mod_freq = self.curr_freq * v_ratio;
                let mod_out = self.osc_m.next_simple(mod_freq, WaveType::Sine);
                
                let carrier_freq = self.curr_freq + (mod_out * v_fm * env_m);
                let sig = self.osc_c.next_simple(carrier_freq, WaveType::Sine);
                
                // Filter (Lowpass)
                let cut = dsp::clamp(v_cut + (env_m * 3000.0), 20.0, 20000.0);
                let filtered = self.filter.process(sig, cut, 0.5);
                
                // Drive
                let mut driven = filtered * (1.0 + v_drive * 10.0);
                driven = driven.tanh();
                
                // Amp
                let raw_out = driven * env_a;
                
                // Compressor (Punch)
                let compressed = self.comp.process(raw_out, v_thresh, 4.0, 0.005, 0.050);
                
                *sample = compressed * v_vol;
            }
        }
    }
}