use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct FracNode;

impl FracNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for FracNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 13,
            name: "Frac",
            category: "01_Math_Atoms",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Fractional" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.is_empty() { return; }
        
        // Frac(x) = x - floor(x)
        let val = inputs[0];
        let mut frac = val - val.floor();

        // Denormal handling
        if frac.abs() > 0.0 && frac.abs() < 1.0e-30 {
            frac = 0.0;
        }

        outputs[0] = frac;
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_instantiation_and_metadata() {
        let node = FracNode::new();
        assert_eq!(node.metadata().name, "Frac");
    }

    #[test]
    fn test_math_accuracy() {
        let mut node = FracNode::new();
        let mut out = [0.0];
        node.process(&[1.75], &mut out, 44100.0);
        assert!((out[0] - 0.75).abs() < 1e-10);
        
        node.process(&[-0.25], &mut out, 44100.0);
        // -0.25 - floor(-0.25) = -0.25 - (-1.0) = 0.75
        assert!((out[0] - 0.75).abs() < 1e-10);
    }

    #[test]
    fn test_denormal_handling() {
        let mut node = FracNode::new();
        let mut out = [0.0];
        node.process(&[1.0 + 1e-40], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
    }
}