use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor, get_buffer_pool};

pub struct BufferLengthNode;

impl BufferLengthNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for BufferLengthNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 42,
            name: "BufferLength",
            category: "03_Memory",
            inputs: &[
                InputDescriptor { name: "Handle", min: 0.0, max: 1000.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Length" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.is_empty() { return; }
        let handle = inputs[0] as usize;
        
        let pool = get_buffer_pool().lock().unwrap();
        outputs[0] = if let Some(buf) = pool.get(handle) {
            buf.len() as f64
        } else {
            0.0
        };
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;
    // Using flat module name from linkage script: category_component
    use crate::memory_bufferalloc::BufferAllocNode;

    #[test]
    fn test_length_reporting() {
        let mut alloc = BufferAllocNode::new();
        let mut len_node = BufferLengthNode::new();
        
        let mut out_h = [0.0];
        let mut out_l = [0.0];
        
        alloc.process(&[512.0], &mut out_h, 44100.0);
        len_node.process(&out_h, &mut out_l, 44100.0);
        
        assert_eq!(out_l[0], 512.0);
    }
}
