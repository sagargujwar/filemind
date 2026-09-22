import jwt from 'jsonwebtoken'

function parseExpiresToMs(expiresIn) {
  const match = expiresIn.match(/^(\d+)(s|m|h|d)$/i)
  if (!match) return 7 * 24 * 60 * 60 * 1000
  const value = parseInt(match[1], 10)
  const unit = match[2].toLowerCase()
  switch (unit) {
    case 's': return value * 1000
    case 'm': return value * 60 * 1000
    case 'h': return value * 60 * 60 * 1000
    case 'd': return value * 24 * 60 * 60 * 1000
    default: return 7 * 24 * 60 * 60 * 1000
  }
}

export function generateToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  })
}

export function setTokenCookie(res, token) {
  const isProduction = process.env.NODE_ENV === 'production'
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d'

  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: parseExpiresToMs(expiresIn)
  })
}
