use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct SlewLimiterNode {
    last_output: f64,
}

impl SlewLimiterNode {
    pub fn new() -> Self {
        Self { last_output: 0.0 }
    }
}

impl AudioNode for SlewLimiterNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 103,
            name: "SlewLimiter",
            category: "08_Timing",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "RiseRate", min: 0.0, max: 1000.0, default: 10.0 }, // Units per second
                InputDescriptor { name: "FallRate", min: 0.0, max: 1000.0, default: 10.0 }, // Units per second
            ],
            outputs: &[
                OutputDescriptor { name: "Output" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], sample_rate: f64) {
        if inputs.len() < 3 { return; }
        let input = inputs[0];
        let rise_rate = inputs[1].max(0.0);
        let fall_rate = inputs[2].max(0.0);

        let max_rise = rise_rate / sample_rate;
        let max_fall = fall_rate / sample_rate;

        let diff = input - self.last_output;
        
        let clamped_diff = if diff > 0.0 {
            diff.min(max_rise)
        } else {
            diff.max(-max_fall)
        };

        self.last_output += clamped_diff;
        
        if self.last_output.abs() < 1e-30 { self.last_output = 0.0; }
        outputs[0] = self.last_output;
    }

    fn reset(&mut self) {
        self.last_output = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_slew() {
        let mut node = SlewLimiterNode::new();
        let mut out = [0.0];
        let sr = 100.0;
        
        // Rise rate 10 units/sec -> 0.1 units per sample at SR=100
        // Input jumps to 1.0
        node.process(&[1.0, 10.0, 10.0], &mut out, sr);
        assert_eq!(out[0], 0.1);
        
        node.process(&[1.0, 10.0, 10.0], &mut out, sr);
        assert_eq!(out[0], 0.2);
    }
}