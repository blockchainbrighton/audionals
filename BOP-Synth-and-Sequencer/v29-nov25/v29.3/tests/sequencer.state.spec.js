import { describe, it, expect } from 'vitest'

import { projectState, initializeProject } from '../modules/sequencer/sequencer-state.js'

describe('sequencer state', () => {
  it('initializes a project with at least one sequence', () => {
    initializeProject()
    expect(Array.isArray(projectState.sequences)).toBe(true)
    expect(projectState.sequences.length).toBeGreaterThan(0)
  })
})
