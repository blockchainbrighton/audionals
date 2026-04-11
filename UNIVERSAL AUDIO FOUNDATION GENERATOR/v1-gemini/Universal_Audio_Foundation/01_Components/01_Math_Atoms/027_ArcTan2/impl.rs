use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct ArcTan2Node;

impl ArcTan2Node {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for ArcTan2Node {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 27,
            name: "ArcTan2",
            category: "01_Math_Atoms",
            inputs: &[
                InputDescriptor { name: "Y", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "X", min: -1.0, max: 1.0, default: 1.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Angle" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 { return; }
        let mut res = inputs[0].atan2(inputs[1]);
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
        let mut node = ArcTan2Node::new();
        let mut out = [0.0];
        node.process(&[1.0, 1.0], &mut out, 44100.0);
        assert!((out[0] - (std::f64::consts::PI / 4.0)).abs() < 1e-10);
    }
}