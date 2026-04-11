use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};
use std::f64::consts::PI;

pub struct BiquadNode {
    x1: f64, x2: f64,
    y1: f64, y2: f64,
    // Cache
    last_type: f64,
    last_freq: f64,
    last_q: f64,
    b0: f64, b1: f64, b2: f64, a1: f64, a2: f64,
}

impl BiquadNode {
    pub fn new() -> Self {
        Self { 
            x1: 0.0, x2: 0.0,
            y1: 0.0, y2: 0.0,
            last_type: -1.0, last_freq: -1.0, last_q: -1.0,
            b0: 1.0, b1: 0.0, b2: 0.0, a1: 0.0, a2: 0.0,
        }
    }

    fn calc_coeffs(&mut self, type_idx: f64, freq: f64, q: f64, sample_rate: f64) {
        let w0 = 2.0 * PI * freq / sample_rate;
        let cos_w0 = w0.cos();
        let sin_w0 = w0.sin();
        let alpha = sin_w0 / (2.0 * q);

        // RBJ Cookbook
        let (a0, b0_t, b1_t, b2_t, a1_t, a2_t) = match type_idx.round() as i32 {
            0 => { // Lowpass
                let b = (1.0 - cos_w0) / 2.0;
                (1.0 + alpha, b, 1.0 - cos_w0, b, -2.0 * cos_w0, 1.0 - alpha)
            },
            1 => { // Highpass
                let b = (1.0 + cos_w0) / 2.0;
                (1.0 + alpha, b, -(1.0 + cos_w0), b, -2.0 * cos_w0, 1.0 - alpha)
            },
            2 => { // Bandpass
                (1.0 + alpha, alpha, 0.0, -alpha, -2.0 * cos_w0, 1.0 - alpha)
            },
            3 => { // Notch
                (1.0 + alpha, 1.0, -2.0 * cos_w0, 1.0, -2.0 * cos_w0, 1.0 - alpha)
            },
            _ => (1.0, 1.0, 0.0, 0.0, 0.0, 0.0) // Pass through
        };

        let inv_a0 = 1.0 / a0;
        self.b0 = b0_t * inv_a0;
        self.b1 = b1_t * inv_a0;
        self.b2 = b2_t * inv_a0;
        self.a1 = a1_t * inv_a0;
        self.a2 = a2_t * inv_a0;
    }
}

impl AudioNode for BiquadNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 80,
            name: "Biquad",
            category: "06_Filters",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Frequency", min: 20.0, max: 22050.0, default: 1000.0 },
                InputDescriptor { name: "Q", min: 0.1, max: 10.0, default: 0.707 },
                InputDescriptor { name: "Type", min: 0.0, max: 3.0, default: 0.0 }, // 0:LP, 1:HP, 2:BP, 3:Notch
            ],
            outputs: &[
                OutputDescriptor { name: "Output" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], sample_rate: f64) {
        if inputs.len() < 4 { return; }
        let x = inputs[0];
        let freq = inputs[1].max(20.0).min(sample_rate * 0.49);
        let q = inputs[2].max(0.01);
        let filter_type = inputs[3];

        if freq != self.last_freq || q != self.last_q || filter_type != self.last_type {
            self.calc_coeffs(filter_type, freq, q, sample_rate);
            self.last_freq = freq;
            self.last_q = q;
            self.last_type = filter_type;
        }

        // Direct Form I
        let y = self.b0 * x + self.b1 * self.x1 + self.b2 * self.x2
                - self.a1 * self.y1 - self.a2 * self.y2;

        let mut y_safe = y;
        if y_safe.abs() < 1e-30 { y_safe = 0.0; }

        outputs[0] = y_safe;

        // Shift
        self.x2 = self.x1;
        self.x1 = x;
        self.y2 = self.y1;
        self.y1 = y_safe;
    }

    fn reset(&mut self) {
        self.x1 = 0.0; self.x2 = 0.0;
        self.y1 = 0.0; self.y2 = 0.0;
        self.last_freq = -1.0; // Force recalc
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_biquad_lp() {
        let mut node = BiquadNode::new();
        let mut out = [0.0];
        
        // Lowpass at 100Hz
        node.process(&[1.0, 100.0, 0.707, 0.0], &mut out, 44100.0);
        assert!(out[0] < 1.0);
    }
}