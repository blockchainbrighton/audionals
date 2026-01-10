use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};
use std::f64::consts::FRAC_PI_4;

pub struct PanEqualNode;

impl PanEqualNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for PanEqualNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 124,
            name: "Pan_Equal",
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

        // Equal Power Pan Law
        // Map Pan [-1, 1] to Angle [0, PI/2]
        // Left = Input * cos(theta)
        // Right = Input * sin(theta)
        // At Pan 0 (Center), theta = PI/4. cos=sin=0.707. 0.707^2 + 0.707^2 = 0.5+0.5 = 1.
        
        let theta = (pan + 1.0) * FRAC_PI_4;
        let (sin_t, cos_t) = theta.sin_cos();

        let mut l = input * cos_t;
        let mut r = input * sin_t;

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
    fn test_pan_equal_center() {
        let mut node = PanEqualNode::new();
        let mut out = [0.0; 2];
        
        // Center: Pan 0.0 -> 0.707 gain
        node.process(&[1.0, 0.0], &mut out, 44100.0);
        let sqrt2_over_2 = std::f64::consts::FRAC_1_SQRT_2;
        assert!((out[0] - sqrt2_over_2).abs() < 1e-9);
        assert!((out[1] - sqrt2_over_2).abs() < 1e-9);
    }

    #[test]
    fn test_pan_equal_hard_left() {
        let mut node = PanEqualNode::new();
        let mut out = [0.0; 2];
        
        // Left: Pan -1.0 -> L=1, R=0
        node.process(&[1.0, -1.0], &mut out, 44100.0);
        assert!((out[0] - 1.0).abs() < 1e-9);
        assert!((out[1] - 0.0).abs() < 1e-9);
    }

    #[test]
    fn test_pan_equal_hard_right() {
        let mut node = PanEqualNode::new();
        let mut out = [0.0; 2];
        
        // Right: Pan 1.0 -> L=0, R=1
        node.process(&[1.0, 1.0], &mut out, 44100.0);
        assert!((out[0] - 0.0).abs() < 1e-9);
        assert!((out[1] - 1.0).abs() < 1e-9);
    }

    #[test]
    fn test_pan_equal_denormal() {
        let mut node = PanEqualNode::new();
        let mut out = [0.0; 2];
        
        let denormal = 1.0e-320;
        node.process(&[denormal, 0.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
        assert_eq!(out[1], 0.0);
    }
}