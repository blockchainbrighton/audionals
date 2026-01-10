use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct LinToExpNode;

impl LinToExpNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for LinToExpNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 144,
            name: "LinToExp",
            category: "10_Utils",
            inputs: &[
                InputDescriptor { name: "Input", min: 0.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Min", min: 0.001, max: 22000.0, default: 20.0 },
                InputDescriptor { name: "Max", min: 0.001, max: 22000.0, default: 20000.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Output" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 3 { return; }
        
        let x = inputs[0].clamp(0.0, 1.0);
        let min_val = inputs[1].max(0.001);
        let max_val = inputs[2].max(0.001);

        // Exponential mapping: y = min * (max/min)^x
        let ratio = max_val / min_val;
        let mut y = min_val * ratio.powf(x);

        if y.is_subnormal() { y = 0.0; }

        outputs[0] = y;
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lin_to_exp_bounds() {
        let mut node = LinToExpNode::new();
        let mut out = [0.0];
        
        // Input 0.0 -> Min (20)
        node.process(&[0.0, 20.0, 20000.0], &mut out, 44100.0);
        assert!((out[0] - 20.0).abs() < 1e-9);

        // Input 1.0 -> Max (20000)
        node.process(&[1.0, 20.0, 20000.0], &mut out, 44100.0);
        assert!((out[0] - 20000.0).abs() < 1e-9);
    }

    #[test]
    fn test_lin_to_exp_mid() {
        let mut node = LinToExpNode::new();
        let mut out = [0.0];
        
        // Input 0.5 -> Geometric Mean -> sqrt(20 * 20000) = sqrt(400000) = 632.455
        node.process(&[0.5, 20.0, 20000.0], &mut out, 44100.0);
        assert!((out[0] - 632.4555).abs() < 1e-3);
    }
}