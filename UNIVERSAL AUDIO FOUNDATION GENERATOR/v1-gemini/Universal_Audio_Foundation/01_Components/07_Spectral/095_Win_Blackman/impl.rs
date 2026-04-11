use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};
use std::f64::consts::TAU;

pub struct WinBlackmanNode;

impl WinBlackmanNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for WinBlackmanNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 95,
            name: "Win_Blackman",
            category: "07_Spectral",
            inputs: &[
                InputDescriptor { name: "Phase", min: 0.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Weight" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.is_empty() { return; }
        let phase = inputs[0].clamp(0.0, 1.0);
        
        // Blackman: a0 - a1*cos(2*PI*t) + a2*cos(4*PI*t)
        let a0 = 0.42659;
        let a1 = 0.49656;
        let a2 = 0.076849;
        
        outputs[0] = a0 - a1 * (TAU * phase).cos() + a2 * (2.0 * TAU * phase).cos();
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_blackman() {
        let mut node = WinBlackmanNode::new();
        let mut out = [0.0];
        // At phase 0.5, Blackman is 1.0 (a0 + a1 + a2)
        node.process(&[0.5], &mut out, 44100.0);
        assert!((out[0] - 1.0).abs() < 1e-5);
    }
}