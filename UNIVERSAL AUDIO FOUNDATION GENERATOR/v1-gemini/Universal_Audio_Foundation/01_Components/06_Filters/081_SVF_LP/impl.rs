use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};
use std::f64::consts::PI;

pub struct SVFLPNode {
    ic1eq: f64,
    ic2eq: f64,
}

impl SVFLPNode {
    pub fn new() -> Self {
        Self { ic1eq: 0.0, ic2eq: 0.0 }
    }
}

impl AudioNode for SVFLPNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 81,
            name: "SVF_LP",
            category: "06_Filters",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Frequency", min: 20.0, max: 22050.0, default: 1000.0 },
                InputDescriptor { name: "Q", min: 0.1, max: 10.0, default: 0.707 },
            ],
            outputs: &[
                OutputDescriptor { name: "Output" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], sample_rate: f64) {
        if inputs.len() < 3 { return; }
        let v0 = inputs[0];
        let cutoff = inputs[1].max(20.0).min(sample_rate * 0.49);
        let q = inputs[2].max(0.01);

        // Andrew Simper's SVF (Trapezoidal)
        let g = (PI * cutoff / sample_rate).tan();
        let k = 1.0 / q;
        let a1 = 1.0 / (1.0 + g * (g + k));
        let a2 = g * a1;
        let _a3 = g * a2;

        let v1 = a1 * self.ic1eq + a2 * (v0 - self.ic2eq);
        let v2 = self.ic2eq + g * v1;
        let _v3 = v1 - k * v2; // Need if we were doing more, but LP...

        // Update state
        self.ic1eq += 2.0 * (v1 - k * v2);
        self.ic2eq += 2.0 * v2;

        // Output LP = v2
        let mut out = v2;
        if out.abs() < 1e-30 { out = 0.0; }
        outputs[0] = out;
    }

    fn reset(&mut self) {
        self.ic1eq = 0.0;
        self.ic2eq = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_svf_lp() {
        let mut node = SVFLPNode::new();
        let mut out = [0.0];
        node.process(&[1.0, 1000.0, 0.7], &mut out, 44100.0);
        assert!(out[0].abs() < 1.0); // Filtered start
    }
}