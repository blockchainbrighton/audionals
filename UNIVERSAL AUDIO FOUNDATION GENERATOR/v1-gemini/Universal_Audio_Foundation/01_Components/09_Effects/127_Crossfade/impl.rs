use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct CrossfadeNode;

impl CrossfadeNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for CrossfadeNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 127,
            name: "Crossfade",
            category: "09_Effects",
            inputs: &[
                InputDescriptor { name: "A", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "B", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Mix", min: 0.0, max: 1.0, default: 0.5 },
            ],
            outputs: &[
                OutputDescriptor { name: "Output" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 3 { return; }
        
        let a = inputs[0];
        let b = inputs[1];
        let mix = inputs[2].clamp(0.0, 1.0);

        // Linear Crossfade
        let mut y = a * (1.0 - mix) + b * mix;

        // Denormal handling
        if y.is_subnormal() { y = 0.0; }

        outputs[0] = y;
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_crossfade_mix_a() {
        let mut node = CrossfadeNode::new();
        let mut out = [0.0];
        
        // Mix 0.0 -> Output A
        node.process(&[1.0, 2.0, 0.0], &mut out, 44100.0);
        assert_eq!(out[0], 1.0);
    }

    #[test]
    fn test_crossfade_mix_b() {
        let mut node = CrossfadeNode::new();
        let mut out = [0.0];
        
        // Mix 1.0 -> Output B
        node.process(&[1.0, 2.0, 1.0], &mut out, 44100.0);
        assert_eq!(out[0], 2.0);
    }

    #[test]
    fn test_crossfade_mix_mid() {
        let mut node = CrossfadeNode::new();
        let mut out = [0.0];
        
        // Mix 0.5 -> Average
        node.process(&[1.0, 2.0, 0.5], &mut out, 44100.0);
        assert!((out[0] - 1.5).abs() < 1e-9);
    }

    #[test]
    fn test_crossfade_denormal() {
        let mut node = CrossfadeNode::new();
        let mut out = [0.0];
        
        let denormal = 1.0e-320;
        node.process(&[denormal, denormal, 0.5], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
    }
}