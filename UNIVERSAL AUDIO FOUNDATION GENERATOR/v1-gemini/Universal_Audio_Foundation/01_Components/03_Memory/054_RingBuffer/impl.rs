use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct RingBufferNode {
    buffer: Vec<f64>,
    head: usize,
    tail: usize,
    len: usize,
}

impl RingBufferNode {
    pub fn new() -> Self {
        Self {
            buffer: vec![0.0; 1024],
            head: 0,
            tail: 0,
            len: 1024,
        }
    }
}

impl AudioNode for RingBufferNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 54,
            name: "RingBuffer",
            category: "03_Memory",
            inputs: &[
                InputDescriptor { name: "PushVal", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "PushTrig", min: 0.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "PopTrig", min: 0.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "PoppedVal" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 3 { return; }
        let push_val = inputs[0];
        let push = inputs[1] > 0.5;
        let pop = inputs[2] > 0.5;
        
        // Simple logic: if push, write to head. if pop, read from tail.
        // If push & pop same frame? Do both.
        
        if push {
            self.buffer[self.head] = push_val;
            self.head = (self.head + 1) % self.len;
        }
        
        if pop {
            // Read
            let val = self.buffer[self.tail];
            outputs[0] = val;
            self.tail = (self.tail + 1) % self.len;
        } else {
            outputs[0] = 0.0; // Or hold? Standard FIFO usually outputs 0 or null if no pop.
        }
    }

    fn reset(&mut self) {
        self.head = 0;
        self.tail = 0;
        for x in self.buffer.iter_mut() { *x = 0.0; }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fifo() {
        let mut node = RingBufferNode::new();
        let mut out = [0.0];
        
        // Push 0.5
        node.process(&[0.5, 1.0, 0.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0); // No pop
        
        // Push 0.8
        node.process(&[0.8, 1.0, 0.0], &mut out, 44100.0);
        
        // Pop (should be 0.5)
        node.process(&[0.0, 0.0, 1.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.5);
        
        // Pop (should be 0.8)
        node.process(&[0.0, 0.0, 1.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.8);
    }
}