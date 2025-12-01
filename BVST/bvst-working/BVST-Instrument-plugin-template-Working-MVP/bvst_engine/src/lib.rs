use wasm_bindgen::prelude::*;

mod plugin_trait;

// --- SYNTH MODULES ---
mod synth_alien;
mod synth_template;
mod synth_saw_lpf;
mod synth_pwm;
mod synth_noise;
mod synth_bell;
mod synth_hard_sync;
mod synth_kick;
mod synth_supersaw;
mod synth_wobble;
mod synth_chiptune;
mod synth_ring_mod;

use plugin_trait::BvstPlugin;

// We rename the exported class to BvstEngine to be generic.
#[wasm_bindgen]
pub struct BvstEngine {
    plugin: Box<dyn BvstPlugin>,
    sample_rate: f32,
}

fn create_synth(id: u32, sample_rate: f32) -> Box<dyn BvstPlugin> {
    match id {
        0 => Box::new(synth_alien::AlienSynth::new(sample_rate)),
        1 => Box::new(synth_saw_lpf::SawLpfSynth::new(sample_rate)),
        2 => Box::new(synth_pwm::PwmSynth::new(sample_rate)),
        3 => Box::new(synth_noise::NoiseSynth::new(sample_rate)),
        4 => Box::new(synth_bell::BellSynth::new(sample_rate)),
        5 => Box::new(synth_hard_sync::SyncSynth::new(sample_rate)),
        6 => Box::new(synth_kick::KickSynth::new(sample_rate)),
        7 => Box::new(synth_supersaw::SuperSawSynth::new(sample_rate)),
        8 => Box::new(synth_wobble::WobbleSynth::new(sample_rate)),
        9 => Box::new(synth_chiptune::ChipSynth::new(sample_rate)),
        10 => Box::new(synth_ring_mod::RingModSynth::new(sample_rate)),
        _ => Box::new(synth_alien::AlienSynth::new(sample_rate)), // Default
    }
}

#[wasm_bindgen]
impl BvstEngine {
    pub fn new(sample_rate: f32) -> BvstEngine {
        let plugin = create_synth(0, sample_rate); // Default to Alien
        BvstEngine { 
            plugin,
            sample_rate,
        }
    }

    pub fn load_synth(&mut self, id: u32) {
        self.plugin = create_synth(id, self.sample_rate);
    }

    pub fn set_param(&mut self, id: u32, value: f32) {
        self.plugin.set_param(id, value);
    }

    // Updated process signature to accept input
    pub fn process(&mut self, input: &[f32], output: &mut [f32]) {
        self.plugin.process(input, output);
    }
}