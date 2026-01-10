use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct ZeroCountNode {
    count: f64,
    last_input: f64,
}

impl ZeroCountNode {
    pub fn new() -> Self {
        Self {
            count: 0.0,
            last_input: 0.0,
        }
    }
}

impl AudioNode for ZeroCountNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 131,
            name: "ZeroCount",
            category: "10_Utils",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Reset", min: 0.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Count" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 { return; }
        
        let input = inputs[0];
        let reset = inputs[1] > 0.5;

        if reset {
            self.count = 0.0;
        }

        // Check for crossing
        // Case 1: Positive to Negative/Zero
        // Case 2: Negative/Zero to Positive
        // Use sign check logic carefully around 0.0
        
        let crossed_down = self.last_input > 0.0 && input <= 0.0;
        let crossed_up = self.last_input <= 0.0 && input > 0.0;

        if crossed_down || crossed_up {
            self.count += 1.0;
        }

        self.last_input = input;
        outputs[0] = self.count;
    }

    fn reset(&mut self) {
        self.count = 0.0;
        self.last_input = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_zero_count_basic() {
        let mut node = ZeroCountNode::new();
        let mut out = [0.0];
        
        // Initial state last_input=0.0.
        // Input 1.0 -> 0.0 to positive -> Cross Up -> Count 1
        node.process(&[1.0, 0.0], &mut out, 44100.0);
        assert_eq!(out[0], 1.0);

        // Input 0.5 -> No cross -> Count 1
        node.process(&[0.5, 0.0], &mut out, 44100.0);
        assert_eq!(out[0], 1.0);

        // Input -0.5 -> Positive to Negative -> Cross Down -> Count 2
        node.process(&[-0.5, 0.0], &mut out, 44100.0);
        assert_eq!(out[0], 2.0);
    }

    #[test]
    fn test_zero_count_reset() {
        let mut node = ZeroCountNode::new();
        let mut out = [0.0];
        
        node.process(&[1.0, 0.0], &mut out, 44100.0); // Count 1
        
        // Reset
        node.process(&[1.0, 1.0], &mut out, 44100.0);
        // Reset clears count. Last input was 1.0. Current input 1.0. No cross. Count 0.
        assert_eq!(out[0], 0.0);
        
        node.process(&[-1.0, 0.0], &mut out, 44100.0); // Cross down -> Count 1
        assert_eq!(out[0], 1.0);
    }

    #[test]
    fn test_zero_count_denormal() {
        let mut node = ZeroCountNode::new();
        let mut out = [0.0];
        let denormal = 1.0e-320;
        
        // 0.0 to denormal (positive) -> Cross Up -> Count 1
        node.process(&[denormal, 0.0], &mut out, 44100.0);
        assert_eq!(out[0], 1.0);
        
        // denormal to -1.0 -> Cross Down -> Count 2
        node.process(&[-1.0, 0.0], &mut out, 44100.0);
        assert_eq!(out[0], 2.0);
    }
}