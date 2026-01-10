use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};
use std::f64::consts::TAU;

pub struct PhasorToSinNode;

impl PhasorToSinNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for PhasorToSinNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 142,
            name: "PhasorToSin",
            category: "10_Utils",
            inputs: &[
                InputDescriptor { name: "Phasor", min: 0.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Sin" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 1 { return; }
        
        let ph = inputs[0];
        // Sin = sin(phasor * 2PI)
        let mut y = (ph * TAU).sin();

        // Denormal check
        if y.is_subnormal() { y = 0.0; }

        outputs[0] = y;
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_phasor_to_sin() {
        let mut node = PhasorToSinNode::new();
        let mut out = [0.0];
        
        // 0.0 -> sin(0) = 0
        node.process(&[0.0], &mut out, 44100.0);
        assert!((out[0] - 0.0).abs() < 1e-9);

        // 0.25 -> sin(PI/2) = 1
        node.process(&[0.25], &mut out, 44100.0);
        assert!((out[0] - 1.0).abs() < 1e-9);

        // 0.75 -> sin(3PI/2) = -1
        node.process(&[0.75], &mut out, 44100.0);
        assert!((out[0] - -1.0).abs() < 1e-9);
    }
}