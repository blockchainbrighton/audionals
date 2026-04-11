use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

#[derive(PartialEq)]
enum ADSRState {
    Idle,
    Attack,
    Decay,
    Sustain,
    Release,
}

pub struct ADSRNode {
    state: ADSRState,
    current_value: f64,
    last_gate: f64,
}

impl ADSRNode {
    pub fn new() -> Self {
        Self {
            state: ADSRState::Idle,
            current_value: 0.0,
            last_gate: 0.0,
        }
    }
}

impl AudioNode for ADSRNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 69,
            name: "ADSR",
            category: "05_Envelopes",
            inputs: &[
                InputDescriptor { name: "Gate", min: 0.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Attack", min: 0.001, max: 10.0, default: 0.01 },
                InputDescriptor { name: "Decay", min: 0.001, max: 10.0, default: 0.1 },
                InputDescriptor { name: "Sustain", min: 0.0, max: 1.0, default: 0.7 },
                InputDescriptor { name: "Release", min: 0.001, max: 10.0, default: 0.2 },
            ],
            outputs: &[
                OutputDescriptor { name: "Envelope" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], sample_rate: f64) {
        if inputs.len() < 5 { return; }
        let gate = inputs[0];
        let attack = inputs[1].max(0.001);
        let decay = inputs[2].max(0.001);
        let sustain = inputs[3].clamp(0.0, 1.0);
        let release = inputs[4].max(0.001);

        // Gate logic
        if gate > 0.5 && self.last_gate <= 0.5 {
            self.state = ADSRState::Attack;
        } else if gate <= 0.5 && self.last_gate > 0.5 {
            self.state = ADSRState::Release;
        }
        self.last_gate = gate;

        match self.state {
            ADSRState::Idle => {
                self.current_value = 0.0;
            }
            ADSRState::Attack => {
                let step = 1.0 / (attack * sample_rate);
                self.current_value += step;
                if self.current_value >= 1.0 {
                    self.current_value = 1.0;
                    self.state = ADSRState::Decay;
                }
            }
            ADSRState::Decay => {
                let step = (1.0 - sustain) / (decay * sample_rate);
                self.current_value -= step;
                if self.current_value <= sustain {
                    self.current_value = sustain;
                    self.state = ADSRState::Sustain;
                }
            }
            ADSRState::Sustain => {
                self.current_value = sustain;
            }
            ADSRState::Release => {
                let step = sustain / (release * sample_rate);
                self.current_value -= step;
                if self.current_value <= 0.0 {
                    self.current_value = 0.0;
                    self.state = ADSRState::Idle;
                }
            }
        }

        if self.current_value.abs() < 1e-30 {
            self.current_value = 0.0;
        }
        outputs[0] = self.current_value;
    }

    fn reset(&mut self) {
        self.state = ADSRState::Idle;
        self.current_value = 0.0;
        self.last_gate = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_adsr_stages() {
        let mut node = ADSRNode::new();
        let mut out = [0.0];
        let sr = 100.0;
        
        // Attack 0.1s (10 samples)
        // Gate On
        node.process(&[1.0, 0.1, 0.1, 0.5, 0.1], &mut out, sr);
        assert!(out[0] > 0.0);
        
        // Decay to sustain 0.5
        for _ in 0..20 {
            node.process(&[1.0, 0.1, 0.1, 0.5, 0.1], &mut out, sr);
        }
        assert_eq!(out[0], 0.5);
        
        // Release
        node.process(&[0.0, 0.1, 0.1, 0.5, 0.1], &mut out, sr);
        assert!(out[0] < 0.5);
    }
}