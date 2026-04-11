use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct ReciprocalNode;

impl ReciprocalNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for ReciprocalNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 8,
            name: "Reciprocal",
            category: "01_Math_Atoms",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 1.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Reciprocal" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 1 { return; }
        
        let input = inputs[0];
        let mut val = if input.abs() < 1.0e-20 {
            0.0 // Prevent divide by zero / infinity
        } else {
            1.0 / input
        };
        
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
        let node = ReciprocalNode::new();
        let meta = node.metadata();
        assert_eq!(meta.name, "Reciprocal");
    }

    #[test]
    fn test_math_accuracy() {
        let mut node = ReciprocalNode::new();
        let inputs = [2.0];
        let mut outputs = [0.0];
        node.process(&inputs, &mut outputs, 44100.0);
        assert_eq!(outputs[0], 0.5);
    }

    #[test]
    fn test_determinism() {
        let mut node = ReciprocalNode::new();
        let inputs = [0.5];
        let mut out1 = [0.0];
        let mut out2 = [0.0];
        node.process(&inputs, &mut out1, 44100.0);
        node.reset();
        node.process(&inputs, &mut out2, 44100.0);
        assert_eq!(out1, out2);
    }

    #[test]
    fn test_zero_handling() {
        let mut node = ReciprocalNode::new();
        let inputs = [0.0];
        let mut outputs = [0.0];
        node.process(&inputs, &mut outputs, 44100.0);
        assert_eq!(outputs[0], 0.0);
    }

    #[test]
    fn test_denormal_handling() {
        // 1 / 1e40 = 1e-40 -> should be 0.0
        let mut node = ReciprocalNode::new();
        let inputs = [1.0e40];
        let mut outputs = [0.0];
        node.process(&inputs, &mut outputs, 44100.0);
        assert_eq!(outputs[0], 0.0);
    }

    #[test]
    fn test_reset_behavior() {
        let mut node = ReciprocalNode::new();
        node.reset();
    }
}