use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct DividerNode {
    count: usize,
    last_trigger: f64,
}

impl DividerNode {
    pub fn new() -> Self {
        Self { count: 0, last_trigger: 0.0 }
    }
}

impl AudioNode for DividerNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 98,
            name: "Divider",
            category: "08_Timing",
            inputs: &[
                InputDescriptor { name: "Trigger", min: 0.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Division", min: 1.0, max: 64.0, default: 4.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Trigger" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 { return; }
        let trigger = inputs[0];
        let division = inputs[1].max(1.0).round() as usize;

        let mut out = 0.0;
        if trigger > 0.5 && self.last_trigger <= 0.5 {
            self.count += 1;
            if self.count >= division {
                out = 1.0;
                self.count = 0;
            }
        }
        self.last_trigger = trigger;
        outputs[0] = out;
    }

    fn reset(&mut self) {
        self.count = 0;
        self.last_trigger = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_division() {
        let mut node = DividerNode::new();
        let mut out = [0.0];
        
        // Divide by 2
        node.process(&[1.0, 2.0], &mut out, 44100.0); // Trigger 1
        assert_eq!(out[0], 0.0);
        node.process(&[0.0, 2.0], &mut out, 44100.0);
        
        node.process(&[1.0, 2.0], &mut out, 44100.0); // Trigger 2
        assert_eq!(out[0], 1.0);
    }
}