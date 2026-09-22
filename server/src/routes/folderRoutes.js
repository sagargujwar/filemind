import { Router } from 'express'
import { protect } from '../middleware/authMiddleware.js'
import {
  getFolders,
  getFolderById,
  createFolder,
  updateFolder,
  deleteFolder
} from '../controllers/folderController.js'

const router = Router()

router.use(protect)

router.get('/', getFolders)
router.get('/:id', getFolderById)
router.post('/', createFolder)
router.patch('/:id', updateFolder)
router.delete('/:id', deleteFolder)

export default router
