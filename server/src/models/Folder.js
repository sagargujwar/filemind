import mongoose from 'mongoose'

const folderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Folder name is required'],
      trim: true,
      maxlength: 100
    },
    parentFolderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null
    },
    description: {
      type: String,
      default: '',
      maxlength: 500
    }
  },
  { timestamps: true }
)

folderSchema.index({ userId: 1, parentFolderId: 1 })
folderSchema.index({ userId: 1, createdAt: -1 })

const Folder = mongoose.model('Folder', folderSchema)

export default Folder
