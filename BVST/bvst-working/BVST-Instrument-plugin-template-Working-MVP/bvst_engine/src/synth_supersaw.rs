use crate::plugin_trait::BvstPlugin;

// Synth 7: Super Saw
// 3 Sawtooth waves slightly detuned
// ID 2 -> Detune Amount
pub struct SuperSawSynth {
    sample_rate: f32,
    phases: [f32; 3],
    frequency: f32,
    detune: f32,
    gain: f32,
}

impl BvstPlugin for SuperSawSynth {
    fn new(sample_rate: f32) -> Self {
        SuperSawSynth { 
            sample_rate,
            phases: [0.0, 0.0, 0.0],
            frequency: 110.0,
            detune: 0.01,
            gain: 0.5,
        }
    }

    fn set_param(&mut self, id: u32, value: f32) {
        match id {
            0 => self.frequency = value,
            1 => self.gain = value,
            2 => self.detune = (value / 10000.0).max(0.0), // Small detune
            _ => {}
        }
    }

    fn process(&mut self, _input: &[f32], output: &mut [f32]) {
        for sample in output.iter_mut() {
            let mut sum = 0.0;
            let detunes = [1.0, 1.0 - self.detune, 1.0 + self.detune];
            
            for i in 0..3 {
                // Naive saw: 2*p - 1
                sum += 2.0 * self.phases[i] - 1.0;
                
                self.phases[i] += (self.frequency * detunes[i]) / self.sample_rate;
                if self.phases[i] > 1.0 { self.phases[i] -= 1.0; }
            }
            
            *sample = (sum / 3.0) * self.gain;
        }
    }
}
