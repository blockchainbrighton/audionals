use std::sync::{Mutex, OnceLock};
use std::collections::HashMap;

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

// Global Memory Manager for Buffer Atoms
pub struct BufferRegistry {
    pub buffers: HashMap<usize, Vec<f64>>,
    pub next_id: usize,
}

impl BufferRegistry {
    pub fn alloc(&mut self, size: usize) -> usize {
        let id = self.next_id;
        self.buffers.insert(id, vec![0.0; size]);
        self.next_id += 1;
        id
    }

    pub fn get_mut(&mut self, id: usize) -> Option<&mut Vec<f64>> {
        self.buffers.get_mut(&id)
    }

    pub fn get(&self, id: usize) -> Option<&Vec<f64>> {
        self.buffers.get(&id)
    }
    
    pub fn clear(&mut self, id: usize) {
        if let Some(buf) = self.buffers.get_mut(&id) {
            for x in buf.iter_mut() { *x = 0.0; }
        }
    }
}

pub fn get_buffer_pool() -> &'static Mutex<BufferRegistry> {
    static POOL: OnceLock<Mutex<BufferRegistry>> = OnceLock::new();
    POOL.get_or_init(|| Mutex::new(BufferRegistry {
        buffers: HashMap::new(),
        next_id: 1,
    }))
}
