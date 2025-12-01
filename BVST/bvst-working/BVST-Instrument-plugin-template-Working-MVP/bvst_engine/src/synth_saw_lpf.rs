use std::f32::consts::PI;
use crate::plugin_trait::BvstPlugin;

// Synth 1: Sawtooth with Low Pass Filter
// ID 2 (FM Depth) -> Filter Cutoff
// ID 3 (FM Ratio) -> Filter Resonance
pub struct SawLpfSynth {
    sample_rate: f32,
    phase: f32,
    frequency: f32,
    gain: f32,
    cutoff_param: f32, // Mapped from ID 2
    resonance_param: f32, // Mapped from ID 3
    // Filter state
    last_output: f32,
}

impl BvstPlugin for SawLpfSynth {
    fn new(sample_rate: f32) -> Self {
        SawLpfSynth { 
            sample_rate,
            phase: 0.0,
            frequency: 110.0,
            gain: 0.5,
            cutoff_param: 1000.0,
            resonance_param: 0.0,
            last_output: 0.0,
        }
    }

    fn set_param(&mut self, id: u32, value: f32) {
        match id {
            0 => self.frequency = value,
            1 => self.gain = value,
            2 => self.cutoff_param = value.max(20.0).min(10000.0), // Reuse FM Depth slider
            3 => self.resonance_param = value.max(0.0).min(0.95), // Reuse FM Ratio slider
            _ => {}
        }
    }

    fn process(&mut self, _input: &[f32], output: &mut [f32]) {
        for sample in output.iter_mut() {
            // 1. Generate Sawtooth: ranges -1.0 to 1.0
            let raw = 2.0 * self.phase - 1.0;

            // 2. Simple One-Pole Low Pass Filter
            // alpha = dt / (RC + dt) ~ 2*pi*fc / sr
            // A crude approximation for a simple filter
            let alpha = (2.0 * PI * self.cutoff_param / self.sample_rate).min(1.0);
            
            // Apply filter with resonance feedback approximation
            let input_with_res = raw + self.resonance_param * (raw - self.last_output);
            let filtered = self.last_output + alpha * (input_with_res - self.last_output);
            self.last_output = filtered;

            *sample = filtered * self.gain;
            
            self.phase += self.frequency / self.sample_rate;
            if self.phase > 1.0 { self.phase -= 1.0; }
        }
    }
}
