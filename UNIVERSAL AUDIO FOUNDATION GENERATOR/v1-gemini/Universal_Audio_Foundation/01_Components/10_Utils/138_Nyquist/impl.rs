use crate::traits::{AudioNode, AudioNodeMetadata, OutputDescriptor};

pub struct NyquistNode;

impl NyquistNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for NyquistNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 138,
            name: "Nyquist",
            category: "10_Utils",
            inputs: &[],
            outputs: &[
                OutputDescriptor { name: "Nyquist" },
            ],
        }
    }

    fn process(&mut self, _inputs: &[f64], outputs: &mut [f64], sample_rate: f64) {
        if outputs.is_empty() { return; }
        outputs[0] = sample_rate * 0.5;
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_nyquist_output() {
        let mut node = NyquistNode::new();
        let mut out = [0.0];
        
        node.process(&[], &mut out, 44100.0);
        assert_eq!(out[0], 22050.0);
    }
}