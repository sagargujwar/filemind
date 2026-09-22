import mongoose from 'mongoose'

const searchHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    query: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    resultCount: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
)

searchHistorySchema.index({ userId: 1, createdAt: -1 })

const SearchHistory = mongoose.model('SearchHistory', searchHistorySchema)

export default SearchHistory
