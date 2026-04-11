use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};
use std::f64::consts::PI;

pub struct IfftNode {
    real_in: Vec<f64>,
    imag_in: Vec<f64>,
    real_out: Vec<f64>,
    imag_out: Vec<f64>,
    count: usize,
}

impl IfftNode {
    pub fn new() -> Self {
        Self {
            real_in: vec![0.0; 512],
            imag_in: vec![0.0; 512],
            real_out: vec![0.0; 512],
            imag_out: vec![0.0; 512],
            count: 0,
        }
    }

    fn bit_reverse(n: usize, bits: usize) -> usize {
        let mut reversed = 0;
        let mut n = n;
        for _ in 0..bits {
            reversed = (reversed << 1) | (n & 1);
            n >>= 1;
        }
        reversed
    }

    fn compute_ifft(&mut self) {
        let n = 512;
        let bits = 9;

        // For iFFT we swap real/imag or conjugate, or just change angle sign
        for i in 0..n {
            let rev = Self::bit_reverse(i, bits);
            self.real_out[rev] = self.real_in[i];
            self.imag_out[rev] = self.imag_in[i];
        }

        let mut len = 2;
        while len <= n {
            let angle = 2.0 * PI / (len as f64); // POSITIVE for inverse
            let wlen_re = angle.cos();
            let wlen_im = angle.sin();

            for i in (0..n).step_by(len) {
                let mut w_re = 1.0;
                let mut w_im = 0.0;
                for j in 0..(len / 2) {
                    let u_re = self.real_out[i + j];
                    let u_im = self.imag_out[i + j];
                    let v_re = self.real_out[i + j + len / 2] * w_re - self.imag_out[i + j + len / 2] * w_im;
                    let v_im = self.real_out[i + j + len / 2] * w_im + self.imag_out[i + j + len / 2] * w_re;

                    self.real_out[i + j] = u_re + v_re;
                    self.imag_out[i + j] = u_im + v_im;
                    self.real_out[i + j + len / 2] = u_re - v_re;
                    self.imag_out[i + j + len / 2] = u_im - v_im;

                    let next_w_re = w_re * wlen_re - w_im * wlen_im;
                    w_im = w_re * wlen_im + w_im * wlen_re;
                    w_re = next_w_re;
                }
            }
            len <<= 1;
        }

        // Scale by N
        for i in 0..n {
            self.real_out[i] /= n as f64;
        }
    }
}

impl AudioNode for IfftNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 90,
            name: "iFFT",
            category: "07_Spectral",
            inputs: &[
                InputDescriptor { name: "Real", min: -100.0, max: 100.0, default: 0.0 },
                InputDescriptor { name: "Imag", min: -100.0, max: 100.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Signal" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 { return; }
        
        // Collect bins
        self.real_in[self.count] = inputs[0];
        self.imag_in[self.count] = inputs[1];
        
        // Output from previous IFFT block
        outputs[0] = self.real_out[self.count];
        
        self.count = (self.count + 1) % 512;
        
        if self.count == 0 {
            self.compute_ifft();
        }
    }

    fn reset(&mut self) {
        self.count = 0;
        for i in 0..512 {
            self.real_out[i] = 0.0;
            self.imag_out[i] = 0.0;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ifft_metadata() {
        let node = IfftNode::new();
        assert_eq!(node.metadata().name, "iFFT");
    }
}