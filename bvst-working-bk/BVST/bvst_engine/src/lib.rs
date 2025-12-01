use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct BvstSynth {
    sample_rate: f32,
    phase: f32,
    frequency: f32,
    gain: f32,
}

#[wasm_bindgen]
impl BvstSynth {
    pub fn new(sample_rate: f32) -> BvstSynth {
        BvstSynth {
            sample_rate,
            phase: 0.0,
            frequency: 440.0,
            gain: 0.5,
        }
    }

    pub fn set_param(&mut self, param_id: u32, value: f32) {
        match param_id {
            0 => self.frequency = value, // ID 0 = Frequency
            1 => self.gain = value,      // ID 1 = Volume
            _ => {}
        }
    }

    // Fills the buffer with audio data
    pub fn process(&mut self, output: &mut [f32]) {
        for sample in output.iter_mut() {
            // Simple Sawtooth Math
            *sample = (self.phase * 2.0 - 1.0) * self.gain;
            
            // Increment Phase
            self.phase += self.frequency / self.sample_rate;
            if self.phase > 1.0 {
                self.phase -= 1.0;
            }
        }
    }
}