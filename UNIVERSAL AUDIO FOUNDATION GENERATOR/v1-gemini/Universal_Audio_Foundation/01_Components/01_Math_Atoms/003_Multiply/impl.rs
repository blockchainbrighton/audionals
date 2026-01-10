use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct MultiplyNode;

impl MultiplyNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for MultiplyNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 3,
            name: "Multiply",
            category: "01_Math_Atoms",
            inputs: &[
                InputDescriptor { name: "Input A", min: -1.0, max: 1.0, default: 1.0 },
                InputDescriptor { name: "Input B", min: -1.0, max: 1.0, default: 1.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Product" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 {
            return;
        }
        
        let mut prod = inputs[0] * inputs[1];

        // Denormal handling
        if prod.abs() > 0.0 && prod.abs() < 1.0e-30 {
            prod = 0.0;
        }

        outputs[0] = prod;
    }

    fn reset(&mut self) {
        // Stateless
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_instantiation_and_metadata() {
        let node = MultiplyNode::new();
        let meta = node.metadata();
        assert_eq!(meta.name, "Multiply");
        assert_eq!(meta.inputs.len(), 2);
    }

    #[test]
    fn test_math_accuracy() {
        let mut node = MultiplyNode::new();
        let inputs = [2.0, 0.5];
        let mut outputs = [0.0];
        node.process(&inputs, &mut outputs, 44100.0);
        assert_eq!(outputs[0], 1.0);

        let inputs_neg = [3.0, -2.0];
        node.process(&inputs_neg, &mut outputs, 44100.0);
        assert_eq!(outputs[0], -6.0);
    }

    #[test]
    fn test_determinism() {
        let mut node = MultiplyNode::new();
        let inputs = [0.5, 0.2];
        let mut out1 = [0.0];
        let mut out2 = [0.0];
        
        node.process(&inputs, &mut out1, 44100.0);
        node.reset();
        node.process(&inputs, &mut out2, 44100.0);

        assert_eq!(out1, out2);
    }

    #[test]
    fn test_denormal_handling() {
        let mut node = MultiplyNode::new();
        // 1e-20 * 1e-20 = 1e-40 (Denormal range)
        let inputs = [1.0e-20, 1.0e-20];
        let mut outputs = [0.0];
        
        node.process(&inputs, &mut outputs, 44100.0);
        assert_eq!(outputs[0], 0.0, "Resulting denormal was not flushed");
    }

    #[test]
    fn test_reset_behavior() {
        let mut node = MultiplyNode::new();
        let inputs = [0.5, 0.5];
        let mut outputs = [0.0];
        node.process(&inputs, &mut outputs, 44100.0);
        node.reset();
        // Stateless
    }
}