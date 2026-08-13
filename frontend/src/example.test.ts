import { describe, expect, it } from 'vitest'

// Sample test proving the Vitest setup works end to end (SCRUM-19).
// Component/DOM testing arrives separately in SCRUM-43.
function add(a: number, b: number) {
  return a + b
}

describe('example', () => {
  it('adds two numbers', () => {
    expect(add(2, 3)).toBe(5)
  })
})
