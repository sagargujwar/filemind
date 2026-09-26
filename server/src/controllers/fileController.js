import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import File from '../models/File.js'
import User from '../models/User.js'
import Folder from '../models/Folder.js'
import Category from '../models/Category.js'
import { embedFile, reembedFile } from '../services/embeddingService.js'
import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads')

export async function getDashboard(req, res, next) {
  try {
    const userId = req.user._id
    const [fileCount, folderCount, categoryCount, user] = await Promise.all([
      File.countDocuments({ userId, isDeleted: false }),
      Folder.countDocuments({ userId }),
      Category.countDocuments({ userId }),
      User.findById(userId).select('storageUsed storageLimit')
    ])

    res.json({
      success: true,
      data: {
        fileCount,
        folderCount,
        categoryCount,
        storageUsed: user?.storageUsed || 0,
        storageLimit: user?.storageLimit || 0
      }
    })
  } catch (error) {
    next(error)
  }
}

export async function uploadFile(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      })
    }

    const user = await User.findById(req.user._id)
    if (user.storageUsed + req.file.size > user.storageLimit) {
      return res.status(400).json({
        success: false,
        message: 'Storage limit exceeded'
      })
    }

    let folderId = null
    if (req.body.folderId) {
      const folder = await Folder.findOne({
        _id: req.body.folderId,
        userId: req.user._id
      })
      if (!folder) {
        return res.status(400).json({
          success: false,
          message: 'Invalid folder'
        })
      }
      folderId = folder._id
    }

    let categoryId = null
    if (req.body.categoryId) {
      const category = await Category.findOne({
        _id: req.body.categoryId,
        userId: req.user._id
      })
      if (category) {
        categoryId = category._id
      }
    }

    const ext = path.extname(req.file.originalname).toLowerCase()
    const cloudinaryUrl = isCloudinaryConfigured ? req.file.path || null : null
    const cloudinaryPublicId = isCloudinaryConfigured ? req.file.filename || null : null

    let file
    try {
      file = await File.create({
        userId: req.user._id,
        originalName: req.file.originalname,
        filePath: req.file.filename,
        cloudinaryUrl,
        cloudinaryPublicId,
        mimeType: req.file.mimetype,
        extension: ext,
        size: req.file.size,
        folderId,
        categoryId
      })
    } catch (createError) {
      if (cloudinaryPublicId && isCloudinaryConfigured) {
        cloudinary.uploader.destroy(cloudinaryPublicId).catch(() => {})
      } else {
        const uploadedPath = path.join(UPLOAD_DIR, req.file.filename)
        fs.unlink(uploadedPath, () => {})
      }
      throw createError
    }

    try {
      const categoryName = categoryId ? (await Category.findById(categoryId))?.name || '' : ''
      const { embedding, model } = await embedFile(
        { originalName: req.file.originalname, extension: ext },
        categoryName
      )
      if (embedding) {
        await File.findByIdAndUpdate(file._id, { embedding, embeddingModel: model })
      }
    } catch (embedErr) {
      console.error('[Upload] Initial embedding failed:', embedErr.message)
    }

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { storageUsed: req.file.size }
    })

    if (categoryId) {
      await Category.findByIdAndUpdate(categoryId, { $inc: { fileCount: 1 } })
    }

    res.status(201).json({
      success: true,
      data: file
    })
  } catch (error) {
    next(error)
  }
}

export async function getFiles(req, res, next) {
  try {
    const { folderId, categoryId, favorite, deleted, sort = '-createdAt' } = req.query

    const query = { userId: req.user._id }
    query.isDeleted = deleted === 'true' ? true : false

    if (folderId) query.folderId = folderId
    if (categoryId) query.categoryId = categoryId
    if (favorite === 'true') query.isFavorite = true

    const allowedSortFields = ['createdAt', '-createdAt', 'name', '-name', 'size', '-size', 'originalName', '-originalName']
    const sortParam = allowedSortFields.includes(sort) ? sort : '-createdAt'

    const files = await File.find(query).sort(sortParam)

    res.json({
      success: true,
      count: files.length,
      data: files
    })
  } catch (error) {
    next(error)
  }
}

