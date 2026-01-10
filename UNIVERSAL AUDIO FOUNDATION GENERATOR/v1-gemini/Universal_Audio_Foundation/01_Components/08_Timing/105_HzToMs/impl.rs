use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct HzToMsNode;

impl HzToMsNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for HzToMsNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 105,
            name: "HzToMs",
            category: "08_Timing",
            inputs: &[
                InputDescriptor { name: "Hz", min: 0.0001, max: 22050.0, default: 1.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Ms" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.is_empty() { return; }
        let hz = inputs[0].max(0.0000001); // Avoid div by zero
        outputs[0] = 1000.0 / hz;
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hz_to_ms() {
        let mut node = HzToMsNode::new();
        let mut out = [0.0];
        
        node.process(&[1.0], &mut out, 44100.0);
        assert_eq!(out[0], 1000.0);
        
        node.process(&[2.0], &mut out, 44100.0);
        assert_eq!(out[0], 500.0);
    }
}