use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};
use std::f64::consts::PI;

pub struct FFTNode {
    buffer: Vec<f64>,
    real: Vec<f64>,
    imag: Vec<f64>,
    write_pos: usize,
    ready: bool,
}

impl FFTNode {
    pub fn new() -> Self {
        Self {
            buffer: vec![0.0; 512],
            real: vec![0.0; 512],
            imag: vec![0.0; 512],
            write_pos: 0,
            ready: false,
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

    fn compute_fft(&mut self) {
        let n = 512;
        let bits = 9;

        // Init complex arrays
        for i in 0..n {
            let rev = Self::bit_reverse(i, bits);
            self.real[rev] = self.buffer[i];
            self.imag[rev] = 0.0;
        }

        // Cooley-Tukey Radix-2
        let mut len = 2;
        while len <= n {
            let angle = -2.0 * PI / (len as f64);
            let wlen_re = angle.cos();
            let wlen_im = angle.sin();

            for i in (0..n).step_by(len) {
                let mut w_re = 1.0;
                let mut w_im = 0.0;
                for j in 0..(len / 2) {
                    let u_re = self.real[i + j];
                    let u_im = self.imag[i + j];
                    let v_re = self.real[i + j + len / 2] * w_re - self.imag[i + j + len / 2] * w_im;
                    let v_im = self.real[i + j + len / 2] * w_im + self.imag[i + j + len / 2] * w_re;

                    self.real[i + j] = u_re + v_re;
                    self.imag[i + j] = u_im + v_im;
                    self.real[i + j + len / 2] = u_re - v_re;
                    self.imag[i + j + len / 2] = u_im - v_im;

                    let next_w_re = w_re * wlen_re - w_im * wlen_im;
                    w_im = w_re * wlen_im + w_im * wlen_re;
                    w_re = next_w_re;
                }
            }
            len <<= 1;
        }
    }
}

impl AudioNode for FFTNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 89,
            name: "FFT",
            category: "07_Spectral",
            inputs: &[
                InputDescriptor { name: "Signal", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "BinIndex", min: 0.0, max: 511.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Real" },
                OutputDescriptor { name: "Imag" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 { return; }
        let signal = inputs[0];
        let bin = (inputs[1].round() as usize) % 512;

        self.buffer[self.write_pos] = signal;
        self.write_pos = (self.write_pos + 1) % 512;

        if self.write_pos == 0 {
            self.compute_fft();
            self.ready = true;
        }

        if self.ready {
            outputs[0] = self.real[bin];
            outputs[1] = self.imag[bin];
        } else {
            outputs[0] = 0.0;
            outputs[1] = 0.0;
        }
    }

    fn reset(&mut self) {
        for x in self.buffer.iter_mut() { *x = 0.0; }
        self.write_pos = 0;
        self.ready = false;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fft_metadata() {
        let node = FFTNode::new();
        assert_eq!(node.metadata().name, "FFT");
    }
}