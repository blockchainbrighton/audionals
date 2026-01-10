use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct HzToMidiNode;

impl HzToMidiNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for HzToMidiNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 108,
            name: "HzToMidi",
            category: "08_Timing",
            inputs: &[
                InputDescriptor { name: "Hz", min: 0.0001, max: 22050.0, default: 440.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Midi" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.is_empty() { return; }
        let hz = inputs[0].max(0.0000001);
        
        outputs[0] = 69.0 + 12.0 * (hz / 440.0).log2();
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hz_to_midi() {
        let mut node = HzToMidiNode::new();
        let mut out = [0.0];
        
        node.process(&[440.0], &mut out, 44100.0);
        assert_eq!(out[0], 69.0);
        
        node.process(&[220.0], &mut out, 44100.0);
        assert_eq!(out[0], 57.0);
    }
}