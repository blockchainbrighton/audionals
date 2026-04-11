use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct SampleAndHoldNode {
    held_value: f64,
    last_trigger: f64,
}

impl SampleAndHoldNode {
    pub fn new() -> Self {
        Self {
            held_value: 0.0,
            last_trigger: 0.0,
        }
    }
}

impl AudioNode for SampleAndHoldNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 39,
            name: "SampleAndHold",
            category: "02_Logic",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Trigger", min: 0.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Held" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 { return; }
        let signal = inputs[0];
        let trigger = inputs[1];
        
        // Edge detection: Low to High
        if trigger > 0.5 && self.last_trigger <= 0.5 {
            self.held_value = signal;
        }
        
        self.last_trigger = trigger;
        outputs[0] = self.held_value;
    }

    fn reset(&mut self) {
        self.held_value = 0.0;
        self.last_trigger = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_logic() {
        let mut node = SampleAndHoldNode::new();
        let mut out = [0.0];
        
        // 1. Send signal while trigger is low
        node.process(&[0.8, 0.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
        
        // 2. Fire trigger
        node.process(&[0.8, 1.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.8);
        
        // 3. Change signal while trigger high
        node.process(&[0.2, 1.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.8, "Should hold value until next edge");
        
        // 4. Drop trigger
        node.process(&[0.2, 0.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.8);
        
        // 5. Fire trigger again
        node.process(&[0.2, 1.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.2);
    }

    #[test]
    fn test_reset_behavior() {
        let mut node = SampleAndHoldNode::new();
        let mut out = [0.0];
        node.process(&[0.8, 1.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.8);
        node.reset();
        assert_eq!(node.held_value, 0.0);
    }
}