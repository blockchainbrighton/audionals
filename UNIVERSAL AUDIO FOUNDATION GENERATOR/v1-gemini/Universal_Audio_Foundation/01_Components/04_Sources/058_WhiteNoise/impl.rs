use crate::traits::{AudioNode, AudioNodeMetadata, OutputDescriptor};

pub struct WhiteNoiseNode {
    seed: u64,
}

impl WhiteNoiseNode {
    pub fn new() -> Self {
        Self { seed: 123456789 }
    }

    // Simple LCG
    fn next_random(&mut self) -> f64 {
        self.seed = self.seed.wrapping_mul(6364136223846793005).wrapping_add(1);
        let float_val = (self.seed >> 11) as f64 * (1.0 / 9007199254740992.0); // 2^-53
        float_val * 2.0 - 1.0 // Map 0..1 to -1..1
    }
}

impl AudioNode for WhiteNoiseNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 58,
            name: "WhiteNoise",
            category: "04_Sources",
            inputs: &[],
            outputs: &[
                OutputDescriptor { name: "Noise" },
            ],
        }
    }

    fn process(&mut self, _inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        outputs[0] = self.next_random();
    }

    fn reset(&mut self) {
        self.seed = 123456789;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_determinism() {
        let mut node = WhiteNoiseNode::new();
        let mut out1 = [0.0];
        let mut out2 = [0.0];
        
        node.process(&[], &mut out1, 44100.0);
        node.reset();
        node.process(&[], &mut out2, 44100.0);
        
        assert_eq!(out1[0], out2[0]);
    }

    #[test]
    fn test_range() {
        let mut node = WhiteNoiseNode::new();
        let mut out = [0.0];
        for _ in 0..1000 {
            node.process(&[], &mut out, 44100.0);
            assert!(out[0] >= -1.0 && out[0] <= 1.0);
        }
    }
}