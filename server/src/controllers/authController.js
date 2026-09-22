import User from '../models/User.js'
import { generateToken, setTokenCookie } from '../utils/generateToken.js'

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email and password'
      })
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email'
      })
    }

    const user = await User.create({ name, email, password })
    const token = generateToken(user._id)
    setTokenCookie(res, token)

    res.status(201).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        storageUsed: user.storageUsed,
        storageLimit: user.storageLimit
      }
    })
  } catch (error) {
    next(error)
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      })
    }

    const user = await User.findOne({ email }).select('+password')
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      })
    }

    const token = generateToken(user._id)
    setTokenCookie(res, token)

    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        storageUsed: user.storageUsed,
        storageLimit: user.storageLimit
      }
    })
  } catch (error) {
    next(error)
  }
}

export function logout(req, res) {
  const isProduction = process.env.NODE_ENV === 'production'

  res.cookie('token', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    expires: new Date(0)
  })

  res.json({
    success: true,
    message: 'Logged out successfully'
  })
}

export function getMe(req, res) {
  res.json({
    success: true,
    data: {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      avatar: req.user.avatar,
      storageUsed: req.user.storageUsed,
      storageLimit: req.user.storageLimit
    }
  })
}

export async function updateProfile(req, res, next) {
  try {
    const { name, email } = req.body

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      })
    }

    const existing = await User.findOne({ email, _id: { $ne: req.user._id } })
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Email already in use'
      })
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, email },
      { new: true, runValidators: true }
    )

    res.json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        storageUsed: user.storageUsed,
        storageLimit: user.storageLimit
      }
    })
  } catch (error) {
    next(error)
  }
}

export async function updatePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current and new password are required'
      })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
      })
    }

    const user = await User.findById(req.user._id).select('+password')
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      })
    }

    user.password = newPassword
    await user.save()

    res.json({
      success: true,
      message: 'Password updated'
    })
  } catch (error) {
    next(error)
  }
}
