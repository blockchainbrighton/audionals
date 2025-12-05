use wasm_bindgen::prelude::*;
use bvst_lib::{Param, Curve, dsp::{self, Oscillator, Svf, Adsr, Delay, Reverb, WaveType}};

#[wasm_bindgen]
pub struct BvstSynth {
    sample_rate: f32,
    osc: Oscillator, sub_osc: Oscillator, lfo: Oscillator,
    amp_env: Adsr, filt_env: Adsr, filter: Svf,
    delay: Delay, reverb: Reverb,
    
    p_cut: Param, p_res: Param, p_drive: Param,
    p_env_amt: Param,
    p_lfo_rate: Param, p_lfo_depth: Param,
    p_glide: Param, p_detune: Param,
    p_sub_level: Param, p_pwm: Param,
    p_chorus: Param,
    p_delay_wet: Param,
    p_reverb_wet: Param,
    p_vol: Param,
    
    base_freq: f32, curr_freq: f32, gate: bool, velocity: f32, pitch_bend: f32, mod_wheel: f32,
}

#[wasm_bindgen]
impl BvstSynth {
    pub fn new(sample_rate: f32) -> BvstSynth {
        BvstSynth {
            sample_rate,
            osc: Oscillator::new(sample_rate), sub_osc: Oscillator::new(sample_rate), lfo: Oscillator::new(sample_rate),
            amp_env: Adsr::new(sample_rate), filt_env: Adsr::new(sample_rate),
            filter: Svf::new(sample_rate),
            delay: Delay::new(sample_rate, 1.0), reverb: Reverb::new(sample_rate),
            
            p_cut: Param::new(Curve::Exponential{min:20.,max:12000.}, 0.8),
            p_res: Param::new(Curve::Linear{min:0.1,max:10.}, 1.0),
            p_drive: Param::new(Curve::Linear{min:0.,max:1.}, 0.0), // Mapped to nothing?
            // GUI has no Drive knob? GUI: "Chorus"(12), "Delay"(13), "Reverb"(14), "Volume"(15).
            // Wait, GUI HTML has `id="drive"`. Let's check GUI.
            // GUI: `id="drive" data-param="2"`? No.
            // GUI Section "Oscillator": Detune(1), Sub(2), PWM(3), Glide(4).
            // GUI Section "VCF": Cutoff(5), Res(6), Env Amt(7).
            // GUI Section "Envelope": A(8), D(9), S(10), R(11).
            // GUI Section "Effects": Chorus(12), Delay(13), Reverb(14), Volume(15).
            // There is NO Drive knob in the GUI HTML provided in previous turn.
            // So p_drive is internal/unused or mapped to Mod Wheel? I'll keep it unused.
            
            p_env_amt: Param::new(Curve::Linear{min:0.,max:5000.}, 0.5),
            p_lfo_rate: Param::new(Curve::Exponential{min:0.1,max:20.}, 0.5),
            p_lfo_depth: Param::new(Curve::Linear{min:0.,max:1.}, 0.0),
            p_glide: Param::new(Curve::Linear{min:0.,max:0.5}, 0.1),
            p_detune: Param::new(Curve::Linear{min:0.,max:1.}, 0.5),
            p_sub_level: Param::new(Curve::Linear{min:0.,max:1.}, 0.0),
            p_pwm: Param::new(Curve::Linear{min:0.1,max:0.9}, 0.5),
            p_chorus: Param::new(Curve::Linear{min:0.,max:1.}, 0.0),
            p_delay_wet: Param::new(Curve::Linear{min:0.,max:1.}, 0.0),
            p_reverb_wet: Param::new(Curve::Linear{min:0.,max:1.}, 0.0),
            p_vol: Param::new(Curve::Squared{min:0.,max:1.}, 0.5),
            
            base_freq: 440.0, curr_freq: 440.0, gate: false, velocity: 1.0, pitch_bend: 0.0, mod_wheel: 0.0,
        }
    }

