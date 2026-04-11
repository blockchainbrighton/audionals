use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct MsToHzNode;

impl MsToHzNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for MsToHzNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 106,
            name: "MsToHz",
            category: "08_Timing",
            inputs: &[
                InputDescriptor { name: "Ms", min: 0.0001, max: 60000.0, default: 1000.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Hz" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.is_empty() { return; }
        let ms = inputs[0].max(0.0000001); // Avoid div by zero
        outputs[0] = 1000.0 / ms;
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ms_to_hz() {
        let mut node = MsToHzNode::new();
        let mut out = [0.0];
        
        node.process(&[1000.0], &mut out, 44100.0);
        assert_eq!(out[0], 1.0);
        
        node.process(&[500.0], &mut out, 44100.0);
        assert_eq!(out[0], 2.0);
    }
}