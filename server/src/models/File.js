import mongoose from 'mongoose'

const fileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    originalName: {
      type: String,
      required: true
    },
    generatedName: {
      type: String,
      default: ''
    },
    filePath: {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    extension: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null
    },
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null
    },
    tags: [{
      type: String,
      trim: true
    }],
    description: {
      type: String,
      default: ''
    },
    extractedText: {
      type: String,
      default: ''
    },
    embedding: {
      type: [Number],
      default: null,
      select: false
    },
    embeddingModel: {
      type: String,
      default: null
    },
    aiConfidence: {
      type: Number,
      default: 0
    },
    aiProcessed: {
      type: Boolean,
      default: false
    },
    processingStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    isFavorite: {
      type: Boolean,
      default: false
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
)

fileSchema.index({ userId: 1, createdAt: -1 })
fileSchema.index({ userId: 1, isDeleted: 1 })
fileSchema.index({ userId: 1, folderId: 1 })
fileSchema.index({ userId: 1, categoryId: 1 })

const File = mongoose.model('File', fileSchema)

export default File
