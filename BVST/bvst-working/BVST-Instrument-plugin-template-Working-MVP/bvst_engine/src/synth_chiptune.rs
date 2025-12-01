use crate::plugin_trait::BvstPlugin;

// Synth 9: Chiptune Arp
// Rapidly switches between root, 3rd, 5th
// ID 4 -> Arp Speed
pub struct ChipSynth {
    sample_rate: f32,
    phase: f32,
    arp_timer: f32,
    arp_index: usize,
    frequency: f32,
    gain: f32,
    arp_speed: f32,
}

impl BvstPlugin for ChipSynth {
    fn new(sample_rate: f32) -> Self {
        ChipSynth { 
            sample_rate,
            phase: 0.0,
            arp_timer: 0.0,
            arp_index: 0,
            frequency: 220.0,
            gain: 0.5,
            arp_speed: 8.0, // Hz
        }
    }

    fn set_param(&mut self, id: u32, value: f32) {
        match id {
            0 => self.frequency = value,
            1 => self.gain = value,
            4 => self.arp_speed = value.max(1.0),
            _ => {}
        }
    }

    fn process(&mut self, _input: &[f32], output: &mut [f32]) {
        let intervals = [1.0, 1.25, 1.5, 2.0]; // Major chord + octave

        for sample in output.iter_mut() {
            // Determine current frequency multiplier
            let mult = intervals[self.arp_index];
            let current_freq = self.frequency * mult;
            
            // Square wave (50% duty)
            let val = if self.phase < 0.5 { 1.0 } else { -1.0 };
            *sample = val * self.gain;

            // Advance phase
            self.phase += current_freq / self.sample_rate;
            if self.phase > 1.0 { self.phase -= 1.0; }

            // Advance Arp
            self.arp_timer += 1.0 / self.sample_rate;
            if self.arp_timer > (1.0 / self.arp_speed) {
                self.arp_timer = 0.0;
                self.arp_index = (self.arp_index + 1) % 4;
            }
        }
    }
}
