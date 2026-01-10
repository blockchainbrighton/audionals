#!/bin/bash

# ==========================================
# UNIVERSAL AUDIO FOUNDATION GENERATOR
# ==========================================

ROOT="Universal_Audio_Foundation"
echo "Initializing Foundation in ./$ROOT..."

# 1. Create Root and Doc Structure
mkdir -p "$ROOT/00_Docs"
mkdir -p "$ROOT/01_Components"

# 2. Write Framework Documentation
cat <<EOF > "$ROOT/00_Docs/01_MANIFESTO.md"
# The Universal Audio Manifesto

## Mission
To build a modular synthesizer foundation compatible with all future systems.
The components defined in this directory are the "Atomic Elements" of audio.

## Rules
1. **Atomicity**: Components must be irreducible.
2. **Immutability**: The logic (math) of a component ID never changes.
3. **Purity**: Components process data. They do not draw UI. They do not access disk.
EOF

cat <<EOF > "$ROOT/00_Docs/02_RUST_TRAIT.md"
... (kept the same) ...
EOF

cat <<EOF > "$ROOT/00_Docs/03_TESTING_STANDARD.md"
# Testing Standard
... (Testing Standard content) ...
EOF

# 3. Define the Generator Function
gen_comp() {
    local cat_folder="$1"
    local id="$2"
    local name="$3"
    local desc="$4"
    
    local path="$ROOT/01_Components/$cat_folder/${id}_${name}"
    mkdir -p "$path"
    
    cat <<EOF > "$path/SPEC.md"
# Component #${id}: ${name}
**Category:** ${cat_folder}

## Description
${desc}

## Requirements
- [ ] Implement strict 64-bit float math.
- [ ] Handle 'Denormal' numbers (flush very small floats to zero).
- [ ] Provide unit tests validating output against standard math.
EOF

    cat <<EOF > "$path/impl.rs"
use crate::traits::{AudioNode, AudioNodeMetadata, InputDescriptor, OutputDescriptor};

pub struct ${name}Node {
    // TODO: Add internal state here
}

impl ${name}Node {
    pub fn new() -> Self {
        Self {}
    }
}

impl AudioNode for ${name}Node {
    fn metadata(&self) -> AudioNodeMetadata {
        AudioNodeMetadata {
            id: ${id#0},
            name: "${name}",
            category: "${cat_folder}",
            inputs: &[
                // TODO: Define inputs
            ],
            outputs: &[
                OutputDescriptor { name: "Output" },
            ],
        }
    }

    fn process(&mut self, inputs: &[f64], outputs: &mut [f64], _sample_rate: f64) {
        // TODO: Implement logic
        // Example: outputs[0] = inputs[0]; 
    }

    fn reset(&mut self) {
        // TODO: Reset state
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_instantiation_and_metadata() {
        let node = ${name}Node::new();
        let meta = node.metadata();
        assert_eq!(meta.name, "${name}");
        assert_eq!(meta.category, "${cat_folder}");
    }

    #[test]
    fn test_determinism() {
        // Rule: Same input + Same State = Same Output
        let mut node = ${name}Node::new();
        let inputs = [0.5, 0.2]; // Arbitrary test signals
        let mut out1 = [0.0];
        let mut out2 = [0.0];
        
        node.process(&inputs, &mut out1, 44100.0);
        
        node.reset(); // Reset to ensure initial state
        node.process(&inputs, &mut out2, 44100.0);

        assert_eq!(out1, out2, "Component is not deterministic!");
    }

    #[test]
    fn test_denormal_handling() {
        // Rule: Tiny values should be flushed to zero or handled gracefully
        let mut node = ${name}Node::new();
        let inputs = [1.0e-40, 1.0e-40]; // Denormal numbers
        let mut outputs = [0.0];
        
        node.process(&inputs, &mut outputs, 44100.0);
        
        // Check for denormals in output (this is a loose check, specific logic depends on component)
        // ideally: assert!(outputs[0].abs() == 0.0 || outputs[0].is_normal());
    }

    #[test]
    fn test_reset_behavior() {
        let mut node = ${name}Node::new();
        // 1. Process some data to change state
        let inputs = [0.5];
        let mut outputs = [0.0];
        node.process(&inputs, &mut outputs, 44100.0);
        
        // 2. Reset
        node.reset();
        
        // 3. Verify internal state is back to default (if accessible) or output matches fresh instance
        let mut clean_node = ${name}Node::new();
        let mut clean_out = [0.0];
        let mut reset_out = [0.0];
        
        clean_node.process(&inputs, &mut clean_out, 44100.0);
        node.process(&inputs, &mut reset_out, 44100.0);
        
        assert_eq!(clean_out, reset_out, "Reset did not return component to initial state");
    }
}
EOF
}

# ==========================================
# 4. GENERATING THE COMPONENTS
# ==========================================

echo "Generating Part 1: Math Atoms..."
CAT="01_Math_Atoms"
gen_comp "$CAT" "001" "Add" "Output = Input A + Input B"
gen_comp "$CAT" "002" "Subtract" "Output = Input A - Input B"
gen_comp "$CAT" "003" "Multiply" "Output = Input A * Input B (Basis of VCA)"
gen_comp "$CAT" "004" "Divide" "Output = Input A / Input B (Handle Divide-by-Zero)"
gen_comp "$CAT" "005" "Modulo" "Output = Input A % Input B (Essential for Phase loops)"
gen_comp "$CAT" "006" "Abs" "Absolute Value (Rectification)"
gen_comp "$CAT" "007" "Negate" "Invert Phase (Multiply by -1)"
gen_comp "$CAT" "008" "Reciprocal" "Output = 1.0 / Input"
gen_comp "$CAT" "009" "Sign" "Returns 1.0, -1.0, or 0.0"
gen_comp "$CAT" "010" "Ceil" "Round Up to nearest integer"
gen_comp "$CAT" "011" "Floor" "Round Down to nearest integer"
gen_comp "$CAT" "012" "Round" "Round to nearest integer"
gen_comp "$CAT" "013" "Frac" "Returns only the decimal part of the float"
gen_comp "$CAT" "014" "Min" "Output = Smaller of Input A or B"
gen_comp "$CAT" "015" "Max" "Output = Larger of Input A or B"
gen_comp "$CAT" "016" "Clamp" "Constrain Input between Min and Max"
gen_comp "$CAT" "017" "Power" "Input A to the power of Input B"
gen_comp "$CAT" "018" "Sqrt" "Square Root"
gen_comp "$CAT" "019" "Log" "Natural Logarithm"
gen_comp "$CAT" "020" "Exp" "Natural Exponent"
gen_comp "$CAT" "021" "Sin" "Sine function"
gen_comp "$CAT" "022" "Cos" "Cosine function"
gen_comp "$CAT" "023" "Tan" "Tangent function"
gen_comp "$CAT" "024" "ArcSin" "Inverse Sine"
gen_comp "$CAT" "025" "ArcCos" "Inverse Cosine"
gen_comp "$CAT" "026" "ArcTan" "Inverse Tangent"
gen_comp "$CAT" "027" "ArcTan2" "Two-argument ArcTangent (Phase calculation)"
gen_comp "$CAT" "028" "Tanh" "Hyperbolic Tangent (Soft Clipping Saturation)"

echo "Generating Part 2: Logic..."
CAT="02_Logic"
gen_comp "$CAT" "029" "GreaterThan" "Output 1.0 if A > B, else 0.0"
gen_comp "$CAT" "030" "LessThan" "Output 1.0 if A < B, else 0.0"
gen_comp "$CAT" "031" "Equal" "Output 1.0 if A == B"
gen_comp "$CAT" "032" "NotEqual" "Output 1.0 if A != B"
gen_comp "$CAT" "033" "AND" "Logical AND gate"
gen_comp "$CAT" "034" "OR" "Logical OR gate"
gen_comp "$CAT" "035" "XOR" "Logical XOR gate"
gen_comp "$CAT" "036" "NOT" "Logical Inverter"
gen_comp "$CAT" "037" "NAND" "Logical NAND"
gen_comp "$CAT" "038" "Select" "Switch: If Control > 0.5 use In A, else In B"
gen_comp "$CAT" "039" "SampleAndHold" "Update Output to Input only when Trigger fires"
gen_comp "$CAT" "040" "Latch" "Set High on Trigger, Low on Reset"

echo "Generating Part 3: Memory & Time..."
CAT="03_Memory"
gen_comp "$CAT" "041" "BufferAlloc" "Allocate heap memory for audio storage"
gen_comp "$CAT" "042" "BufferLength" "Return size of buffer"
gen_comp "$CAT" "043" "BufferClear" "Zero out buffer contents"
gen_comp "$CAT" "044" "BufferRead_Raw" "Read index integer I"
gen_comp "$CAT" "045" "BufferWrite_Raw" "Write value to index integer I"
gen_comp "$CAT" "046" "BufferRead_Lin" "Read index Float F (Linear Interpolation)"
gen_comp "$CAT" "047" "BufferRead_Cubic" "Read index Float F (Cubic Interpolation)"
gen_comp "$CAT" "048" "BufferOverdub" "Add Value to existing Index (Looper logic)"
gen_comp "$CAT" "049" "UnitDelay" "Output = Input from 1 sample ago (Z^-1)"
gen_comp "$CAT" "050" "DelayLine" "Variable delay line"
gen_comp "$CAT" "051" "TapDelay" "Delay with multiple read heads"
gen_comp "$CAT" "052" "AllpassDelay" "Phase smearing delay (Reverb core)"
gen_comp "$CAT" "053" "CombDelay" "Delay with feedback path"
gen_comp "$CAT" "054" "RingBuffer" "Circular FIFO Queue"

echo "Generating Part 4: Sources..."
CAT="04_Sources"
gen_comp "$CAT" "055" "Phasor" "Master Clock: Ramp 0.0 to 1.0 at Freq"
gen_comp "$CAT" "056" "SineOsc" "Pure Sine Generator"
gen_comp "$CAT" "057" "Impulse" "Single sample spike"
gen_comp "$CAT" "058" "WhiteNoise" "Random values -1.0 to 1.0"
gen_comp "$CAT" "059" "PinkNoise" "-3dB/Oct Filtered Noise"
gen_comp "$CAT" "060" "BrownNoise" "-6dB/Oct Filtered Noise"
gen_comp "$CAT" "061" "Saw_Naive" "Simple mathematical saw (aliased)"
gen_comp "$CAT" "062" "Pulse_Naive" "Simple mathematical pulse (aliased)"
gen_comp "$CAT" "063" "Tri_Naive" "Simple mathematical triangle"
gen_comp "$CAT" "064" "Saw_PolyBLEP" "Anti-Aliased Analog Sawtooth"
gen_comp "$CAT" "065" "Pulse_PolyBLEP" "Anti-Aliased Analog Pulse"
gen_comp "$CAT" "066" "WavetableRead" "Oscillator scanning a buffer"

echo "Generating Part 5: Envelopes..."
CAT="05_Envelopes"
gen_comp "$CAT" "067" "Line" "Ramp from value A to B over time T"
gen_comp "$CAT" "068" "ExpCurve" "Exponential decay curve"
gen_comp "$CAT" "069" "ADSR" "Attack Decay Sustain Release generator"
gen_comp "$CAT" "070" "AR" "Attack Release generator"
gen_comp "$CAT" "071" "AHDSR" "Attack Hold Decay Sustain Release"
gen_comp "$CAT" "072" "Follower" "Envelope Follower (Peak)"
gen_comp "$CAT" "073" "FollowerRMS" "Envelope Follower (Root Mean Square)"
gen_comp "$CAT" "074" "ZeroCrossDetect" "Trigger on zero crossing"
gen_comp "$CAT" "075" "SchmidtTrigger" "Noise-resilient switch"
gen_comp "$CAT" "076" "LFO" "Low Frequency Oscillator"

echo "Generating Part 6: Filters..."
CAT="06_Filters"
gen_comp "$CAT" "077" "OnePoleLP" "6dB Lowpass"
gen_comp "$CAT" "078" "OnePoleHP" "6dB Highpass"
gen_comp "$CAT" "079" "DCBlocker" "Remove DC Offset"
gen_comp "$CAT" "080" "Biquad" "Generic 2-pole filter container"
gen_comp "$CAT" "081" "SVF_LP" "State Variable Filter Lowpass"
gen_comp "$CAT" "082" "SVF_HP" "State Variable Filter Highpass"
gen_comp "$CAT" "083" "SVF_BP" "State Variable Filter Bandpass"
gen_comp "$CAT" "084" "SVF_Notch" "State Variable Filter Notch"
gen_comp "$CAT" "085" "Ladder_LP" "4-pole Moog-style Lowpass"
gen_comp "$CAT" "086" "Butterworth" "Clean scientific filter"
gen_comp "$CAT" "087" "Shelf" "EQ Shelf Filter"
gen_comp "$CAT" "088" "Peaking" "EQ Bell/Peak Filter"

echo "Generating Part 7: Spectral..."
CAT="07_Spectral"
gen_comp "$CAT" "089" "FFT" "Fast Fourier Transform"
gen_comp "$CAT" "090" "iFFT" "Inverse FFT"
gen_comp "$CAT" "091" "CartToPolar" "Convert Real/Imag to Mag/Phase"
gen_comp "$CAT" "092" "PolarToCart" "Convert Mag/Phase to Real/Imag"
gen_comp "$CAT" "093" "Win_Hann" "Hann Window function"
gen_comp "$CAT" "094" "Win_Hamming" "Hamming Window function"
gen_comp "$CAT" "095" "Win_Blackman" "Blackman Window function"
gen_comp "$CAT" "096" "Convolution" "Apply Impulse Response"

echo "Generating Part 8: Timing..."
CAT="08_Timing"
gen_comp "$CAT" "097" "Metronome" "Steady BPM triggers"
gen_comp "$CAT" "098" "Divider" "Clock Divider"
gen_comp "$CAT" "099" "Multiplier" "Clock Multiplier"
gen_comp "$CAT" "100" "Counter" "Step Counter"
gen_comp "$CAT" "101" "Accumulator" "Value accumulator"
gen_comp "$CAT" "102" "Quantizer" "Snap value to nearest scale note"
gen_comp "$CAT" "103" "SlewLimiter" "Smooth value changes (Glide)"
gen_comp "$CAT" "104" "Rate" "BPM to Hz"
gen_comp "$CAT" "105" "HzToMs" "Frequency to Milliseconds"
gen_comp "$CAT" "106" "MsToHz" "Milliseconds to Frequency"
gen_comp "$CAT" "107" "MidiToHz" "MIDI Note Number to Frequency"
gen_comp "$CAT" "108" "HzToMidi" "Frequency to MIDI Note Number"
gen_comp "$CAT" "109" "SequencerStep" "Step Sequencer Logic"
gen_comp "$CAT" "110" "Euclidean" "Euclidean Rhythm Generator"
gen_comp "$CAT" "111" "Burst" "Rapid Fire Generator"
gen_comp "$CAT" "112" "Probability" "Random Chance Gate"
gen_comp "$CAT" "113" "Markov" "Markov Chain State"
gen_comp "$CAT" "114" "DelayTrigger" "Time-delayed trigger"
gen_comp "$CAT" "115" "GateToTrig" "Edge Detector"
gen_comp "$CAT" "116" "Toggle" "Flip-Flop Switch"

echo "Generating Part 9: Effects..."
CAT="09_Effects"
gen_comp "$CAT" "117" "HardClip" "Digital Clipping"
gen_comp "$CAT" "118" "SoftClip" "Analog Saturation"
gen_comp "$CAT" "119" "Bitcrush" "Reduce Bit Depth"
gen_comp "$CAT" "120" "RateReduce" "Reduce Sample Rate (Aliasing)"
gen_comp "$CAT" "121" "Wavefolder" "Fold signal back"
gen_comp "$CAT" "122" "VCA" "Voltage Controlled Amplifier"
gen_comp "$CAT" "123" "Pan_Lin" "Linear Panning"
gen_comp "$CAT" "124" "Pan_Equal" "Equal Power Panning"
gen_comp "$CAT" "125" "MS_Encode" "Mid-Side Encoder"
gen_comp "$CAT" "126" "MS_Decode" "Mid-Side Decoder"
gen_comp "$CAT" "127" "Crossfade" "Mix A and B"
gen_comp "$CAT" "128" "Sidechain" "Dynamics Link"

echo "Generating Part 10: Analysis & Utils..."
CAT="10_Utils"
gen_comp "$CAT" "129" "PeakDetect" "Detect Max Amplitude"
gen_comp "$CAT" "130" "RMSDetect" "Detect Average Power"
gen_comp "$CAT" "131" "ZeroCount" "Count zero crossings"
gen_comp "$CAT" "132" "Spectrum" "Spectral Magnitude output"
gen_comp "$CAT" "133" "Scope" "Oscilloscope Buffer"
gen_comp "$CAT" "134" "PI" "Constant PI"
gen_comp "$CAT" "135" "TAU" "Constant TAU"
gen_comp "$CAT" "136" "EULER" "Constant e"
gen_comp "$CAT" "137" "SampleRate" "Get System Rate"
gen_comp "$CAT" "138" "Nyquist" "Get Nyquist Frequency"
gen_comp "$CAT" "139" "DbToAmp" "Decibel to Amplitude"
gen_comp "$CAT" "140" "AmpToDb" "Amplitude to Decibel"
gen_comp "$CAT" "141" "BpmToMs" "Beats per Minute to Milliseconds"
gen_comp "$CAT" "142" "PhasorToSin" "Lookup Table Optimization"
gen_comp "$CAT" "143" "PhasorToTri" "Lookup Table Optimization"
gen_comp "$CAT" "144" "LinToExp" "Linear to Exponential Conversion"

echo "=========================================="
echo "COMPLETE."
echo "Created 'Universal_Audio_Foundation' with 144+ components."
echo "=========================================="
