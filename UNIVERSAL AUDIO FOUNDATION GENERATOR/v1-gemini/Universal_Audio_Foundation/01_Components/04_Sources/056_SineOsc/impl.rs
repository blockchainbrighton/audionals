use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};
use std::f64::consts::TAU;

pub struct SineOscNode {
    phase: f64,
}

impl SineOscNode {
    pub fn new() -> Self {
        Self { phase: 0.0 }
    }
}

impl AudioNode for SineOscNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 56,
            name: "SineOsc",
            category: "04_Sources",
            inputs: &[
                InputDescriptor { name: "Frequency", min: 0.0, max: 22050.0, default: 440.0 },
                InputDescriptor { name: "PhaseOffset", min: 0.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Signal" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], sample_rate: f64) {
        if inputs.len() < 2 { return; }
        let freq = inputs[0];
        let offset = inputs[1];

        let out_phase = (self.phase + offset).fract();
        outputs[0] = (out_phase * TAU).sin();

        let phase_inc = freq / sample_rate;
        self.phase = (self.phase + phase_inc).fract();
    }

    fn reset(&mut self) {
        self.phase = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sine() {
        let mut node = SineOscNode::new();
        let mut out = [0.0];
        // At phase 0, sin(0) = 0
        node.process(&[440.0, 0.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
        
        // At phase 0.25 (90 deg), sin = 1.0
        let mut node2 = SineOscNode::new();
        node2.process(&[440.0, 0.25], &mut out, 44100.0);
        assert!((out[0] - 1.0).abs() < 1e-10);
    }
}