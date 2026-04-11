use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct MetronomeNode {
    phase: f64,
}

impl MetronomeNode {
    pub fn new() -> Self {
        Self { phase: 0.0 }
    }
}

impl AudioNode for MetronomeNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 97,
            name: "Metronome",
            category: "08_Timing",
            inputs: &[
                InputDescriptor { name: "BPM", min: 1.0, max: 300.0, default: 120.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Trigger" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], sample_rate: f64) {
        if inputs.is_empty() { return; }
        let bpm = inputs[0].max(1.0);
        let freq = bpm / 60.0;
        let phase_inc = freq / sample_rate;

        let mut trigger = 0.0;
        let next_phase = self.phase + phase_inc;
        
        if next_phase >= 1.0 {
            trigger = 1.0;
            self.phase = next_phase - 1.0;
        } else {
            self.phase = next_phase;
        }

        outputs[0] = trigger;
    }

    fn reset(&mut self) {
        self.phase = 0.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_metronome() {
        let mut node = MetronomeNode::new();
        let mut out = [0.0];
        let sr = 100.0;
        let bpm = 60.0; // 1 trigger per second
        
        // At SR=100, BPM=60, trigger should occur every 100 samples
        let mut trigger_count = 0;
        for _ in 0..201 {
            node.process(&[bpm], &mut out, sr);
            if out[0] > 0.5 {
                trigger_count += 1;
            }
        }
        assert_eq!(trigger_count, 2);
    }
}