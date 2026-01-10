use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor, get_buffer_pool};

pub struct WavetableReadNode {
    phase: f64,
}

impl WavetableReadNode {
    pub fn new() -> Self {
        Self { phase: 0.0 }
    }
}

impl AudioNode for WavetableReadNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 66,
            name: "WavetableRead",
            category: "04_Sources",
            inputs: &[
                InputDescriptor { name: "Handle", min: 0.0, max: 1000.0, default: 0.0 },
                InputDescriptor { name: "Frequency", min: 0.0, max: 22050.0, default: 440.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Signal" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], sample_rate: f64) {
        if inputs.len() < 2 { return; }
        let handle = inputs[0] as usize;
        let freq = inputs[1];

        let pool = get_buffer_pool().lock().unwrap();
        outputs[0] = if let Some(buf) = pool.get(handle) {
            let len = buf.len();
            if len == 0 {
                0.0
            } else if len == 1 {
                buf[0]
            } else {
                let pos_f = self.phase * (len as f64);
                let i0 = pos_f.floor() as usize;
                let i1 = (i0 + 1) % len;
                let frac = pos_f - i0 as f64;
                
                let mut res = buf[i0] + (buf[i1] - buf[i0]) * frac;
                if res.abs() < 1e-30 { res = 0.0; }
                res
            }
        } else {
            0.0
        };

        let phase_inc = freq / sample_rate;
        self.phase = (self.phase + phase_inc).fract();
        if self.phase < 0.0 { self.phase += 1.0; }
    }

    fn reset(&mut self) {
        self.phase = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_wavetable_metadata() {
        let node = WavetableReadNode::new();
        assert_eq!(node.metadata().name, "WavetableRead");
    }
}