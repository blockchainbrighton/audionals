use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};
use std::f64::consts::TAU;

pub struct OnePoleLPNode {
    y1: f64,
}

impl OnePoleLPNode {
    pub fn new() -> Self {
        Self { y1: 0.0 }
    }
}

impl AudioNode for OnePoleLPNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 77,
            name: "OnePoleLP",
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
        
        let mut y = self.y1 + alpha * (x - self.y1);
        
        if y.abs() < 1e-30 { y = 0.0; }
        
        outputs[0] = y;
        self.y1 = y;
    }

    fn reset(&mut self) {
        self.y1 = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lowpass_behavior() {
        let mut node = OnePoleLPNode::new();
        let mut out = [0.0];
        
        // Impulse input
        node.process(&[1.0, 100.0], &mut out, 44100.0);
        assert!(out[0] > 0.0 && out[0] < 1.0);
        
        let first = out[0];
        node.process(&[0.0, 100.0], &mut out, 44100.0);
        assert!(out[0] < first);
    }
}