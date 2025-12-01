use crate::plugin_trait::BvstPlugin;

// Synth 3: Filtered Noise
// ID 2 -> Filter Cutoff
pub struct NoiseSynth {
    sample_rate: f32,
    gain: f32,
    cutoff: f32,
    last_val: f32,
    seed: u32,
}

impl BvstPlugin for NoiseSynth {
    fn new(sample_rate: f32) -> Self {
        NoiseSynth { 
            sample_rate,
            gain: 0.5,
            cutoff: 5000.0,
            last_val: 0.0,
            seed: 12345,
        }
    }

    fn set_param(&mut self, id: u32, value: f32) {
        match id {
            1 => self.gain = value,
            2 => self.cutoff = value.max(50.0),
            _ => {} // Freq ignored for pure noise
        }
    }

    fn process(&mut self, _input: &[f32], output: &mut [f32]) {
        for sample in output.iter_mut() {
            // Linear Congruential Generator for noise
            self.seed = self.seed.wrapping_mul(1103515245).wrapping_add(12345);
            let noise = (self.seed as f32 / u32::MAX as f32) * 2.0 - 1.0;

            // Simple Low Pass
            let alpha = (2.0 * std::f32::consts::PI * self.cutoff / self.sample_rate).min(1.0);
            self.last_val = self.last_val + alpha * (noise - self.last_val);

            *sample = self.last_val * self.gain;
        }
    }
}
