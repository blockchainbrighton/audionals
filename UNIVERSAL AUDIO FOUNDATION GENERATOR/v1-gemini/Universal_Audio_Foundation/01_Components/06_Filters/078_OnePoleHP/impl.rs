use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};
use std::f64::consts::TAU;

pub struct OnePoleHPNode {
    y1: f64,
}

impl OnePoleHPNode {
    pub fn new() -> Self {
        Self { y1: 0.0 }
    }
}

impl AudioNode for OnePoleHPNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 78,
            name: "OnePoleHP",
            category: "06_Filters",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Cutoff", min: 0.0, max: 22050.0, default: 1000.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Output" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], sample_rate: f64) {
        if inputs.len() < 2 { return; }
        let x = inputs[0];
        let cutoff = inputs[1].max(0.0).min(sample_rate * 0.5);
        
        let alpha = 1.0 - (-TAU * cutoff / sample_rate).exp();
        
        // Highpass is Input - Lowpassed part
        let lp = self.y1 + alpha * (x - self.y1);
        let mut y = x - lp;
        
        if y.abs() < 1e-30 { y = 0.0; }
        
        outputs[0] = y;
        self.y1 = lp;
    }

    fn reset(&mut self) {
        self.y1 = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_highpass_behavior() {
        let mut node = OnePoleHPNode::new();
        let mut out = [0.0];
        
        // Impulse should pass high frequencies well
        node.process(&[1.0, 100.0], &mut out, 44100.0);
        assert!(out[0] > 0.5);
    }
}