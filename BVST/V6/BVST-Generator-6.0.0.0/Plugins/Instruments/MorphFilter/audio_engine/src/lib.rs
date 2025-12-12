use wasm_bindgen::prelude::*;
use bvst_lib::{bvst_plugin, Param, Curve, dsp::{self, Oscillator, NoiseGen, Svf, Adsr, FilterMode, WaveType}};

bvst_plugin! {
    struct BvstSynth {
        osc: Oscillator,
        noise: NoiseGen,
        lfo: Oscillator,
        filter: Svf,
        env: Adsr,
        
        p_mode: f32,
        
        curr_freq: f32,
        gate: bool,
    }

    init_fields (sample_rate) {
        osc = Oscillator::new(sample_rate),
        noise = NoiseGen::new(),
        lfo = Oscillator::new(sample_rate),
        filter = Svf::new(sample_rate),
        env = Adsr::new(sample_rate),
        
        p_mode = 0.0,
        
        curr_freq = 110.0, gate = false
    }

    params {
        2: p_cut        = Exponential(40.0, 15000.0, 1000.0),
        3: p_res        = Linear(0.0, 10.0, 2.0),
        4: p_lfo_rate   = Exponential(0.1, 20.0, 1.0),
        5: p_lfo_depth  = Linear(0.0, 5000.0, 0.0),
        6: p_osc_mix    = Linear(0.0, 1.0, 0.5),
        7: p_noise_mix  = Linear(0.0, 1.0, 0.5),
        8: p_vol        = Squared(0.0, 1.0, 0.5),
    }

    impl BvstSynth {
        fn custom_param(&mut self, id: u32, value: f32) {
            match id {
                1 => self.p_mode = value,
                
                26 => self.curr_freq = value,
                27 => {
                    self.gate = value > 0.5;
                    self.env.trigger(self.gate);
                },
                _ => {}
            }
        }

        pub fn process(&mut self, output: &mut [f32]) {
            for sample in output.iter_mut() {
                // Params
                let v_cut = self.p_cut.process();
                let v_res = self.p_res.process();
                let v_lrate = self.p_lfo_rate.process();
                let v_ldepth = self.p_lfo_depth.process();
                let v_osc = self.p_osc_mix.process();
                let v_noise = self.p_noise_mix.process();
                let v_vol = self.p_vol.process();
                
                let env_val = self.env.next();
                
                // Sources
                let o = self.osc.next_simple(self.curr_freq, WaveType::Saw);
                let n = self.noise.next();
                let raw = (o * v_osc) + (n * v_noise);
                
                // LFO Mod
                let lfo_val = self.lfo.next_simple(v_lrate, WaveType::Sine);
                let mod_amt = lfo_val * v_ldepth;
                
                // Filter
                let cut = dsp::clamp(v_cut + mod_amt, 20.0, 20000.0);
                let mode = FilterMode::from(self.p_mode);
                
                let filtered = self.filter.process_mode(raw, cut, v_res, mode);
                
                *sample = filtered * env_val * v_vol;
            }
        }
    }
}