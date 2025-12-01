use std::f32::consts::PI;
use crate::plugin_trait::BvstPlugin;

pub struct AlienSynth {
    sample_rate: f32,
    phase_carrier: f32,
    phase_mod: f32,
    phase_lfo: f32,
    frequency: f32,
    gain: f32,
    fm_depth: f32,
    fm_ratio: f32,
    lfo_rate: f32,
}

impl BvstPlugin for AlienSynth {
    fn new(sample_rate: f32) -> Self {
        AlienSynth { 
            sample_rate,
            phase_carrier: 0.0,
            phase_mod: 0.0,
            phase_lfo: 0.0,
            frequency: 110.0,
            gain: 0.5,
            fm_depth: 500.0,
            fm_ratio: 2.0,
            lfo_rate: 0.5,
        }
    }

    fn set_param(&mut self, id: u32, value: f32) {
        match id {
            0 => self.frequency = value,
            1 => self.gain = value,
            2 => self.fm_depth = value,
            3 => self.fm_ratio = value,
            4 => self.lfo_rate = value,
            _ => {}
        }
    }

    fn process(&mut self, _input: &[f32], output: &mut [f32]) {
        for sample in output.iter_mut() {
            let lfo_val = (self.phase_lfo * 2.0 * PI).sin(); 
            let current_fm_depth = self.fm_depth + (lfo_val * (self.fm_depth * 0.5));
            let mod_val = (self.phase_mod * 2.0 * PI).sin() * current_fm_depth;
            let carrier_signal = ((self.phase_carrier * 2.0 * PI) + mod_val).sin();
            let raw_out = (carrier_signal * 1.5).tanh();

            *sample = raw_out * self.gain;
            
            self.phase_carrier += self.frequency / self.sample_rate;
            if self.phase_carrier > 1.0 { self.phase_carrier -= 1.0; }

            self.phase_mod += (self.frequency * self.fm_ratio) / self.sample_rate;
            if self.phase_mod > 1.0 { self.phase_mod -= 1.0; }

            self.phase_lfo += self.lfo_rate / self.sample_rate;
            if self.phase_lfo > 1.0 { self.phase_lfo -= 1.0; }
        }
    }
}
