use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct DbToAmpNode;

impl DbToAmpNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for DbToAmpNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 139,
            name: "DbToAmp",
            category: "10_Utils",
            inputs: &[
                InputDescriptor { name: "dB", min: -100.0, max: 100.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Amp" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 1 { return; }
        
        let db = inputs[0];
        // Amp = 10 ^ (dB / 20)
        let mut amp = 10.0f64.powf(db / 20.0);

        if amp.is_subnormal() { amp = 0.0; }
        
        outputs[0] = amp;
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_db_to_amp() {
        let mut node = DbToAmpNode::new();
        let mut out = [0.0];
        
        // 0 dB -> 1.0
        node.process(&[0.0], &mut out, 44100.0);
        assert!((out[0] - 1.0).abs() < 1e-9);

        // -6 dB -> approx 0.5
        node.process(&[-6.0206], &mut out, 44100.0);
        assert!((out[0] - 0.5).abs() < 1e-4);
        
        // 20 dB -> 10.0
        node.process(&[20.0], &mut out, 44100.0);
        assert!((out[0] - 10.0).abs() < 1e-9);
    }
}