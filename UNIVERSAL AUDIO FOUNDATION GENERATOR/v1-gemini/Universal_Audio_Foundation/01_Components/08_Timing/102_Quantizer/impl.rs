use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct QuantizerNode;

impl QuantizerNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for QuantizerNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 102,
            name: "Quantizer",
            category: "08_Timing",
            inputs: &[
                InputDescriptor { name: "Input", min: -100.0, max: 100.0, default: 0.0 },
                InputDescriptor { name: "Grid", min: 0.0001, max: 12.0, default: 1.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Output" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 { return; }
        let input = inputs[0];
        let grid = inputs[1].max(0.000001);

        let quantized = (input / grid).round() * grid;
        
        let mut out = quantized;
        if out.abs() < 1e-30 { out = 0.0; }
        outputs[0] = out;
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_quantization() {
        let mut node = QuantizerNode::new();
        let mut out = [0.0];
        
        // Snap 0.7 to grid 1.0 -> 1.0
        node.process(&[0.7, 1.0], &mut out, 44100.0);
        assert_eq!(out[0], 1.0);
        
        // Snap 0.4 to grid 1.0 -> 0.0
        node.process(&[0.4, 1.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);

        // Snap 5.2 to grid 2.0 -> 6.0? No, 5.2/2 = 2.6 -> round to 3 -> 3*2 = 6.
        node.process(&[5.2, 2.0], &mut out, 44100.0);
        assert_eq!(out[0], 6.0);
    }
}