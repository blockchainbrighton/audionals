use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};
use std::f64::consts::PI;

pub struct PeakingNode {
    x1: f64, x2: f64,
    y1: f64, y2: f64,
    last_params: (f64, f64, f64), // freq, gain_db, q
    b0: f64, b1: f64, b2: f64, a1: f64, a2: f64,
}

impl PeakingNode {
    pub fn new() -> Self {
        Self {
            x1: 0.0, x2: 0.0,
            y1: 0.0, y2: 0.0,
            last_params: (-1.0, -1.0, -1.0),
            b0: 1.0, b1: 0.0, b2: 0.0, a1: 0.0, a2: 0.0,
        }
    }

    fn calc_coeffs(&mut self, freq: f64, gain_db: f64, q: f64, sample_rate: f64) {
        let a = 10.0f64.powf(gain_db / 40.0);
        let w0 = 2.0 * PI * freq / sample_rate;
        let cos_w0 = w0.cos();
        let sin_w0 = w0.sin();
        let alpha = sin_w0 / (2.0 * q);

        let b0_t = 1.0 + alpha * a;
        let b1_t = -2.0 * cos_w0;
        let b2_t = 1.0 - alpha * a;
        let a0_t = 1.0 + alpha / a;
        let a1_t = -2.0 * cos_w0;
        let a2_t = 1.0 - alpha / a;

        let inv_a0 = 1.0 / a0_t;
        self.b0 = b0_t * inv_a0;
        self.b1 = b1_t * inv_a0;
        self.b2 = b2_t * inv_a0;
        self.a1 = a1_t * inv_a0;
        self.a2 = a2_t * inv_a0;
    }
}

impl AudioNode for PeakingNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 88,
            name: "Peaking",
            category: "06_Filters",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Frequency", min: 20.0, max: 20000.0, default: 1000.0 },
                InputDescriptor { name: "Gain_dB", min: -24.0, max: 24.0, default: 0.0 },
                InputDescriptor { name: "Q", min: 0.1, max: 10.0, default: 0.707 },
            ],
            outputs: &[
                OutputDescriptor { name: "Output" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], sample_rate: f64) {
        if inputs.len() < 4 { return; }
        let x = inputs[0];
        let freq = inputs[1].max(20.0).min(sample_rate * 0.45);
        let gain = inputs[2];
        let q = inputs[3].max(0.1);

        if (freq, gain, q) != self.last_params {
            self.calc_coeffs(freq, gain, q, sample_rate);
            self.last_params = (freq, gain, q);
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
        self.last_params = (-1.0, -1.0, -1.0);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_peaking_metadata() {
        let node = PeakingNode::new();
        assert_eq!(node.metadata().name, "Peaking");
    }
}