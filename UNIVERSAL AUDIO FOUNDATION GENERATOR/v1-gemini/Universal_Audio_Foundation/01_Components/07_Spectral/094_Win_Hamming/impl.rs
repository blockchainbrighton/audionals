use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};
use std::f64::consts::TAU;

pub struct WinHammingNode;

impl WinHammingNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for WinHammingNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 94,
            name: "Win_Hamming",
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
        
        // Hamming: 0.54 - 0.46 * cos(2*PI*t)
        outputs[0] = 0.54 - 0.46 * (TAU * phase).cos();
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hamming() {
        let mut node = WinHammingNode::new();
        let mut out = [0.0];
        // At phase 0.5, Hamming is 1.0 (0.54 + 0.46)
        node.process(&[0.5], &mut out, 44100.0);
        assert!((out[0] - 1.0).abs() < 1e-10);
        // At phase 0.0, Hamming is 0.08 (0.54 - 0.46)
        node.process(&[0.0], &mut out, 44100.0);
        assert!((out[0] - 0.08).abs() < 1e-10);
    }
}