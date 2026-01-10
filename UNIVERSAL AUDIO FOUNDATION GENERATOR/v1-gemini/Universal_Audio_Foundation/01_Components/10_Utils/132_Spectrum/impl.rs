use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct SpectrumNode;

impl SpectrumNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for SpectrumNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 132,
            name: "Spectrum",
            category: "10_Utils",
            inputs: &[
                InputDescriptor { name: "Real", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Imag", min: -1.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Magnitude" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 { return; }
        
        let re = inputs[0];
        let im = inputs[1];

        let mut mag = (re * re + im * im).sqrt();

        // Denormal handling
        if mag.is_subnormal() { mag = 0.0; }

        outputs[0] = mag;
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_spectrum_magnitude() {
        let mut node = SpectrumNode::new();
        let mut out = [0.0];
        
        // 3-4-5 triangle
        node.process(&[3.0, 4.0], &mut out, 44100.0);
        assert!((out[0] - 5.0).abs() < 1e-9);
    }

    #[test]
    fn test_spectrum_zero() {
        let mut node = SpectrumNode::new();
        let mut out = [0.0];
        
        node.process(&[0.0, 0.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
    }

    #[test]
    fn test_spectrum_denormal() {
        let mut node = SpectrumNode::new();
        let mut out = [0.0];
        let denormal = 1.0e-320;
        
        node.process(&[denormal, 0.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
    }
}