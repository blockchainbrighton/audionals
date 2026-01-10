use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct WavefolderNode;

impl WavefolderNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for WavefolderNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 121,
            name: "Wavefolder",
            category: "09_Effects",
            inputs: &[
                InputDescriptor { name: "Input", min: -1.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Drive", min: 0.0, max: 100.0, default: 1.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Output" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 { return; }
        let input = inputs[0];
        let drive = inputs[1].max(0.0);
        let x = input * drive;

        // O(1) Infinite Triangle Folding
        // Maps x to a triangle wave oscillating between -1 and 1
        // Period is 4.0 (0->1->0->-1->0 is distance 4)
        // Formula: 1.0 - abs((x + 1.0) % 4.0 - 2.0)
        
        let mut y = 1.0 - ((x + 1.0).rem_euclid(4.0) - 2.0).abs();

        // Denormal handling
        if y.is_subnormal() {
            y = 0.0;
        }

        outputs[0] = y;
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_wavefolder_unity() {
        let mut node = WavefolderNode::new();
        let mut out = [0.0];
        
        // Drive 1.0: Linear in range -1 to 1
        node.process(&[0.5, 1.0], &mut out, 44100.0);
        assert!((out[0] - 0.5).abs() < 1e-9);

        node.process(&[-0.5, 1.0], &mut out, 44100.0);
        assert!((out[0] - -0.5).abs() < 1e-9);
    }

    #[test]
    fn test_wavefolder_folding() {
        let mut node = WavefolderNode::new();
        let mut out = [0.0];

        // Drive 1.0, Input 1.5 -> x=1.5. 
        // 1.5 is past 1.0 by 0.5. Should fold back to 0.5.
        // Formula: 1 - abs((2.5 % 4) - 2) = 1 - abs(2.5 - 2) = 1 - 0.5 = 0.5.
        node.process(&[1.5, 1.0], &mut out, 44100.0);
        assert!((out[0] - 0.5).abs() < 1e-9);

        // Input 2.0 -> Fold back to 0.0
        // Formula: 1 - abs((3 % 4) - 2) = 1 - abs(3 - 2) = 0.0
        node.process(&[2.0, 1.0], &mut out, 44100.0);
        assert!((out[0] - 0.0).abs() < 1e-9);
    }
    
    #[test]
    fn test_wavefolder_negative_folding() {
        let mut node = WavefolderNode::new();
        let mut out = [0.0];

        // Input -1.5 -> x=-1.5.
        // Past -1.0 by -0.5. Should fold back to -0.5.
        // Formula: 1 - abs((-0.5 % 4) - 2). (-0.5 % 4 = 3.5). 
        // 1 - abs(3.5 - 2) = 1 - 1.5 = -0.5. Correct.
        node.process(&[-1.5, 1.0], &mut out, 44100.0);
        assert!((out[0] - -0.5).abs() < 1e-9);
    }

    #[test]
    fn test_wavefolder_denormal() {
        let mut node = WavefolderNode::new();
        let mut out = [0.0];
        
        // Input 2.0 folds to 0.0. 
        // If we use 2.0 + small_epsilon, we might get denormal result near 0.
        // Let's just force a denormal result by passing effectively a 0-crossing value?
        // Actually simplest is just 0 input with high drive? No, 0*drive=0.
        // Input 1e-320 * drive 1 = 1e-320. Output should be flushed.
        let denormal = 1.0e-320;
        node.process(&[denormal, 1.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
    }
}