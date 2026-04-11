use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct LogNode;

impl LogNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for LogNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 19,
            name: "Log",
            category: "01_Math_Atoms",
            inputs: &[
                InputDescriptor { name: "Input", min: 0.0, max: 1.0, default: 1.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Natural Log" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.is_empty() { return; }
        let val = inputs[0];
        
        let res = if val <= 1.0e-20 {
            // Log of zero/negative is undefined/neg infinity. 
            // In audio, we clamp to a very low value or zero.
            -100.0 // Arbitrary low floor for log scale
        } else {
            val.ln()
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
        let mut node = LogNode::new();
        let mut out = [0.0];
        node.process(&[1.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
    }

    #[test]
    fn test_zero_safety() {
        let mut node = LogNode::new();
        let mut out = [0.0];
        node.process(&[0.0], &mut out, 44100.0);
        assert!(out[0] < -90.0);
    }
}