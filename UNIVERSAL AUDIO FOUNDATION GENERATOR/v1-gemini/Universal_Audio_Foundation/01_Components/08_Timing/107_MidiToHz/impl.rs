use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct MidiToHzNode;

impl MidiToHzNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for MidiToHzNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 107,
            name: "MidiToHz",
            category: "08_Timing",
            inputs: &[
                InputDescriptor { name: "Midi", min: 0.0, max: 127.0, default: 69.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Hz" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.is_empty() { return; }
        let midi = inputs[0];
        
        // standard A4 = 440Hz at MIDI 69
        outputs[0] = 440.0 * 2.0f64.powf((midi - 69.0) / 12.0);
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_midi_to_hz() {
        let mut node = MidiToHzNode::new();
        let mut out = [0.0];
        
        node.process(&[69.0], &mut out, 44100.0);
        assert_eq!(out[0], 440.0);
        
        node.process(&[57.0], &mut out, 44100.0);
        assert_eq!(out[0], 220.0);
    }
}