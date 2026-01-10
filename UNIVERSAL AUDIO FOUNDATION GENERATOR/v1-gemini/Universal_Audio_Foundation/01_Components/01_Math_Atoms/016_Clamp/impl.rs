use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct ClampNode;

impl ClampNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for ClampNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 16,
            name: "Clamp",
            category: "01_Math_Atoms",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Min", min: -1.0, max: 1.0, default: -1.0 },
                InputDescriptor { name: "Max", min: -1.0, max: 1.0, default: 1.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Clamped" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 3 { return; }
        let val = inputs[0];
        let min = inputs[1];
        let max = inputs[2];
        outputs[0] = val.clamp(min, max);
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_math_accuracy() {
        let mut node = ClampNode::new();
        let mut out = [0.0];
        node.process(&[1.5, -1.0, 1.0], &mut out, 44100.0);
        assert_eq!(out[0], 1.0);
        node.process(&[-2.0, -1.0, 1.0], &mut out, 44100.0);
        assert_eq!(out[0], -1.0);
        node.process(&[0.5, -1.0, 1.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.5);
    }
}