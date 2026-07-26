import { describe, it, expect } from 'vitest'
import { capitalize, toCamelCase, fibonacci } from './utils'

describe('capitalize', () => {
  it('should capitalize the first letter', () => {
    expect(capitalize('hello')).toBe('Hello')
    expect(capitalize('world')).toBe('World')
  })

  it('should return empty string for empty input', () => {
    expect(capitalize('')).toBe('')
  })

  it('should not change already capitalized strings', () => {
    expect(capitalize('Hello')).toBe('Hello')
  })
})

describe('toCamelCase', () => {
  it('should convert kebab-case to camelCase', () => {
    expect(toCamelCase('hello-world')).toBe('helloWorld')
    expect(toCamelCase('foo-bar-baz')).toBe('fooBarBaz')
  })

  it('should handle single words', () => {
    expect(toCamelCase('hello')).toBe('hello')
  })

  it('should handle empty string', () => {
    expect(toCamelCase('')).toBe('')
  })
})

describe('fibonacci', () => {
  it('should return 0 for n=0', () => {
    expect(fibonacci(0)).toBe(0)
  })

  it('should return 1 for n=1', () => {
    expect(fibonacci(1)).toBe(1)
  })

  it('should compute fibonacci correctly', () => {
    expect(fibonacci(2)).toBe(1)
    expect(fibonacci(3)).toBe(2)
    expect(fibonacci(4)).toBe(3)
    expect(fibonacci(5)).toBe(5)
    expect(fibonacci(6)).toBe(8)
    expect(fibonacci(10)).toBe(55)
  })

  it('should throw error for negative numbers', () => {
    expect(() => fibonacci(-1)).toThrow('n must be non-negative')
  })
})
