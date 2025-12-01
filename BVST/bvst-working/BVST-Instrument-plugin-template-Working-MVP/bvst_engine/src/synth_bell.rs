use std::f32::consts::PI;
use crate::plugin_trait::BvstPlugin;

// Synth 4: Additive Bell
// Sum of inharmonic sine waves
pub struct BellSynth {
    sample_rate: f32,
    phases: [f32; 4],
    frequency: f32,
    gain: f32,
}

impl BvstPlugin for BellSynth {
    fn new(sample_rate: f32) -> Self {
        BellSynth { 
            sample_rate,
            phases: [0.0; 4],
            frequency: 440.0,
            gain: 0.5,
        }
    }

    fn set_param(&mut self, id: u32, value: f32) {
        match id {
            0 => self.frequency = value,
            1 => self.gain = value,
            _ => {}
        }
    }

    fn process(&mut self, _input: &[f32], output: &mut [f32]) {
        // Ratios for bell-like sound
        let ratios = [1.0, 2.0, 3.0, 4.2];
        let amps = [1.0, 0.5, 0.3, 0.2];

        for sample in output.iter_mut() {
            let mut sum = 0.0;
            for i in 0..4 {
                sum += (self.phases[i] * 2.0 * PI).sin() * amps[i];
                
                // Increment phase
                self.phases[i] += (self.frequency * ratios[i]) / self.sample_rate;
                if self.phases[i] > 1.0 { self.phases[i] -= 1.0; }
            }
            *sample = (sum / 2.0) * self.gain; // Normalize roughly
        }
    }
}
