use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

#[derive(PartialEq)]
enum ARState {
    Idle,
    Attack,
    Release,
}

pub struct ARNode {
    state: ARState,
    current_value: f64,
    last_trigger: f64,
}

impl ARNode {
    pub fn new() -> Self {
        Self {
            state: ARState::Idle,
            current_value: 0.0,
            last_trigger: 0.0,
        }
    }
}

impl AudioNode for ARNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 70,
            name: "AR",
            category: "05_Envelopes",
            inputs: &[
                InputDescriptor { name: "Trigger", min: 0.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Attack", min: 0.001, max: 10.0, default: 0.01 },
                InputDescriptor { name: "Release", min: 0.001, max: 10.0, default: 0.5 },
            ],
            outputs: &[
                OutputDescriptor { name: "Envelope" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], sample_rate: f64) {
        if inputs.len() < 3 { return; }
        let trigger = inputs[0];
        let attack = inputs[1].max(0.001);
        let release = inputs[2].max(0.001);

        if trigger > 0.5 && self.last_trigger <= 0.5 {
            self.state = ARState::Attack;
        }
        self.last_trigger = trigger;

        match self.state {
            ARState::Idle => {
                self.current_value = 0.0;
            }
            ARState::Attack => {
                let step = 1.0 / (attack * sample_rate);
                self.current_value += step;
                if self.current_value >= 1.0 {
                    self.current_value = 1.0;
                    self.state = ARState::Release;
                }
            }
            ARState::Release => {
                let step = 1.0 / (release * sample_rate);
                self.current_value -= step;
                if self.current_value <= 0.0 {
                    self.current_value = 0.0;
                    self.state = ARState::Idle;
                }
            }
        }

        if self.current_value.abs() < 1e-30 { self.current_value = 0.0; }
        outputs[0] = self.current_value;
    }

    fn reset(&mut self) {
        self.state = ARState::Idle;
        self.current_value = 0.0;
        self.last_trigger = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ar_envelope() {
        let mut node = ARNode::new();
        let mut out = [0.0];
        let sr = 100.0;
        
        // Attack 0.1s (10 samples)
        node.process(&[1.0, 0.1, 0.5], &mut out, sr);
        assert!(out[0] > 0.0);
        
        // Process 20 samples total to ensure it reaches Release
        for _ in 0..20 {
            node.process(&[0.0, 0.1, 0.5], &mut out, sr);
        }
        // Should have reached peak and finished release or be releasing
        assert!(out[0] < 1.0);
    }
}