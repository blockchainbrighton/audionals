use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct TriNaiveNode {
    phase: f64,
}

impl TriNaiveNode {
    pub fn new() -> Self {
        Self { phase: 0.0 }
    }
}

impl AudioNode for TriNaiveNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 63,
            name: "Tri_Naive",
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
        
        // Naive Triangle: 4 * abs(phase - 0.5) - 1.0
        // Maps 0.0..1.0 -> -1..1..-1
        // At 0.0 -> 4*0.5 - 1 = 1.0
        // At 0.5 -> 4*0.0 - 1 = -1.0
        // This is a Cosine-phase triangle.
        // Standard Sine-phase triangle starts at 0.
        
        // Let's implement standard mathematical triangle starting at -1.0 going up?
        // Usually matches Saw phase.
        // Saw: -1 to 1.
        // Tri: 1 - 2*abs(2*phase - 1)  <-- Common formulation
        
        let saw = 2.0 * self.phase - 1.0;
        outputs[0] = 1.0 - 2.0 * saw.abs(); // 0->1, 0.5->-1, 1.0->1.
        
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
    fn test_tri() {
        let mut node = TriNaiveNode::new();
        let mut out = [0.0];
        
        // T=0, Phase=0. Output = 1.0 - 2*|-1| = 1 - 2 = -1.0?
        // Logic: saw = -1. abs(saw) = 1. 1 - 2 = -1.
        // T=0.5, Phase=0.5. saw = 0. output = 1.0.
        
        node.process(&[1.0], &mut out, 100.0);
        assert_eq!(out[0], -1.0);
    }
}