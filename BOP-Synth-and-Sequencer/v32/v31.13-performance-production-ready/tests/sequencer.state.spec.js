import { describe, it, expect } from 'vitest';

import { projectState, initializeProject } from '../modules/sequencer/sequencer-state.js';

describe('sequencer state', () => {
  it('initializes a project with at least one sequence', () => {
    initializeProject();
    expect(Array.isArray(projectState.sequences)).toBe(true);
    expect(projectState.sequences.length).toBeGreaterThan(0);
  });

  it.todo('toggles step selection without mutating unrelated channels');
  it.todo('records undo snapshots when mutating transport state');
  it.todo('restores last active sequence after undo/redo navigation');
});
