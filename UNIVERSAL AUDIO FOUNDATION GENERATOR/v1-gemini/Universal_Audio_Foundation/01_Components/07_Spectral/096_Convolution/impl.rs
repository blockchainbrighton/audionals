use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor, get_buffer_pool};

pub struct ConvolutionNode {
    history: Vec<f64>,
    pos: usize,
}

impl ConvolutionNode {
    pub fn new() -> Self {
        Self {
            history: vec![0.0; 128], // 128-tap fixed convolution for the atom
            pos: 0,
        }
    }
}

impl AudioNode for ConvolutionNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 96,
            name: "Convolution",
            category: "07_Spectral",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Handle", min: 0.0, max: 1000.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Output" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 { return; }
        let x = inputs[0];
        let handle = inputs[1] as usize;

        // Add to history
        self.history[self.pos] = x;
        
        let mut sum = 0.0;
        let pool = get_buffer_pool().lock().unwrap();
        if let Some(ir) = pool.get(handle) {
            let ir_len = ir.len().min(128);
            for i in 0..ir_len {
                let h_idx = (self.pos + 128 - i) % 128;
                sum += self.history[h_idx] * ir[i];
            }
        }

        if sum.abs() < 1e-30 { sum = 0.0; }
        outputs[0] = sum;

        self.pos = (self.pos + 1) % 128;
    }

    fn reset(&mut self) {
        for x in self.history.iter_mut() { *x = 0.0; }
        self.pos = 0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_convolution_metadata() {
        let node = ConvolutionNode::new();
        assert_eq!(node.metadata().name, "Convolution");
    }
}