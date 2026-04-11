use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct SoftClipNode;

impl SoftClipNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for SoftClipNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 118,
            name: "SoftClip",
            category: "09_Effects",
            inputs: &[
                InputDescriptor { name: "Input", min: -100.0, max: 100.0, default: 0.0 },
                InputDescriptor { name: "Drive", min: 0.0, max: 100.0, default: 1.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Output" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 { return; }
        let x = inputs[0];
        let drive = inputs[1].max(0.0);

        // Simple tanh soft clipper: y = tanh(x * drive)
        let mut y = (x * drive).tanh();

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
    fn test_soft_clip_unity_drive() {
        let mut node = SoftClipNode::new();
        let mut out = [0.0];
        
        // tanh(0) = 0
        node.process(&[0.0, 1.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);

        // tanh(1) approx 0.76159
        node.process(&[1.0, 1.0], &mut out, 44100.0);
        assert!((out[0] - 0.7615941559557649).abs() < 1e-9);
    }

    #[test]
    fn test_soft_clip_high_drive() {
        let mut node = SoftClipNode::new();
        let mut out = [0.0];

        // tanh(0.1 * 10) = tanh(1)
        node.process(&[0.1, 10.0], &mut out, 44100.0);
        assert!((out[0] - 0.7615941559557649).abs() < 1e-9);
    }

    #[test]
    fn test_soft_clip_denormal() {
        let mut node = SoftClipNode::new();
        let mut out = [0.0];
        
        // very small input -> linear region -> very small output
        let denormal = 1.0e-320;
        node.process(&[denormal, 1.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
    }
}
