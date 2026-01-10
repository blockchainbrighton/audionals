use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct ProbabilityNode {
    seed: u64,
}

impl ProbabilityNode {
    pub fn new() -> Self {
        Self { seed: 12345 } // Fixed seed for determinism
    }

    fn next_rand(&mut self) -> f64 {
        // LCG
        self.seed = self.seed.wrapping_mul(6364136223846793005).wrapping_add(1);
        (self.seed >> 32) as f64 / 4294967296.0
    }
}

impl AudioNode for ProbabilityNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 112,
            name: "Probability",
            category: "08_Timing",
            inputs: &[
                InputDescriptor { name: "Trigger", min: 0.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Chance", min: 0.0, max: 1.0, default: 0.5 },
            ],
            outputs: &[
                OutputDescriptor { name: "Trigger" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 { return; }
        let trigger = inputs[0];
        let chance = inputs[1].clamp(0.0, 1.0);

        let mut out = 0.0;
        // On input trigger, decide if we pass it
        if trigger > 0.5 {
            if self.next_rand() < chance {
                out = trigger;
            }
        }

        outputs[0] = out;
    }

    fn reset(&mut self) {
        self.seed = 12345;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_probability_determinism() {
        let mut node = ProbabilityNode::new();
        let mut out = [0.0];
        node.process(&[1.0, 0.5], &mut out, 44100.0);
        let first = out[0];
        
        node.reset();
        node.process(&[1.0, 0.5], &mut out, 44100.0);
        assert_eq!(out[0], first);
    }
}