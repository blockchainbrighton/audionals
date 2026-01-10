use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct ArcSinNode;

impl ArcSinNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for ArcSinNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 24,
            name: "ArcSin",
            category: "01_Math_Atoms",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Angle" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.is_empty() { return; }
        let val = inputs[0].clamp(-1.0, 1.0);
        let mut res = val.asin();
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
        let mut node = ArcSinNode::new();
        let mut out = [0.0];
        node.process(&[1.0], &mut out, 44100.0);
        assert!((out[0] - (std::f64::consts::PI / 2.0)).abs() < 1e-10);
    }

    #[test]
    fn test_range_safety() {
        let mut node = ArcSinNode::new();
        let mut out = [0.0];
        node.process(&[2.0], &mut out, 44100.0);
        assert!(!out[0].is_nan());
    }
}