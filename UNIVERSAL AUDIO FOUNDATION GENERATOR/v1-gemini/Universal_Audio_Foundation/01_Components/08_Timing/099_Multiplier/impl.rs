use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct MultiplierNode {
    last_trigger: f64,
    samples_since_last: usize,
    current_interval: usize,
    phase: f64,
}

impl MultiplierNode {
    pub fn new() -> Self {
        Self {
            last_trigger: 0.0,
            samples_since_last: 0,
            current_interval: 44100, // Default 1 second
            phase: 0.0,
        }
    }
}

impl AudioNode for MultiplierNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 99,
            name: "Multiplier",
            category: "08_Timing",
            inputs: &[
                InputDescriptor { name: "Trigger", min: 0.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Multiplier", min: 1.0, max: 64.0, default: 2.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Trigger" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 { return; }
        let trigger = inputs[0];
        let multiplier = inputs[1].max(1.0);

        // Detect input pulse to measure interval
        if trigger > 0.5 && self.last_trigger <= 0.5 {
            if self.samples_since_last > 0 {
                self.current_interval = self.samples_since_last;
            }
            self.samples_since_last = 0;
            self.phase = 0.0; // Sync phase on input pulse
        }
        self.last_trigger = trigger;
        self.samples_since_last += 1;

        // Internal oscillator synced to measured interval
        let freq = multiplier / (self.current_interval as f64);
        let mut out = 0.0;
        let next_phase = self.phase + freq;
        
        if next_phase >= 1.0 {
            out = 1.0;
            self.phase = next_phase - 1.0;
        } else {
            self.phase = next_phase;
        }

        outputs[0] = out;
    }

    fn reset(&mut self) {
        self.last_trigger = 0.0;
        self.samples_since_last = 0;
        self.current_interval = 44100;
        self.phase = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_multiplier_instantiation() {
        let node = MultiplierNode::new();
        assert_eq!(node.metadata().name, "Multiplier");
    }
}