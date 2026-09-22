import { Router } from 'express'
import { protect } from '../middleware/authMiddleware.js'
import { searchFiles, getSearchHistory, clearSearchHistory, semanticSearch } from '../controllers/searchController.js'

const router = Router()

router.use(protect)

router.get('/semantic', semanticSearch)
router.get('/history', getSearchHistory)
router.delete('/history', clearSearchHistory)
router.get('/', searchFiles)

export default router
