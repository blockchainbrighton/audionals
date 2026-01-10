use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct FollowerRMSNode {
    mean_square: f64,
}

impl FollowerRMSNode {
    pub fn new() -> Self {
        Self { mean_square: 0.0 }
    }
}

impl AudioNode for FollowerRMSNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 73,
            name: "FollowerRMS",
            category: "05_Envelopes",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "WindowTime", min: 0.001, max: 1.0, default: 0.05 },
            ],
            outputs: &[
                OutputDescriptor { name: "Envelope" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], sample_rate: f64) {
        if inputs.len() < 2 { return; }
        let input = inputs[0];
        let window_time = inputs[1].max(0.001);
        
        let squared = input * input;
        let alpha = 1.0 - (-1.0 / (window_time * sample_rate)).exp();
        
        self.mean_square += (squared - self.mean_square) * alpha;
        
        if self.mean_square.abs() < 1e-30 { self.mean_square = 0.0; }
        
        outputs[0] = self.mean_square.sqrt();
    }

    fn reset(&mut self) {
        self.mean_square = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rms_follower() {
        let mut node = FollowerRMSNode::new();
        let mut out = [0.0];
        
        // Steady input. Need enough iterations for the integrator to settle.
        // Time constant is ~2205 samples. 5x time constant is ~11k samples.
        for _ in 0..20000 {
            node.process(&[0.707, 0.05], &mut out, 44100.0);
        }
        // RMS of 0.707 should be close to 0.707
        assert!((out[0] - 0.707).abs() < 0.01);
    }
}