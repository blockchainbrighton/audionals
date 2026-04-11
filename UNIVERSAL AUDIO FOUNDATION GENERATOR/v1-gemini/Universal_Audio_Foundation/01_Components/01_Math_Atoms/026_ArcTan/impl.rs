use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct ArcTanNode;

impl ArcTanNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for ArcTanNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 26,
            name: "ArcTan",
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
        let mut res = inputs[0].atan();
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
        let mut node = ArcTanNode::new();
        let mut out = [0.0];
        node.process(&[1.0], &mut out, 44100.0);
        assert!((out[0] - (std::f64::consts::PI / 4.0)).abs() < 1e-10);
    }
}