
# Refactoring Guidelines

**ES2024+**
- Prefer const/let, arrow functions, optional chaining, nullish coalescing
- Named exports over default when practical

**State & Events**
- Keep sequencer state serializable; UI state separate
- Centralize events (typed payload shapes in one module)

**Tone.js Safety Patterns**
- Unlock audio before graph creation
- Ramped parameter changes only; avoid setValueNow-ish updates
- Tail-aware disposal; never dispose while node is audible

**Docs & Comments**
- Each module top: responsibility, inputs/outputs, side effects
- Update this docs set alongside changes
