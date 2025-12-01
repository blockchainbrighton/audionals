use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct BvstSynth {
    phase: f32,
    frequency: f32,
    gain: f32,
    sample_rate: f32,
}

#[wasm_bindgen]
impl BvstSynth {
    pub fn new(sample_rate: f32) -> BvstSynth {
        BvstSynth { 
            phase: 0.0, 
            frequency: 440.0,
            gain: 0.5,
            sample_rate 
        }
    }

    pub fn set_param(&mut self, id: u32, value: f32) {
        match id {
            0 => self.frequency = value,
            1 => self.gain = value,
            _ => {}
        }
    }

    pub fn process(&mut self, output: &mut [f32]) {
        for sample in output.iter_mut() {
            // Simple Sawtooth synthesis
            let value = (self.phase * 2.0 - 1.0) * self.gain;
            *sample = value;
            
            // Advance phase
            self.phase += self.frequency / self.sample_rate;
            if self.phase > 1.0 { self.phase -= 1.0; }
        }
    }
}