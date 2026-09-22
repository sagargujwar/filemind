import { describe, it, expect } from 'vitest'
import { cosineSimilarity, expandQuery, buildFileEmbeddingText } from '../services/embeddingService.js'

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBe(1)
    expect(cosineSimilarity([3, 4], [3, 4])).toBe(1)
  })

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0)
  })

  it('returns value between -1 and 1', () => {
    const result = cosineSimilarity([1, 2, 3], [4, 5, 6])
    expect(result).toBeGreaterThan(-1)
    expect(result).toBeLessThanOrEqual(1)
  })

  it('returns 0 for zero vectors', () => {
    expect(cosineSimilarity([0, 0], [1, 2])).toBe(0)
    expect(cosineSimilarity([1, 2], [0, 0])).toBe(0)
    expect(cosineSimilarity([0, 0], [0, 0])).toBe(0)
  })

  it('returns 0 for mismatched lengths', () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0)
  })

  it('returns 0 for null/undefined inputs', () => {
    expect(cosineSimilarity(null, [1, 2])).toBe(0)
    expect(cosineSimilarity([1, 2], null)).toBe(0)
    expect(cosineSimilarity(undefined, [1, 2])).toBe(0)
  })

  it('handles negative values', () => {
    const result = cosineSimilarity([1, -1], [1, -1])
    expect(result).toBeCloseTo(1)
  })
})

describe('expandQuery', () => {
  it('expands known synonyms', () => {
    const result = expandQuery('game')
    expect(result).toContain('game')
    expect(result).toContain('gaming')
    expect(result).toContain('gamer')
    expect(result).toContain('play')
  })

  it('expands multiple words', () => {
    const result = expandQuery('game chat')
    expect(result).toContain('game')
    expect(result).toContain('chat')
    expect(result).toContain('gaming')
    expect(result).toContain('messaging')
  })

  it('returns original word if no synonyms found', () => {
    const result = expandQuery('xyznotaword')
    expect(result).toContain('xyznotaword')
    expect(result.length).toBe(1)
  })

  it('deduplicates results', () => {
    const result = expandQuery('find search')
    const unique = [...new Set(result)]
    expect(result.length).toBe(unique.length)
  })

  it('handles empty input', () => {
    const result = expandQuery('')
    expect(Array.isArray(result)).toBe(true)
  })

  it('is case insensitive', () => {
    const result = expandQuery('GAME')
    expect(result).toContain('game')
    expect(result).toContain('gaming')
  })
})

describe('buildFileEmbeddingText', () => {
  it('includes originalName', () => {
    const text = buildFileEmbeddingText({ originalName: 'test.png', extension: '.png' })
    expect(text).toContain('test.png')
  })

  it('includes generatedName when different from originalName', () => {
    const text = buildFileEmbeddingText({
      originalName: 'screenshot.png',
      generatedName: 'my_screenshot.png',
      extension: '.png'
    })
    expect(text).toContain('my_screenshot.png')
  })

  it('excludes generatedName when same as originalName', () => {
    const text = buildFileEmbeddingText({
      originalName: 'test.png',
      generatedName: 'test.png',
      extension: '.png'
    })
    expect(text.split('test.png').length).toBe(2)
  })

  it('includes description', () => {
    const text = buildFileEmbeddingText({
      originalName: 'test.png',
      description: 'A test image',
      extension: '.png'
    })
    expect(text).toContain('A test image')
  })

  it('includes tags joined by space', () => {
    const text = buildFileEmbeddingText({
      originalName: 'test.png',
      tags: ['screenshot', 'code', 'python'],
      extension: '.png'
    })
    expect(text).toContain('screenshot code python')
  })

  it('includes category when provided', () => {
    const text = buildFileEmbeddingText(
      { originalName: 'test.png', extension: '.png' },
      'Screenshots'
    )
    expect(text).toContain('Category: Screenshots')
  })

  it('excludes category when empty', () => {
    const text = buildFileEmbeddingText(
      { originalName: 'test.png', extension: '.png' },
      ''
    )
    expect(text).not.toContain('Category:')
  })

  it('includes file extension', () => {
    const text = buildFileEmbeddingText({ originalName: 'test.pdf', extension: '.pdf' })
    expect(text).toContain('File type: .pdf')
  })

  it('handles minimal file object', () => {
    const text = buildFileEmbeddingText({ originalName: 'file.png' })
    expect(text).toContain('file.png')
  })
})
