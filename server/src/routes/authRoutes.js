import { Router } from 'express'
import { register, login, logout, getMe, updateProfile, updatePassword } from '../controllers/authController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.post('/logout', logout)
router.get('/me', protect, getMe)
router.put('/me', protect, updateProfile)
router.put('/me/password', protect, updatePassword)

export default router
