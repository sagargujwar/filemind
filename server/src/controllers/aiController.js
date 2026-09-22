import File from '../models/File.js'
import Category from '../models/Category.js'
import Folder from '../models/Folder.js'
import { analyzeFile } from '../services/aiService.js'
import { embedFile } from '../services/embeddingService.js'
import { escapeRegex } from '../utils/escapeRegex.js'

export async function analyzeSingleFile(req, res, next) {
  try {
    const file = await File.findOne({
      _id: req.params.fileId,
      userId: req.user._id
    })

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      })
    }

    const suggestion = await analyzeFile(file)

    const categoryRegex = { $regex: new RegExp(`^${escapeRegex(suggestion.category)}$`, 'i') }

    const [category, existingFolder] = await Promise.all([
      Category.findOne({ userId: req.user._id, name: categoryRegex }),
      Folder.findOne({
        userId: req.user._id,
        name: categoryRegex,
        parentFolderId: null
      })
    ])

    const finalCategory = category || await Category.create({
      userId: req.user._id,
      name: suggestion.category,
      fileCount: 0
    })

    const folder = existingFolder || await Folder.create({
      userId: req.user._id,
      name: suggestion.category,
      description: `Auto-organized: ${suggestion.category}`
    })

    let embeddingResult = { embedding: null, model: null }
    try {
      embeddingResult = await embedFile(file, suggestion.category)
    } catch (embedError) {
      console.error(`[AI] Embedding failed for ${file.originalName}:`, embedError.message)
    }

    await File.findByIdAndUpdate(file._id, {
      aiProcessed: true,
      processingStatus: 'completed',
      embedding: embeddingResult.embedding,
      embeddingModel: embeddingResult.model
    })

    res.json({
      success: true,
      data: {
        suggestion: {
          ...suggestion,
          categoryId: finalCategory._id,
          categoryName: finalCategory.name,
          folderId: folder._id,
          folderName: folder.name
        }
      }
    })
  } catch (error) {
    next(error)
  }
}

export async function analyzeBulkFiles(req, res, next) {
  try {
    const { fileIds } = req.body

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide fileIds array'
      })
    }

    const files = await File.find({
      _id: { $in: fileIds },
      userId: req.user._id
    })

    const results = []
    const errors = []

    const categoryRegex = (name) => ({ $regex: new RegExp(`^${escapeRegex(name)}$`, 'i') })

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1500))
      }

      try {
        const suggestion = await analyzeFile(file)

        const catQuery = { userId: req.user._id, name: categoryRegex(suggestion.category) }

        const [category, existingFolder] = await Promise.all([
          Category.findOne(catQuery),
          file.folderId
            ? Folder.findById(file.folderId)
            : Folder.findOne({ ...catQuery, parentFolderId: null })
        ])

        const finalCategory = category || await Category.create({
          userId: req.user._id,
          name: suggestion.category,
          fileCount: 0
        })

        let folder = existingFolder
        if (!folder) {
          folder = await Folder.create({
            userId: req.user._id,
            name: suggestion.category,
            description: `Auto-organized: ${suggestion.category}`
          })
        }

        let embeddingResult = { embedding: null, model: null }
        try {
          embeddingResult = await embedFile(file, suggestion.category)
        } catch (embedError) {
          console.error(`[AI] Embedding failed for ${file.originalName}:`, embedError.message)
        }

        await File.findByIdAndUpdate(file._id, {
          aiProcessed: true,
          processingStatus: 'completed',
          embedding: embeddingResult.embedding,
          embeddingModel: embeddingResult.model
        })

        results.push({
          fileId: file._id,
          suggestion: {
            ...suggestion,
            categoryId: finalCategory._id,
            categoryName: finalCategory.name,
            folderId: folder._id,
            folderName: folder.name
          }
        })
      } catch (err) {
        errors.push({ fileId: file._id, error: err.message })
      }
    }

    res.json({
      success: true,
      count: results.length,
      data: results,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    next(error)
  }
}
