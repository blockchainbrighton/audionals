use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct TanNode;

impl TanNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for TanNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 23,
            name: "Tan",
            category: "01_Math_Atoms",
            inputs: &[
                InputDescriptor { name: "Phase", min: -3.141592653589793, max: 3.141592653589793, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Tangent" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.is_empty() { return; }
        let mut res = inputs[0].tan();
        
        // Safety: tan(PI/2) results in extreme values
        if res.is_nan() || res.is_infinite() || res.abs() > 1.0e10 {
            res = 0.0;
        }
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
        let mut node = TanNode::new();
        let mut out = [0.0];
        node.process(&[0.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
        node.process(&[PI / 4.0], &mut out, 44100.0);
        assert!((out[0] - 1.0).abs() < 1e-10);
    }

    #[test]
    fn test_infinity_safety() {
        let mut node = TanNode::new();
        let mut out = [0.0];
        node.process(&[PI / 2.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0); // Clamped for safety
    }
}