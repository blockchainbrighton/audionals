use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct LatchNode {
    is_high: bool,
    last_set: f64,
    last_reset: f64,
}

impl LatchNode {
    pub fn new() -> Self {
        Self {
            is_high: false,
            last_set: 0.0,
            last_reset: 0.0,
        }
    }
}

impl AudioNode for LatchNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 40,
            name: "Latch",
            category: "02_Logic",
            inputs: &[
                InputDescriptor { name: "Set", min: 0.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Reset", min: 0.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "State" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 { return; }
        let set = inputs[0];
        let reset = inputs[1];
        
        // Set edge
        if set > 0.5 && self.last_set <= 0.5 {
            self.is_high = true;
        }
        
        // Reset edge (Reset takes priority if both occur, or just check after)
        if reset > 0.5 && self.last_reset <= 0.5 {
            self.is_high = false;
        }
        
        self.last_set = set;
        self.last_reset = reset;
        
        outputs[0] = if self.is_high { 1.0 } else { 0.0 };
    }

    fn reset(&mut self) {
        self.is_high = false;
        self.last_set = 0.0;
        self.last_reset = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_logic() {
        let mut node = LatchNode::new();
        let mut out = [0.0];
        
        // 1. Set High
        node.process(&[1.0, 0.0], &mut out, 44100.0);
        assert_eq!(out[0], 1.0);
        
        // 2. Stay high
        node.process(&[0.0, 0.0], &mut out, 44100.0);
        assert_eq!(out[0], 1.0);
        
        // 3. Reset
        node.process(&[0.0, 1.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
    }
}