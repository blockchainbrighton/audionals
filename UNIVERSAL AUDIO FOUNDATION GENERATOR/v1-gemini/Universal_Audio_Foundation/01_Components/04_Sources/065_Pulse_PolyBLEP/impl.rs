use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct PulsePolyBLEPNode {
    phase: f64,
}

impl PulsePolyBLEPNode {
    pub fn new() -> Self {
        Self { phase: 0.0 }
    }

    fn poly_blep(t: f64, dt: f64) -> f64 {
        if t < dt {
            let t = t / dt;
            t + t - t * t - 1.0
        } else if t > 1.0 - dt {
            let t = (t - 1.0) / dt;
            t * t + t + t + 1.0
        } else {
            0.0
        }
    }
}

impl AudioNode for PulsePolyBLEPNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 65,
            name: "Pulse_PolyBLEP",
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
        let freq = inputs[0].max(0.0);
        let width = inputs[1].clamp(0.0, 1.0);
        let dt = freq / sample_rate;

        let mut naive = if self.phase < width { 1.0 } else { -1.0 };
        
        // Add BLEP at wrap (0/1)
        naive += Self::poly_blep(self.phase, dt);
        // Subtract BLEP at discontinuity (width)
        naive -= Self::poly_blep((self.phase + (1.0 - width)).fract(), dt);

        if naive.abs() < 1e-30 { naive = 0.0; }
        outputs[0] = naive;

        self.phase = (self.phase + dt).fract();
    }

    fn reset(&mut self) {
        self.phase = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pulse_blep_metadata() {
        let node = PulsePolyBLEPNode::new();
        assert_eq!(node.metadata().name, "Pulse_PolyBLEP");
    }
}