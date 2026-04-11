use crate::traits::{AudioNode, AudioNodeMetadata, OutputDescriptor};

pub struct SampleRateNode;

impl SampleRateNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for SampleRateNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 137,
            name: "SampleRate",
            category: "10_Utils",
            inputs: &[],
            outputs: &[
                OutputDescriptor { name: "SR" },
            ],
        }
    }

    fn process(&mut self, _inputs: &[f64], outputs: &mut [f64], sample_rate: f64) {
        if outputs.is_empty() { return; }
        outputs[0] = sample_rate;
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sample_rate_output() {
        let mut node = SampleRateNode::new();
        let mut out = [0.0];
        
        node.process(&[], &mut out, 44100.0);
        assert_eq!(out[0], 44100.0);

        node.process(&[], &mut out, 48000.0);
        assert_eq!(out[0], 48000.0);
    }
}