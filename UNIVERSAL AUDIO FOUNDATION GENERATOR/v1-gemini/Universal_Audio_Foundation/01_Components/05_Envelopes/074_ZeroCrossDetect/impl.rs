use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct ZeroCrossDetectNode {
    last_sample: f64,
}

impl ZeroCrossDetectNode {
    pub fn new() -> Self {
        Self { last_sample: 0.0 }
    }
}

impl AudioNode for ZeroCrossDetectNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 74,
            name: "ZeroCrossDetect",
            category: "05_Envelopes",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Trigger" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.is_empty() { return; }
        let input = inputs[0];
        
        // Detect positive-going zero crossing
        if self.last_sample <= 0.0 && input > 0.0 {
            outputs[0] = 1.0;
        } else {
            outputs[0] = 0.0;
        }
        
        self.last_sample = input;
    }

    fn reset(&mut self) {
        self.last_sample = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_zero_crossing() {
        let mut node = ZeroCrossDetectNode::new();
        let mut out = [0.0];
        
        node.process(&[-0.1], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
        
        node.process(&[0.1], &mut out, 44100.0);
        assert_eq!(out[0], 1.0);
        
        node.process(&[0.2], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
    }
}