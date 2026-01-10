use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct RateReduceNode {
    samples_left: f64,
    held_sample: f64,
}

impl RateReduceNode {
    pub fn new() -> Self {
        Self {
            samples_left: 0.0,
            held_sample: 0.0,
        }
    }
}

impl AudioNode for RateReduceNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 120,
            name: "RateReduce",
            category: "09_Effects",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Ratio", min: 1.0, max: 1000.0, default: 1.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Output" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 { return; }
        let input = inputs[0];
        let ratio = inputs[1].max(1.0);

        if self.samples_left <= 0.0 {
            self.held_sample = input;
            // Add ratio to current counter. 
            // If we were very negative (lag), we might want to reset or catch up.
            // For simple effects, resetting to ratio is safer to avoid bursts after parameter jumps.
            self.samples_left = ratio;
        }

        let mut y = self.held_sample;
        
        // Denormal handling
        if y.is_subnormal() {
            y = 0.0;
        }
        outputs[0] = y;

        self.samples_left -= 1.0;
    }

    fn reset(&mut self) {
        self.samples_left = 0.0;
        self.held_sample = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rate_reduce_unity() {
        let mut node = RateReduceNode::new();
        let mut out = [0.0];
        
        // Ratio 1.0: Output = Input
        for i in 0..10 {
            let val = i as f64 * 0.1;
            node.process(&[val, 1.0], &mut out, 44100.0);
            assert!((out[0] - val).abs() < 1e-9);
        }
    }

    #[test]
    fn test_rate_reduce_half() {
        let mut node = RateReduceNode::new();
        let mut out = [0.0];

        // Ratio 2.0: Sample 0, Hold 1, Sample 2, Hold 3...
        
        // t=0: Input 0.1 -> Output 0.1
        node.process(&[0.1, 2.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.1);

        // t=1: Input 0.2 -> Output 0.1 (Held)
        node.process(&[0.2, 2.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.1);

        // t=2: Input 0.3 -> Output 0.3 (Sampled)
        node.process(&[0.3, 2.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.3);
    }

    #[test]
    fn test_rate_reduce_denormal() {
        let mut node = RateReduceNode::new();
        let mut out = [0.0];
        let denormal = 1.0e-320;
        
        node.process(&[denormal, 1.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
    }
}