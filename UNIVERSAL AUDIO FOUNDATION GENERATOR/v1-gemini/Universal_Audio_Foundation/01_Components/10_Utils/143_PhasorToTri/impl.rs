use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct PhasorToTriNode;

impl PhasorToTriNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for PhasorToTriNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 143,
            name: "PhasorToTri",
            category: "10_Utils",
            inputs: &[
                InputDescriptor { name: "Phasor", min: 0.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Tri" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 1 { return; }
        
        let ph = inputs[0];
        // Triangle wave mapping 0..1 to 0->1->0->-1->0
        // Period is 1.0 in phasor domain.
        // Scale to 4.0 period for integer math logic
        
        let x = ph * 4.0;
        let mut y = 1.0 - ((x + 1.0).rem_euclid(4.0) - 2.0).abs();

        if y.is_subnormal() { y = 0.0; }

        outputs[0] = y;
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_phasor_to_tri() {
        let mut node = PhasorToTriNode::new();
        let mut out = [0.0];
        
        // 0.0 -> 0
        node.process(&[0.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);

        // 0.25 -> 1
        node.process(&[0.25], &mut out, 44100.0);
        assert_eq!(out[0], 1.0);

        // 0.5 -> 0
        node.process(&[0.5], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);

        // 0.75 -> -1
        node.process(&[0.75], &mut out, 44100.0);
        assert_eq!(out[0], -1.0);
    }
}