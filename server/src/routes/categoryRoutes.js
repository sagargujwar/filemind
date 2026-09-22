import { Router } from 'express'
import { protect } from '../middleware/authMiddleware.js'
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/categoryController.js'

const router = Router()

router.use(protect)

router.get('/', getCategories)
router.get('/:id', getCategoryById)
router.post('/', createCategory)
router.patch('/:id', updateCategory)
router.delete('/:id', deleteCategory)

export default router
