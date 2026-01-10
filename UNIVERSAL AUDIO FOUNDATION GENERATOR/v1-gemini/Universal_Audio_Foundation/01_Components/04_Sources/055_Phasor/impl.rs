use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct PhasorNode {
    phase: f64,
}

impl PhasorNode {
    pub fn new() -> Self {
        Self { phase: 0.0 }
    }
}

impl AudioNode for PhasorNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 55,
            name: "Phasor",
            category: "04_Sources",
            inputs: &[
                InputDescriptor { name: "Frequency", min: 0.0, max: 22050.0, default: 440.0 },
                InputDescriptor { name: "Reset", min: 0.0, max: 1.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Ramp" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], sample_rate: f64) {
        if inputs.len() < 2 { return; }
        let freq = inputs[0];
        let reset = inputs[1] > 0.5;

        if reset {
            self.phase = 0.0;
        }

        outputs[0] = self.phase;

        let phase_inc = freq / sample_rate;
        self.phase = (self.phase + phase_inc).fract();
        
        // Safety for negative frequencies or precision issues
        if self.phase < 0.0 { self.phase += 1.0; }
    }

    fn reset(&mut self) {
        self.phase = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ramp() {
        let mut node = PhasorNode::new();
        let mut out = [0.0];
        let sr = 100.0;
        let freq = 1.0; // Should take 100 samples to cycle
        
        node.process(&[freq, 0.0], &mut out, sr);
        assert_eq!(out[0], 0.0);
        
        node.process(&[freq, 0.0], &mut out, sr);
        assert_eq!(out[0], 0.01);
    }
}