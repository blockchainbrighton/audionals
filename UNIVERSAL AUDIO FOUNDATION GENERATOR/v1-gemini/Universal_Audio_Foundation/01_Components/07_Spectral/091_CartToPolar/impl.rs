use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct CartToPolarNode;

impl CartToPolarNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for CartToPolarNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 91,
            name: "CartToPolar",
            category: "07_Spectral",
            inputs: &[
                InputDescriptor { name: "Real", min: -100.0, max: 100.0, default: 0.0 },
                InputDescriptor { name: "Imag", min: -100.0, max: 100.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Magnitude" },
                OutputDescriptor { name: "Phase" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 { return; }
        let re = inputs[0];
        let im = inputs[1];

        outputs[0] = (re * re + im * im).sqrt();
        outputs[1] = im.atan2(re);
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_conversion() {
        let mut node = CartToPolarNode::new();
        let mut out = [0.0, 0.0];
        // 3, 4 -> mag 5
        node.process(&[3.0, 4.0], &mut out, 44100.0);
        assert_eq!(out[0], 5.0);
    }
}