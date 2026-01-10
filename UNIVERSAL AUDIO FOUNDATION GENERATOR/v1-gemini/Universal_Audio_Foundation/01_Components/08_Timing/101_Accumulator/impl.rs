use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct AccumulatorNode {
    sum: f64,
}

impl AccumulatorNode {
    pub fn new() -> Self {
        Self { sum: 0.0 }
    }
}

impl AudioNode for AccumulatorNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 101,
            name: "Accumulator",
            category: "08_Timing",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Reset", min: 0.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Sum" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 { return; }
        let input = inputs[0];
        let reset = inputs[1] > 0.5;

        if reset {
            self.sum = 0.0;
        } else {
            self.sum += input;
        }

        if self.sum.abs() < 1e-30 { self.sum = 0.0; }
        outputs[0] = self.sum;
    }

    fn reset(&mut self) {
        self.sum = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_accumulation() {
        let mut node = AccumulatorNode::new();
        let mut out = [0.0];
        
        node.process(&[0.1, 0.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.1);
        
        node.process(&[0.2, 0.0], &mut out, 44100.0);
        assert!((out[0] - 0.3).abs() < 1e-10);
        
        node.process(&[0.0, 1.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
    }
}