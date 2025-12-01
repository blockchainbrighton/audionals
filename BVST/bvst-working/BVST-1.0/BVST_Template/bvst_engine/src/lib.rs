use wasm_bindgen::prelude::*;
use std::f32::consts::PI;

// --- BVST CORE STRUCTURE ---
// You generally don't need to modify this struct's fields unless you need more state.
// If you add fields, remember to initialize them in `new()`.

#[wasm_bindgen]
pub struct BvstSynth {
    // Standard BVST properties
    sample_rate: f32,
    
    // Custom synth state
    phase: f32,
    frequency: f32,
    gain: f32,
    // Add your own parameters here (e.g., filter_cutoff: f32)
}

#[wasm_bindgen]
impl BvstSynth {
    // --- INITIALIZATION ---
    pub fn new(sample_rate: f32) -> BvstSynth {
        // Initialize your state here
        BvstSynth { 
            sample_rate,
            phase: 0.0, 
            frequency: 440.0,
            gain: 0.5,
            // Initialize new parameters here
        }
    }

    // --- PARAMETER CONTROL ---
    // Map parameter IDs (defined in manifest.json) to your struct fields.
    pub fn set_param(&mut self, id: u32, value: f32) {
        match id {
            0 => self.frequency = value,
            1 => self.gain = value,
            // Add more cases here:
            // 2 => self.filter_cutoff = value,
            _ => {}
        }
    }

    // --- AUDIO PROCESSING ---
    // This is the heart of your synth. It runs for every audio block (usually 128 samples).
    pub fn process(&mut self, output: &mut [f32]) {
        for sample in output.iter_mut() {
            // --- DSP LOGIC START ---
            
            // Example: Simple Sine Wave
            // val = sin(phase * 2pi) * gain
            let value = (self.phase * 2.0 * PI).sin() * self.gain;
            
            *sample = value;
            
            // Update phase
            self.phase += self.frequency / self.sample_rate;
            if self.phase > 1.0 { self.phase -= 1.0; }
            
            // --- DSP LOGIC END ---
        }
    }
}
