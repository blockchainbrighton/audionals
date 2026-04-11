pub struct InputDescriptor {
    pub name: &'static str,
    pub min: f64,
    pub max: f64,
    pub default: f64,
}

pub struct OutputDescriptor {
    pub name: &'static str,
}

pub struct AudioNodeMetadata {
    pub id: u32,
    pub name: &'static str,
    pub category: &'static str,
    pub inputs: &'static [InputDescriptor],
    pub outputs: &'static [OutputDescriptor],
}

pub trait AudioNode {
    fn metadata(&self) -> AudioNodeMetadata;
    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], sample_rate: f64);
    fn reset(&mut self);
}
