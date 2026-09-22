import mongoose from 'mongoose'

const categorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: 50
    },
    description: {
      type: String,
      default: '',
      maxlength: 200
    },
    fileCount: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
)

categorySchema.index({ userId: 1, name: 1 }, { unique: true })

const Category = mongoose.model('Category', categorySchema)

export default Category
