use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct PowerNode;

impl PowerNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for PowerNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 17,
            name: "Power",
            category: "01_Math_Atoms",
            inputs: &[
                InputDescriptor { name: "Base", min: -1.0, max: 1.0, default: 1.0 },
                InputDescriptor { name: "Exponent", min: -1.0, max: 1.0, default: 1.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Result" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 { return; }
        let base = inputs[0];
        let exp = inputs[1];
        
        // powf can return NaN for negative base and non-integer exponent
        let mut res = base.powf(exp);
        
        if res.is_nan() || res.is_infinite() {
            res = 0.0;
        }

        if res.abs() > 0.0 && res.abs() < 1.0e-30 {
            res = 0.0;
        }

        outputs[0] = res;
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_math_accuracy() {
        let mut node = PowerNode::new();
        let mut out = [0.0];
        node.process(&[2.0, 3.0], &mut out, 44100.0);
        assert_eq!(out[0], 8.0);
    }

    #[test]
    fn test_nan_safety() {
        let mut node = PowerNode::new();
        let mut out = [0.0];
        // Negative base with fractional exponent = NaN
        node.process(&[-1.0, 0.5], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
    }
}