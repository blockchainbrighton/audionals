pub mod dsp;

#[derive(Clone, Copy)]
pub enum Curve {
    Linear(f32, f32, f32), // min, max, default
    Exponential(f32, f32, f32),
}

impl Curve {
    pub fn map(&self, val: f32) -> f32 {
        // val is 0..1 from UI (usually? or is it raw?)
        // The GUI sends raw values? No, GUI sends what?
        // Wait, "thin_plugin" params definition has (min, max, default).
        // Usually `set_param` receives the value *in the range* or normalized?
        // processor_glue.js says: `this.synth.set_param(event.data.id, event.data.value);`
        // The GUI controls like `knob` have `min`, `max`, `step`.
        // So the GUI sends the *actual* value (e.g. 440.0), not 0..1.
        // But the `Param` struct in `UniversalEngine` seems to process it?
        // `let mix = self.p_mix.process();`
        // If the `Param` struct handles smoothing/interpolation, then `set_param` updates the target.
        // The `Curve` in the macro might be just for metadata or initializing the `Param`.
        val
    }
}

pub struct Param {
    pub val: f32,
    pub target: f32,
    pub min: f32,
    pub max: f32,
    pub def: f32,
    coef: f32,
}

impl Param {
    pub fn new(min: f32, max: f32, def: f32, sample_rate: f32) -> Self {
        // Default smoothing time (seconds). Small enough to avoid zipper noise, large enough to feel responsive.
        let smoothing_sec = 0.005;
        let coef = if smoothing_sec <= 0.0 || sample_rate <= 0.0 {
            0.0
        } else {
            (-1.0 / (smoothing_sec * sample_rate)).exp()
        };

        Self { val: def, target: def, min, max, def, coef }
    }
    
    pub fn set(&mut self, v: f32) {
        self.target = v.max(self.min).min(self.max);
    }
    
    pub fn process(&mut self) -> f32 {
        // One-pole smoothing: y[n] = target + (y[n-1] - target) * coef
        if self.coef <= 0.0 {
            self.val = self.target;
            return self.val;
        }

        self.val = self.target + (self.val - self.target) * self.coef;
        self.val
    }
}

#[macro_export]
macro_rules! thin_plugin {
    (
        struct $name:ident {
            $($field_name:ident : $field_type:ty),* $(,)?
        }

        init_fields ($sr:ident) {
            $($init_field:ident = $init_val:expr),* $(,)?
        }

        params {
            $($id:literal : $p_name:ident = $p_curve:ident ( $p_min:expr, $p_max:expr, $p_def:expr ) ),* $(,)?
        }
    ) => {
        use wasm_bindgen::prelude::*;

        #[wasm_bindgen(js_name = BvstSynth)]
        pub struct $name {
            $($field_name : $field_type),*,
            // Auto-generated param fields
            $($p_name : $crate::Param),*,
            sample_rate: f32,
        }

        #[wasm_bindgen(js_class = BvstSynth)]
        impl $name {
            pub fn new(sample_rate: f32) -> Self {
                let $sr = sample_rate;
                Self {
                    $($init_field : $init_val),*,
                    $($p_name : $crate::Param::new($p_min, $p_max, $p_def, sample_rate)),*,
                    sample_rate
                }
            }

            pub fn set_param(&mut self, id: u32, value: f32) {
                match id {
                    $($id => self.$p_name.set(value)),*,
                    _ => {}
                }
                // Also handle special events if needed, but the loop usually does that via handle_event
                // Wait, handle_event is separate.
                self.handle_event(id, value);
            }
            
            pub fn process(&mut self, in_l: &[f32], in_r: &[f32], out_l: &mut [f32], out_r: &mut [f32]) {
                self.process_audio(in_l, in_r, out_l, out_r);
            }
        }
    };
}
