use wasm_bindgen::prelude::*;
use bvst_lib::{bvst_plugin, Param, Curve, dsp::{self, Oscillator, Svf, Adsr, Reverb, WaveType}};

bvst_plugin! {
    struct BvstSynth {
        osc_carrier: Oscillator,
        osc_modulator: Oscillator,
        lfo_tremolo: Oscillator,
        env: Adsr,
        filter: Svf,
        reverb: Reverb,
        
        curr_freq: f32,
        gate: bool,
    }

    init_fields (sample_rate) {
        osc_carrier = Oscillator::new(sample_rate),
        osc_modulator = Oscillator::new(sample_rate),
        lfo_tremolo = Oscillator::new(sample_rate),
        env = Adsr::new(sample_rate),
        filter = Svf::new(sample_rate),
        reverb = Reverb::new(sample_rate),
        
        curr_freq = 440.0, gate = false
    }

    params {
        1: p_fm_amt     = Linear(0.0, 500.0, 100.0),
        2: p_trem_rate  = Exponential(0.5, 15.0, 4.0),
        3: p_trem_depth = Linear(0.0, 0.8, 0.0),
        4: p_tone       = Exponential(200.0, 10000.0, 2000.0),
        5: p_decay      = Linear(0.1, 3.0, 1.0),
        6: p_vol        = Squared(0.0, 1.0, 0.5),
        7: p_verb       = Linear(0.0, 0.6, 0.1),
    }

    impl BvstSynth {
        fn custom_param(&mut self, id: u32, value: f32) {
            match id {
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
                let v_fm = self.p_fm_amt.process();
                let v_trem_rate = self.p_trem_rate.process();
                let v_trem_depth = self.p_trem_depth.process();
                let v_tone = self.p_tone.process();
                let v_decay = self.p_decay.process();
                let v_vol = self.p_vol.process();
                let v_verb = self.p_verb.process();
                
                // Env
                self.env.d = v_decay;
                let env_val = self.env.next();
                
                // LFO
                let trem_osc = self.lfo_tremolo.next_simple(v_trem_rate, WaveType::Sine);
                let tremolo = 1.0 - (v_trem_depth * (trem_osc * 0.5 + 0.5));

                // FM
                let mod_out = self.osc_modulator.next_simple(self.curr_freq * 4.0, WaveType::Sine);
                let carrier_freq = self.curr_freq + (mod_out * v_fm);
                let signal = self.osc_carrier.next_simple(carrier_freq, WaveType::Sine);
                
                // Filter
                let filtered = self.filter.process(signal, v_tone, 0.0);
                
                let dry = filtered * env_val * tremolo;
                let wet = self.reverb.process(dry, v_verb, 0.8);

                *sample = wet * v_vol;
            }
        }
    }
}
