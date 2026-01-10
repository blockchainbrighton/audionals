use crate::traits::{AudioNode, AudioNodeMetadata, OutputDescriptor};

pub struct BrownNoiseNode {
    seed: u64,
    last_out: f64,
}

impl BrownNoiseNode {
    pub fn new() -> Self {
        Self { 
            seed: 987654321,
            last_out: 0.0,
        }
    }

    fn next_white(&mut self) -> f64 {
        self.seed = self.seed.wrapping_mul(6364136223846793005).wrapping_add(1);
        let float_val = (self.seed >> 11) as f64 * (1.0 / 9007199254740992.0);
        float_val * 2.0 - 1.0
    }
}

impl AudioNode for BrownNoiseNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 60,
            name: "BrownNoise",
            category: "04_Sources",
            inputs: &[],
            outputs: &[
                OutputDescriptor { name: "Noise" },
            ],
        }
    }

    fn process(&mut self, _inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        let white = self.next_white();
        
        // Leaky integrator to prevent drift
        let leak = 0.995;
        let val = (self.last_out * leak) + (white * 0.05); // scaling for amplitude
        
        self.last_out = val.clamp(-1.0, 1.0);
        outputs[0] = self.last_out;
    }

    fn reset(&mut self) {
        self.seed = 987654321;
        self.last_out = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_determinism() {
        let mut node = BrownNoiseNode::new();
        let mut out1 = [0.0];
        let mut out2 = [0.0];
        
        node.process(&[], &mut out1, 44100.0);
        node.reset();
        node.process(&[], &mut out2, 44100.0);
        
        assert_eq!(out1[0], out2[0]);
    }
}