use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor, get_buffer_pool};

pub struct BufferClearNode {
    last_trigger: f64,
}

impl BufferClearNode {
    pub fn new() -> Self {
        Self { last_trigger: 0.0 }
    }
}

impl AudioNode for BufferClearNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 43,
            name: "BufferClear",
            category: "03_Memory",
            inputs: &[
                InputDescriptor { name: "Handle", min: 0.0, max: 1000.0, default: 0.0 },
                InputDescriptor { name: "Trigger", min: 0.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Handle" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 { return; }
        let handle = inputs[0] as usize;
        let trigger = inputs[1];
        
        if trigger > 0.5 && self.last_trigger <= 0.5 {
            let mut pool = get_buffer_pool().lock().unwrap();
            pool.clear(handle);
        }
        
        self.last_trigger = trigger;
        outputs[0] = handle as f64;
    }

    fn reset(&mut self) {
        self.last_trigger = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_clear_trigger() {
        let mut node = BufferClearNode::new();
        let mut out = [0.0];
        node.process(&[1.0, 1.0], &mut out, 44100.0);
        assert_eq!(out[0], 1.0);
    }
}
