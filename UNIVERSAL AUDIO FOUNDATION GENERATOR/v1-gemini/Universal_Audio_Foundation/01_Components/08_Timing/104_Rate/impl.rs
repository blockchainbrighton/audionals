use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct RateNode;

impl RateNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for RateNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 104,
            name: "Rate",
            category: "08_Timing",
            inputs: &[
                InputDescriptor { name: "BPM", min: 1.0, max: 999.0, default: 120.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Hz" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.is_empty() { return; }
        let bpm = inputs[0];
        
        // Hz = BPM / 60
        outputs[0] = bpm / 60.0;
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rate_conversion() {
        let mut node = RateNode::new();
        let mut out = [0.0];
        
        node.process(&[60.0], &mut out, 44100.0);
        assert_eq!(out[0], 1.0);
        
        node.process(&[120.0], &mut out, 44100.0);
        assert_eq!(out[0], 2.0);
    }
}