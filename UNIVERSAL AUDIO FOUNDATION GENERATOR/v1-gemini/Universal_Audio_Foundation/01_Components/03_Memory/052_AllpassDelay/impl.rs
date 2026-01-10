use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct AllpassDelayNode {
    buffer: Vec<f64>,
    write_pos: usize,
}

impl AllpassDelayNode {
    pub fn new() -> Self {
        Self {
            buffer: vec![0.0; 44100], 
            write_pos: 0,
        }
    }
}

impl AudioNode for AllpassDelayNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 52,
            name: "AllpassDelay",
            category: "03_Memory",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "DelaySamples", min: 1.0, max: 40000.0, default: 500.0 },
                InputDescriptor { name: "Gain", min: -0.99, max: 0.99, default: 0.5 },
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
        let g = inputs[2].clamp(-0.99, 0.99);
        
        let len = self.buffer.len();
        
        // Standard Allpass Structure:
        // v = input + g * delayed
        // output = -g * v + delayed
        
        let read_pos_f = (self.write_pos as f64 - delay_samples).rem_euclid(len as f64);
        let i0 = read_pos_f.floor() as usize;
        let i1 = (i0 + 1) % len;
        let frac = read_pos_f - i0 as f64;
        
        let delayed = self.buffer[i0] + (self.buffer[i1] - self.buffer[i0]) * frac;
        
        let mut v = input + g * delayed;
        if v.abs() < 1e-30 { v = 0.0; }
        
        let mut out = -g * v + delayed;
        if out.abs() < 1e-30 { out = 0.0; }
        
        outputs[0] = out;
        
        self.buffer[self.write_pos] = v;
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
    fn test_allpass_metadata() {
        let node = AllpassDelayNode::new();
        assert_eq!(node.metadata().name, "AllpassDelay");
    }
}