use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor, get_buffer_pool};

pub struct BufferReadCubicNode;

impl BufferReadCubicNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for BufferReadCubicNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 47,
            name: "BufferRead_Cubic",
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
                let i_floor = index_f.floor();
                let frac = index_f - i_floor;
                
                // 4-point indices
                let i1 = (i_floor as i64).rem_euclid(len as i64) as usize;
                let i0 = (i1 as i64 - 1).rem_euclid(len as i64) as usize;
                let i2 = (i1 + 1) % len;
                let i3 = (i1 + 2) % len;
                
                let y0 = buf[i0];
                let y1 = buf[i1];
                let y2 = buf[i2];
                let y3 = buf[i3];
                
                // Catmull-Rom Spline
                // a = -0.5*y0 + 1.5*y1 - 1.5*y2 + 0.5*y3
                // b = y0 - 2.5*y1 + 2.0*y2 - 0.5*y3
                // c = -0.5*y0 + 0.5*y2
                // d = y1
                
                let a = -0.5 * y0 + 1.5 * y1 - 1.5 * y2 + 0.5 * y3;
                let b = y0 - 2.5 * y1 + 2.0 * y2 - 0.5 * y3;
                let c = -0.5 * y0 + 0.5 * y2;
                let d = y1;
                
                let res = ((a * frac + b) * frac + c) * frac + d;
                
                if res.abs() < 1e-30 { 0.0 } else { res }
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
    fn test_cubic_interpolation() {
        let mut alloc = BufferAllocNode::new();
        let mut write = BufferWriteRawNode::new();
        let mut read = BufferReadCubicNode::new();
        
        let mut out_h = [0.0];
        let mut out_v = [0.0];
        
        alloc.process(&[10.0], &mut out_h, 44100.0);
        let h = out_h[0];
        
        // Populate simple ramp
        for i in 0..4 {
            write.process(&[h, i as f64, i as f64], &mut out_h, 44100.0);
        }
        
        // Read at 1.5. In a perfect line 0,1,2,3... index 1.5 should be 1.5.
        // Cubic handles linear ramps perfectly? Catmull-Rom does.
        read.process(&[h, 1.5], &mut out_v, 44100.0);
        assert!((out_v[0] - 1.5).abs() < 1e-10);
    }
}