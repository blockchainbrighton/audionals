use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct CeilNode;

impl CeilNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for CeilNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 10,
            name: "Ceil",
            category: "01_Math_Atoms",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Ceiling" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 1 { return; }
        
        // Ceil always produces integers, so denormals aren't an issue for output
        // unless input is NaN/Inf
        let val = inputs[0].ceil();
        
        outputs[0] = val;
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_instantiation_and_metadata() {
        let node = CeilNode::new();
        let meta = node.metadata();
        assert_eq!(meta.name, "Ceil");
    }

    #[test]
    fn test_math_accuracy() {
        let mut node = CeilNode::new();
        let inputs = [0.1];
        let mut outputs = [0.0];
        node.process(&inputs, &mut outputs, 44100.0);
        assert_eq!(outputs[0], 1.0);

        let inputs_neg = [-0.1];
        node.process(&inputs_neg, &mut outputs, 44100.0);
        assert_eq!(outputs[0], -0.0); // Ceil of -0.1 is 0.0
    }

    #[test]
    fn test_determinism() {
        let mut node = CeilNode::new();
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
        let mut node = CeilNode::new();
        let inputs = [1.0e-40]; // Small positive
        let mut outputs = [0.0];
        node.process(&inputs, &mut outputs, 44100.0);
        assert_eq!(outputs[0], 1.0);
    }

    #[test]
    fn test_reset_behavior() {
        let mut node = CeilNode::new();
        node.reset();
    }
}