use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct MarkovNode {
    state: f64,
    last_trigger: f64,
    seed: u64,
}

impl MarkovNode {
    pub fn new() -> Self {
        Self {
            state: 0.0,
            last_trigger: 0.0,
            seed: 12345,
        }
    }

    fn next_rand(&mut self) -> f64 {
        self.seed = self.seed.wrapping_mul(6364136223846793005).wrapping_add(1);
        (self.seed >> 32) as f64 / 4294967296.0
    }
}

impl AudioNode for MarkovNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 113,
            name: "Markov",
            category: "08_Timing",
            inputs: &[
                InputDescriptor { name: "Trigger", min: 0.0, max: 1.0, default: 0.0 },
                InputDescriptor { name: "Prob_A_to_B", min: 0.0, max: 1.0, default: 0.1 },
                InputDescriptor { name: "Prob_B_to_A", min: 0.0, max: 1.0, default: 0.1 },
            ],
            outputs: &[
                OutputDescriptor { name: "State" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 3 { return; }
        let trigger = inputs[0];
        let p_ab = inputs[1].clamp(0.0, 1.0);
        let p_ba = inputs[2].clamp(0.0, 1.0);

        if trigger > 0.5 && self.last_trigger <= 0.5 {
            let r = self.next_rand();
            if self.state < 0.5 {
                if r < p_ab {
                    self.state = 1.0;
                }
            } else {
                if r < p_ba {
                    self.state = 0.0;
                }
            }
        }
        self.last_trigger = trigger;
        outputs[0] = self.state;
    }

    fn reset(&mut self) {
        self.state = 0.0;
        self.last_trigger = 0.0;
        self.seed = 12345;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_markov_state() {
        let mut node = MarkovNode::new();
        let mut out = [0.0];
        
        // Prob A->B = 1.0, should switch on first trigger
        node.process(&[1.0, 1.0, 0.0], &mut out, 44100.0);
        assert_eq!(out[0], 1.0);
        
        node.process(&[0.0, 1.0, 0.0], &mut out, 44100.0);
        
        // Prob B->A = 1.0, should switch back
        node.process(&[1.0, 1.0, 1.0], &mut out, 44100.0);
        assert_eq!(out[0], 0.0);
    }
}