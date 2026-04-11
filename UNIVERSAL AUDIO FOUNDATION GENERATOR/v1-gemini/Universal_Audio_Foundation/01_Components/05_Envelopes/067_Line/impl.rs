use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct LineNode {
    current_value: f64,
    start_value: f64,
    end_value: f64,
    step: f64,
    remaining_samples: usize,
    last_trigger: f64,
}

impl LineNode {
    pub fn new() -> Self {
        Self {
            current_value: 0.0,
            start_value: 0.0,
            end_value: 0.0,
            step: 0.0,
            remaining_samples: 0,
            last_trigger: 0.0,
        }
    }
}

impl AudioNode for LineNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 67,
            name: "Line",
            category: "05_Envelopes",
            inputs: &[
                InputDescriptor { name: "Start", min: -100.0, max: 100.0, default: 0.0 },
                InputDescriptor { name: "End", min: -100.0, max: 100.0, default: 1.0 },
                InputDescriptor { name: "Duration", min: 0.0, max: 60.0, default: 1.0 },
                InputDescriptor { name: "Trigger", min: 0.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Value" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], sample_rate: f64) {
        if inputs.len() < 4 { return; }
        let start = inputs[0];
        let end = inputs[1];
        let duration = inputs[2].max(0.0);
        let trigger = inputs[3];

        if trigger > 0.5 && self.last_trigger <= 0.5 {
            self.start_value = start;
            self.end_value = end;
            self.current_value = start;
            let total_samples = (duration * sample_rate).max(1.0) as usize;
            self.remaining_samples = total_samples;
            self.step = (end - start) / (total_samples as f64);
        }
        self.last_trigger = trigger;

        if self.remaining_samples > 0 {
            self.current_value += self.step;
            self.remaining_samples -= 1;
            if self.remaining_samples == 0 {
                self.current_value = self.end_value;
            }
        }

        let mut out = self.current_value;
        if out.abs() < 1e-30 { out = 0.0; }
        outputs[0] = out;
    }

    fn reset(&mut self) {
        self.current_value = 0.0;
        self.remaining_samples = 0;
        self.last_trigger = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_line_ramp() {
        let mut node = LineNode::new();
        let mut out = [0.0];
        let sr = 100.0;
        
        // Trigger ramp from 0 to 1 over 1 second (100 samples)
        node.process(&[0.0, 1.0, 1.0, 1.0], &mut out, sr);
        // First sample of ramp
        assert_eq!(out[0], 0.01);
        
        for _ in 0..98 {
            node.process(&[0.0, 1.0, 1.0, 0.0], &mut out, sr);
        }
        // Sample 99
        assert!((out[0] - 0.99).abs() < 1e-10);
        
        // Final sample
        node.process(&[0.0, 1.0, 1.0, 0.0], &mut out, sr);
        assert_eq!(out[0], 1.0);
        
        // Stays at end
        node.process(&[0.0, 1.0, 1.0, 0.0], &mut out, sr);
        assert_eq!(out[0], 1.0);
    }
}