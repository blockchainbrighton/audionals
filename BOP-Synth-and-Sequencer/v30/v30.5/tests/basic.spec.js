import { describe, it, expect } from 'vitest'

describe('environment sanity check', () => {
  it('runs a simple test', () => {
    expect(2 + 2).toBe(4)
  })
})
