use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct SinNode;

impl SinNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for SinNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 21,
            name: "Sin",
            category: "01_Math_Atoms",
            inputs: &[
                InputDescriptor { name: "Phase", min: -3.141592653589793, max: 3.141592653589793, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Sine" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.is_empty() { return; }
        let mut res = inputs[0].sin();
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
        let mut node = SinNode::new();
        let mut out = [0.0];
        node.process(&[PI / 2.0], &mut out, 44100.0);
        assert!((out[0] - 1.0).abs() < 1e-10);
        node.process(&[0.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
    }
}