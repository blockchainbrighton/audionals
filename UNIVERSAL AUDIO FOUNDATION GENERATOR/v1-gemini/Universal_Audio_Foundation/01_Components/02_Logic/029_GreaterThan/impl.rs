use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct GreaterThanNode;

impl GreaterThanNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for GreaterThanNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 29,
            name: "GreaterThan",
            category: "02_Logic",
            inputs: &[
                InputDescriptor { name: "Input A", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Input B", min: -1.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Boolean" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 { return; }
        outputs[0] = if inputs[0] > inputs[1] { 1.0 } else { 0.0 };
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_math_accuracy() {
        let mut node = GreaterThanNode::new();
        let mut out = [0.0];
        node.process(&[0.5, 0.2], &mut out, 44100.0);
        assert_eq!(out[0], 1.0);
        node.process(&[0.2, 0.5], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
        node.process(&[0.5, 0.5], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
    }
}