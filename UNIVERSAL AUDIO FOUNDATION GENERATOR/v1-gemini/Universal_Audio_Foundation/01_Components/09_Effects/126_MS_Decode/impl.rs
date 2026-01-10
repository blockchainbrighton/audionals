use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct MsDecodeNode;

impl MsDecodeNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for MsDecodeNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 126,
            name: "MS_Decode",
            category: "09_Effects",
            inputs: &[
                InputDescriptor { name: "Mid", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Side", min: -1.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Left" },
                OutputDescriptor { name: "Right" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 || outputs.len() < 2 { return; }
        
        let m = inputs[0];
        let s = inputs[1];

        // Left = (Mid + Side) * 0.5
        // Right = (Mid - Side) * 0.5
        let mut l = (m + s) * 0.5;
        let mut r = (m - s) * 0.5;

        // Denormal handling
        if l.is_subnormal() { l = 0.0; }
        if r.is_subnormal() { r = 0.0; }

        outputs[0] = l;
        outputs[1] = r;
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ms_decode_left() {
        let mut node = MsDecodeNode::new();
        let mut out = [0.0; 2];
        
        // M=1, S=1 -> L=1, R=0
        node.process(&[1.0, 1.0], &mut out, 44100.0);
        assert_eq!(out[0], 1.0);
        assert_eq!(out[1], 0.0);
    }

    #[test]
    fn test_ms_decode_right() {
        let mut node = MsDecodeNode::new();
        let mut out = [0.0; 2];
        
        // M=1, S=-1 -> L=0, R=1
        node.process(&[1.0, -1.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
        assert_eq!(out[1], 1.0);
    }

    #[test]
    fn test_ms_decode_denormal() {
        let mut node = MsDecodeNode::new();
        let mut out = [0.0; 2];
        
        let denormal = 1.0e-320;
        node.process(&[denormal, 0.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
        assert_eq!(out[1], 0.0);
    }
}