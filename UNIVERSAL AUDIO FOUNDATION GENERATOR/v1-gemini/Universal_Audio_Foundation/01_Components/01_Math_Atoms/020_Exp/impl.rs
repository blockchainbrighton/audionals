use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct ExpNode;

impl ExpNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for ExpNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 20,
            name: "Exp",
            category: "01_Math_Atoms",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Exponential" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.is_empty() { return; }
        let val = inputs[0];
        
        let mut res = val.exp();

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
        let mut node = ExpNode::new();
        let mut out = [0.0];
        node.process(&[0.0], &mut out, 44100.0);
        assert_eq!(out[0], 1.0);
    }
}