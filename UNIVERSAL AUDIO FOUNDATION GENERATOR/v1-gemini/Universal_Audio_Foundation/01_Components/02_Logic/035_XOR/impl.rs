use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct XORNode;

impl XORNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for XORNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 35,
            name: "XOR",
            category: "02_Logic",
            inputs: &[
                InputDescriptor { name: "Input A", min: 0.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Input B", min: 0.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Boolean" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 { return; }
        let a = inputs[0] > 0.0;
        let b = inputs[1] > 0.0;
        outputs[0] = if a != b { 1.0 } else { 0.0 };
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_math_accuracy() {
        let mut node = XORNode::new();
        let mut out = [0.0];
        node.process(&[1.0, 0.0], &mut out, 44100.0);
        assert_eq!(out[0], 1.0);
        node.process(&[1.0, 1.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
    }
}