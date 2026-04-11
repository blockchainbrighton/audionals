use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct AddNode;

impl AddNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for AddNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 1,
            name: "Add",
            category: "01_Math_Atoms",
            inputs: &[
                InputDescriptor { name: "Input A", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Input B", min: -1.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Sum" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 {
            return;
        }
        
        let mut sum = inputs[0] + inputs[1];

        // Denormal handling: flush to zero if extremely small
        if sum.abs() > 0.0 && sum.abs() < 1.0e-30 {
            sum = 0.0;
        }

        outputs[0] = sum;
    }

    fn reset(&mut self) {
        // Stateless component, nothing to reset
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_instantiation_and_metadata() {
        let node = AddNode::new();
        let meta = node.metadata();
        assert_eq!(meta.name, "Add");
        assert_eq!(meta.category, "01_Math_Atoms");
        assert_eq!(meta.inputs.len(), 2);
    }

    #[test]
    fn test_math_accuracy() {
        let mut node = AddNode::new();
        let inputs = [1.0, 2.0];
        let mut outputs = [0.0];
        node.process(&inputs, &mut outputs, 44100.0);
        assert_eq!(outputs[0], 3.0);

        let inputs_neg = [-1.0, -2.5];
        node.process(&inputs_neg, &mut outputs, 44100.0);
        assert_eq!(outputs[0], -3.5);
    }

    #[test]
    fn test_determinism() {
        let mut node = AddNode::new();
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
        let mut node = AddNode::new();
        let inputs = [1.0e-40, 0.0];
        let mut outputs = [0.0];
        
        node.process(&inputs, &mut outputs, 44100.0);
        assert_eq!(outputs[0], 0.0, "Denormal output was not flushed to zero");
    }

    #[test]
    fn test_reset_behavior() {
        let mut node = AddNode::new();
        let inputs = [0.5, 0.5];
        let mut clean_out = [0.0];
        let mut reset_out = [0.0];
        
        // Even for stateless, reset shouldn't break anything
        let mut clean_node = AddNode::new();
        clean_node.process(&inputs, &mut clean_out, 44100.0);
        
        node.reset();
        node.process(&inputs, &mut reset_out, 44100.0);
        
        assert_eq!(clean_out, reset_out);
    }
}