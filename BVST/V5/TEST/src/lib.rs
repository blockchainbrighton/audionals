use wasm_bindgen::prelude::*;
use std::collections::HashMap;
use std::f32::consts::PI;

// --- CONSTANTS ---
const BLOCK_SIZE: usize = 128;

// --- UTILS ---
fn clip(val: f32) -> f32 {
    val.max(-1.0).min(1.0)
}

fn midi_to_freq(note: f32) -> f32 {
    440.0 * 2.0_f32.powf((note - 69.0) / 12.0)
}

// --- NODE TYPES ENUM ---
#[derive(Copy, Clone, PartialEq)]
enum NodeType {
    // Sources
    Oscillator = 0, // 0:Form (0=Sin,1=Saw,2=Sqr,3=Tri,4=Noise), 1:Freq, 2:Detune, 3:Gain
    Constant = 1,   // 0:Value (DC Offset)
    
    // Filters & EQ
    Biquad = 10,    // 0:Type (0=LP,1=HP,2=BP,3=Notch,4=Peak,5=LS,6=HS), 1:Freq, 2:Q, 3:Gain
    SVF = 11,       // 0:Type (0=LP,1=HP,2=BP,3=Notch), 1:Freq, 2:Res
    
    // Dynamics
    Gain = 20,      // 0:Value (Linear Gain)
    EnvFollower = 21, // 0:Attack(s), 1:Release(s)
    Comparator = 22,  // 0:Threshold
    Limiter = 23,     // 0:Threshold, 1:Release
    
    // Time
    Delay = 30,     // 0:Time(s), 1:Feedback, 2:Mix
    ADSR = 31,      // 0:Att, 1:Dec, 2:Sus, 3:Rel, 4:Gate(bool)
    
    // Math & Mixing
    Mixer = 40,     // No params, sums all inputs
    Mult = 41,      // Multiplies Input 0 * Input 1 (Ring Mod / VCA)
    Master = 99,    // Final Output (Hard clip protection)
}

// --- NODE STRUCT ---
struct Node {
    node_type: NodeType,
    params: [f32; 8],     // Generic slots for parameters
    inputs: Vec<u32>,     // IDs of nodes feeding into this one
    
    // State Memory
    phase: f32,           // Oscillators
    z1: f32, z2: f32,     // Filters (Direct Form I/II)
    s1: f32, s2: f32,     // Filters (State Variable)
    env_val: f32,         // Envelope Followers / ADSR value
    state_machine: u8,    // ADSR State (0=Idle, 1=Att, 2=Dec, 3=Sus, 4=Rel)
    delay_buf: Vec<f32>,  // Delay Lines
    write_ptr: usize,     // Ring buffer pointer
    sample_rate: f32,
}

impl Node {
    fn new(node_type: NodeType, sample_rate: f32) -> Self {
        // Allocate delay buffer only if needed
        let delay_buf = if node_type == NodeType::Delay { 
            vec![0.0; (sample_rate * 2.0) as usize] // Max 2 seconds
        } else { 
            Vec::new() 
        };

        Self {
            node_type,
            params: [0.0; 8],
            inputs: Vec::with_capacity(4),
            phase: 0.0,
            z1: 0.0, z2: 0.0,
            s1: 0.0, s2: 0.0,
            env_val: 0.0,
            state_machine: 0,
            delay_buf,
            write_ptr: 0,
            sample_rate,
        }
    }

