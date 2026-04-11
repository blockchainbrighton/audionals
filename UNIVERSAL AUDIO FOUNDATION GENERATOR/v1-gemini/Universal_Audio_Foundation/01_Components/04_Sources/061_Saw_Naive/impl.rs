use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct SawNaiveNode {
    phase: f64,
}

impl SawNaiveNode {
    pub fn new() -> Self {
        Self { phase: 0.0 }
    }
}

impl AudioNode for SawNaiveNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 61,
            name: "Saw_Naive",
            category: "04_Sources",
            inputs: &[
                InputDescriptor { name: "Frequency", min: 0.0, max: 22050.0, default: 440.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Signal" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], sample_rate: f64) {
        if inputs.is_empty() { return; }
        let freq = inputs[0];
        
        // Naive Saw: 2.0 * phase - 1.0
        outputs[0] = 2.0 * self.phase - 1.0;
        
        let phase_inc = freq / sample_rate;
        self.phase = (self.phase + phase_inc).fract();
    }

    fn reset(&mut self) {
        self.phase = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_saw_range() {
        let mut node = SawNaiveNode::new();
        let mut out = [0.0];
        
        // At 0 phase, output should be -1.0
        node.process(&[1.0], &mut out, 100.0);
        assert_eq!(out[0], -1.0);
        
        // Next sample phase = 0.01 -> -0.98
        node.process(&[1.0], &mut out, 100.0);
        assert!((out[0] - (-0.98)).abs() < 1e-10);
    }
}