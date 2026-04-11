use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor, get_buffer_pool};

pub struct BufferWriteRawNode;

impl BufferWriteRawNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for BufferWriteRawNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 45,
            name: "BufferWrite_Raw",
            category: "03_Memory",
            inputs: &[
                InputDescriptor { name: "Handle", min: 0.0, max: 1000.0, default: 0.0 },
                InputDescriptor { name: "Index", min: 0.0, max: 1000000.0, default: 0.0 },
                InputDescriptor { name: "Value", min: -1.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Handle" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 3 { return; }
        let handle = inputs[0] as usize;
        let index = inputs[1] as usize;
        let value = inputs[2];
        
        let mut pool = get_buffer_pool().lock().unwrap();
        if let Some(buf) = pool.get_mut(handle) {
            if !buf.is_empty() {
                let len = buf.len();
                buf[index % len] = value;
            }
        }
        
        outputs[0] = handle as f64;
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_instantiation() {
        let node = BufferWriteRawNode::new();
        assert_eq!(node.metadata().name, "BufferWrite_Raw");
    }
}