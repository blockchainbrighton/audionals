# Rust Trait Definition (v2.0)

This document defines the strict interface that *all* Universal Audio Foundation components must implement. This interface ensures interoperability, self-description, and long-term stability.

## The `AudioNode` Trait

```rust
use std::sync::Mutex;
use std::collections::HashMap;

// --- Metadata Structures ---

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

// --- The Core Trait ---

pub trait AudioNode {
    /// Returns static metadata describing the node (inputs, outputs, ID).
    fn metadata(&self) -> AudioNodeMetadata;

    /// The core DSP processing function.
    /// 
    /// # Arguments
    /// * `inputs` - Slice of input values (control or signal). Length matches `metadata().inputs.len()`.
    /// * `outputs` - Mutable slice for writing results. Length matches `metadata().outputs.len()`.
    /// * `sample_rate` - The current sample rate (e.g., 44100.0).
    ///
    /// # Rules
    /// * Must be realtime safe (no allocations, no locks on critical paths unless unavoidable).
    /// * Must handle Denormals (flush to zero).
    /// * Must be Deterministic.
    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], sample_rate: f64);

    /// Resets internal state (delay lines, accumulators) to initial values.
    fn reset(&mut self);
}
```

## Shared Memory Architecture

Certain components (like Delays, Tables, and Buffers) require shared memory access across different atomic nodes. To support this while maintaining the modular `AudioNode` interface, we utilize a **Global Buffer Registry**.

### The Mechanism
We use a global, thread-safe singleton (via `OnceLock<Mutex<BufferRegistry>>`) to manage heap-allocated buffers.

1.  **Allocation**: A node (e.g., `BufferAlloc`) requests memory from the registry and receives a `usize` **Handle** (returned as an `f64`).
2.  **Access**: Other nodes (e.g., `BufferRead`, `BufferWrite`) accept this **Handle** as an input port.
3.  **Lookup**: Inside `process()`, nodes use the handle to lock the registry and access the data.

### Usage
Components needing shared memory should import:
```rust
use crate::traits::get_buffer_pool;
```

And access it safely:
```rust
let pool = get_buffer_pool().lock().unwrap();
if let Some(buffer) = pool.get(handle_id) {
    // Read/Write buffer
}
```