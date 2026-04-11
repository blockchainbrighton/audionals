use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct ToggleNode {
    state: f64,
    last_trigger: f64,
}

impl ToggleNode {
    pub fn new() -> Self {
        Self { state: 0.0, last_trigger: 0.0 }
    }
}

impl AudioNode for ToggleNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 116,
            name: "Toggle",
            category: "08_Timing",
            inputs: &[
                InputDescriptor { name: "Trigger", min: 0.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Output" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.is_empty() { return; }
        let trigger = inputs[0];
        
        if trigger > 0.5 && self.last_trigger <= 0.5 {
            self.state = if self.state > 0.5 { 0.0 } else { 1.0 };
        }
        
        self.last_trigger = trigger;
        outputs[0] = self.state;
    }

    fn reset(&mut self) {
        self.state = 0.0;
        self.last_trigger = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_toggle() {
        let mut node = ToggleNode::new();
        let mut out = [0.0];
        
        node.process(&[1.0], &mut out, 44100.0);
        assert_eq!(out[0], 1.0);
        
        node.process(&[0.0], &mut out, 44100.0);
        node.process(&[1.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
    }
}