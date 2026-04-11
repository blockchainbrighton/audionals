# The Universal Interface (Rust)

Every component in the /01_Components folder must implement this trait:

```rust
pub trait AudioNode {
    /// Process a single sample frame
    /// inputs: Slice of input signals (control or audio)
    /// sample_rate: The current system sample rate (e.g., 44100.0)
    fn process(&mut self, inputs: &[f64], sample_rate: f64) -> f64;

    /// Reset internal memory (e.g., clear delay buffers)
    fn reset(&mut self);
}
```
