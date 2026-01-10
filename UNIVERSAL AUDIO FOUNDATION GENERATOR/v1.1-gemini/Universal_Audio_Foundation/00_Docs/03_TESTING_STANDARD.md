# Universal Audio Foundation: Testing Standard v1.0

To ensure every component is "watertight," immutable, and ready for 50+ years of use on the blockchain, the following testing standards are mandatory. Every component (`impl.rs`) must contain a `tests` module implementing these checks.

## 1. Instantiation & Metadata Test
Ensures the component correctly describes itself to the host.
- **Goal:** Verify that `metadata()` returns the correct ID, Name, and Category.
- **Check:** Ensure input and output descriptor counts match the implementation.

## 2. Mathematical Accuracy Test
The core functional test.
- **Goal:** Verify the component produces the mathematically correct result for known inputs.
- **Check:** Hardcode at least 2-3 standard scenarios (e.g., for `Add`: `1.0 + 2.0 = 3.0`).

## 3. Bit-Determinism Test
Critical for blockchain consensus and verification.
- **Goal:** Ensure the component is deterministic (Same Input + Same State = Same Output).
- **Check:** 
    1. Process a signal.
    2. Call `reset()`.
    3. Process the *exact same* signal again.
    4. Assert that the outputs are bit-for-bit identical (`assert_eq!`).

## 4. Denormal Sanitization Test
Prevents CPU spikes (the "denormal bug") common in digital audio.
- **Goal:** Tiny floating point values (subnormals) must be handled gracefully or flushed to zero.
- **Check:** Pass an extremely small non-zero value (e.g., `1e-40`) to the process method. Verify the output is either a "Normal" float or a strict `0.0`.

## 5. Reset Integrity Test
Ensures no "memory leakage" between sessions.
- **Goal:** Verify that `reset()` returns internal state (buffers, accumulators) to the exact initial condition.
- **Check:** Compare the output of a freshly initialized node with a node that has been used and then reset.

## 6. Safety & Edge Case Test (Where Applicable)
- **Divide-by-Zero:** Components involving division or reciprocals must return `0.0` or a safe value instead of `Inf` or `NaN`.
- **Range Safety:** Verify that logic does not explode when inputs are at extreme ranges (e.g., `-1.0` or `1.0`).

---

## Example Test Harness (Rust)
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_determinism() {
        let mut node = MyNode::new();
        let inputs = [0.5, 0.5];
        let mut out1 = [0.0];
        let mut out2 = [0.0];
        
        node.process(&inputs, &mut out1, 44100.0);
        node.reset();
        node.process(&inputs, &mut out2, 44100.0);

        assert_eq!(out1, out2, "Component is non-deterministic!");
    }
}
```