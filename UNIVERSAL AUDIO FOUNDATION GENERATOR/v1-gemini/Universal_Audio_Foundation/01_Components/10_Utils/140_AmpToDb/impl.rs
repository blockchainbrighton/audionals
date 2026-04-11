use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct AmpToDbNode;

impl AmpToDbNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for AmpToDbNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 140,
            name: "AmpToDb",
            category: "10_Utils",
            inputs: &[
                InputDescriptor { name: "Amp", min: 0.0, max: 100.0, default: 1.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "dB" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 1 { return; }
        
        let amp = inputs[0].abs();
        
        // dB = 20 * log10(amp)
        // Handle near-zero inputs
        let db = if amp < 1.0e-9 {
            -180.0
        } else {
            20.0 * amp.log10()
        };

        outputs[0] = db;
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_amp_to_db() {
        let mut node = AmpToDbNode::new();
        let mut out = [0.0];
        
        // 1.0 -> 0 dB
        node.process(&[1.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);

        // 0.5 -> -6.02 dB
        node.process(&[0.5], &mut out, 44100.0);
        assert!((out[0] - -6.0205999).abs() < 1e-5);
        
        // 0.0 -> -180.0
        node.process(&[0.0], &mut out, 44100.0);
        assert_eq!(out[0], -180.0);
    }
}