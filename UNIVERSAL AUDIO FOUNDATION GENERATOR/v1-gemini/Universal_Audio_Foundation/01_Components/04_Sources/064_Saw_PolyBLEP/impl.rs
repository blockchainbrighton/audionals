use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct SawPolyBLEPNode {
    phase: f64,
}

impl SawPolyBLEPNode {
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

impl AudioNode for SawPolyBLEPNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 64,
            name: "Saw_PolyBLEP",
            category: "04_Sources",
            inputs: &[
                InputDescriptor { name: "Frequency", min: 0.0, max: 22050.0, default: 440.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Signal" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], sample_rate: f64) {
        if inputs.is_empty() { return; }
        let freq = inputs[0].max(0.0);
        let dt = freq / sample_rate;

        let mut naive = 2.0 * self.phase - 1.0;
        naive -= Self::poly_blep(self.phase, dt);

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
    fn test_saw_blep_metadata() {
        let node = SawPolyBLEPNode::new();
        assert_eq!(node.metadata().name, "Saw_PolyBLEP");
    }
}