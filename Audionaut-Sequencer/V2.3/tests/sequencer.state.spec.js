import { describe, it, expect } from 'vitest';

import { projectState, initializeProject } from '../modules/sequencer/sequencer-state.js';

describe('sequencer state', () => {
  it('initializes a project with at least one sequence', () => {
    initializeProject();
    expect(Array.isArray(projectState.sequences)).toBe(true);
    expect(projectState.sequences.length).toBeGreaterThan(0);
  });

  it('toggles step selection without mutating unrelated channels', () => {
    initializeProject();
    const sequence = projectState.sequences[0];
    const channel1 = sequence.channels[0];
    const channel2 = sequence.channels[1];

    // Take a snapshot of channel2's steps before any mutation.
    const originalChannel2Steps = [...channel2.steps];

    // Toggle a step on channel1.
    channel1.steps[0] = !channel1.steps[0];

    // Check that channel2's steps remain unchanged.
    expect(channel2.steps).toEqual(originalChannel2Steps);
  });
  
  it.todo('records undo snapshots when mutating transport state');
  it.todo('restores last active sequence after undo/redo navigation');
});
