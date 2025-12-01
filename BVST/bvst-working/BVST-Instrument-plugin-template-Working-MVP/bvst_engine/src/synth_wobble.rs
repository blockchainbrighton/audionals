use std::f32::consts::PI;
use crate::plugin_trait::BvstPlugin;

// Synth 8: Wobble Bass
// Saw wave through LFO-modulated Low Pass Filter
// ID 4 -> LFO Rate (Wobble Speed)
// ID 2 -> Filter Base Cutoff
// ID 3 -> Filter Mod Depth
pub struct WobbleSynth {
    sample_rate: f32,
    phase: f32,
    lfo_phase: f32,
    frequency: f32,
    gain: f32,
    lfo_rate: f32,
    base_cutoff: f32,
    mod_depth: f32,
    last_out: f32,
}

impl BvstPlugin for WobbleSynth {
    fn new(sample_rate: f32) -> Self {
        WobbleSynth { 
            sample_rate,
            phase: 0.0,
            lfo_phase: 0.0,
            frequency: 55.0,
            gain: 0.5,
            lfo_rate: 2.0,
            base_cutoff: 500.0,
            mod_depth: 400.0,
            last_out: 0.0,
        }
    }

    fn set_param(&mut self, id: u32, value: f32) {
        match id {
            0 => self.frequency = value,
            1 => self.gain = value,
            2 => self.base_cutoff = value,
            3 => self.mod_depth = value,
            4 => self.lfo_rate = value,
            _ => {}
        }
    }

    fn process(&mut self, _input: &[f32], output: &mut [f32]) {
        for sample in output.iter_mut() {
            // Source: Sawtooth
            let raw = 2.0 * self.phase - 1.0;
            
            // LFO
            let lfo = (self.lfo_phase * 2.0 * PI).sin();
            
            // Modulate Cutoff
            let cutoff = (self.base_cutoff + lfo * self.mod_depth).max(50.0).min(10000.0);
            
            // One-pole LPF
            let alpha = (2.0 * PI * cutoff / self.sample_rate).min(1.0);
            self.last_out += alpha * (raw - self.last_out);
            
            *sample = self.last_out * self.gain;

            self.phase += self.frequency / self.sample_rate;
            if self.phase > 1.0 { self.phase -= 1.0; }

            self.lfo_phase += self.lfo_rate / self.sample_rate;
            if self.lfo_phase > 1.0 { self.lfo_phase -= 1.0; }
        }
    }
}
