use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct NegateNode;

impl NegateNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for NegateNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 7,
            name: "Negate",
            category: "01_Math_Atoms",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Negated" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 1 { return; }
        
        let mut val = -inputs[0];
        
        if val.abs() > 0.0 && val.abs() < 1.0e-30 {
            val = 0.0;
        }
        
        outputs[0] = val;
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_instantiation_and_metadata() {
        let node = NegateNode::new();
        let meta = node.metadata();
        assert_eq!(meta.name, "Negate");
    }

    #[test]
    fn test_math_accuracy() {
        let mut node = NegateNode::new();
        let inputs = [0.5];
        let mut outputs = [0.0];
        node.process(&inputs, &mut outputs, 44100.0);
        assert_eq!(outputs[0], -0.5);
    }

    #[test]
    fn test_determinism() {
        let mut node = NegateNode::new();
        let inputs = [0.5];
        let mut out1 = [0.0];
        let mut out2 = [0.0];
        node.process(&inputs, &mut out1, 44100.0);
        node.reset();
        node.process(&inputs, &mut out2, 44100.0);
        assert_eq!(out1, out2);
    }

    #[test]
    fn test_denormal_handling() {
        let mut node = NegateNode::new();
        let inputs = [1.0e-40];
        let mut outputs = [0.0];
        node.process(&inputs, &mut outputs, 44100.0);
        assert_eq!(outputs[0], 0.0);
    }

    #[test]
    fn test_reset_behavior() {
        let mut node = NegateNode::new();
        node.reset();
    }
}