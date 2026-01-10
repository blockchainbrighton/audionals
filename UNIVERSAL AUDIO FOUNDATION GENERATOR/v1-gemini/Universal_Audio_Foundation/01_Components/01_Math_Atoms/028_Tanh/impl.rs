use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct TanhNode;

impl TanhNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for TanhNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 28,
            name: "Tanh",
            category: "01_Math_Atoms",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Saturated" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.is_empty() { return; }
        let mut res = inputs[0].tanh();
        if res.abs() < 1.0e-30 { res = 0.0; }
        outputs[0] = res;
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_math_accuracy() {
        let mut node = TanhNode::new();
        let mut out = [0.0];
        node.process(&[0.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
        node.process(&[100.0], &mut out, 44100.0);
        assert!((out[0] - 1.0).abs() < 1e-10);
    }
}