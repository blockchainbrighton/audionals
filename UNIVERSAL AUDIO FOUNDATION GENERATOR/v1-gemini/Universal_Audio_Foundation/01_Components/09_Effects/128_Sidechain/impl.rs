use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct SidechainNode;

impl SidechainNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for SidechainNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 128,
            name: "Sidechain",
            category: "09_Effects",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Key", min: 0.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Threshold", min: 0.0, max: 1.0, default: 0.5 },
                InputDescriptor { name: "Ratio", min: 0.0, max: 10.0, default: 1.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Output" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 4 { return; }
        
        let input = inputs[0];
        let key = inputs[1].abs(); // Ensure key is magnitude
        let threshold = inputs[2].max(0.0);
        let ratio = inputs[3].max(0.0);

        // Instantaneous Ducking
        // Calculate amount key exceeds threshold
        let over = (key - threshold).max(0.0);
        
        // Apply reduction scaled by ratio
        // Gain starts at 1.0 and reduces
        let reduction = over * ratio;
        let gain = (1.0 - reduction).max(0.0);

        let mut y = input * gain;

        // Denormal handling
        if y.is_subnormal() { y = 0.0; }

        outputs[0] = y;
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sidechain_below_threshold() {
        let mut node = SidechainNode::new();
        let mut out = [0.0];
        
        // Input 1.0, Key 0.2, Threshold 0.5. Key < Threshold -> Gain 1.0
        node.process(&[1.0, 0.2, 0.5, 1.0], &mut out, 44100.0);
        assert_eq!(out[0], 1.0);
    }

    #[test]
    fn test_sidechain_ducking() {
        let mut node = SidechainNode::new();
        let mut out = [0.0];
        
        // Input 1.0, Key 0.8, Threshold 0.5, Ratio 1.0
        // Over = 0.8 - 0.5 = 0.3
        // Reduction = 0.3 * 1.0 = 0.3
        // Gain = 1.0 - 0.3 = 0.7
        // Output = 1.0 * 0.7 = 0.7
        node.process(&[1.0, 0.8, 0.5, 1.0], &mut out, 44100.0);
        assert!((out[0] - 0.7).abs() < 1e-9);
    }

    #[test]
    fn test_sidechain_full_duck() {
        let mut node = SidechainNode::new();
        let mut out = [0.0];
        
        // Key 1.0, Threshold 0.0, Ratio 1.0 -> Over 1.0 -> Reduction 1.0 -> Gain 0.0
        node.process(&[1.0, 1.0, 0.0, 1.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
    }

    #[test]
    fn test_sidechain_denormal() {
        let mut node = SidechainNode::new();
        let mut out = [0.0];
        
        let denormal = 1.0e-320;
        node.process(&[denormal, 0.0, 0.5, 1.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
    }
}