use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor, get_buffer_pool};

pub struct BufferReadRawNode;

impl BufferReadRawNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for BufferReadRawNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 44,
            name: "BufferRead_Raw",
            category: "03_Memory",
            inputs: &[
                InputDescriptor { name: "Handle", min: 0.0, max: 1000.0, default: 0.0 },
                InputDescriptor { name: "Index", min: 0.0, max: 1000000.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Value" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 { return; }
        let handle = inputs[0] as usize;
        let index = inputs[1] as usize;
        
        let pool = get_buffer_pool().lock().unwrap();
        outputs[0] = if let Some(buf) = pool.get(handle) {
            if buf.is_empty() {
                0.0
            } else {
                buf[index % buf.len()]
            }
        } else {
            0.0
        };
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::memory_bufferalloc::BufferAllocNode;
    use crate::memory_bufferwrite_raw::BufferWriteRawNode;

    #[test]
    fn test_read_accuracy() {
        let mut alloc = BufferAllocNode::new();
        let mut write = BufferWriteRawNode::new();
        let mut read = BufferReadRawNode::new();
        
        let mut out_h = [0.0];
        let mut out_v = [0.0];
        
        // 1. Alloc
        alloc.process(&[10.0], &mut out_h, 44100.0);
        let h = out_h[0];
        
        // 2. Write 0.5 to index 3
        write.process(&[h, 3.0, 0.5], &mut out_h, 44100.0);
        
        // 3. Read back
        read.process(&[h, 3.0], &mut out_v, 44100.0);
        assert_eq!(out_v[0], 0.5);
        
        // 4. Read wrap
        read.process(&[h, 13.0], &mut out_v, 44100.0);
        assert_eq!(out_v[0], 0.5);
    }
}