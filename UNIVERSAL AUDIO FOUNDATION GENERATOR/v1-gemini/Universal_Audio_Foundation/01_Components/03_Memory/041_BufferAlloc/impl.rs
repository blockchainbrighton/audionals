use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor, get_buffer_pool};

pub struct BufferAllocNode {
    id: Option<usize>,
    last_size: usize,
}

impl BufferAllocNode {
    pub fn new() -> Self {
        Self { id: None, last_size: 0 }
    }
}

impl AudioNode for BufferAllocNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 41,
            name: "BufferAlloc",
            category: "03_Memory",
            inputs: &[
                InputDescriptor { name: "Size", min: 0.0, max: 1000000.0, default: 44100.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Handle" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.is_empty() { return; }
        
        let requested_size = inputs[0].max(0.0) as usize;
        
        if self.id.is_none() {
            let mut pool = get_buffer_pool().lock().unwrap();
            self.id = Some(pool.alloc(requested_size));
            self.last_size = requested_size;
        }

        outputs[0] = self.id.unwrap_or(0) as f64;
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_allocation() {
        let mut node = BufferAllocNode::new();
        let mut out = [0.0];
        node.process(&[1024.0], &mut out, 44100.0);
        assert!(out[0] > 0.0);
        
        let handle = out[0] as usize;
        let pool = get_buffer_pool().lock().unwrap();
        let buf = pool.get(handle).unwrap();
        assert_eq!(buf.len(), 1024);
    }
}
