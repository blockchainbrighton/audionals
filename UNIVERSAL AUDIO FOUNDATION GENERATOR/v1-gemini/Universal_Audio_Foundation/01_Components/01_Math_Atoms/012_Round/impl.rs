use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct RoundNode;

impl RoundNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for RoundNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 12,
            name: "Round",
            category: "01_Math_Atoms",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Rounded" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.is_empty() { return; }
        outputs[0] = inputs[0].round();
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_instantiation_and_metadata() {
        let node = RoundNode::new();
        assert_eq!(node.metadata().name, "Round");
    }

    #[test]
    fn test_math_accuracy() {
        let mut node = RoundNode::new();
        let mut out = [0.0];
        node.process(&[0.6], &mut out, 44100.0);
        assert_eq!(out[0], 1.0);
        node.process(&[0.4], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
    }

    #[test]
    fn test_determinism() {
        let mut node = RoundNode::new();
        let mut out1 = [0.0];
        let mut out2 = [0.0];
        node.process(&[0.5], &mut out1, 44100.0);
        node.reset();
        node.process(&[0.5], &mut out2, 44100.0);
        assert_eq!(out1, out2);
    }
}