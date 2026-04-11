use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct DelayLineNode {
    buffer: Vec<f64>,
    write_pos: usize,
}

impl DelayLineNode {
    pub fn new() -> Self {
        Self {
            buffer: vec![0.0; 44100 * 2], // 1 second default at 88.2k, or 2s at 44.1k
            write_pos: 0,
        }
    }
}

impl AudioNode for DelayLineNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 50,
            name: "DelayLine",
            category: "03_Memory",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "DelaySamples", min: 0.0, max: 100000.0, default: 441.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Output" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 { return; }
        let input = inputs[0];
        let delay_samples = inputs[1].max(0.0);
        
        let len = self.buffer.len();
        
        // Write to current position
        self.buffer[self.write_pos] = input;
        
        // Calculate read position (linear interpolation)
        let read_pos_f = (self.write_pos as f64 - delay_samples).rem_euclid(len as f64);
        let i0 = read_pos_f.floor() as usize;
        let i1 = (i0 + 1) % len;
        let frac = read_pos_f - i0 as f64;
        
        let v0 = self.buffer[i0];
        let v1 = self.buffer[i1];
        
        let mut out = v0 + (v1 - v0) * frac;
        
        // Denormal handling
        if out.abs() < 1e-30 {
            out = 0.0;
        }
        
        outputs[0] = out;
        
        // Advance write position
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
    fn test_delay() {
        let mut node = DelayLineNode::new();
        let mut out = [0.0];
        
        // 10 samples delay
        let delay = 10.0;
        
        // Impulse
        node.process(&[1.0, delay], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
        
        // Process 9 more samples
        for _ in 0..9 {
            node.process(&[0.0, delay], &mut out, 44100.0);
            assert_eq!(out[0], 0.0);
        }
        
        // 11th sample should have the impulse
        node.process(&[0.0, delay], &mut out, 44100.0);
        assert_eq!(out[0], 1.0);
    }
}