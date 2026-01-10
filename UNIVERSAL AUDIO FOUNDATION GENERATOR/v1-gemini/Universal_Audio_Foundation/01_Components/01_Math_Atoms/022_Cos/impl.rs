use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct CosNode;

impl CosNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for CosNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 22,
            name: "Cos",
            category: "01_Math_Atoms",
            inputs: &[
                InputDescriptor { name: "Phase", min: -3.141592653589793, max: 3.141592653589793, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Cosine" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.is_empty() { return; }
        let mut res = inputs[0].cos();
        if res.abs() < 1.0e-30 { res = 0.0; }
        outputs[0] = res;
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::f64::consts::PI;

    #[test]
    fn test_math_accuracy() {
        let mut node = CosNode::new();
        let mut out = [0.0];
        node.process(&[0.0], &mut out, 44100.0);
        assert!((out[0] - 1.0).abs() < 1e-10);
        node.process(&[PI], &mut out, 44100.0);
        assert!((out[0] - (-1.0)).abs() < 1e-10);
    }
}