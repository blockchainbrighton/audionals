use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct SignNode;

impl SignNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for SignNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 9,
            name: "Sign",
            category: "01_Math_Atoms",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Sign" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 1 { return; }
        
        let input = inputs[0];
        let val = if input > 0.0 {
            1.0
        } else if input < 0.0 {
            -1.0
        } else {
            0.0
        };
        
        outputs[0] = val;
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_instantiation_and_metadata() {
        let node = SignNode::new();
        let meta = node.metadata();
        assert_eq!(meta.name, "Sign");
    }

    #[test]
    fn test_math_accuracy() {
        let mut node = SignNode::new();
        
        let inputs = [0.5];
        let mut outputs = [0.0];
        node.process(&inputs, &mut outputs, 44100.0);
        assert_eq!(outputs[0], 1.0);

        let inputs_neg = [-0.5];
        node.process(&inputs_neg, &mut outputs, 44100.0);
        assert_eq!(outputs[0], -1.0);

        let inputs_zero = [0.0];
        node.process(&inputs_zero, &mut outputs, 44100.0);
        assert_eq!(outputs[0], 0.0);
    }

    #[test]
    fn test_determinism() {
        let mut node = SignNode::new();
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
        // Sign is 1.0 or -1.0, so output won't be denormal unless input is.
        // If input is denormal (e.g. 1e-40), it is > 0.0, so output is 1.0.
        // This is correct behavior for sign(x).
        let mut node = SignNode::new();
        let inputs = [1.0e-40];
        let mut outputs = [0.0];
        node.process(&inputs, &mut outputs, 44100.0);
        assert_eq!(outputs[0], 1.0);
    }

    #[test]
    fn test_reset_behavior() {
        let mut node = SignNode::new();
        node.reset();
    }
}