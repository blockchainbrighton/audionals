use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct CombDelayNode {
    buffer: Vec<f64>,
    write_pos: usize,
}

impl CombDelayNode {
    pub fn new() -> Self {
        Self {
            buffer: vec![0.0; 44100], // Max ~1s
            write_pos: 0,
        }
    }
}

impl AudioNode for CombDelayNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 53,
            name: "CombDelay",
            category: "03_Memory",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "DelaySamples", min: 1.0, max: 40000.0, default: 441.0 },
                InputDescriptor { name: "Feedback", min: -0.99, max: 0.99, default: 0.5 },
            ],
            outputs: &[
                OutputDescriptor { name: "Output" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 3 { return; }
        let input = inputs[0];
        let delay_samples = inputs[1].max(1.0);
        let feedback = inputs[2].clamp(-0.99, 0.99);
        
        let len = self.buffer.len();
        
        // Read from delay line
        let read_pos_f = (self.write_pos as f64 - delay_samples).rem_euclid(len as f64);
        let i0 = read_pos_f.floor() as usize;
        let i1 = (i0 + 1) % len;
        let frac = read_pos_f - i0 as f64;
        
        let delayed_val = self.buffer[i0] + (self.buffer[i1] - self.buffer[i0]) * frac;
        
        // Output is the delayed value (or input + delayed? Standard FB Comb output is usually the delay line tap or the new input)
        // Standard Schroeder-style: 
        // input -> (+) -> [Delay] -> output
        //           ^         |
        //           |__(g)____|
        // So the output of the system IS the output of the delay line.
        
        outputs[0] = delayed_val;
        
        // Feedback path
        let mut new_val = input + (delayed_val * feedback);
        
        // Denormal
        if new_val.abs() < 1e-30 { new_val = 0.0; }
        
        self.buffer[self.write_pos] = new_val;
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
    fn test_feedback() {
        let mut node = CombDelayNode::new();
        let mut out = [0.0];
        
        // Delay 10 samples, Feedback 0.5
        let delay = 10.0;
        let fb = 0.5;
        
        // Impulse
        node.process(&[1.0, delay, fb], &mut out, 44100.0);
        
        // At t=0, output is 0.0 (buffer empty)
        assert_eq!(out[0], 0.0);
        
        // Wait 10 samples
        for _ in 0..9 {
            node.process(&[0.0, delay, fb], &mut out, 44100.0);
            assert_eq!(out[0], 0.0);
        }
        
        // t=10: First echo (the impulse input that was written at t=0 comes out)
        // Value written at t=0 was: input(1.0) + 0 = 1.0.
        node.process(&[0.0, delay, fb], &mut out, 44100.0);
        assert_eq!(out[0], 1.0);
        
        // Wait 10 samples
        for _ in 0..9 {
            node.process(&[0.0, delay, fb], &mut out, 44100.0);
        }
        
        // t=20: Second echo
        // Value written at t=10 was: input(0.0) + delayed(1.0) * 0.5 = 0.5.
        node.process(&[0.0, delay, fb], &mut out, 44100.0);
        assert_eq!(out[0], 0.5);
    }
}