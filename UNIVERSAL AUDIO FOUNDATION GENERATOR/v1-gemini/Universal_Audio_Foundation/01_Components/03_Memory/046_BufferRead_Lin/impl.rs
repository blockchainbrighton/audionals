use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor, get_buffer_pool};

pub struct BufferReadLinNode;

impl BufferReadLinNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for BufferReadLinNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 46,
            name: "BufferRead_Lin",
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
        let index_f = inputs[1];
        
        let pool = get_buffer_pool().lock().unwrap();
        outputs[0] = if let Some(buf) = pool.get(handle) {
            let len = buf.len();
            if len == 0 {
                0.0
            } else if len == 1 {
                buf[0]
            } else {
                // Linear Interpolation with wrapping
                let i0 = index_f.floor();
                let frac = index_f - i0;
                
                let idx0 = (i0 as i64).rem_euclid(len as i64) as usize;
                let idx1 = (idx0 + 1) % len;
                
                let v0 = buf[idx0];
                let v1 = buf[idx1];
                
                let mut res = v0 + (v1 - v0) * frac;
                
                if res.abs() > 0.0 && res.abs() < 1.0e-30 {
                    res = 0.0;
                }
                res
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
    fn test_linear_interpolation() {
        let mut alloc = BufferAllocNode::new();
        let mut write = BufferWriteRawNode::new();
        let mut read = BufferReadLinNode::new();
        
        let mut out_h = [0.0];
        let mut out_v = [0.0];
        
        alloc.process(&[10.0], &mut out_h, 44100.0);
        let h = out_h[0];
        
        // Write 0.0 at index 0, 1.0 at index 1
        write.process(&[h, 0.0, 0.0], &mut out_h, 44100.0);
        write.process(&[h, 1.0, 1.0], &mut out_h, 44100.0);
        
        // Read at 0.5
        read.process(&[h, 0.5], &mut out_v, 44100.0);
        assert!((out_v[0] - 0.5).abs() < 1e-10);
        
        // Read at 0.0
        read.process(&[h, 0.0], &mut out_v, 44100.0);
        assert_eq!(out_v[0], 0.0);
        
        // Read at 1.0
        read.process(&[h, 1.0], &mut out_v, 44100.0);
        assert_eq!(out_v[0], 1.0);
    }
}