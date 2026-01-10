use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct SqrtNode;

impl SqrtNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for SqrtNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 18,
            name: "Sqrt",
            category: "01_Math_Atoms",
            inputs: &[
                InputDescriptor { name: "Input", min: 0.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Square Root" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.is_empty() { return; }
        let val = inputs[0];
        
        let res = if val < 0.0 {
            0.0
        } else {
            val.sqrt()
        };
        
        outputs[0] = res;
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_math_accuracy() {
        let mut node = SqrtNode::new();
        let mut out = [0.0];
        node.process(&[4.0], &mut out, 44100.0);
        assert_eq!(out[0], 2.0);
    }

    #[test]
    fn test_negative_safety() {
        let mut node = SqrtNode::new();
        let mut out = [0.0];
        node.process(&[-1.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
    }
}