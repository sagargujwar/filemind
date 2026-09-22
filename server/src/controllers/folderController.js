import Folder from '../models/Folder.js'
import File from '../models/File.js'

export async function getFolders(req, res, next) {
  try {
    const { parentFolderId } = req.query

    const query = { userId: req.user._id }
    if (parentFolderId) {
      query.parentFolderId = parentFolderId
    } else {
      query.parentFolderId = null
    }

    const folders = await Folder.find(query).sort('name')

    res.json({
      success: true,
      count: folders.length,
      data: folders
    })
  } catch (error) {
    next(error)
  }
}

export async function getFolderById(req, res, next) {
  try {
    const folder = await Folder.findOne({
      _id: req.params.id,
      userId: req.user._id
    })

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      })
    }

    res.json({
      success: true,
      data: folder
    })
  } catch (error) {
    next(error)
  }
}

export async function createFolder(req, res, next) {
  try {
    const { name, parentFolderId, description } = req.body

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Folder name is required'
      })
    }

    if (parentFolderId) {
      const parentFolder = await Folder.findOne({
        _id: parentFolderId,
        userId: req.user._id
      })

      if (!parentFolder) {
        return res.status(404).json({
          success: false,
          message: 'Parent folder not found'
        })
      }
    }

    const folder = await Folder.create({
      userId: req.user._id,
      name,
      parentFolderId: parentFolderId || null,
      description: description || ''
    })

    res.status(201).json({
      success: true,
      data: folder
    })
  } catch (error) {
    next(error)
  }
}

export async function updateFolder(req, res, next) {
  try {
    const { name, description } = req.body

    const folder = await Folder.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { name, description },
      { new: true }
    )

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      })
    }

    res.json({
      success: true,
      data: folder
    })
  } catch (error) {
    next(error)
  }
}

export async function deleteFolder(req, res, next) {
  try {
    const folder = await Folder.findOne({
      _id: req.params.id,
      userId: req.user._id
    })

    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      })
    }

    const allFolderIds = [folder._id]
    const queue = [folder._id]

    while (queue.length > 0) {
      const currentId = queue.shift()
      const children = await Folder.find({
        parentFolderId: currentId,
        userId: req.user._id
      }).select('_id')

      for (const child of children) {
        allFolderIds.push(child._id)
        queue.push(child._id)
      }
    }

    await File.updateMany(
      { folderId: { $in: allFolderIds }, userId: req.user._id },
      { folderId: null }
    )

    await Folder.deleteMany({
      _id: { $in: allFolderIds },
      userId: req.user._id
    })

    res.json({
      success: true,
      message: 'Folder deleted'
    })
  } catch (error) {
    next(error)
  }
}
