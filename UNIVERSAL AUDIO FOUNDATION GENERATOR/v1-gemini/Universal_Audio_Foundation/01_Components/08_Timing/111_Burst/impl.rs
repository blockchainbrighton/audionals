use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct BurstNode {
    last_trigger: f64,
    burst_count: usize,
    samples_until_next: i64,
}

impl BurstNode {
    pub fn new() -> Self {
        Self {
            last_trigger: 0.0,
            burst_count: 0,
            samples_until_next: -1,
        }
    }
}

impl AudioNode for BurstNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 111,
            name: "Burst",
            category: "08_Timing",
            inputs: &[
                InputDescriptor { name: "Trigger", min: 0.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Count", min: 1.0, max: 64.0, default: 4.0 },
                InputDescriptor { name: "Interval_ms", min: 1.0, max: 1000.0, default: 100.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Trigger" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], sample_rate: f64) {
        if inputs.len() < 3 { return; }
        let trigger = inputs[0];
        let count = inputs[1].max(1.0).round() as usize;
        let interval_ms = inputs[2].max(1.0);
        let interval_samples = (interval_ms * sample_rate / 1000.0).round() as i64;

        let mut out = 0.0;

        // Start burst on trigger
        if trigger > 0.5 && self.last_trigger <= 0.5 {
            self.burst_count = count;
            self.samples_until_next = 0; // Trigger immediately
        }
        self.last_trigger = trigger;

        if self.burst_count > 0 {
            if self.samples_until_next <= 0 {
                out = 1.0;
                self.burst_count -= 1;
                self.samples_until_next = interval_samples;
            }
            self.samples_until_next -= 1;
        }

        outputs[0] = out;
    }

    fn reset(&mut self) {
        self.last_trigger = 0.0;
        self.burst_count = 0;
        self.samples_until_next = -1;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_burst() {
        let mut node = BurstNode::new();
        let mut out = [0.0];
        let sr = 1000.0; // 1ms per sample
        
        // Trigger burst of 2 with 10ms interval
        node.process(&[1.0, 2.0, 10.0], &mut out, sr);
        assert_eq!(out[0], 1.0); // First pulse
        
        // Wait 9 samples
        for _ in 0..9 {
            node.process(&[0.0, 2.0, 10.0], &mut out, sr);
            assert_eq!(out[0], 0.0);
        }
        
        // 10th sample should be next pulse
        node.process(&[0.0, 2.0, 10.0], &mut out, sr);
        assert_eq!(out[0], 1.0); // Second pulse
    }
}
