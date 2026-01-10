use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor, get_buffer_pool};

pub struct SequencerStepNode;

impl SequencerStepNode {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for SequencerStepNode {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: 109,
            name: "SequencerStep",
            category: "08_Timing",
            inputs: &[
                InputDescriptor { name: "Index", min: 0.0, max: 1000000.0, default: 0.0 },
                InputDescriptor { name: "BufferHandle", min: 0.0, max: 1000.0, default: 0.0 },
            ],
            outputs: &[
                OutputDescriptor { name: "Value" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        if inputs.len() < 2 { return; }
        let index = inputs[0].max(0.0).round() as usize;
        let handle = inputs[1] as usize;

        let mut out = 0.0;
        let pool = get_buffer_pool().lock().unwrap();
        if let Some(buf) = pool.get(handle) {
            if !buf.is_empty() {
                out = buf[index % buf.len()];
            }
        }

        if out.abs() < 1e-30 { out = 0.0; }
        outputs[0] = out;
    }

    fn reset(&mut self) {}
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sequencer_metadata() {
        let node = SequencerStepNode::new();
        assert_eq!(node.metadata().name, "SequencerStep");
    }
}