use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct MinNode;

impl MinNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for MinNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 14,
            name: "Min",
            category: "01_Math_Atoms",
            inputs: &[
                InputDescriptor { name: "Input A", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Input B", min: -1.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Minimum" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 { return; }
        outputs[0] = inputs[0].min(inputs[1]);
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_instantiation_and_metadata() {
        let node = MinNode::new();
        assert_eq!(node.metadata().name, "Min");
    }

    #[test]
    fn test_math_accuracy() {
        let mut node = MinNode::new();
        let mut out = [0.0];
        node.process(&[0.5, 0.2], &mut out, 44100.0);
        assert_eq!(out[0], 0.2);
        node.process(&[-0.5, 0.2], &mut out, 44100.0);
        assert_eq!(out[0], -0.5);
    }
}