export async function getFileById(req, res, next) {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user._id
    })

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      })
    }

    res.json({
      success: true,
      data: file
    })
  } catch (error) {
    next(error)
  }
}

export async function renameFile(req, res, next) {
  try {
    const { generatedName } = req.body

    if (!generatedName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a name'
      })
    }

    const file = await File.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { generatedName },
      { new: true }
    )

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      })
    }

    const category = file.categoryId ? await Category.findById(file.categoryId) : null
    reembedFile(file, category?.name).then(result => {
      if (result.embedding) {
        File.findByIdAndUpdate(file._id, { embedding: result.embedding, embeddingModel: result.model }).catch(() => {})
      }
    }).catch(err =>
      console.error(`[File] Re-embed after rename failed:`, err.message)
    )

    res.json({
      success: true,
      data: file
    })
  } catch (error) {
    next(error)
  }
}

export async function moveFile(req, res, next) {
  try {
    const { folderId } = req.body

    if (folderId) {
      const folder = await Folder.findOne({
        _id: folderId,
        userId: req.user._id
      })
      if (!folder) {
        return res.status(400).json({
          success: false,
          message: 'Invalid folder'
        })
      }
    }

    const file = await File.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { folderId: folderId || null },
      { new: true }
    )

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      })
    }

    const category = file.categoryId ? await Category.findById(file.categoryId) : null
    reembedFile(file, category?.name).then(result => {
      if (result.embedding) {
        File.findByIdAndUpdate(file._id, { embedding: result.embedding, embeddingModel: result.model }).catch(() => {})
      }
    }).catch(err =>
      console.error(`[File] Re-embed after move failed:`, err.message)
    )

    res.json({
      success: true,
      data: file
    })
  } catch (error) {
    next(error)
  }
}

export async function toggleFavorite(req, res, next) {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user._id
    })

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      })
    }

    file.isFavorite = !file.isFavorite
    await file.save()

    res.json({
      success: true,
      data: file
    })
  } catch (error) {
    next(error)
  }
}

export async function deleteFile(req, res, next) {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user._id
    })

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      })
    }

    file.isDeleted = true
    await file.save()

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { storageUsed: -file.size }
    })

    if (file.categoryId) {
      await Category.findByIdAndUpdate(file.categoryId, { $inc: { fileCount: -1 } })
    }

    res.json({
      success: true,
      message: 'File moved to trash'
    })
  } catch (error) {
    next(error)
  }
}

export async function restoreFile(req, res, next) {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isDeleted: true
    })

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found in trash'
      })
    }

    const user = await User.findById(req.user._id)
    if (user.storageUsed + file.size > user.storageLimit) {
      return res.status(400).json({
        success: false,
        message: 'Storage limit exceeded'
      })
    }

    file.isDeleted = false
    await file.save()

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { storageUsed: file.size }
    })

    if (file.categoryId) {
      await Category.findByIdAndUpdate(file.categoryId, { $inc: { fileCount: 1 } })
    }

    res.json({
      success: true,
      data: file
    })
  } catch (error) {
    next(error)
  }
}

export async function updateTags(req, res, next) {
  try {
    const { tags } = req.body

    if (!Array.isArray(tags)) {
      return res.status(400).json({
        success: false,
        message: 'Tags must be an array'
      })
    }

    const file = await File.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { tags: tags.map(tag => tag.trim().toLowerCase()).filter(tag => tag) },
      { new: true }
    )

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      })
    }

    const category = file.categoryId ? await Category.findById(file.categoryId) : null
    reembedFile(file, category?.name).then(result => {
      if (result.embedding) {
        File.findByIdAndUpdate(file._id, { embedding: result.embedding, embeddingModel: result.model }).catch(() => {})
      }
    }).catch(err =>
      console.error(`[File] Re-embed after tags update failed:`, err.message)
    )

    res.json({
      success: true,
      data: file
    })
  } catch (error) {
    next(error)
  }
}

