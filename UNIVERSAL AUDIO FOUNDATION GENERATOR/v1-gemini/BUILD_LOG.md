# Universal Audio Foundation - Build Log
Track the implementation status of all components here.

## Status Legend
- [ ] Pending
- [x] Implemented & Verified

## 01_Math_Atoms
- [x] 001_Add
- [x] 002_Subtract
- [x] 003_Multiply
- [x] 004_Divide
- [x] 005_Modulo
- [x] 006_Abs
- [x] 007_Negate
- [x] 008_Reciprocal
- [x] 009_Sign
- [x] 010_Ceil
- [x] 011_Floor
- [x] 012_Round
- [x] 013_Frac
- [x] 014_Min
- [x] 015_Max
- [x] 016_Clamp
- [x] 017_Power
- [x] 018_Sqrt
- [x] 019_Log
- [x] 020_Exp
- [x] 021_Sin
- [x] 022_Cos
- [x] 023_Tan
- [x] 024_ArcSin
- [x] 025_ArcCos
- [x] 026_ArcTan
- [x] 027_ArcTan2
- [x] 028_Tanh

## 02_Logic
- [x] 029_GreaterThan
- [x] 030_LessThan
- [x] 031_Equal
- [x] 032_NotEqual
- [x] 033_AND
- [x] 034_OR
- [x] 035_XOR
- [x] 036_NOT
- [x] 037_NAND
- [x] 038_Select
- [x] 039_SampleAndHold
- [x] 040_Latch

## 03_Memory
- [x] 041_BufferAlloc
- [x] 042_BufferLength
- [x] 043_BufferClear
- [x] 044_BufferRead_Raw
- [x] 045_BufferWrite_Raw
- [x] 046_BufferRead_Lin
- [x] 047_BufferRead_Cubic
- [x] 048_BufferOverdub
- [x] 049_UnitDelay
- [x] 050_DelayLine
- [x] 051_TapDelay
- [x] 052_AllpassDelay
- [x] 053_CombDelay
- [x] 054_RingBuffer

## 04_Sources
- [x] 055_Phasor
- [x] 056_SineOsc
- [x] 057_Impulse
- [x] 058_WhiteNoise
- [x] 059_PinkNoise
- [x] 060_BrownNoise
- [x] 061_Saw_Naive
- [x] 062_Pulse_Naive
- [x] 063_Tri_Naive
- [x] 064_Saw_PolyBLEP
- [x] 065_Pulse_PolyBLEP
- [x] 066_WavetableRead

## 05_Envelopes
- [x] 067_Line
- [x] 068_ExpCurve
- [x] 069_ADSR
- [x] 070_AR
- [x] 071_AHDSR
- [x] 072_Follower
- [x] 073_FollowerRMS
- [x] 074_ZeroCrossDetect
- [x] 075_SchmidtTrigger
- [x] 076_LFO

## 06_Filters
- [x] 077_OnePoleLP
- [x] 078_OnePoleHP
- [x] 079_DCBlocker
- [x] 080_Biquad
- [x] 081_SVF_LP
- [x] 082_SVF_HP
- [x] 083_SVF_BP
- [x] 084_SVF_Notch
- [x] 085_Ladder_LP
- [x] 086_Butterworth
- [x] 087_Shelf
- [x] 088_Peaking

## 07_Spectral
- [x] 089_FFT
- [x] 090_iFFT
- [x] 091_CartToPolar
- [x] 092_PolarToCart
- [x] 093_Win_Hann
- [x] 094_Win_Hamming
- [x] 095_Win_Blackman
- [x] 096_Convolution

## 08_Timing
- [x] 097_Metronome
- [x] 098_Divider
- [x] 099_Multiplier
- [x] 100_Counter
- [x] 101_Accumulator
- [x] 102_Quantizer
- [x] 103_SlewLimiter
- [x] 104_Rate
- [x] 105_HzToMs
- [x] 106_MsToHz
- [x] 107_MidiToHz
- [x] 108_HzToMidi
- [x] 109_SequencerStep
- [x] 110_Euclidean
- [x] 111_Burst
- [x] 112_Probability
- [x] 113_Markov
- [x] 114_DelayTrigger
- [x] 115_GateToTrig
- [x] 116_Toggle

## 09_Effects
- [x] 117_HardClip
- [x] 118_SoftClip
- [x] 119_Bitcrush
- [x] 120_RateReduce
- [x] 121_Wavefolder
- [x] 122_VCA
- [x] 123_Pan_Lin
- [x] 124_Pan_Equal
- [x] 125_MS_Encode
- [x] 126_MS_Decode
- [x] 127_Crossfade
- [x] 128_Sidechain

## 10_Utils
- [x] 129_PeakDetect
- [x] 130_RMSDetect
- [x] 131_ZeroCount
- [x] 132_Spectrum
- [x] 133_Scope
- [x] 134_PI
- [x] 135_TAU
- [x] 136_EULER
- [x] 137_SampleRate
- [x] 138_Nyquist
- [x] 139_DbToAmp
- [x] 140_AmpToDb
- [x] 141_BpmToMs
- [x] 142_PhasorToSin
- [x] 143_PhasorToTri
- [x] 144_LinToExp

