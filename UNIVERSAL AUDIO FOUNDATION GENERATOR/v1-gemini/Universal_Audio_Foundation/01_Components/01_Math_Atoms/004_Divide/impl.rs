use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct DivideNode;

impl DivideNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for DivideNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 4,
            name: "Divide",
            category: "01_Math_Atoms",
            inputs: &[
                InputDescriptor { name: "Numerator", min: -1.0, max: 1.0, default: 1.0 },
                InputDescriptor { name: "Denominator", min: -1.0, max: 1.0, default: 1.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Quotient" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 {
            return;
        }
        
        let num = inputs[0];
        let den = inputs[1];
        
        let mut quotient = if den.abs() < 1.0e-20 {
            // Safe division: prevent infinity
            0.0
        } else {
            num / den
        };

        // Denormal handling
        if quotient.abs() > 0.0 && quotient.abs() < 1.0e-30 {
            quotient = 0.0;
        }

        outputs[0] = quotient;
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
        let node = DivideNode::new();
        let meta = node.metadata();
        assert_eq!(meta.name, "Divide");
        assert_eq!(meta.inputs.len(), 2);
    }

    #[test]
    fn test_math_accuracy() {
        let mut node = DivideNode::new();
        let inputs = [1.0, 2.0];
        let mut outputs = [0.0];
        node.process(&inputs, &mut outputs, 44100.0);
        assert_eq!(outputs[0], 0.5);

        let inputs_neg = [1.0, -2.0];
        node.process(&inputs_neg, &mut outputs, 44100.0);
        assert_eq!(outputs[0], -0.5);
    }

    #[test]
    fn test_divide_by_zero_safety() {
        let mut node = DivideNode::new();
        let inputs = [1.0, 0.0];
        let mut outputs = [0.0];
        node.process(&inputs, &mut outputs, 44100.0);
        assert_eq!(outputs[0], 0.0, "Divide by zero should return 0.0 for audio safety");
    }

    #[test]
    fn test_determinism() {
        let mut node = DivideNode::new();
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
        let mut node = DivideNode::new();
        let inputs = [1.0e-40, 1.0];
        let mut outputs = [0.0];
        
        node.process(&inputs, &mut outputs, 44100.0);
        assert_eq!(outputs[0], 0.0);
    }

    #[test]
    fn test_reset_behavior() {
        let mut node = DivideNode::new();
        let inputs = [0.5, 0.5];
        let mut outputs = [0.0];
        node.process(&inputs, &mut outputs, 44100.0);
        node.reset();
    }
}