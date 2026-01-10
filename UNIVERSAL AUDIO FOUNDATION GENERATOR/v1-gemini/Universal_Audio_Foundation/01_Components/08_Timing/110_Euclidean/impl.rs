use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct EuclideanNode;

impl EuclideanNode {
    pub fn new() -> Self {
        Self {}
    }
    
    fn is_active(step: usize, total_steps: usize, pulses: usize) -> bool {
        if total_steps == 0 || pulses == 0 { return false; }
        let pulses = pulses.min(total_steps);
        // Standard Bjorklund simplified: pulses * step % total < pulses
        (step * pulses) % total_steps < pulses
    }
}

impl AudioNode for EuclideanNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 110,
            name: "Euclidean",
            category: "08_Timing",
            inputs: &[
                InputDescriptor { name: "Step", min: 0.0, max: 1024.0, default: 0.0 },
                InputDescriptor { name: "TotalSteps", min: 1.0, max: 64.0, default: 16.0 },
                InputDescriptor { name: "Pulses", min: 0.0, max: 64.0, default: 4.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Active" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 3 { return; }
        let step = inputs[0].max(0.0).round() as usize;
        let total = inputs[1].max(1.0).round() as usize;
        let pulses = inputs[2].max(0.0).round() as usize;

        outputs[0] = if Self::is_active(step % total, total, pulses) { 1.0 } else { 0.0 };
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_euclidean_logic() {
        // 4 pulses in 16 steps: 0, 4, 8, 12
        assert!(EuclideanNode::is_active(0, 16, 4));
        assert!(!EuclideanNode::is_active(1, 16, 4));
        assert!(!EuclideanNode::is_active(2, 16, 4));
        assert!(!EuclideanNode::is_active(3, 16, 4));
        assert!(EuclideanNode::is_active(4, 16, 4));
    }
}
