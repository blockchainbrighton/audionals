use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct VCANode;

impl VCANode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for VCANode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 122,
            name: "VCA",
            category: "09_Effects",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Gain", min: 0.0, max: 10.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Output" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 { return; }
        let input = inputs[0];
        let gain = inputs[1];
        
        let mut y = input * gain;

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
    fn test_vca_unity() {
        let mut node = VCANode::new();
        let mut out = [0.0];
        
        // Gain 1.0
        node.process(&[0.5, 1.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.5);
    }

    #[test]
    fn test_vca_silence_default() {
        let mut node = VCANode::new();
        let mut out = [0.0];

        // Gain 0.0
        node.process(&[0.5, 0.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
    }

    #[test]
    fn test_vca_amplification() {
        let mut node = VCANode::new();
        let mut out = [0.0];

        // Gain 2.0
        node.process(&[0.5, 2.0], &mut out, 44100.0);
        assert_eq!(out[0], 1.0);
    }

    #[test]
    fn test_vca_denormal() {
        let mut node = VCANode::new();
        let mut out = [0.0];
        
        let denormal = 1.0e-320;
        node.process(&[denormal, 1.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
    }
}