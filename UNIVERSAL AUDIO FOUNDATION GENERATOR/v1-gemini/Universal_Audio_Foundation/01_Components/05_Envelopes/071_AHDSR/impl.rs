use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

#[derive(PartialEq)]
enum AHDSRState {
    Idle,
    Attack,
    Hold,
    Decay,
    Sustain,
    Release,
}

pub struct AHDSRNode {
    state: AHDSRState,
    current_value: f64,
    last_gate: f64,
    hold_count: usize,
}

impl AHDSRNode {
    pub fn new() -> Self {
        Self {
            state: AHDSRState::Idle,
            current_value: 0.0,
            last_gate: 0.0,
            hold_count: 0,
        }
    }
}

impl AudioNode for AHDSRNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 71,
            name: "AHDSR",
            category: "05_Envelopes",
            inputs: &[
                InputDescriptor { name: "Gate", min: 0.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Attack", min: 0.001, max: 10.0, default: 0.01 },
                InputDescriptor { name: "Hold", min: 0.0, max: 10.0, default: 0.05 },
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
        if inputs.len() < 6 { return; }
        let gate = inputs[0];
        let attack = inputs[1].max(0.001);
        let hold = inputs[2].max(0.0);
        let decay = inputs[3].max(0.001);
        let sustain = inputs[4].clamp(0.0, 1.0);
        let release = inputs[5].max(0.001);

        if gate > 0.5 && self.last_gate <= 0.5 {
            self.state = AHDSRState::Attack;
        } else if gate <= 0.5 && self.last_gate > 0.5 {
            self.state = AHDSRState::Release;
        }
        self.last_gate = gate;

        match self.state {
            AHDSRState::Idle => {
                self.current_value = 0.0;
            }
            AHDSRState::Attack => {
                let step = 1.0 / (attack * sample_rate);
                self.current_value += step;
                if self.current_value >= 1.0 {
                    self.current_value = 1.0;
                    self.hold_count = (hold * sample_rate) as usize;
                    self.state = if self.hold_count > 0 { AHDSRState::Hold } else { AHDSRState::Decay };
                }
            }
            AHDSRState::Hold => {
                self.current_value = 1.0;
                if self.hold_count > 0 {
                    self.hold_count -= 1;
                } else {
                    self.state = AHDSRState::Decay;
                }
            }
            AHDSRState::Decay => {
                let step = (1.0 - sustain) / (decay * sample_rate);
                self.current_value -= step;
                if self.current_value <= sustain {
                    self.current_value = sustain;
                    self.state = AHDSRState::Sustain;
                }
            }
            AHDSRState::Sustain => {
                self.current_value = sustain;
            }
            AHDSRState::Release => {
                let step = sustain / (release * sample_rate);
                self.current_value -= step;
                if self.current_value <= 0.0 {
                    self.current_value = 0.0;
                    self.state = AHDSRState::Idle;
                }
            }
        }

        if self.current_value.abs() < 1e-30 { self.current_value = 0.0; }
        outputs[0] = self.current_value;
    }

    fn reset(&mut self) {
        self.state = AHDSRState::Idle;
        self.current_value = 0.0;
        self.last_gate = 0.0;
        self.hold_count = 0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ahdsr_metadata() {
        let node = AHDSRNode::new();
        assert_eq!(node.metadata().name, "AHDSR");
    }
}