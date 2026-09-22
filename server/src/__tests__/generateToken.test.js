import { describe, it, expect, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'
import { generateToken, setTokenCookie } from '../utils/generateToken.js'

describe('generateToken', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key'
    process.env.JWT_EXPIRES_IN = '7d'
  })

  it('returns a string', () => {
    const token = generateToken('user123')
    expect(typeof token).toBe('string')
  })

  it('returns a valid JWT', () => {
    const token = generateToken('user123')
    const decoded = jwt.verify(token, 'test-secret-key')
    expect(decoded.id).toBe('user123')
  })

  it('includes expiration', () => {
    const token = generateToken('user123')
    const decoded = jwt.verify(token, 'test-secret-key')
    expect(decoded.exp).toBeDefined()
    expect(decoded.iat).toBeDefined()
    expect(decoded.exp).toBeGreaterThan(decoded.iat)
  })

  it('uses default expiration when not set', () => {
    delete process.env.JWT_EXPIRES_IN
    const token = generateToken('user123')
    const decoded = jwt.verify(token, 'test-secret-key')
    expect(decoded.exp).toBeDefined()
  })
})

describe('setTokenCookie', () => {
  it('sets cookie on response', () => {
    const cookies = {}
    const res = {
      cookie: (name, value, options) => {
        cookies[name] = { value, options }
      }
    }

    setTokenCookie(res, 'test-token')
    expect(cookies.token).toBeDefined()
    expect(cookies.token.value).toBe('test-token')
    expect(cookies.token.options.httpOnly).toBe(true)
  })

  it('sets secure flag in production', () => {
    process.env.NODE_ENV = 'production'
    const cookies = {}
    const res = {
      cookie: (name, value, options) => {
        cookies[name] = { value, options }
      }
    }

    setTokenCookie(res, 'test-token')
    expect(cookies.token.options.secure).toBe(true)
    expect(cookies.token.options.sameSite).toBe('strict')
  })

  it('does not set secure flag in development', () => {
    process.env.NODE_ENV = 'development'
    const cookies = {}
    const res = {
      cookie: (name, value, options) => {
        cookies[name] = { value, options }
      }
    }

    setTokenCookie(res, 'test-token')
    expect(cookies.token.options.secure).toBe(false)
    expect(cookies.token.options.sameSite).toBe('lax')
  })
})
