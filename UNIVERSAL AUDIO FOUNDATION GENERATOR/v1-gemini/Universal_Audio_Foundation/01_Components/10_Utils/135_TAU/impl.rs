use crate::traits::{AudioNode, AudioNodeMetadata, OutputDescriptor};
use std::f64::consts::TAU;

pub struct TauNode;

impl TauNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for TauNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 135,
            name: "TAU",
            category: "10_Utils",
            inputs: &[],
            outputs: &[
                OutputDescriptor { name: "TAU" },
            ],
        }
    }

    fn process(&mut self, _inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if outputs.is_empty() { return; }
        outputs[0] = TAU;
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tau_value() {
        let mut node = TauNode::new();
        let mut out = [0.0];
        
        node.process(&[], &mut out, 44100.0);
        assert!((out[0] - std::f64::consts::TAU).abs() < 1e-15);
    }
}