    pub fn set_param(&mut self, id: u32, value: f32) {
        match id {
            1 => self.p_detune.set(value),
            2 => self.p_sub_level.set(value),
            3 => self.p_pwm.set(value),
            4 => self.p_glide.set(value),
            5 => self.p_cut.set(value),
            6 => self.p_res.set(value),
            7 => self.p_env_amt.set(value),
            
            8 => { self.amp_env.a = value; self.filt_env.a = value; },
            9 => { self.amp_env.d = value; self.filt_env.d = value; },
            10 => { self.amp_env.s = value; self.filt_env.s = value; },
            11 => { self.amp_env.r = value; self.filt_env.r = value; },
            
            12 => self.p_chorus.set(value),
            13 => self.p_delay_wet.set(value),
            14 => self.p_reverb_wet.set(value),
            15 => self.p_vol.set(value),
            
            16 => {
                self.gate = value > 0.5;
                self.amp_env.trigger(self.gate);
                self.filt_env.trigger(self.gate);
            },
            17 => self.velocity = value,
            18 => {
                self.base_freq = dsp::mtof(value);
                if self.p_glide.get() == 0.0 { self.curr_freq = self.base_freq; }
            },
            21 => { // Note On
                self.base_freq = dsp::mtof(value);
                self.gate = true;
                self.amp_env.trigger(true);
                self.filt_env.trigger(true);
            },
            22 => { // Note Off
                self.gate = false;
                self.amp_env.trigger(false);
                self.filt_env.trigger(false);
            },
            23 => self.mod_wheel = value,
            _ => {}
        }
    }

    pub fn process(&mut self, output: &mut [f32]) {
        for sample in output.iter_mut() {
            let v_detune = self.p_detune.process();
            let v_sub = self.p_sub_level.process();
            let v_pwm = self.p_pwm.process();
            let v_glide = self.p_glide.process();
            let v_cut = self.p_cut.process();
            let v_res = self.p_res.process();
            let v_env_amt = self.p_env_amt.process();
            let v_d_wet = self.p_delay_wet.process();
            let v_r_wet = self.p_reverb_wet.process();
            let v_vol = self.p_vol.process();

            // LFO (Internal fixed rate for now as knobs missing?)
            // GUI has no LFO knobs.
            let lfo_val = self.lfo.next(3.0, WaveType::Triangle, 0.5);

            // Pitch
            if v_glide > 0.0 {
                 let diff = self.base_freq - self.curr_freq;
                 let step = diff * (1.0 / (v_glide * self.sample_rate * 0.5 + 1.0));
                 self.curr_freq += step;
            } else {
                 self.curr_freq = self.base_freq;
            }
            
            // Detune LFO
            let detune_cents = (v_detune - 0.5) * 50.0 + (lfo_val * self.mod_wheel * 20.0);
            let detune_factor = 2.0_f32.powf(detune_cents / 1200.0);
            
            let osc_out = self.osc.next(self.curr_freq * detune_factor, WaveType::Saw, v_pwm);
            let sub_out = self.sub_osc.next(self.curr_freq * 0.5, WaveType::Square, 0.5);
            
            let mix = osc_out + (sub_out * v_sub);
            
            // Filter
            let env_f = self.filt_env.next();
            let final_cut = dsp::clamp(v_cut + (env_f * v_env_amt), 20.0, 18000.0);
            
            let filt_out = self.filter.process(mix, final_cut, v_res);
            
            let env_a = self.amp_env.next();
            let mut out = filt_out * env_a * self.velocity;
            
            // Delay: fixed time 0.4s
            let d_out = self.delay.process(out, 0.4, v_d_wet);
            out = d_out; 
            
            // Reverb
            let r_out = self.reverb.process(out, v_r_wet);
            out = r_out;
            
            *sample = out * v_vol;
        }
    }
}
