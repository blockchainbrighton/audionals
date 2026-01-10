use crate::traits::{AudioNode, AudioNodeMetadata, OutputDescriptor};
use std::f64::consts::PI;

pub struct PiNode;

impl PiNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for PiNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 134,
            name: "PI",
            category: "10_Utils",
            inputs: &[],
            outputs: &[
                OutputDescriptor { name: "PI" },
            ],
        }
    }

    fn process(&mut self, _inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if outputs.is_empty() { return; }
        outputs[0] = PI;
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pi_value() {
        let mut node = PiNode::new();
        let mut out = [0.0];
        
        node.process(&[], &mut out, 44100.0);
        assert!((out[0] - std::f64::consts::PI).abs() < 1e-15);
    }
}