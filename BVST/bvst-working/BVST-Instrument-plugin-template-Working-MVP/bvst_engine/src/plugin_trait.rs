pub trait BvstPlugin {
    fn new(sample_rate: f32) -> Self where Self: Sized;
    fn process(&mut self, input: &[f32], output: &mut [f32]);
    fn set_param(&mut self, id: u32, value: f32);
}
