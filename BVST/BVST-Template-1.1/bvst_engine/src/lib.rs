use wasm_bindgen::prelude::*;
use std::f32::consts::PI;

#[wasm_bindgen]
pub struct BvstSynth {
    // Standard properties
    sample_rate: f32,
    
    // Oscillators State
    phase_carrier: f32,
    phase_mod: f32,
    phase_lfo: f32,

    // Parameters
    frequency: f32,     // Param 0: Base Pitch
    gain: f32,          // Param 1: Volume
    fm_depth: f32,      // Param 2: How much the sound growls
    fm_ratio: f32,      // Param 3: Harmonic texture (metallic vs deep)
    lfo_rate: f32,      // Param 4: Speed of the pulse
}

#[wasm_bindgen]
impl BvstSynth {
    pub fn new(sample_rate: f32) -> BvstSynth {
        BvstSynth { 
            sample_rate,
            phase_carrier: 0.0,
            phase_mod: 0.0,
            phase_lfo: 0.0,
            
            // Default "Alien" Preset
            frequency: 110.0, // Low A
            gain: 0.5,
            fm_depth: 500.0,
            fm_ratio: 2.0,
            lfo_rate: 0.5,
        }
    }

    // Map GUI IDs to internal variables
    pub fn set_param(&mut self, id: u32, value: f32) {
        match id {
            0 => self.frequency = value,
            1 => self.gain = value,
            2 => self.fm_depth = value,
            3 => self.fm_ratio = value,
            4 => self.lfo_rate = value,
            _ => {}
        }
    }

    pub fn process(&mut self, output: &mut [f32]) {
        for sample in output.iter_mut() {
            // 1. Calculate LFO (Low Frequency Oscillator) - Slow Sine
            // This creates the "breathing" or "swirling" alien movement
            let lfo_val = (self.phase_lfo * 2.0 * PI).sin(); 
            
            // 2. Calculate Modulator - Sine Wave
            // The modulation intensity is affected by the LFO
            let current_fm_depth = self.fm_depth + (lfo_val * (self.fm_depth * 0.5));
            let mod_val = (self.phase_mod * 2.0 * PI).sin() * current_fm_depth;

            // 3. Calculate Carrier - Sawtooth Wave
            // We add the modulator value to the phase calculation to warp the pitch
            // A raw sawtooth is calculated as: 2.0 * (phase - 0.5)
            // But here we use a sine function distorted by the modulator for a smoother "alien" tone
            let carrier_signal = ((self.phase_carrier * 2.0 * PI) + mod_val).sin();
            
            // Apply slight distortion (tanh) for grit
            let raw_out = (carrier_signal * 1.5).tanh();

            *sample = raw_out * self.gain;
            
            // --- Phase Updates ---
            
            // Carrier Phase
            self.phase_carrier += self.frequency / self.sample_rate;
            if self.phase_carrier > 1.0 { self.phase_carrier -= 1.0; }

            // Modulator Phase (Frequency * Ratio)
            self.phase_mod += (self.frequency * self.fm_ratio) / self.sample_rate;
            if self.phase_mod > 1.0 { self.phase_mod -= 1.0; }

            // LFO Phase
            self.phase_lfo += self.lfo_rate / self.sample_rate;
            if self.phase_lfo > 1.0 { self.phase_lfo -= 1.0; }
        }
    }
}