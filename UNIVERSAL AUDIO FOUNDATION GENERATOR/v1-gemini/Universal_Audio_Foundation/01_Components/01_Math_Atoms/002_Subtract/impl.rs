use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct SubtractNode;

impl SubtractNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for SubtractNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 2,
            name: "Subtract",
            category: "01_Math_Atoms",
            inputs: &[
                InputDescriptor { name: "Input A", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Input B", min: -1.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Difference" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 {
            return;
        }
        
        let mut diff = inputs[0] - inputs[1];

        // Denormal handling
        if diff.abs() > 0.0 && diff.abs() < 1.0e-30 {
            diff = 0.0;
        }

        outputs[0] = diff;
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
        let node = SubtractNode::new();
        let meta = node.metadata();
        assert_eq!(meta.name, "Subtract");
        assert_eq!(meta.inputs.len(), 2);
    }

    #[test]
    fn test_math_accuracy() {
        let mut node = SubtractNode::new();
        let inputs = [1.0, 0.5];
        let mut outputs = [0.0];
        node.process(&inputs, &mut outputs, 44100.0);
        assert_eq!(outputs[0], 0.5);

        let inputs_neg = [0.0, 1.0];
        node.process(&inputs_neg, &mut outputs, 44100.0);
        assert_eq!(outputs[0], -1.0);
    }

    #[test]
    fn test_determinism() {
        let mut node = SubtractNode::new();
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
        let mut node = SubtractNode::new();
        let inputs = [1.0e-40, 0.0];
        let mut outputs = [0.0];
        
        node.process(&inputs, &mut outputs, 44100.0);
        assert_eq!(outputs[0], 0.0);
    }

    #[test]
    fn test_reset_behavior() {
        let mut node = SubtractNode::new();
        let inputs = [0.5, 0.1];
        let mut outputs = [0.0];
        node.process(&inputs, &mut outputs, 44100.0);
        node.reset();
        // Stateless, no observable change
    }
}