    fn process_block(&mut self, inputs: &HashMap<u32, [f32; BLOCK_SIZE]>, output: &mut [f32; BLOCK_SIZE]) {
        // Clear output buffer first
        output.fill(0.0);

        // Helper to get input buffer safely
        let get_input = |idx: usize| -> &[f32; BLOCK_SIZE] {
            if let Some(id) = self.inputs.get(idx) {
                if let Some(buf) = inputs.get(id) {
                    return buf;
                }
            }
            &[0.0; BLOCK_SIZE] // Silence if unconnected
        };

        match self.node_type {
            
            // --- OSCILLATOR ---
            NodeType::Oscillator => {
                let form = self.params[0] as usize;
                let freq_base = self.params[1];
                let detune = self.params[2];
                let gain = if self.params[3] == 0.0 { 1.0 } else { self.params[3] }; // Default to 1.0 if 0
                
                // Input 0 modulates Frequency (FM)
                let fm_buf = get_input(0); 

                let base_freq = freq_base * 2.0_f32.powf(detune / 1200.0);

                for i in 0..BLOCK_SIZE {
                    let fm_val = fm_buf[i] * 1000.0; // FM Depth scaling
                    let current_freq = (base_freq + fm_val).max(0.1);
                    let phase_inc = current_freq / self.sample_rate;

                    let raw_sample = match form {
                        0 => (self.phase * 2.0 * PI).sin(), // Sine
                        1 => 2.0 * self.phase - 1.0,        // Saw
                        2 => if self.phase > 0.5 { 1.0 } else { -1.0 }, // Square
                        3 => 4.0 * (self.phase - 0.5).abs() - 1.0, // Tri
                        4 => (rand::random::<f32>() * 2.0) - 1.0, // Noise
                        _ => 0.0,
                    };

                    output[i] = raw_sample * gain;
                    self.phase = (self.phase + phase_inc) % 1.0;
                }
            },

            // --- BIQUAD FILTER ---
            NodeType::Biquad => {
                let filter_type = self.params[0] as usize;
                let cutoff = self.params[1].max(10.0).min(self.sample_rate / 2.1);
                let q = self.params[2].max(0.01);
                let gain_db = self.params[3];

                let w0 = 2.0 * PI * cutoff / self.sample_rate;
                let alpha = w0.sin() / (2.0 * q);
                let cos_w0 = w0.cos();
                let a_pow = 10.0_f32.powf(gain_db / 40.0);

                let (b0, b1, b2, a0, a1, a2) = match filter_type {
                    0 => ((1.-cos_w0)/2., 1.-cos_w0, (1.-cos_w0)/2., 1.+alpha, -2.*cos_w0, 1.-alpha), // LP
                    1 => ((1.+cos_w0)/2., -(1.+cos_w0), (1.+cos_w0)/2., 1.+alpha, -2.*cos_w0, 1.-alpha), // HP
                    2 => (alpha, 0.0, -alpha, 1.+alpha, -2.*cos_w0, 1.-alpha), // BP
                    3 => (1.0, -2.0*cos_w0, 1.0, 1.+alpha, -2.*cos_w0, 1.-alpha), // Notch
                    4 => (1.+alpha*a_pow, -2.*cos_w0, 1.-alpha*a_pow, 1.+alpha/a_pow, -2.*cos_w0, 1.-alpha/a_pow), // Peaking
                    _ => (1.0, 0.0, 0.0, 1.0, 0.0, 0.0), // Bypass
                };

                let inv_a0 = 1.0 / a0;
                let in_buf = get_input(0);

                for i in 0..BLOCK_SIZE {
                    let src = in_buf[i];
                    let y = (b0*src + b1*self.z1 + b2*self.z2 - a1*self.s1 - a2*self.s2) * inv_a0;
                    
                    // Shift delay lines
                    self.z2 = self.z1; self.z1 = src;
                    self.s2 = self.s1; self.s1 = y;
                    output[i] = y;
                }
            },

            // --- ADSR ENVELOPE ---
            NodeType::ADSR => {
                let att = self.params[0].max(0.001);
                let dec = self.params[1].max(0.001);
                let sus = self.params[2].max(0.0).min(1.0);
                let rel = self.params[3].max(0.001);
                let gate = self.params[4] > 0.5;

                let att_rate = 1.0 / (att * self.sample_rate);
                let dec_rate = 1.0 / (dec * self.sample_rate);
                let rel_rate = 1.0 / (rel * self.sample_rate);

                // State Machine: 0=Idle, 1=Att, 2=Dec, 3=Sus, 4=Rel
                if gate && self.state_machine == 0 { self.state_machine = 1; }
                if !gate && self.state_machine != 0 && self.state_machine != 4 { self.state_machine = 4; }

                for i in 0..BLOCK_SIZE {
                    match self.state_machine {
                        1 => { // Attack
                            self.env_val += att_rate;
                            if self.env_val >= 1.0 { self.env_val = 1.0; self.state_machine = 2; }
                        },
                        2 => { // Decay
                            self.env_val -= dec_rate;
                            if self.env_val <= sus { self.env_val = sus; self.state_machine = 3; }
                        },
                        3 => { // Sustain
                            self.env_val = sus;
                        },
                        4 => { // Release
                            self.env_val -= rel_rate;
                            if self.env_val <= 0.0 { self.env_val = 0.0; self.state_machine = 0; }
                        },
                        _ => { self.env_val = 0.0; }
                    }
                    output[i] = self.env_val;
                }
            },

            // --- DELAY ---
            NodeType::Delay => {
                let time = self.params[0].max(0.0);
                let feedback = self.params[1].min(0.95);
                let mix = self.params[2].max(0.0).min(1.0);
                
                let delay_samples = (time * self.sample_rate) as usize;
                let buf_len = self.delay_buf.len();
                if buf_len == 0 { return; } // Safety

                let in_buf = get_input(0);

                for i in 0..BLOCK_SIZE {
                    // Read from past
                    let read_idx = (self.write_ptr + buf_len - delay_samples) % buf_len;
                    let delayed_sample = self.delay_buf[read_idx];

                    // Input + Feedback
                    let src = in_buf[i];
                    let to_write = src + (delayed_sample * feedback);
                    
                    // Write to buffer
                    self.delay_buf[self.write_ptr] = to_write;
                    self.write_ptr = (self.write_ptr + 1) % buf_len;

                    // Output Mix
                    output[i] = (src * (1.0 - mix)) + (delayed_sample * mix);
                }
            },

            // --- GAIN / VCA ---
            NodeType::Gain => {
                let static_gain = if self.params[0] == 0.0 && self.inputs.len() > 1 { 0.0 } else { self.params[0] };
                let default_gain = if static_gain == 0.0 && self.inputs.len() == 1 { 1.0 } else { static_gain };
                
                let in_buf = get_input(0);
                let mod_buf = get_input(1); // Optional modulator (like an ADSR)
                
                let has_mod = self.inputs.len() > 1;

                for i in 0..BLOCK_SIZE {
                    let g = if has_mod { mod_buf[i] } else { default_gain };
                    output[i] = in_buf[i] * g;
                }
            },

            // --- ENVELOPE FOLLOWER ---
            NodeType::EnvFollower => {
                let att = self.params[0].max(0.001);
                let rel = self.params[1].max(0.001);
                let in_buf = get_input(0);

                let att_coef = (-1.0 / (att * self.sample_rate)).exp();
                let rel_coef = (-1.0 / (rel * self.sample_rate)).exp();

                for i in 0..BLOCK_SIZE {
                    let abs_in = in_buf[i].abs();
                    let coef = if abs_in > self.env_val { att_coef } else { rel_coef };
                    self.env_val = coef * self.env_val + (1.0 - coef) * abs_in;
                    output[i] = self.env_val;
                }
            },

            // --- COMPARATOR ---
            NodeType::Comparator => {
                let thresh = self.params[0];
                let in_buf = get_input(0);
                for i in 0..BLOCK_SIZE {
                    output[i] = if in_buf[i] > thresh { 1.0 } else { 0.0 };
                }
            },

            // --- MIXER ---
            NodeType::Mixer => {
                for id in &self.inputs {
                    if let Some(buf) = inputs.get(id) {
                        for i in 0..BLOCK_SIZE {
                            output[i] += buf[i];
                        }
                    }
                }
            },

            // --- MASTER OUTPUT ---
            NodeType::Master => {
                for id in &self.inputs {
                    if let Some(buf) = inputs.get(id) {
                        for i in 0..BLOCK_SIZE {
                            output[i] += buf[i];
                        }
                    }
                }
                // Soft clip for mastering
                for i in 0..BLOCK_SIZE {
                    let x = output[i];
                    output[i] = if x.abs() < 1.0 { x } else { x.signum() };
                }
            },

            _ => {} // Implement Mult, Constant, etc.
        }
    }
}

