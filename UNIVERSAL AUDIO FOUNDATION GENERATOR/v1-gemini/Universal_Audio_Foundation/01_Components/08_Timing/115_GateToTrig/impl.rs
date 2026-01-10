use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct GateToTrigNode {
    last_gate: f64,
}

impl GateToTrigNode {
    pub fn new() -> Self {
        Self { last_gate: 0.0 }
    }
}

impl AudioNode for GateToTrigNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 115,
            name: "GateToTrig",
            category: "08_Timing",
            inputs: &[
                InputDescriptor { name: "Gate", min: 0.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Trigger" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.is_empty() { return; }
        let gate = inputs[0];
        
        let mut out = 0.0;
        if gate > 0.5 && self.last_gate <= 0.5 {
            out = 1.0;
        }
        
        self.last_gate = gate;
        outputs[0] = out;
    }

    fn reset(&mut self) {
        self.last_gate = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_gate_to_trig() {
        let mut node = GateToTrigNode::new();
        let mut out = [0.0];
        
        node.process(&[1.0], &mut out, 44100.0);
        assert_eq!(out[0], 1.0);
        
        node.process(&[1.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0); // Held high -> no new trigger
        
        node.process(&[0.0], &mut out, 44100.0);
        node.process(&[1.0], &mut out, 44100.0);
        assert_eq!(out[0], 1.0); // New rising edge
    }
}