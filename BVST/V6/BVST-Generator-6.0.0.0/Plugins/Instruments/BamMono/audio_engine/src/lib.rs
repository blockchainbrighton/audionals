use wasm_bindgen::prelude::*;
use bvst_lib::{bvst_plugin, Param, Curve, dsp::{self, Oscillator, NoiseGen, Svf, Adsr, Delay, WaveType}};

bvst_plugin! {
    struct BvstSynth {
        osc1: Oscillator, osc2: Oscillator, noise: NoiseGen, lfo: Oscillator,
        amp_env: Adsr, filt_env: Adsr,
        filter: Svf, filter2: Svf,
        delay: Delay,
        
        p_o1_wave: WaveType, p_o1_oct: f32, p_o1_tune: f32,
        p_o2_wave: WaveType, p_o2_oct: f32, p_o2_tune: f32,
        
        base_freq: f32, curr_freq: f32, gate: bool, velocity: f32,
    }

    init_fields (sample_rate) {
        osc1 = Oscillator::new(sample_rate), osc2 = Oscillator::new(sample_rate),
        noise = NoiseGen::new(), lfo = Oscillator::new(sample_rate),
        amp_env = Adsr::new(sample_rate), filt_env = Adsr::new(sample_rate),
        filter = Svf::new(sample_rate), filter2 = Svf::new(sample_rate),
        delay = Delay::new(sample_rate, 1.0),
        
        p_o1_wave = WaveType::Saw, p_o1_oct = 0.0, p_o1_tune = 0.0,
        p_o2_wave = WaveType::Square, p_o2_oct = -1.0, p_o2_tune = 7.0,
        
        base_freq = 440.0, curr_freq = 440.0, gate = false, velocity = 1.0
    }

    params {
        6: p_mix1 = Linear(0.0, 1.0, 1.0),
        7: p_mix2 = Linear(0.0, 1.0, 0.5),
        8: p_mix_noise = Linear(0.0, 0.5, 0.0),
        
        9: p_cut = Exponential(20.0, 20000.0, 20000.0),
        10: p_res = Linear(0.0, 4.0, 1.0),
        11: p_filt_env_amt = Linear(-5000.0, 5000.0, 2000.0),
        
        12: p_a_a = Linear(0.005, 2.0, 0.01),
        13: p_a_d = Linear(0.0, 2.0, 0.1),
        14: p_a_s = Linear(0.0, 1.0, 1.0),
        15: p_a_r = Linear(0.01, 4.0, 0.1),
        
        16: p_f_a = Linear(0.005, 2.0, 0.01),
        17: p_f_d = Linear(0.0, 2.0, 0.2),
        18: p_f_s = Linear(0.0, 1.0, 0.5),
        19: p_f_r = Linear(0.01, 4.0, 0.5),
        
        20: p_lfo_rate = Exponential(0.1, 20.0, 5.0),
        21: p_lfo_amt  = Linear(0.0, 1000.0, 0.0),
        22: p_glide    = Linear(0.0, 0.5, 0.0),
        
        23: p_dist     = Linear(0.0, 1.0, 0.0),
        24: p_delay    = Linear(0.0, 0.6, 0.2),
        25: p_vol      = Squared(0.0, 1.0, 0.25),
    }

    impl BvstSynth {
        fn custom_param(&mut self, id: u32, value: f32) {
            match id {
                0 => self.p_o1_wave = WaveType::from(value),
                1 => self.p_o1_oct = value,
                2 => self.p_o1_tune = value,
                3 => self.p_o2_wave = WaveType::from(value),
                4 => self.p_o2_oct = value,
                5 => self.p_o2_tune = value,
                
                26 => {
                    self.base_freq = value;
                    // Instant update if no glide
                    if self.p_glide.get() == 0.0 { self.curr_freq = value; }
                },
                27 => {
                    self.gate = value > 0.5;
                    self.amp_env.trigger(self.gate);
                    self.filt_env.trigger(self.gate);
                },
                28 => self.velocity = value,
                _ => {}
            }
        }

        pub fn process(&mut self, output: &mut [f32]) {
            for sample in output.iter_mut() {
                // Update params
                let v_glide = self.p_glide.process();
                let v_cut = self.p_cut.process();
                let v_res = self.p_res.process();
                let v_env_amt = self.p_filt_env_amt.process();
                let v_lfo_rate = self.p_lfo_rate.process();
                let v_lfo_amt = self.p_lfo_amt.process();
                let v_dist = self.p_dist.process();
                let v_d_wet = self.p_delay.process();
                let v_vol = self.p_vol.process();

                // Update Envs
                self.amp_env.a = self.p_a_a.process();
                self.amp_env.d = self.p_a_d.process();
                self.amp_env.s = self.p_a_s.process();
                self.amp_env.r = self.p_a_r.process();
                
                self.filt_env.a = self.p_f_a.process();
                self.filt_env.d = self.p_f_d.process();
                self.filt_env.s = self.p_f_s.process();
                self.filt_env.r = self.p_f_r.process();

                // Glide
                if v_glide > 0.0 {
                    let diff = self.base_freq - self.curr_freq;
                    let step = diff * (1.0 / (v_glide * self.sample_rate + 1.0));
                    self.curr_freq += step;
                } else {
                    self.curr_freq = self.base_freq;
                }

                // Mod
                let lfo_val = self.lfo.next(v_lfo_rate, WaveType::Triangle, 0.5);
                let env_a = self.amp_env.next();
                let env_f = self.filt_env.next();
                
                if env_a < 0.0001 && !self.gate { *sample = 0.0; continue; }
                
                // Osc
                let detune1 = 2.0_f32.powf(self.p_o1_tune / 1200.0);
                let freq1 = self.curr_freq * 2.0_f32.powf(self.p_o1_oct) * detune1;
                let detune2 = 2.0_f32.powf(self.p_o2_tune / 1200.0);
                let freq2 = self.curr_freq * 2.0_f32.powf(self.p_o2_oct) * detune2;
                
                let o1 = self.osc1.next(freq1, self.p_o1_wave, 0.5);
                let o2 = self.osc2.next(freq2, self.p_o2_wave, 0.5);
                let ns = self.noise.next();
                
                let mix = (o1 * self.p_mix1.process()) + (o2 * self.p_mix2.process()) + (ns * self.p_mix_noise.process());
                
                // Filter
                let mut cut = v_cut + (env_f * v_env_amt) + (lfo_val * v_lfo_amt);
                cut = dsp::clamp(cut, 20.0, 20000.0);
                
                let stage1 = self.filter.process(mix, cut, v_res);
                let mut filtered = self.filter2.process(stage1, cut, v_res);
                
                // Dist
                if v_dist > 0.0 {
                     filtered *= 1.0 + v_dist * 5.0;
                     filtered = filtered.tanh();
                }
                
                // Amp
                let out = filtered * env_a * self.velocity;
                
                // Delay
                let final_out = self.delay.process(out, 0.3, 0.4, v_d_wet);

                *sample = final_out * v_vol;
            }
        }
    }
}