// --- MAIN ENGINE ---
#[wasm_bindgen]
pub struct AudioEngine {
    nodes: HashMap<u32, Node>,
    buffers: HashMap<u32, [f32; BLOCK_SIZE]>,
    order: Vec<u32>,
    sample_rate: f32,
}

#[wasm_bindgen]
impl AudioEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(sample_rate: f32) -> Self {
        Self {
            nodes: HashMap::new(),
            buffers: HashMap::new(),
            order: Vec::new(),
            sample_rate,
        }
    }

    // --- NODE MANAGEMENT ---
    pub fn add_node(&mut self, id: u32, type_id: u32) {
        let node_type = match type_id {
            0 => NodeType::Oscillator,
            1 => NodeType::Constant,
            10 => NodeType::Biquad,
            11 => NodeType::SVF,
            20 => NodeType::Gain,
            21 => NodeType::EnvFollower,
            22 => NodeType::Comparator,
            30 => NodeType::Delay,
            31 => NodeType::ADSR,
            40 => NodeType::Mixer,
            99 => NodeType::Master,
            _ => NodeType::Gain,
        };
        
        self.nodes.insert(id, Node::new(node_type, self.sample_rate));
        self.buffers.insert(id, [0.0; BLOCK_SIZE]);
        if !self.order.contains(&id) {
            self.order.push(id);
        }
    }

    pub fn connect(&mut self, source_id: u32, target_id: u32) {
        if let Some(node) = self.nodes.get_mut(&target_id) {
            if !node.inputs.contains(&source_id) {
                node.inputs.push(source_id);
                // Basic topological sort/reorder logic should ideally happen here 
                // to ensure source is processed before target.
                // For this V1, we rely on JS adding nodes in correct order or simple loop.
            }
        }
    }

    pub fn set_param(&mut self, id: u32, idx: usize, val: f32) {
        if let Some(node) = self.nodes.get_mut(&id) {
            if idx < 8 {
                node.params[idx] = val;
            }
        }
    }

    // --- AUDIO PROCESSING ---
    
    // JS calls this every frame
    pub fn process(&mut self, out_ptr: *mut f32) {
        // Iterate over nodes
        // (Cloning ID order to avoid borrow conflicts)
        let process_order = self.order.clone();

        for id in process_order {
            // Unsafe workaround to borrow self.nodes and self.buffers simultaneously
            // In pure Rust we'd use a Graph structure or slotmap, but for WASM
            // we do a swap-out dance to satisfy the borrow checker.
            if let Some(mut node) = self.nodes.remove(&id) {
                let mut my_out = [0.0; BLOCK_SIZE];
                node.process_block(&self.buffers, &mut my_out);
                self.buffers.insert(id, my_out);
                self.nodes.insert(id, node);
            }
        }

        // Copy MASTER node (ID 99) to output pointer
        unsafe {
            let out_slice = std::slice::from_raw_parts_mut(out_ptr, BLOCK_SIZE);
            if let Some(master_buf) = self.buffers.get(&99) {
                out_slice.copy_from_slice(master_buf);
            } else {
                out_slice.fill(0.0);
            }
        }
    }
}

// --- MEMORY MANAGEMENT FOR JS ---
#[wasm_bindgen]
pub fn alloc_buffer(size: usize) -> *mut f32 {
    let mut buf = Vec::with_capacity(size);
    let ptr = buf.as_mut_ptr();
    std::mem::forget(buf); // Prevent Rust from dropping this memory
    ptr
}