use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct CounterNode {
    count: i64,
    last_trigger: f64,
}

impl CounterNode {
    pub fn new() -> Self {
        Self { count: 0, last_trigger: 0.0 }
    }
}

impl AudioNode for CounterNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 100,
            name: "Counter",
            category: "08_Timing",
            inputs: &[
                InputDescriptor { name: "Trigger", min: 0.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Max", min: 1.0, max: 1000000.0, default: 16.0 },
                InputDescriptor { name: "Reset", min: 0.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Count" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 3 { return; }
        let trigger = inputs[0];
        let max = inputs[1].max(1.0).round() as i64;
        let reset = inputs[2] > 0.5;

        if reset {
            self.count = 0;
        } else if trigger > 0.5 && self.last_trigger <= 0.5 {
            self.count += 1;
            if self.count >= max {
                self.count = 0;
            }
        }
        self.last_trigger = trigger;
        outputs[0] = self.count as f64;
    }

    fn reset(&mut self) {
        self.count = 0;
        self.last_trigger = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_counting() {
        let mut node = CounterNode::new();
        let mut out = [0.0];
        
        // Initial state
        assert_eq!(node.count, 0);

        // Trigger 1: 0 -> 1
        node.process(&[1.0, 4.0, 0.0], &mut out, 44100.0);
        assert_eq!(out[0], 1.0);
        node.process(&[0.0, 4.0, 0.0], &mut out, 44100.0);
        
        // Trigger 2: 1 -> 2
        node.process(&[1.0, 4.0, 0.0], &mut out, 44100.0);
        assert_eq!(out[0], 2.0);
        node.process(&[0.0, 4.0, 0.0], &mut out, 44100.0);

        // Trigger 3: 2 -> 3
        node.process(&[1.0, 4.0, 0.0], &mut out, 44100.0);
        assert_eq!(out[0], 3.0);
        node.process(&[0.0, 4.0, 0.0], &mut out, 44100.0);
        
        // Trigger 4: 3 -> 0 (Max is 4)
        node.process(&[1.0, 4.0, 0.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
    }
}
