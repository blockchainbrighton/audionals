import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('app init loader', () => {
  beforeEach(() => {
    globalThis.__BOP_DISABLE_AUTO_START__ = true
  })

  afterEach(() => {
    delete globalThis.__BOP_DISABLE_AUTO_START__
  })

  it('exposes startSequencerApp without auto-start side effects', async () => {
    const mod = await import('../modules/app-init.js')
    expect(typeof mod.startSequencerApp).toBe('function')
  })
})
