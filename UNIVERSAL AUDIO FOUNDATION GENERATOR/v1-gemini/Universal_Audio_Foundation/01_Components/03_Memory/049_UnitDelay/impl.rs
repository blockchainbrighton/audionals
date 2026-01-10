use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct UnitDelayNode {
    last_sample: f64,
}

impl UnitDelayNode {
    pub fn new() -> Self {
        Self { last_sample: 0.0 }
    }
}

impl AudioNode for UnitDelayNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 49,
            name: "UnitDelay",
            category: "03_Memory",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Delayed" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.is_empty() { return; }
        
        outputs[0] = self.last_sample;
        self.last_sample = inputs[0];
        
        if self.last_sample.abs() < 1e-30 {
            self.last_sample = 0.0;
        }
    }

    fn reset(&mut self) {
        self.last_sample = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_unit_delay() {
        let mut node = UnitDelayNode::new();
        let mut out = [0.0];
        
        node.process(&[1.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0); // Initial
        
        node.process(&[0.5], &mut out, 44100.0);
        assert_eq!(out[0], 1.0); // Delayed 1
        
        node.process(&[0.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.5); // Delayed 2
    }
}