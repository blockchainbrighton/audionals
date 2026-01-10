use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct HardClipNode;

impl HardClipNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for HardClipNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 117,
            name: "HardClip",
            category: "09_Effects",
            inputs: &[
                InputDescriptor { name: "Input", min: -100.0, max: 100.0, default: 0.0 },
                InputDescriptor { name: "Threshold", min: 0.0, max: 100.0, default: 1.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Output" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 { return; }
        let x = inputs[0];
        let threshold = inputs[1].max(0.0); // Ensure non-negative threshold

        let mut val = x.clamp(-threshold, threshold);

        // Denormal handling
        if val.is_subnormal() {
            val = 0.0;
        }

        outputs[0] = val;
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hard_clip_basic() {
        let mut node = HardClipNode::new();
        let mut out = [0.0];
        
        // Inside threshold
        node.process(&[0.5, 1.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.5);

        // Above threshold
        node.process(&[1.5, 1.0], &mut out, 44100.0);
        assert_eq!(out[0], 1.0);
        
        // Below negative threshold
        node.process(&[-1.5, 1.0], &mut out, 44100.0);
        assert_eq!(out[0], -1.0);
    }

    #[test]
    fn test_hard_clip_threshold_zero() {
        let mut node = HardClipNode::new();
        let mut out = [0.0];

        node.process(&[10.0, 0.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
    }

    #[test]
    fn test_hard_clip_denormal() {
        let mut node = HardClipNode::new();
        let mut out = [0.0];

        // Create a subnormal float
        let denormal = 1.0e-320; 
        node.process(&[denormal, 1.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0, "Denormal output should be flushed to zero");
    }
}
