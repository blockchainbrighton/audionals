use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct PanLinNode;

impl PanLinNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for PanLinNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 123,
            name: "Pan_Lin",
            category: "09_Effects",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Pan", min: -1.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Left" },
                OutputDescriptor { name: "Right" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 || outputs.len() < 2 { return; }
        
        let input = inputs[0];
        let pan = inputs[1].clamp(-1.0, 1.0);

        // Linear Pan Law: Sum of L+R amplitudes = 1.0 (for Pan=0 => 0.5+0.5=1)
        // L = 0.5 * (1 - Pan)
        // R = 0.5 * (1 + Pan)

        let mut l = input * 0.5 * (1.0 - pan);
        let mut r = input * 0.5 * (1.0 + pan);

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
    fn test_pan_lin_center() {
        let mut node = PanLinNode::new();
        let mut out = [0.0; 2];
        
        // Center: Pan 0.0. Input 1.0 -> L=0.5, R=0.5
        node.process(&[1.0, 0.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.5);
        assert_eq!(out[1], 0.5);
    }

    #[test]
    fn test_pan_lin_hard_left() {
        let mut node = PanLinNode::new();
        let mut out = [0.0; 2];
        
        // Left: Pan -1.0. Input 1.0 -> L=1.0, R=0.0
        node.process(&[1.0, -1.0], &mut out, 44100.0);
        assert_eq!(out[0], 1.0);
        assert_eq!(out[1], 0.0);
    }

    #[test]
    fn test_pan_lin_hard_right() {
        let mut node = PanLinNode::new();
        let mut out = [0.0; 2];
        
        // Right: Pan 1.0. Input 1.0 -> L=0.0, R=1.0
        node.process(&[1.0, 1.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
        assert_eq!(out[1], 1.0);
    }

    #[test]
    fn test_pan_lin_denormal() {
        let mut node = PanLinNode::new();
        let mut out = [0.0; 2];
        
        let denormal = 1.0e-320;
        node.process(&[denormal, 0.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
        assert_eq!(out[1], 0.0);
    }
}