export async function updateDescription(req, res, next) {
  try {
    const { description } = req.body

    const file = await File.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { description: description || '' },
      { new: true }
    )

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      })
    }

    const category = file.categoryId ? await Category.findById(file.categoryId) : null
    reembedFile(file, category?.name).then(result => {
      if (result.embedding) {
        File.findByIdAndUpdate(file._id, { embedding: result.embedding, embeddingModel: result.model }).catch(() => {})
      }
    }).catch(err =>
      console.error(`[File] Re-embed after description update failed:`, err.message)
    )

    res.json({
      success: true,
      data: file
    })
  } catch (error) {
    next(error)
  }
}

export async function updateCategory(req, res, next) {
  try {
    const { categoryId } = req.body

    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user._id
    })

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      })
    }

    const oldCategoryId = file.categoryId
    const newCategoryId = categoryId || null

    if (String(oldCategoryId) !== String(newCategoryId)) {
      if (oldCategoryId) {
        await Category.findByIdAndUpdate(oldCategoryId, { $inc: { fileCount: -1 } })
      }
      if (newCategoryId) {
        await Category.findByIdAndUpdate(newCategoryId, { $inc: { fileCount: 1 } })
      }
    }

    file.categoryId = newCategoryId
    await file.save()

    const newCategory = newCategoryId ? await Category.findById(newCategoryId) : null
    reembedFile(file, newCategory?.name).then(result => {
      if (result.embedding) {
        File.findByIdAndUpdate(file._id, { embedding: result.embedding, embeddingModel: result.model }).catch(() => {})
      }
    }).catch(err =>
      console.error(`[File] Re-embed after category update failed:`, err.message)
    )

    res.json({
      success: true,
      data: file
    })
  } catch (error) {
    next(error)
  }
}

export async function permanentDeleteFile(req, res, next) {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isDeleted: true
    })

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found in trash'
      })
    }

    if (file.cloudinaryPublicId && isCloudinaryConfigured) {
      cloudinary.uploader.destroy(file.cloudinaryPublicId).catch((err) => {
        console.error('[File] Failed to delete file from Cloudinary:', err.message)
      })
    } else {
      const filePath = path.join(UPLOAD_DIR, file.filePath)
      fs.unlink(filePath, (err) => {
        if (err) console.error('[File] Failed to delete file from disk:', err.message)
      })
    }

    await File.findByIdAndDelete(file._id)

    res.json({
      success: true,
      message: 'File permanently deleted'
    })
  } catch (error) {
    next(error)
  }
}

export async function emptyTrash(req, res, next) {
  try {
    const files = await File.find({ userId: req.user._id, isDeleted: true })

    for (const file of files) {
      if (file.cloudinaryPublicId && isCloudinaryConfigured) {
        cloudinary.uploader.destroy(file.cloudinaryPublicId).catch((err) => {
          console.error('[File] Failed to delete file from Cloudinary:', err.message)
        })
      } else {
        const filePath = path.join(UPLOAD_DIR, file.filePath)
        fs.unlink(filePath, (err) => {
          if (err) console.error('[File] Failed to delete file from disk:', err.message)
        })
      }
    }

    await File.deleteMany({ userId: req.user._id, isDeleted: true })

    res.json({
      success: true,
      message: `Trash emptied (${files.length} file${files.length !== 1 ? 's' : ''} deleted)`
    })
  } catch (error) {
    next(error)
  }
}

export async function serveFile(req, res, next) {
  try {
    const file = await File.findOne({
      _id: req.params.id,
      userId: req.user._id
    })

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      })
    }

    if (file.cloudinaryUrl && /^https?:\/\//i.test(file.cloudinaryUrl)) {
      const url = req.query.download === 'true'
        ? file.cloudinaryUrl.replace('/upload/', '/upload/fl_attachment/')
        : file.cloudinaryUrl
      return res.redirect(url)
    }

    const filePath = path.join(UPLOAD_DIR, file.filePath)

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on disk'
      })
    }

    const disposition = req.query.download === 'true' ? 'attachment' : 'inline'
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(file.originalName)}"`)
    res.setHeader('Content-Type', file.mimeType)
    fs.createReadStream(filePath).pipe(res)
  } catch (error) {
    next(error)
  }
}
