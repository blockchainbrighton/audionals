use wasm_bindgen::prelude::*;
use bvst_lib::{Param, Curve, dsp::{self, Oscillator, NoiseGen, Svf, Adsr, WaveType, FilterMode}};

#[wasm_bindgen]
pub struct BvstSynth {
    sample_rate: f32,
    
    // Core Modules
    osc: Oscillator,
    noise: NoiseGen,
    filter: Svf,
    lfo: Oscillator, // MG (Modulation Generator)
    env: Adsr,       // EG (Envelope Generator)
    
    // Params
    // VCO
    p_wave: f32, // 0=Tri, 1=Saw, 2=Pulse, 3=Noise
    p_octave: f32, // 4, 8, 16, 32
    p_pwm: Param,
    
    // VCF
    p_cut: Param,
    p_peak: Param, // Resonance
    p_eg_amt: Param, // EG to Cutoff
    p_mg_amt: Param, // MG to Cutoff
    
    // MG (LFO)
    p_mg_wave: f32, // 0=Tri, 1=Square
    p_mg_rate: Param,
    p_mg_vco_amt: Param, // MG to Pitch
    
    // EG
    p_att: Param, p_dec: Param, p_sus: Param, p_rel: Param,
    p_hold: Param, // Added basic hold time logic? Or just standard ADSR
    
    // VCA & Global
    p_vol: Param,
    p_glide: Param,
    
    // State
    curr_freq: f32,
    target_freq: f32,
    gate: bool,
    
    // internal
    mod_wheel: f32,
}

#[wasm_bindgen]
impl BvstSynth {
    pub fn new(sample_rate: f32) -> BvstSynth {
        BvstSynth {
            sample_rate,
            osc: Oscillator::new(sample_rate),
            noise: NoiseGen::new(),
            filter: Svf::new(sample_rate),
            lfo: Oscillator::new(sample_rate),
            env: Adsr::new(sample_rate),
            
            p_wave: 1.0, // Saw
            p_octave: 0.0, // 0 = normal
            p_pwm: Param::new(Curve::Linear{min:0.0,max:1.0}, 0.5),
            
            p_cut: Param::new(Curve::Exponential{min:20.,max:20000.}, 1000.0),
            p_peak: Param::new(Curve::Linear{min:0.0,max:10.0}, 2.0),
            p_eg_amt: Param::new(Curve::Linear{min:-5000.0,max:5000.0}, 0.0),
            p_mg_amt: Param::new(Curve::Linear{min:0.0,max:5000.0}, 0.0),
            
            p_mg_wave: 0.0, // Tri
            p_mg_rate: Param::new(Curve::Exponential{min:0.1,max:50.0}, 5.0),
            p_mg_vco_amt: Param::new(Curve::Linear{min:0.0,max:12.0}, 0.0), // Semitones
            
            p_att: Param::new(Curve::Linear{min:0.001,max:3.0}, 0.01),
            p_dec: Param::new(Curve::Linear{min:0.001,max:3.0}, 0.4),
            p_sus: Param::new(Curve::Linear{min:0.0,max:1.0}, 0.5),
            p_rel: Param::new(Curve::Linear{min:0.001,max:5.0}, 0.5),
            p_hold: Param::new(Curve::Linear{min:0.0,max:1.0}, 0.0),
            
            p_vol: Param::new(Curve::Squared{min:0.0,max:1.0}, 0.5),
            p_glide: Param::new(Curve::Linear{min:0.0,max:1.0}, 0.0),
            
            curr_freq: 440.0, target_freq: 440.0, gate: false, mod_wheel: 0.0,
        }
    }

    pub fn set_param(&mut self, id: u32, value: f32) {
        match id {
            // VCO
            1 => self.p_wave = value,
            2 => self.p_octave = value, // -2 to +1 range
            3 => self.p_pwm.set(value),
            
            // VCF
            4 => self.p_cut.set(value),
            5 => self.p_peak.set(value),
            6 => self.p_eg_amt.set(value),
            7 => self.p_mg_amt.set(value),
            
            // MG
            8 => self.p_mg_rate.set(value),
            9 => self.p_mg_wave = value,
            10 => self.p_mg_vco_amt.set(value),
            
            // EG
            11 => { self.p_att.set(value); self.update_env(); },
            12 => { self.p_dec.set(value); self.update_env(); },
            13 => { self.p_sus.set(value); self.update_env(); },
            14 => { self.p_rel.set(value); self.update_env(); },
            
            // Global
            15 => self.p_vol.set(value),
            16 => self.p_glide.set(value),
            
            // Performance
            26 => self.target_freq = value,
            27 => {
                self.gate = value > 0.5;
                self.env.trigger(self.gate);
                // If glide is 0, snap
                if self.p_glide.get() <= 0.001 && self.gate {
                     self.curr_freq = self.target_freq;
                }
            },
            
            _ => {}
        }
    }
    
    fn update_env(&mut self) {
        self.env.a = self.p_att.val_norm; // Direct access? Param stores norm/smooth.
        // Param.set() updates val_norm. But Param.process() returns mapped.
        // We need mapped values for ADSR.
        // Let's assume set_param updates val_norm, and we use `process()` inside audio loop 
        // to get smoothed mapped value? Or just use mapped now?
        // For Envelope times, smoothing is bad (zipper noise on time change isn't issue, but delay is).
        // Let's read .get() (which is smoothed) or re-map.
        // Simpler: Update env in process loop.
    }

    pub fn process(&mut self, output: &mut [f32]) {
        for sample in output.iter_mut() {
            // 1. Process Params
            let pwm = self.p_pwm.process();
            let cut_base = self.p_cut.process();
            let res = self.p_peak.process();
            let eg_to_cut = self.p_eg_amt.process();
            let mg_to_cut = self.p_mg_amt.process();
            let mg_rate = self.p_mg_rate.process();
            let mg_to_pitch = self.p_mg_vco_amt.process();
            let vol = self.p_vol.process();
            let glide = self.p_glide.process();
            
            // Env Times
            self.env.a = self.p_att.process();
            self.env.d = self.p_dec.process();
            self.env.s = self.p_sus.process();
            self.env.r = self.p_rel.process();
            
            // Glide
            if glide > 0.0 {
                let diff = self.target_freq - self.curr_freq;
                // Simple exp approach
                self.curr_freq += diff * (1.0 / (glide * self.sample_rate * 0.5 + 1.0));
            } else {
                self.curr_freq = self.target_freq;
            }
            
            // LFO (MG)
            let mg_w = if self.p_mg_wave < 0.5 { WaveType::Triangle } else { WaveType::Square };
            let mg_val = self.lfo.next_simple(mg_rate, mg_w);
            
            // Env
            let eg_val = self.env.next();
            
            // Osc
            let pitch_mod = mg_val * mg_to_pitch; // Semitones
            let freq = self.curr_freq * 2.0_f32.powf((self.p_octave + pitch_mod) / 12.0);
            
            let sig = if self.p_wave > 2.5 { // Noise
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
            let cut_mod = cut_base + (eg_val * eg_to_cut) + (mg_val * mg_to_cut);
            let cut = dsp::clamp(cut_mod, 20.0, 20000.0);
            
            // MS-10 filter is Lowpass 12db/oct usually, but rough.
            // SVF process is 12dB LP.
            // Add some drive before filter?
            let drive_sig = sig * 1.5; 
            let mut filtered = self.filter.process(drive_sig, cut, res);
            
            // VCA (Controlled by EG)
            filtered *= eg_val * vol;
            
            *sample = filtered.tanh(); // Output saturation
        }
    }
}
