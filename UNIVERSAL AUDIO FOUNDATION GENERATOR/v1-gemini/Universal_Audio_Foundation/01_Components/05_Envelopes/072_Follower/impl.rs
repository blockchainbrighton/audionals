use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct FollowerNode {
    envelope: f64,
}

impl FollowerNode {
    pub fn new() -> Self {
        Self { envelope: 0.0 }
    }
}

impl AudioNode for FollowerNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 72,
            name: "Follower",
            category: "05_Envelopes",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Attack", min: 0.001, max: 1.0, default: 0.01 },
                InputDescriptor { name: "Release", min: 0.001, max: 1.0, default: 0.1 },
            ],
            outputs: &[
                OutputDescriptor { name: "Envelope" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], sample_rate: f64) {
        if inputs.len() < 3 { return; }
        let input_abs = inputs[0].abs();
        let attack = inputs[1].max(0.001);
        let release = inputs[2].max(0.001);

        let attack_alpha = 1.0 - (-1.0 / (attack * sample_rate)).exp();
        let release_alpha = 1.0 - (-1.0 / (release * sample_rate)).exp();

        let alpha = if input_abs > self.envelope { attack_alpha } else { release_alpha };
        
        self.envelope += (input_abs - self.envelope) * alpha;

        if self.envelope.abs() < 1e-30 { self.envelope = 0.0; }
        outputs[0] = self.envelope;
    }

    fn reset(&mut self) {
        self.envelope = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_follower_up_down() {
        let mut node = FollowerNode::new();
        let mut out = [0.0];
        
        // Input full scale
        node.process(&[1.0, 0.01, 0.1], &mut out, 44100.0);
        assert!(out[0] > 0.0);
        
        let up = out[0];
        // Input zero
        node.process(&[0.0, 0.01, 0.1], &mut out, 44100.0);
        assert!(out[0] < up);
    }
}