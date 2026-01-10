use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct DelayTriggerNode {
    buffer: Vec<f64>,
    write_pos: usize,
}

impl DelayTriggerNode {
    pub fn new() -> Self {
        Self {
            buffer: vec![0.0; 44100], // Max 1 second at 44.1k
            write_pos: 0,
        }
    }
}

impl AudioNode for DelayTriggerNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 114,
            name: "DelayTrigger",
            category: "08_Timing",
            inputs: &[
                InputDescriptor { name: "Trigger", min: 0.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Delay_ms", min: 0.0, max: 1000.0, default: 100.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Trigger" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], sample_rate: f64) {
        if inputs.len() < 2 { return; }
        let trigger = inputs[0];
        let delay_ms = inputs[1].max(0.0);
        let delay_samples = (delay_ms * sample_rate / 1000.0).round() as usize;
        let delay_samples = delay_samples.min(self.buffer.len() - 1);

        self.buffer[self.write_pos] = trigger;
        
        let read_pos = (self.write_pos + self.buffer.len() - delay_samples) % self.buffer.len();
        let out = self.buffer[read_pos];
        
        outputs[0] = if out > 0.5 { 1.0 } else { 0.0 };
        
        self.write_pos = (self.write_pos + 1) % self.buffer.len();
    }

    fn reset(&mut self) {
        for x in self.buffer.iter_mut() { *x = 0.0; }
        self.write_pos = 0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_delay_trigger() {
        let mut node = DelayTriggerNode::new();
        let mut out = [0.0];
        let sr = 1000.0; // 1ms per sample
        
        // Delay 5ms
        node.process(&[1.0, 5.0], &mut out, sr); // Write trigger at pos 0
        assert_eq!(out[0], 0.0); // Output pos (0-5)%N -> 0.0
        
        for _ in 0..4 {
            node.process(&[0.0, 5.0], &mut out, sr);
            assert_eq!(out[0], 0.0);
        }
        
        node.process(&[0.0, 5.0], &mut out, sr);
        assert_eq!(out[0], 1.0); // 5th sample should be the trigger
    }
}