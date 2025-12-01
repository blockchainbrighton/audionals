use std::f32::consts::PI;
use crate::plugin_trait::BvstPlugin;

// Synth 10: Ring Modulation
// Carrier multiplied by Modulator (Amplitude Modulation at audio rates)
// ID 2 -> Modulator Frequency (independent or ratio)
// ID 3 -> Mix (Dry/Wet)
pub struct RingModSynth {
    sample_rate: f32,
    phase_carrier: f32,
    phase_mod: f32,
    frequency: f32,
    mod_freq: f32,
    mix: f32,
    gain: f32,
}

impl BvstPlugin for RingModSynth {
    fn new(sample_rate: f32) -> Self {
        RingModSynth { 
            sample_rate,
            phase_carrier: 0.0,
            phase_mod: 0.0,
            frequency: 440.0,
            mod_freq: 100.0,
            mix: 1.0,
            gain: 0.5,
        }
    }

    fn set_param(&mut self, id: u32, value: f32) {
        match id {
            0 => self.frequency = value,
            1 => self.gain = value,
            2 => self.mod_freq = value,
            3 => self.mix = (value / 10.0).min(1.0), // Normalize if range is large
            _ => {}
        }
    }

    fn process(&mut self, _input: &[f32], output: &mut [f32]) {
        for sample in output.iter_mut() {
            let carrier = (self.phase_carrier * 2.0 * PI).sin();
            let modulator = (self.phase_mod * 2.0 * PI).sin();
            
            let ring = carrier * modulator;
            let out = carrier * (1.0 - self.mix) + ring * self.mix;
            
            *sample = out * self.gain;

            self.phase_carrier += self.frequency / self.sample_rate;
            if self.phase_carrier > 1.0 { self.phase_carrier -= 1.0; }

            self.phase_mod += self.mod_freq / self.sample_rate;
            if self.phase_mod > 1.0 { self.phase_mod -= 1.0; }
        }
    }
}
