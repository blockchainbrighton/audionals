use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct ImpulseNode {
    last_trigger: f64,
}

impl ImpulseNode {
    pub fn new() -> Self {
        Self {
            last_trigger: 0.0,
        }
    }
}

impl AudioNode for ImpulseNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 57,
            name: "Impulse",
            category: "04_Sources",
            inputs: &[
                InputDescriptor { name: "Trigger", min: 0.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Signal" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.is_empty() { return; }
        let trigger = inputs[0];
        
        // Edge detection: Low to High
        if trigger > 0.5 && self.last_trigger <= 0.5 {
            outputs[0] = 1.0;
        } else {
            outputs[0] = 0.0;
        }
        
        self.last_trigger = trigger;
    }

    fn reset(&mut self) {
        self.last_trigger = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_impulse() {
        let mut node = ImpulseNode::new();
        let mut out = [0.0];
        
        // No trigger
        node.process(&[0.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
        
        // Trigger high
        node.process(&[1.0], &mut out, 44100.0);
        assert_eq!(out[0], 1.0);
        
        // Still high (no new edge)
        node.process(&[1.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
        
        // Back to low
        node.process(&[0.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
        
        // Trigger again
        node.process(&[1.0], &mut out, 44100.0);
        assert_eq!(out[0], 1.0);
    }
}