use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct PolarToCartNode;

impl PolarToCartNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for PolarToCartNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 92,
            name: "PolarToCart",
            category: "07_Spectral",
            inputs: &[
                InputDescriptor { name: "Magnitude", min: 0.0, max: 100.0, default: 0.0 },
                InputDescriptor { name: "Phase", min: -3.14159, max: 3.14159, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Real" },
                OutputDescriptor { name: "Imag" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 { return; }
        let mag = inputs[0];
        let phase = inputs[1];

        outputs[0] = mag * phase.cos();
        outputs[1] = mag * phase.sin();
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_conversion() {
        let mut node = PolarToCartNode::new();
        let mut out = [0.0, 0.0];
        // mag 1, phase PI/2 -> real 0, imag 1
        node.process(&[1.0, 1.5707963267948966], &mut out, 44100.0);
        assert!(out[0].abs() < 1e-10);
        assert!((out[1] - 1.0).abs() < 1e-10);
    }
}