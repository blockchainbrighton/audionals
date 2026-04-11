use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};
use std::f64::consts::TAU;

pub struct WinHannNode;

impl WinHannNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for WinHannNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 93,
            name: "Win_Hann",
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
        
        // Hann: 0.5 * (1 - cos(2*PI*t))
        outputs[0] = 0.5 * (1.0 - (TAU * phase).cos());
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hann() {
        let mut node = WinHannNode::new();
        let mut out = [0.0];
        // At phase 0.5, Hann is 1.0
        node.process(&[0.5], &mut out, 44100.0);
        assert!((out[0] - 1.0).abs() < 1e-10);
        // At phase 0.0, Hann is 0.0
        node.process(&[0.0], &mut out, 44100.0);
        assert!(out[0].abs() < 1e-10);
    }
}