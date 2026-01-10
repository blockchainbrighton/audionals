use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};
use std::f64::consts::TAU;

pub struct LFONode {
    phase: f64,
}

impl LFONode {
    pub fn new() -> Self {
        Self { phase: 0.0 }
    }
}

impl AudioNode for LFONode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 76,
            name: "LFO",
            category: "05_Envelopes",
            inputs: &[
                InputDescriptor { name: "Frequency", min: 0.0, max: 100.0, default: 1.0 },
                InputDescriptor { name: "Waveform", min: 0.0, max: 3.0, default: 0.0 }, // 0: Sine, 1: Saw, 2: Tri, 3: Pulse
                InputDescriptor { name: "PulseWidth", min: 0.0, max: 1.0, default: 0.5 },
            ],
            outputs: &[
                OutputDescriptor { name: "Signal" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], sample_rate: f64) {
        if inputs.len() < 3 { return; }
        let freq = inputs[0];
        let waveform = inputs[1].round() as i32;
        let width = inputs[2].clamp(0.0, 1.0);
        
        let out = match waveform {
            0 => (self.phase * TAU).sin(), // Sine
            1 => 2.0 * self.phase - 1.0,   // Saw
            2 => 1.0 - 2.0 * (2.0 * self.phase - 1.0).abs(), // Tri
            3 => if self.phase < width { 1.0 } else { -1.0 }, // Pulse
            _ => (self.phase * TAU).sin(),
        };
        
        let mut out = out;
        if out.abs() < 1e-30 { out = 0.0; }
        outputs[0] = out;
        
        let phase_inc = freq / sample_rate;
        self.phase = (self.phase + phase_inc).fract();
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
    fn test_lfo_sine() {
        let mut node = LFONode::new();
        let mut out = [0.0];
        node.process(&[1.0, 0.0, 0.5], &mut out, 100.0);
        assert_eq!(out[0], 0.0); // sin(0)
    }
}