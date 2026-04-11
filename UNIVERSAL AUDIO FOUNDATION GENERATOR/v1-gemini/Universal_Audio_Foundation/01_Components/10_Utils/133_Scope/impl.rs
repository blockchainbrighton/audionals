use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct ScopeNode {
    buffer: Vec<f64>,
    write_pos: usize,
}

impl ScopeNode {
    pub fn new() -> Self {
        Self {
            buffer: vec![0.0; 1024],
            write_pos: 0,
        }
    }
}

impl AudioNode for ScopeNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 133,
            name: "Scope",
            category: "10_Utils",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Output" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 1 { return; }
        
        let mut x = inputs[0];
        
        // Write to buffer
        self.buffer[self.write_pos] = x;
        self.write_pos = (self.write_pos + 1) % self.buffer.len();

        // Pass through with denormal check
        if x.is_subnormal() { x = 0.0; }
        
        outputs[0] = x;
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
    fn test_scope_pass_through() {
        let mut node = ScopeNode::new();
        let mut out = [0.0];
        
        node.process(&[0.5], &mut out, 44100.0);
        assert_eq!(out[0], 0.5);
    }

    #[test]
    fn test_scope_denormal() {
        let mut node = ScopeNode::new();
        let mut out = [0.0];
        let denormal = 1.0e-320;
        
        node.process(&[denormal], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
    }
}