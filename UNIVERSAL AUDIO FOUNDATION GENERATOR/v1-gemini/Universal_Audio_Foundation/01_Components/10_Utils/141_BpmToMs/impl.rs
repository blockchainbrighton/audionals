use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct BpmToMsNode;

impl BpmToMsNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for BpmToMsNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 141,
            name: "BpmToMs",
            category: "10_Utils",
            inputs: &[
                InputDescriptor { name: "BPM", min: 0.1, max: 1000.0, default: 120.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "ms" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 1 { return; }
        
        let bpm = inputs[0].max(0.001); // Prevent div by zero
        let ms = 60000.0 / bpm;

        outputs[0] = ms;
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bpm_to_ms() {
        let mut node = BpmToMsNode::new();
        let mut out = [0.0];
        
        // 60 BPM -> 1000 ms
        node.process(&[60.0], &mut out, 44100.0);
        assert!((out[0] - 1000.0).abs() < 1e-9);

        // 120 BPM -> 500 ms
        node.process(&[120.0], &mut out, 44100.0);
        assert!((out[0] - 500.0).abs() < 1e-9);
    }
}