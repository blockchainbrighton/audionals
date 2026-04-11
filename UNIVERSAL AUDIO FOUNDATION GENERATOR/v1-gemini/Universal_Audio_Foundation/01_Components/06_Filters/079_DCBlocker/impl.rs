use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct DCBlockerNode {
    x1: f64,
    y1: f64,
}

impl DCBlockerNode {
    pub fn new() -> Self {
        Self { x1: 0.0, y1: 0.0 }
    }
}

impl AudioNode for DCBlockerNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 79,
            name: "DCBlocker",
            category: "06_Filters",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Pole", min: 0.9, max: 0.9999, default: 0.995 },
            ],
            outputs: &[
                OutputDescriptor { name: "Output" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 { return; }
        let x = inputs[0];
        let r = inputs[1].clamp(0.0, 0.999999);
        
        let mut y = x - self.x1 + r * self.y1;
        
        if y.abs() < 1e-30 { y = 0.0; }
        
        outputs[0] = y;
        self.x1 = x;
        self.y1 = y;
    }

    fn reset(&mut self) {
        self.x1 = 0.0;
        self.y1 = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dc_blocking() {
        let mut node = DCBlockerNode::new();
        let mut out = [0.0];
        
        // Constant DC offset 0.5
        for _ in 0..1000 {
            node.process(&[0.5, 0.995], &mut out, 44100.0);
        }
        // Output should have decayed towards 0.0
        assert!(out[0].abs() < 0.01);
    }
}