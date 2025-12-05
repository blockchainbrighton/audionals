use wasm_bindgen::prelude::*;
use bvst_lib::{Param, Curve, dsp::{self, Oscillator, NoiseGen, Adsr, Svf, Delay, WaveType}};

#[wasm_bindgen]
pub struct BvstSynth {
    sample_rate: f32,
    osc1: Oscillator, osc2: Oscillator, noise: NoiseGen, lfo: Oscillator,
    amp_env: Adsr, filt_env: Adsr,
    filter: Svf, filter2: Svf,
    delay: Delay,
    
    // Params
    p_o1_wave: WaveType, p_o1_oct: f32, p_o1_tune: f32,
    p_o2_wave: WaveType, p_o2_oct: f32, p_o2_tune: f32,
    
    p_mix1: Param, p_mix2: Param, p_mix_noise: Param,
    p_cut: Param, p_res: Param, p_filt_env_amt: Param,
    
    // Env Params (held separately for setting ADSR)
    p_a_a: f32, p_a_d: f32, p_a_s: f32, p_a_r: f32,
    p_f_a: f32, p_f_d: f32, p_f_s: f32, p_f_r: f32,

    p_lfo_rate: Param, p_lfo_amt: Param, p_glide: Param,
    p_dist: Param, p_delay_wet: Param, p_vol: Param,
    
    base_freq: f32, curr_freq: f32, gate: bool, velocity: f32,
}

#[wasm_bindgen]
impl BvstSynth {
    pub fn new(sample_rate: f32) -> BvstSynth {
        BvstSynth {
            sample_rate,
            osc1: Oscillator::new(sample_rate), osc2: Oscillator::new(sample_rate),
            noise: NoiseGen::new(), lfo: Oscillator::new(sample_rate),
            amp_env: Adsr::new(sample_rate), filt_env: Adsr::new(sample_rate),
            filter: Svf::new(sample_rate), filter2: Svf::new(sample_rate),
            delay: Delay::new(sample_rate, 1.0), // Max 1s delay
            
            p_o1_wave: WaveType::Saw, p_o1_oct: 0.0, p_o1_tune: 0.0,
            p_o2_wave: WaveType::Square, p_o2_oct: -1.0, p_o2_tune: 7.0,
            
            p_mix1: Param::new(Curve::Linear{min:0.,max:1.}, 1.0),
            p_mix2: Param::new(Curve::Linear{min:0.,max:1.}, 0.5),
            p_mix_noise: Param::new(Curve::Linear{min:0.,max:1.}, 0.0),
            
            p_cut: Param::new(Curve::Exponential{min:20.,max:20000.}, 0.5),
            p_res: Param::new(Curve::Linear{min:0.5,max:10.}, 1.0),
            p_filt_env_amt: Param::new(Curve::Linear{min:-5000.,max:5000.}, 2000.0),
            
            p_a_a:0.01, p_a_d:0.1, p_a_s:1.0, p_a_r:0.1,
            p_f_a:0.01, p_f_d:0.1, p_f_s:1.0, p_f_r:0.1,
            
            p_lfo_rate: Param::new(Curve::Exponential{min:0.1,max:20.}, 5.0),
            p_lfo_amt: Param::new(Curve::Linear{min:0.,max:1000.}, 0.0),
            p_glide: Param::new(Curve::Linear{min:0.,max:0.5}, 0.0),
            
            p_dist: Param::new(Curve::Linear{min:0.,max:1.}, 0.0),
            p_delay_wet: Param::new(Curve::Linear{min:0.,max:1.}, 0.0),
            p_vol: Param::new(Curve::Squared{min:0.,max:1.}, 0.5),
            
            base_freq: 440.0, curr_freq: 440.0, gate: false, velocity: 1.0,
        }
    }

