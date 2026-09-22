import { Router } from 'express'
import { protect } from '../middleware/authMiddleware.js'
import { analyzeSingleFile, analyzeBulkFiles } from '../controllers/aiController.js'

const router = Router()

router.use(protect)

router.post('/analyze/:fileId', analyzeSingleFile)
router.post('/analyze-bulk', analyzeBulkFiles)

export default router
