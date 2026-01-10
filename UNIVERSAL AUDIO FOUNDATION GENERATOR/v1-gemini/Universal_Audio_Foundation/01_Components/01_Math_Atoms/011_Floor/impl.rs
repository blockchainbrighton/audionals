use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct FloorNode;

impl FloorNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for FloorNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 11,
            name: "Floor",
            category: "01_Math_Atoms",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Floor" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.is_empty() { return; }
        outputs[0] = inputs[0].floor();
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_instantiation_and_metadata() {
        let node = FloorNode::new();
        assert_eq!(node.metadata().name, "Floor");
    }

    #[test]
    fn test_math_accuracy() {
        let mut node = FloorNode::new();
        let mut out = [0.0];
        node.process(&[0.9], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
        node.process(&[-0.1], &mut out, 44100.0);
        assert_eq!(out[0], -1.0);
    }

    #[test]
    fn test_determinism() {
        let mut node = FloorNode::new();
        let mut out1 = [0.0];
        let mut out2 = [0.0];
        node.process(&[0.5], &mut out1, 44100.0);
        node.reset();
        node.process(&[0.5], &mut out2, 44100.0);
        assert_eq!(out1, out2);
    }
}