use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct SchmidtTriggerNode {
    is_high: bool,
}

impl SchmidtTriggerNode {
    pub fn new() -> Self {
        Self { is_high: false }
    }
}

impl AudioNode for SchmidtTriggerNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 75,
            name: "SchmidtTrigger",
            category: "05_Envelopes",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "HighThreshold", min: -1.0, max: 1.0, default: 0.5 },
                InputDescriptor { name: "LowThreshold", min: -1.0, max: 1.0, default: 0.1 },
            ],
            outputs: &[
                OutputDescriptor { name: "Output" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 3 { return; }
        let input = inputs[0];
        let high = inputs[1];
        let low = inputs[2];
        
        if !self.is_high && input > high {
            self.is_high = true;
        } else if self.is_high && input < low {
            self.is_high = false;
        }
        
        outputs[0] = if self.is_high { 1.0 } else { 0.0 };
    }

    fn reset(&mut self) {
        self.is_high = false;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hysteresis() {
        let mut node = SchmidtTriggerNode::new();
        let mut out = [0.0];
        
        // Input rises above high (0.5)
        node.process(&[0.6, 0.5, 0.1], &mut out, 44100.0);
        assert_eq!(out[0], 1.0);
        
        // Input falls but stays above low (0.1)
        node.process(&[0.2, 0.5, 0.1], &mut out, 44100.0);
        assert_eq!(out[0], 1.0);
        
        // Input falls below low
        node.process(&[0.05, 0.5, 0.1], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
    }
}