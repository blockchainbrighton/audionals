use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct LadderLPNode {
    stage: [f64; 4],
    delay: [f64; 4],
}

impl LadderLPNode {
    pub fn new() -> Self {
        Self {
            stage: [0.0; 4],
            delay: [0.0; 4],
        }
    }
}

impl AudioNode for LadderLPNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 85,
            name: "Ladder_LP",
            category: "06_Filters",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Cutoff", min: 20.0, max: 20000.0, default: 1000.0 },
                InputDescriptor { name: "Resonance", min: 0.0, max: 4.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Output" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], sample_rate: f64) {
        if inputs.len() < 3 { return; }
        let input = inputs[0];
        let cutoff = inputs[1].max(20.0).min(sample_rate * 0.45);
        let resonance = inputs[2].clamp(0.0, 4.0);

        // Simple Stilson/Smith model
        let f = 2.0 * cutoff / sample_rate;
        let k = 3.6 * f - 1.6 * f * f - 1.0;
        let p = (k + 1.0) * 0.5;
        let scale = (1.0 - p) * 1.386249;
        let res = resonance;

        let x = input - res * self.stage[3];

        // 4 stages
        self.stage[0] = x * scale + p * self.delay[0];
        self.stage[1] = self.stage[0] * scale + p * self.delay[1];
        self.stage[2] = self.stage[1] * scale + p * self.delay[2];
        self.stage[3] = self.stage[2] * scale + p * self.delay[3];

        // Feedback clip (optional for analog warmth, but keeping pure for now)
        // self.stage[3] -= (self.stage[3].powi(3)) / 6.0;

        self.delay[0] = self.stage[0];
        self.delay[1] = self.stage[1];
        self.delay[2] = self.stage[2];
        self.delay[3] = self.stage[3];

        let mut out = self.stage[3];
        if out.abs() < 1e-30 { out = 0.0; }
        outputs[0] = out;
    }

    fn reset(&mut self) {
        self.stage = [0.0; 4];
        self.delay = [0.0; 4];
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ladder_metadata() {
        let node = LadderLPNode::new();
        assert_eq!(node.metadata().name, "Ladder_LP");
    }
}