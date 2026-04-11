use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};
use std::f64::consts::PI;

pub struct ButterworthNode {
    x1: f64, x2: f64,
    y1: f64, y2: f64,
    last_freq: f64,
    b0: f64, b1: f64, b2: f64, a1: f64, a2: f64,
}

impl ButterworthNode {
    pub fn new() -> Self {
        Self {
            x1: 0.0, x2: 0.0,
            y1: 0.0, y2: 0.0,
            last_freq: -1.0,
            b0: 1.0, b1: 0.0, b2: 0.0, a1: 0.0, a2: 0.0,
        }
    }

    fn calc_coeffs(&mut self, freq: f64, sample_rate: f64) {
        let ff = freq / sample_rate;
        let ita = 1.0 / (PI * ff).tan();
        let q = 2.0f64.sqrt();
        let a0 = 1.0 + q * ita + ita * ita;
        self.b0 = 1.0 / a0;
        self.b1 = 2.0 / a0;
        self.b2 = 1.0 / a0;
        self.a1 = 2.0 * (1.0 - ita * ita) / a0;
        self.a2 = (1.0 - q * ita + ita * ita) / a0;
    }
}

impl AudioNode for ButterworthNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 86,
            name: "Butterworth",
            category: "06_Filters",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Cutoff", min: 20.0, max: 20000.0, default: 1000.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Output" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], sample_rate: f64) {
        if inputs.len() < 2 { return; }
        let x = inputs[0];
        let freq = inputs[1].max(20.0).min(sample_rate * 0.45);

        if freq != self.last_freq {
            self.calc_coeffs(freq, sample_rate);
            self.last_freq = freq;
        }

        let y = self.b0 * x + self.b1 * self.x1 + self.b2 * self.x2
                - self.a1 * self.y1 - self.a2 * self.y2;

        let mut y_safe = y;
        if y_safe.abs() < 1e-30 { y_safe = 0.0; }
        outputs[0] = y_safe;

        self.x2 = self.x1;
        self.x1 = x;
        self.y2 = self.y1;
        self.y1 = y_safe;
    }

    fn reset(&mut self) {
        self.x1 = 0.0; self.x2 = 0.0;
        self.y1 = 0.0; self.y2 = 0.0;
        self.last_freq = -1.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_butterworth_metadata() {
        let node = ButterworthNode::new();
        assert_eq!(node.metadata().name, "Butterworth");
    }
}