use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct ModuloNode;

impl ModuloNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for ModuloNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 5,
            name: "Modulo",
            category: "01_Math_Atoms",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Modulus", min: 0.0, max: 1.0, default: 1.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Remainder" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 {
            return;
        }
        
        let val = inputs[0];
        let modulus = inputs[1];
        
        let mut rem = if modulus.abs() < 1.0e-20 {
            0.0
        } else {
            val % modulus
        };

        // Denormal handling
        if rem.abs() > 0.0 && rem.abs() < 1.0e-30 {
            rem = 0.0;
        }

        outputs[0] = rem;
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
        let node = ModuloNode::new();
        let meta = node.metadata();
        assert_eq!(meta.name, "Modulo");
        assert_eq!(meta.inputs.len(), 2);
    }

    #[test]
    fn test_math_accuracy() {
        let mut node = ModuloNode::new();
        let inputs = [1.5, 1.0];
        let mut outputs = [0.0];
        node.process(&inputs, &mut outputs, 44100.0);
        assert_eq!(outputs[0], 0.5);

        let inputs_exact = [2.0, 1.0];
        node.process(&inputs_exact, &mut outputs, 44100.0);
        assert_eq!(outputs[0], 0.0);
    }

    #[test]
    fn test_negative_handling() {
        // Documenting behavior for negative numbers
        let mut node = ModuloNode::new();
        let inputs = [-1.5, 1.0];
        let mut outputs = [0.0];
        node.process(&inputs, &mut outputs, 44100.0);
        // Rust % operator preserves sign of dividend
        assert_eq!(outputs[0], -0.5); 
    }

    #[test]
    fn test_zero_modulus_safety() {
        let mut node = ModuloNode::new();
        let inputs = [1.0, 0.0];
        let mut outputs = [0.0];
        node.process(&inputs, &mut outputs, 44100.0);
        assert_eq!(outputs[0], 0.0);
    }

    #[test]
    fn test_determinism() {
        let mut node = ModuloNode::new();
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
        let mut node = ModuloNode::new();
        let inputs = [1.0e-40, 1.0];
        let mut outputs = [0.0];
        
        node.process(&inputs, &mut outputs, 44100.0);
        assert_eq!(outputs[0], 0.0);
    }

    #[test]
    fn test_reset_behavior() {
        let mut node = ModuloNode::new();
        let inputs = [0.5, 0.5];
        let mut outputs = [0.0];
        node.process(&inputs, &mut outputs, 44100.0);
        node.reset();
    }
}