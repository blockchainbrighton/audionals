use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct PeakDetectNode {
    current_peak: f64,
}

impl PeakDetectNode {
    pub fn new() -> Self {
        Self {
            current_peak: 0.0,
        }
    }
}

impl AudioNode for PeakDetectNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 129,
            name: "PeakDetect",
            category: "10_Utils",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Reset", min: 0.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Peak" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 { return; }
        
        let input = inputs[0].abs();
        let reset = inputs[1] > 0.5;

        if reset {
            self.current_peak = 0.0;
        }

        if input > self.current_peak {
            self.current_peak = input;
        }

        let mut y = self.current_peak;
        // Denormal handling
        if y.is_subnormal() { y = 0.0; }
        outputs[0] = y;
    }

    fn reset(&mut self) {
        self.current_peak = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_peak_detect_hold() {
        let mut node = PeakDetectNode::new();
        let mut out = [0.0];
        
        // Input 0.5 -> Peak 0.5
        node.process(&[0.5, 0.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.5);

        // Input 0.2 -> Peak 0.5 (Held)
        node.process(&[0.2, 0.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.5);

        // Input -0.8 -> Peak 0.8
        node.process(&[-0.8, 0.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.8);
    }

    #[test]
    fn test_peak_detect_reset() {
        let mut node = PeakDetectNode::new();
        let mut out = [0.0];
        
        // Set peak to 0.8
        node.process(&[0.8, 0.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.8);

        // Reset
        node.process(&[0.0, 1.0], &mut out, 44100.0);
        // Note: process resets THEN checks input. Input 0.0 -> Peak 0.0
        assert_eq!(out[0], 0.0);

        // Check hold after reset
        node.process(&[0.3, 0.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.3);
    }

    #[test]
    fn test_peak_detect_denormal() {
        let mut node = PeakDetectNode::new();
        let mut out = [0.0];
        let denormal = 1.0e-320;
        
        // Denormal input should ideally be treated as 0 or handled.
        // abs(denormal) is positive denormal.
        // If stored, output is denormal.
        // Process logic checks output denormal and flushes.
        
        node.process(&[denormal, 0.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
    }
}