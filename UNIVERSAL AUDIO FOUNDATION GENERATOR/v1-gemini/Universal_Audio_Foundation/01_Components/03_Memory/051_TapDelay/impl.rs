use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct TapDelayNode {
    buffer: Vec<f64>,
    write_pos: usize,
}

impl TapDelayNode {
    pub fn new() -> Self {
        Self {
            buffer: vec![0.0; 44100 * 2],
            write_pos: 0,
        }
    }
}

impl AudioNode for TapDelayNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 51,
            name: "TapDelay",
            category: "03_Memory",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Tap1_Samples", min: 0.0, max: 100000.0, default: 441.0 },
                InputDescriptor { name: "Tap2_Samples", min: 0.0, max: 100000.0, default: 882.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Tap1_Out" },
                OutputDescriptor { name: "Tap2_Out" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 3 { return; }
        let input = inputs[0];
        let len = self.buffer.len();
        
        self.buffer[self.write_pos] = input;
        
        for i in 0..2 {
            let delay_samples = inputs[i + 1].max(0.0);
            let read_pos_f = (self.write_pos as f64 - delay_samples).rem_euclid(len as f64);
            let i0 = read_pos_f.floor() as usize;
            let i1 = (i0 + 1) % len;
            let frac = read_pos_f - i0 as f64;
            
            let v0 = self.buffer[i0];
            let v1 = self.buffer[i1];
            let mut out = v0 + (v1 - v0) * frac;
            
            if out.abs() < 1e-30 { out = 0.0; }
            outputs[i] = out;
        }
        
        self.write_pos = (self.write_pos + 1) % len;
    }

    fn reset(&mut self) {
        for x in self.buffer.iter_mut() { *x = 0.0; }
        self.write_pos = 0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_taps() {
        let mut node = TapDelayNode::new();
        let mut out = [0.0, 0.0];
        
        // Tap 1: 5 samples, Tap 2: 10 samples
        node.process(&[1.0, 5.0, 10.0], &mut out, 44100.0);
        
        for i in 1..15 {
            node.process(&[0.0, 5.0, 10.0], &mut out, 44100.0);
            if i == 5 { assert_eq!(out[0], 1.0); }
            if i == 10 { assert_eq!(out[1], 1.0); }
        }
    }
}