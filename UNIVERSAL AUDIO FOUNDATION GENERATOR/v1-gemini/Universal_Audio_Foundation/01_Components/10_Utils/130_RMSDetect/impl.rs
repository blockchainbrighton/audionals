use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct RMSDetectNode {
    mean_square: f64,
}

impl RMSDetectNode {
    pub fn new() -> Self {
        Self {
            mean_square: 0.0,
        }
    }
}

impl AudioNode for RMSDetectNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 130,
            name: "RMSDetect",
            category: "10_Utils",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Time", min: 0.001, max: 10.0, default: 0.1 },
            ],
            outputs: &[
                OutputDescriptor { name: "Output" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], sample_rate: f64) {
        if inputs.len() < 2 { return; }
        
        let input = inputs[0];
        let time = inputs[1].max(0.001);
        
        // Calculate filter coefficient for EMA
        // Time constant tau -> alpha approx 1 / (tau * Fs)
        let alpha = 1.0 / (time * sample_rate).max(1.0);

        let sq = input * input;
        
        // EMA: y[n] = y[n-1] + alpha * (x[n] - y[n-1])
        self.mean_square += alpha * (sq - self.mean_square);

        // Denormal handling
        if self.mean_square.is_subnormal() {
            self.mean_square = 0.0;
        }

        outputs[0] = self.mean_square.sqrt();
    }

    fn reset(&mut self) {
        self.mean_square = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rms_steady_state() {
        let mut node = RMSDetectNode::new();
        let mut out = [0.0];
        
        // Input DC 1.0. RMS should approach 1.0.
        // Time = 0.001s (fast). SampleRate = 1000.0 (alpha = 1.0)
        // If alpha=1.0, it follows instantly.
        node.process(&[1.0, 0.001], &mut out, 1000.0);
        assert!((out[0] - 1.0).abs() < 1e-9);
    }

    #[test]
    fn test_rms_averaging() {
        let mut node = RMSDetectNode::new();
        let mut out = [0.0];
        
        // Input alternating 1.0, -1.0. Square is always 1.0. RMS -> 1.0.
        // alpha = 0.5 (Time = 2 samples / Fs = 2/1000 = 0.002)
        // Let's use Fs=1.0, Time=2.0 -> alpha = 1/(2*1) = 0.5.
        
        node.process(&[1.0, 2.0], &mut out, 1.0); // mean_sq = 0 + 0.5(1 - 0) = 0.5. Out=sqrt(0.5)=0.707
        assert!((out[0] - 0.70710678).abs() < 1e-4);
        
        node.process(&[-1.0, 2.0], &mut out, 1.0); // mean_sq = 0.5 + 0.5(1 - 0.5) = 0.75. Out=sqrt(0.75)=0.866
        assert!((out[0] - 0.8660254).abs() < 1e-4);
    }

    #[test]
    fn test_rms_denormal() {
        let mut node = RMSDetectNode::new();
        let mut out = [0.0];
        let denormal = 1.0e-320;
        
        node.process(&[denormal, 0.1], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
    }
}