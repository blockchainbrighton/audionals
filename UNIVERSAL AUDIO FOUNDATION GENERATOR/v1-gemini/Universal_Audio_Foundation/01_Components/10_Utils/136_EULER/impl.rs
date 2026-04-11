use crate::traits::{AudioNode, AudioNodeMetadata, OutputDescriptor};
use std::f64::consts::E;

pub struct EulerNode;

impl EulerNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for EulerNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 136,
            name: "EULER",
            category: "10_Utils",
            inputs: &[],
            outputs: &[
                OutputDescriptor { name: "E" },
            ],
        }
    }

    fn process(&mut self, _inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if outputs.is_empty() { return; }
        outputs[0] = E;
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_euler_value() {
        let mut node = EulerNode::new();
        let mut out = [0.0];
        
        node.process(&[], &mut out, 44100.0);
        assert!((out[0] - std::f64::consts::E).abs() < 1e-15);
    }
}