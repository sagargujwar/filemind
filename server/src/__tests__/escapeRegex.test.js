import { describe, it, expect } from 'vitest'
import { escapeRegex, hasWord } from '../utils/escapeRegex.js'

describe('escapeRegex', () => {
  it('escapes special regex characters', () => {
    expect(escapeRegex('file.txt')).toBe('file\\.txt')
    expect(escapeRegex('price: $5.00')).toBe('price: \\$5\\.00')
    expect(escapeRegex('a+b*c')).toBe('a\\+b\\*c')
    expect(escapeRegex('test (1)')).toBe('test \\(1\\)')
    expect(escapeRegex('[brackets]')).toBe('\\[brackets\\]')
    expect(escapeRegex('a|b')).toBe('a\\|b')
    expect(escapeRegex('a^b')).toBe('a\\^b')
  })

  it('returns plain strings unchanged', () => {
    expect(escapeRegex('hello')).toBe('hello')
    expect(escapeRegex('file123')).toBe('file123')
    expect(escapeRegex('')).toBe('')
  })
})

describe('hasWord', () => {
  it('matches whole words', () => {
    expect(hasWord('the cat sat', 'cat')).toBe(true)
    expect(hasWord('the cat sat', 'cats')).toBe(false)
    expect(hasWord('the cat sat', 'ca')).toBe(false)
  })

  it('normalizes underscores to spaces', () => {
    expect(hasWord('man_eating.png', 'man')).toBe(true)
    expect(hasWord('man_eating.png', 'eating')).toBe(true)
    expect(hasWord('my_file_name', 'file')).toBe(true)
  })

  it('is case insensitive', () => {
    expect(hasWord('Hello World', 'hello')).toBe(true)
    expect(hasWord('HELLO WORLD', 'hello')).toBe(true)
    expect(hasWord('Hello World', 'HELLO')).toBe(true)
  })

  it('handles special characters in words', () => {
    expect(hasWord('price is 5.00 dollars', '5.00')).toBe(true)
    expect(hasWord('test done now', 'done')).toBe(true)
  })

  it('returns false for empty inputs', () => {
    expect(hasWord('', 'test')).toBe(false)
  })
})