    pub fn set_param(&mut self, id: u32, value: f32) {
        match id {
            0 => self.p_o1_wave = WaveType::from(value),
            1 => self.p_o1_oct = value,
            2 => self.p_o1_tune = value,
            3 => self.p_o2_wave = WaveType::from(value),
            4 => self.p_o2_oct = value,
            5 => self.p_o2_tune = value,
            
            6 => self.p_mix1.set(value),
            7 => self.p_mix2.set(value),
            8 => self.p_mix_noise.set(value),
            
            9 => self.p_cut.set(value),
            10 => self.p_res.set(value),
            11 => self.p_filt_env_amt.set(value),
            
            12 => { self.p_a_a = value; self.amp_env.a = value; },
            13 => { self.p_a_d = value; self.amp_env.d = value; },
            14 => { self.p_a_s = value; self.amp_env.s = value; },
            15 => { self.p_a_r = value; self.amp_env.r = value; },
            
            16 => { self.p_f_a = value; self.filt_env.a = value; },
            17 => { self.p_f_d = value; self.filt_env.d = value; },
            18 => { self.p_f_s = value; self.filt_env.s = value; },
            19 => { self.p_f_r = value; self.filt_env.r = value; },
            
            20 => self.p_lfo_rate.set(value),
            21 => self.p_lfo_amt.set(value),
            22 => self.p_glide.set(value),
            
            23 => self.p_dist.set(value),
            24 => self.p_delay_wet.set(value),
            25 => self.p_vol.set(value),
            
            26 => {
                self.base_freq = value;
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
            // 0. Params
            let v_glide = self.p_glide.process();
            let v_cut = self.p_cut.process();
            let v_res = self.p_res.process();
            let v_env_amt = self.p_filt_env_amt.process();
            let v_lfo_rate = self.p_lfo_rate.process();
            let v_lfo_amt = self.p_lfo_amt.process();
            let v_dist = self.p_dist.process();
            let v_d_wet = self.p_delay_wet.process();
            let v_vol = self.p_vol.process();

            // Glide
            if v_glide > 0.0 {
                let diff = self.base_freq - self.curr_freq;
                let step = diff * (1.0 / (v_glide * self.sample_rate + 1.0));
                self.curr_freq += step;
            } else {
                self.curr_freq = self.base_freq;
            }

            // 1. Mod
            let lfo_val = self.lfo.next(v_lfo_rate, WaveType::Triangle, 0.5);
            let env_a = self.amp_env.next();
            let env_f = self.filt_env.next();
            
            if env_a < 0.0001 && !self.gate { *sample = 0.0; continue; }
            
            // 2. Osc
            let detune1 = 2.0_f32.powf(self.p_o1_tune / 1200.0);
            let freq1 = self.curr_freq * 2.0_f32.powf(self.p_o1_oct) * detune1;
            let detune2 = 2.0_f32.powf(self.p_o2_tune / 1200.0);
            let freq2 = self.curr_freq * 2.0_f32.powf(self.p_o2_oct) * detune2;
            
            let o1 = self.osc1.next(freq1, self.p_o1_wave, 0.5);
            let o2 = self.osc2.next(freq2, self.p_o2_wave, 0.5);
            let ns = self.noise.next();
            
            let mix = (o1 * self.p_mix1.process()) + (o2 * self.p_mix2.process()) + (ns * self.p_mix_noise.process());
            
            // 3. Filter
            let mut cut = v_cut + (env_f * v_env_amt) + (lfo_val * v_lfo_amt);
            cut = dsp::clamp(cut, 20.0, 20000.0);
            
            let stage1 = self.filter.process(mix, cut, v_res);
            let mut filtered = self.filter2.process(stage1, cut, v_res);
            
            // 4. Dist
            if v_dist > 0.0 {
                 filtered *= 1.0 + v_dist * 5.0;
                 filtered = filtered.tanh();
            }
            
            // 5. Amp
            let out = filtered * env_a * self.velocity;
            
            // 6. Delay
            // Fixed 300ms delay in old code. With 1.0s buffer, 300ms is 0.3
            let final_out = self.delay.process(out, 0.3, v_d_wet);

            *sample = final_out * v_vol;
        }
    }
}