use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct NOTNode;

impl NOTNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for NOTNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 36,
            name: "NOT",
            category: "02_Logic",
            inputs: &[
                InputDescriptor { name: "Input", min: 0.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Boolean" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.is_empty() { return; }
        outputs[0] = if inputs[0] > 0.0 { 0.0 } else { 1.0 };
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_math_accuracy() {
        let mut node = NOTNode::new();
        let mut out = [0.0];
        node.process(&[1.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
        node.process(&[0.0], &mut out, 44100.0);
        assert_eq!(out[0], 1.0);
    }
}