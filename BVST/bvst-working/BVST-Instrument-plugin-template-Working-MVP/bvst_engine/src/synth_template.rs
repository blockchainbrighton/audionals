use crate::plugin_trait::BvstPlugin;

pub struct TemplateSynth {
    sample_rate: f32,
    // Add your state here (e.g., phase, frequency, gain)
    phase: f32,
    frequency: f32,
    gain: f32,
}

impl TemplateSynth {
    pub fn new(sample_rate: f32) -> Self {
        TemplateSynth {
            sample_rate,
            phase: 0.0,
            frequency: 440.0,
            gain: 0.5,
        }
    }
}

impl BvstPlugin for TemplateSynth {
    fn new(sample_rate: f32) -> Self {
        TemplateSynth::new(sample_rate)
    }

    fn set_param(&mut self, id: u32, value: f32) {
        match id {
            0 => self.frequency = value,
            1 => self.gain = value,
            // Add more parameters here
            _ => {}
        }
    }

    fn process(&mut self, _input: &[f32], output: &mut [f32]) {
        for sample in output.iter_mut() {
            // Simple Sine Wave Example
            *sample = (self.phase * 2.0 * std::f32::consts::PI).sin() * self.gain;

            // Advance phase
            self.phase += self.frequency / self.sample_rate;
            if self.phase > 1.0 {
                self.phase -= 1.0;
            }
        }
    }
}
