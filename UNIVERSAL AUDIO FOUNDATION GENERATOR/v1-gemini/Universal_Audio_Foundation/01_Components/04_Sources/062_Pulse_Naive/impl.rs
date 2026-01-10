use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct PulseNaiveNode {
    phase: f64,
}

impl PulseNaiveNode {
    pub fn new() -> Self {
        Self { phase: 0.0 }
    }
}

impl AudioNode for PulseNaiveNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 62,
            name: "Pulse_Naive",
            category: "04_Sources",
            inputs: &[
                InputDescriptor { name: "Frequency", min: 0.0, max: 22050.0, default: 440.0 },
                InputDescriptor { name: "Width", min: 0.0, max: 1.0, default: 0.5 },
            ],
            outputs: &[
                OutputDescriptor { name: "Signal" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], sample_rate: f64) {
        if inputs.len() < 2 { return; }
        let freq = inputs[0];
        let width = inputs[1].clamp(0.0, 1.0);
        
        // Naive Pulse
        outputs[0] = if self.phase < width { 1.0 } else { -1.0 };
        
        let phase_inc = freq / sample_rate;
        self.phase = (self.phase + phase_inc).fract();
    }

    fn reset(&mut self) {
        self.phase = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pulse() {
        let mut node = PulseNaiveNode::new();
        let mut out = [0.0];
        
        // Freq 1.0, SR 100.0, Width 0.5
        // Sample 0: Phase 0.0 < 0.5 -> 1.0
        node.process(&[1.0, 0.5], &mut out, 100.0);
        assert_eq!(out[0], 1.0);
        
        // Phase is now 0.01...
    }
}