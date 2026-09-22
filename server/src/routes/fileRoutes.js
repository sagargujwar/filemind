import { Router } from 'express'
import { protect } from '../middleware/authMiddleware.js'
import upload from '../middleware/uploadMiddleware.js'
import rateLimit from 'express-rate-limit'
import {
  uploadFile,
  getFiles,
  getDashboard,
  getFileById,
  renameFile,
  moveFile,
  toggleFavorite,
  deleteFile,
  restoreFile,
  permanentDeleteFile,
  emptyTrash,
  updateTags,
  updateCategory,
  updateDescription,
  serveFile
} from '../controllers/fileController.js'

const router = Router()

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many uploads, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
})

router.use(protect)

router.post('/upload', uploadLimiter, upload.single('file'), uploadFile)
router.get('/dashboard', getDashboard)
router.get('/', getFiles)
router.delete('/trash', emptyTrash)
router.get('/:id/serve', serveFile)
router.get('/:id', getFileById)
router.patch('/:id/rename', renameFile)
router.patch('/:id/move', moveFile)
router.patch('/:id/favorite', toggleFavorite)
router.patch('/:id/tags', updateTags)
router.patch('/:id/description', updateDescription)
router.patch('/:id/category', updateCategory)
router.delete('/:id', deleteFile)
router.patch('/:id/restore', restoreFile)
router.delete('/:id/permanent', permanentDeleteFile)

export default router
