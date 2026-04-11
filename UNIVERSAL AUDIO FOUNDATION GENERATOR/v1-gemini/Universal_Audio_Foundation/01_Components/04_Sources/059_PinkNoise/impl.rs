use crate::traits::{AudioNode, AudioNodeMetadata, OutputDescriptor};

pub struct PinkNoiseNode {
    seed: u64,
    // Paul Kellett's method variables
    b0: f64, b1: f64, b2: f64, b3: f64, b4: f64, b5: f64, b6: f64,
}

impl PinkNoiseNode {
    pub fn new() -> Self {
        Self { 
            seed: 2463534242,
            b0: 0.0, b1: 0.0, b2: 0.0, b3: 0.0, b4: 0.0, b5: 0.0, b6: 0.0 
        }
    }

    fn next_white(&mut self) -> f64 {
        self.seed = self.seed.wrapping_mul(6364136223846793005).wrapping_add(1);
        let float_val = (self.seed >> 11) as f64 * (1.0 / 9007199254740992.0);
        float_val * 2.0 - 1.0
    }
}

impl AudioNode for PinkNoiseNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 59,
            name: "PinkNoise",
            category: "04_Sources",
            inputs: &[],
            outputs: &[
                OutputDescriptor { name: "Noise" },
            ],
        }
    }

    fn process(&mut self, _inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        let white = self.next_white();
        
        self.b0 = 0.99886 * self.b0 + white * 0.0555179;
        self.b1 = 0.99332 * self.b1 + white * 0.0750759;
        self.b2 = 0.96900 * self.b2 + white * 0.1538520;
        self.b3 = 0.86650 * self.b3 + white * 0.3104856;
        self.b4 = 0.55000 * self.b4 + white * 0.5329522;
        self.b5 = -0.7616 * self.b5 - white * 0.0168980;
        
        let pink = self.b0 + self.b1 + self.b2 + self.b3 + self.b4 + self.b5 + self.b6 + white * 0.5362;
        self.b6 = white * 0.115926;
        
        // Approx range adjustment (Paul's method output is ~0.11 gain of white? No it sums up.)
        // Usually needs scaling to roughly -1..1
        outputs[0] = pink * 0.11; 
    }

    fn reset(&mut self) {
        self.seed = 2463534242;
        self.b0 = 0.0; self.b1 = 0.0; self.b2 = 0.0; 
        self.b3 = 0.0; self.b4 = 0.0; self.b5 = 0.0; self.b6 = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_determinism() {
        let mut node = PinkNoiseNode::new();
        let mut out1 = [0.0];
        let mut out2 = [0.0];
        
        node.process(&[], &mut out1, 44100.0);
        node.reset();
        node.process(&[], &mut out2, 44100.0);
        
        assert_eq!(out1[0], out2[0]);
    }
}