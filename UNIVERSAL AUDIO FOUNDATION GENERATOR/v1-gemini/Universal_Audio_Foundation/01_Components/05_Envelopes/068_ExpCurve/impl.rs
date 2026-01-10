use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct ExpCurveNode {
    current_value: f64,
    last_trigger: f64,
}

impl ExpCurveNode {
    pub fn new() -> Self {
        Self {
            current_value: 0.0,
            last_trigger: 0.0,
        }
    }
}

impl AudioNode for ExpCurveNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 68,
            name: "ExpCurve",
            category: "05_Envelopes",
            inputs: &[
                InputDescriptor { name: "Start", min: -100.0, max: 100.0, default: 1.0 },
                InputDescriptor { name: "End", min: -100.0, max: 100.0, default: 0.0 },
                InputDescriptor { name: "Tau", min: 0.001, max: 10.0, default: 0.1 },
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
        let tau = inputs[2].max(0.0001);
        let trigger = inputs[3];

        if trigger > 0.5 && self.last_trigger <= 0.5 {
            self.current_value = start;
        }
        self.last_trigger = trigger;

        let alpha = 1.0 - (-1.0 / (tau * sample_rate)).exp();
        self.current_value += (end - self.current_value) * alpha;

        if self.current_value.abs() < 1e-30 {
            self.current_value = 0.0;
        }

        outputs[0] = self.current_value;
    }

    fn reset(&mut self) {
        self.current_value = 0.0;
        self.last_trigger = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_exp_decay() {
        let mut node = ExpCurveNode::new();
        let mut out = [0.0];
        
        // Trigger decay from 1.0 to 0.0
        node.process(&[1.0, 0.0, 0.1, 1.0], &mut out, 44100.0);
        assert!(out[0] <= 1.0);
        
        let first = out[0];
        node.process(&[1.0, 0.0, 0.1, 0.0], &mut out, 44100.0);
        assert!(out[0] < first);
    }
}