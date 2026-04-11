use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor, get_buffer_pool};

pub struct BufferOverdubNode;

impl BufferOverdubNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for BufferOverdubNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 48,
            name: "BufferOverdub",
            category: "03_Memory",
            inputs: &[
                InputDescriptor { name: "Handle", min: 0.0, max: 1000.0, default: 0.0 },
                InputDescriptor { name: "Index", min: 0.0, max: 1000000.0, default: 0.0 },
                InputDescriptor { name: "AddValue", min: -1.0, max: 1.0, default: 0.0 },
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
        let val = inputs[2];
        
        let mut pool = get_buffer_pool().lock().unwrap();
        if let Some(buf) = pool.get_mut(handle) {
            if !buf.is_empty() {
                let idx = index % buf.len();
                buf[idx] += val;
            }
        }
        
        outputs[0] = handle as f64;
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::memory_bufferalloc::BufferAllocNode;
    use crate::memory_bufferread_raw::BufferReadRawNode;

    #[test]
    fn test_overdub() {
        let mut alloc = BufferAllocNode::new();
        let mut overdub = BufferOverdubNode::new();
        let mut read = BufferReadRawNode::new();
        
        let mut out_h = [0.0];
        let mut out_v = [0.0];
        
        alloc.process(&[10.0], &mut out_h, 44100.0);
        let h = out_h[0];
        
        // Add 0.5 twice to index 0
        overdub.process(&[h, 0.0, 0.5], &mut out_h, 44100.0);
        overdub.process(&[h, 0.0, 0.5], &mut out_h, 44100.0);
        
        read.process(&[h, 0.0], &mut out_v, 44100.0);
        assert_eq!(out_v[0], 1.0);
    }
}