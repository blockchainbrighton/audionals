use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct BitcrushNode;

impl BitcrushNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for BitcrushNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 119,
            name: "Bitcrush",
            category: "09_Effects",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Bits", min: 1.0, max: 24.0, default: 16.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Output" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 { return; }
        let x = inputs[0];
        let bits = inputs[1].max(1.0).min(64.0); // Allow higher bits but practically limited by f64 precision

        let levels = 2.0f64.powf(bits);
        let mut y = (x * levels).round() / levels;
        
        // Denormal handling
        if y.is_subnormal() {
            y = 0.0;
        }
        outputs[0] = y;
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bitcrush_1bit() {
        let mut node = BitcrushNode::new();
        let mut out = [0.0];
        
        // 1 bit: levels = 2. Steps: 0.0, 0.5, 1.0
        // 0.4 * 2 = 0.8 -> round 1 -> 0.5
        node.process(&[0.4, 1.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.5);
        
        // -0.4 * 2 = -0.8 -> round -1 -> -0.5
        node.process(&[-0.4, 1.0], &mut out, 44100.0);
        assert_eq!(out[0], -0.5);
    }

    #[test]
    fn test_bitcrush_high_bits() {
        let mut node = BitcrushNode::new();
        let mut out = [0.0];

        // High bit depth should basically preserve the signal
        node.process(&[0.5, 24.0], &mut out, 44100.0);
        assert!((out[0] - 0.5).abs() < 1e-6);
    }

    #[test]
    fn test_bitcrush_denormal() {
        let mut node = BitcrushNode::new();
        let mut out = [0.0];

        let denormal = 1.0e-320;
        node.process(&[denormal, 16.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
    }
}
