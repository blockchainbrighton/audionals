use std::f32::consts::PI;
use crate::plugin_trait::BvstPlugin;

// Synth 6: Kick Drum
// Sine wave with rapid pitch drop
// ID 4 (LFO Rate) -> Trigger speed (auto-trigger for testing)
pub struct KickSynth {
    sample_rate: f32,
    phase: f32,
    env_time: f32, // Time since trigger
    trigger_period: f32,
    gain: f32,
}

impl BvstPlugin for KickSynth {
    fn new(sample_rate: f32) -> Self {
        KickSynth { 
            sample_rate,
            phase: 0.0,
            env_time: 0.0,
            trigger_period: 1.0, // 1 second
            gain: 0.5,
        }
    }

    fn set_param(&mut self, id: u32, value: f32) {
        match id {
            1 => self.gain = value,
            4 => self.trigger_period = if value > 0.1 { 1.0 / value } else { 2.0 },
            _ => {}
        }
    }

    fn process(&mut self, _input: &[f32], output: &mut [f32]) {
        for sample in output.iter_mut() {
            // Pitch envelope: Start high (150Hz), drop to low (50Hz) exponentially
            let freq = 50.0 + 150.0 * (-10.0 * self.env_time).exp();
            
            // Amp envelope: Short decay
            let amp = (-5.0 * self.env_time).exp().max(0.0);
            
            let val = (self.phase * 2.0 * PI).sin();
            *sample = val * amp * self.gain;

            self.phase += freq / self.sample_rate;
            if self.phase > 1.0 { self.phase -= 1.0; }

            self.env_time += 1.0 / self.sample_rate;
            
            // Auto re-trigger
            if self.env_time > self.trigger_period {
                self.env_time = 0.0;
                self.phase = 0.0;
            }
        }
    }
}
