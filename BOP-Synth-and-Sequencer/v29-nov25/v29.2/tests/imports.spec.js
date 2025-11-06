import { describe, it, expect } from 'vitest'

describe('module imports', () => {
  it('imports the sequencer entry without executing the DOM', async () => {
    const mod = await import('../modules/sequencer/sequencer-main.js')
    expect(typeof mod.startSequencerApp).toBe('function')
  })
})
