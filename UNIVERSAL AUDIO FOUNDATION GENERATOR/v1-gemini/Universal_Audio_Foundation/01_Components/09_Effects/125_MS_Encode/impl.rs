use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct MsEncodeNode;

impl MsEncodeNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for MsEncodeNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 125,
            name: "MS_Encode",
            category: "09_Effects",
            inputs: &[
                InputDescriptor { name: "Left", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Right", min: -1.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Mid" },
                OutputDescriptor { name: "Side" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 || outputs.len() < 2 { return; }
        
        let l = inputs[0];
        let r = inputs[1];

        // Mid = L + R
        // Side = L - R
        let mut m = l + r;
        let mut s = l - r;

        // Denormal handling
        if m.is_subnormal() { m = 0.0; }
        if s.is_subnormal() { s = 0.0; }

        outputs[0] = m;
        outputs[1] = s;
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ms_encode_mid() {
        let mut node = MsEncodeNode::new();
        let mut out = [0.0; 2];
        
        // Correlated (Mono Center): L=1, R=1. M=2, S=0.
        node.process(&[0.5, 0.5], &mut out, 44100.0);
        assert_eq!(out[0], 1.0); // Mid
        assert_eq!(out[1], 0.0); // Side
    }

    #[test]
    fn test_ms_encode_side() {
        let mut node = MsEncodeNode::new();
        let mut out = [0.0; 2];
        
        // Anti-correlated: L=1, R=-1. M=0, S=2.
        node.process(&[0.5, -0.5], &mut out, 44100.0);
        assert_eq!(out[0], 0.0); // Mid
        assert_eq!(out[1], 1.0); // Side
    }

    #[test]
    fn test_ms_encode_denormal() {
        let mut node = MsEncodeNode::new();
        let mut out = [0.0; 2];
        
        let denormal = 1.0e-320;
        node.process(&[denormal, 0.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
        assert_eq!(out[1], 0.0);
    }
}