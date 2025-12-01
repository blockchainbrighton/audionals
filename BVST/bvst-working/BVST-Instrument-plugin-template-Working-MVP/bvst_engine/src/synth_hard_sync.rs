use std::f32::consts::PI;
use crate::plugin_trait::BvstPlugin;

// Synth 5: Hard Sync
// Slave osc frequency forced to reset by Master osc
// ID 2 -> Slave Frequency Offset (detune/ratio)
pub struct SyncSynth {
    sample_rate: f32,
    master_phase: f32,
    slave_phase: f32,
    frequency: f32,
    slave_ratio: f32,
    gain: f32,
}

impl BvstPlugin for SyncSynth {
    fn new(sample_rate: f32) -> Self {
        SyncSynth { 
            sample_rate,
            master_phase: 0.0,
            slave_phase: 0.0,
            frequency: 110.0,
            slave_ratio: 1.5,
            gain: 0.5,
        }
    }

    fn set_param(&mut self, id: u32, value: f32) {
        match id {
            0 => self.frequency = value,
            1 => self.gain = value,
            2 => self.slave_ratio = (value / 100.0).max(1.0), // Map depth to ratio
            _ => {}
        }
    }

    fn process(&mut self, _input: &[f32], output: &mut [f32]) {
        for sample in output.iter_mut() {
            // Slave generates the sound
            let slave_val = (self.slave_phase * 2.0 * PI).sin();
            
            *sample = slave_val * self.gain;

            // Advance Master
            self.master_phase += self.frequency / self.sample_rate;
            if self.master_phase >= 1.0 {
                self.master_phase -= 1.0;
                // HARD SYNC: Reset slave phase
                self.slave_phase = 0.0;
            } else {
                // Advance Slave
                self.slave_phase += (self.frequency * self.slave_ratio) / self.sample_rate;
                if self.slave_phase >= 1.0 { self.slave_phase -= 1.0; }
            }
        }
    }
}
