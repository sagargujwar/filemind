import Category from '../models/Category.js'
import File from '../models/File.js'
import { escapeRegex } from '../utils/escapeRegex.js'
import { reembedFile } from '../services/embeddingService.js'

export async function getCategories(req, res, next) {
  try {
    const categories = await Category.find({ userId: req.user._id }).sort('name')

    res.json({
      success: true,
      count: categories.length,
      data: categories
    })
  } catch (error) {
    next(error)
  }
}

export async function getCategoryById(req, res, next) {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      userId: req.user._id
    })

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      })
    }

    res.json({
      success: true,
      data: category
    })
  } catch (error) {
    next(error)
  }
}

export async function createCategory(req, res, next) {
  try {
    const { name, description } = req.body

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      })
    }

    const existingCategory = await Category.findOne({
      userId: req.user._id,
      name: { $regex: new RegExp(`^${escapeRegex(name)}$`, 'i') }
    })

    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: 'Category already exists'
      })
    }

    const category = await Category.create({
      userId: req.user._id,
      name,
      description: description || ''
    })

    res.status(201).json({
      success: true,
      data: category
    })
  } catch (error) {
    next(error)
  }
}

export async function updateCategory(req, res, next) {
  try {
    const { name, description } = req.body

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      })
    }

    const existingCategory = await Category.findOne({
      userId: req.user._id,
      name: { $regex: new RegExp(`^${escapeRegex(name)}$`, 'i') },
      _id: { $ne: req.params.id }
    })

    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: 'Category already exists'
      })
    }

    const oldCategory = await Category.findOne({ _id: req.params.id, userId: req.user._id })
    const nameChanged = oldCategory && oldCategory.name !== name

    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { name, description },
      { new: true }
    )

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      })
    }

    if (nameChanged) {
      const files = await File.find({ categoryId: category._id, userId: req.user._id })
      for (const file of files) {
        reembedFile(file, category.name).then(result => {
          if (result.embedding) {
            File.findByIdAndUpdate(file._id, { embedding: result.embedding, embeddingModel: result.model }).catch(() => {})
          }
        }).catch(err =>
          console.error(`[Category] Re-embed after rename failed for ${file.originalName}:`, err.message)
        )
      }
    }

    res.json({
      success: true,
      data: category
    })
  } catch (error) {
    next(error)
  }
}

export async function deleteCategory(req, res, next) {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      userId: req.user._id
    })

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      })
    }

    await File.updateMany(
      { categoryId: category._id, userId: req.user._id },
      { categoryId: null }
    )

    await category.deleteOne()

    res.json({
      success: true,
      message: 'Category deleted'
    })
  } catch (error) {
    next(error)
  }
}
