use std::f32::consts::PI;
use crate::plugin_trait::BvstPlugin;

// Synth 2: Pulse Width Modulation
// ID 2 (FM Depth) -> Base Pulse Width
// ID 4 (LFO Rate) -> PWM Speed
pub struct PwmSynth {
    sample_rate: f32,
    phase: f32,
    lfo_phase: f32,
    frequency: f32,
    gain: f32,
    base_width: f32,
    pwm_rate: f32,
}

impl BvstPlugin for PwmSynth {
    fn new(sample_rate: f32) -> Self {
        PwmSynth { 
            sample_rate,
            phase: 0.0,
            lfo_phase: 0.0,
            frequency: 110.0,
            gain: 0.5,
            base_width: 0.5,
            pwm_rate: 1.0,
        }
    }

    fn set_param(&mut self, id: u32, value: f32) {
        match id {
            0 => self.frequency = value,
            1 => self.gain = value,
            2 => self.base_width = (value / 2000.0).max(0.1).min(0.9), // Map big range to 0.1-0.9
            4 => self.pwm_rate = value,
            _ => {}
        }
    }

    fn process(&mut self, _input: &[f32], output: &mut [f32]) {
        for sample in output.iter_mut() {
            // LFO for PWM: varies width by +/- 0.3 around base
            let lfo = (self.lfo_phase * 2.0 * PI).sin();
            let current_width = (self.base_width + lfo * 0.3).max(0.05).min(0.95);

            let val = if self.phase < current_width { 1.0 } else { -1.0 };

            *sample = val * self.gain;
            
            self.phase += self.frequency / self.sample_rate;
            if self.phase > 1.0 { self.phase -= 1.0; }

            self.lfo_phase += self.pwm_rate / self.sample_rate;
            if self.lfo_phase > 1.0 { self.lfo_phase -= 1.0; }
        }
    }
}
