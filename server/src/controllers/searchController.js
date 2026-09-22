import File from '../models/File.js'
import SearchHistory from '../models/SearchHistory.js'
import { expandQuery, embedQuery, cosineSimilarity } from '../services/embeddingService.js'
import { escapeRegex, hasWord } from '../utils/escapeRegex.js'

export async function searchFiles(req, res, next) {
  try {
    const { q, folderId, categoryId, limit: rawLimit = '20', page: rawPage = '1' } = req.query

    if (!q || !q.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      })
    }

    const pageNum = Math.max(1, parseInt(rawPage) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(rawLimit) || 20))

    const searchTerms = q.trim().split(/\s+/).filter(t => t.length > 0)
    const regexPatterns = searchTerms.map(term => new RegExp(escapeRegex(term), 'i'))

    const query = {
      userId: req.user._id,
      isDeleted: false,
      $and: regexPatterns.map(pattern => ({
        $or: [
          { originalName: pattern },
          { generatedName: pattern },
          { description: pattern },
          { tags: pattern },
          { extractedText: pattern }
        ]
      }))
    }

    if (folderId) query.folderId = folderId
    if (categoryId) query.categoryId = categoryId

    const allFiles = await File.find(query)
      .select('originalName generatedName description tags extractedText categoryId folderId extension mimeType size createdAt isFavorite')
      .sort({ createdAt: -1 })
      .lean()

    const filtered = allFiles.filter(file => {
      const searchable = [
        file.originalName,
        file.generatedName,
        file.description,
        file.extractedText,
        ...(file.tags || [])
      ].filter(Boolean).join(' ')

      return searchTerms.every(term => hasWord(searchable, term))
    })

    const total = filtered.length
    const skip = (pageNum - 1) * limitNum
    const paginatedFiles = filtered.slice(skip, skip + limitNum)

    SearchHistory.create({
      userId: req.user._id,
      query: q.trim(),
      resultCount: total
    }).catch((err) => {
      console.error('Failed to save search history:', err.message)
    })

    res.json({
      success: true,
      count: paginatedFiles.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: paginatedFiles
    })
  } catch (error) {
    next(error)
  }
}

export async function getSearchHistory(req, res, next) {
  try {
    const { limit: rawLimit = '10' } = req.query
    const limitNum = Math.min(50, Math.max(1, parseInt(rawLimit) || 10))

    const history = await SearchHistory.aggregate([
      { $match: { userId: req.user._id } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: { $toLower: '$query' },
          query: { $first: '$query' },
          resultCount: { $first: '$resultCount' },
          createdAt: { $first: '$createdAt' }
        }
      },
      { $sort: { createdAt: -1 } },
      { $limit: limitNum }
    ])

    res.json({
      success: true,
      count: history.length,
      data: history
    })
  } catch (error) {
    next(error)
  }
}

export async function clearSearchHistory(req, res, next) {
  try {
    await SearchHistory.deleteMany({ userId: req.user._id })

    res.json({
      success: true,
      message: 'Search history cleared'
    })
  } catch (error) {
    next(error)
  }
}

export async function semanticSearch(req, res, next) {
  try {
    const { q, folderId, categoryId, limit: rawLimit = '20', page: rawPage = '1' } = req.query

    if (!q || !q.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      })
    }

    const pageNum = Math.max(1, parseInt(rawPage) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(rawLimit) || 20))

    const searchTerm = q.trim()
    const queryLower = searchTerm.toLowerCase()
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 1)

    const expandedWords = [...new Set(queryWords.flatMap(w => expandQuery(w)))]

    console.log(`[Search] Semantic: "${searchTerm}" (expanded: [${expandedWords.join(', ')}])`)

    const baseFilter = {
      userId: req.user._id,
      isDeleted: false
    }
    if (folderId) baseFilter.folderId = folderId
    if (categoryId) baseFilter.categoryId = categoryId

    const keywordFilter = {
      ...baseFilter,
      $or: expandedWords.flatMap(word => {
        const pattern = new RegExp(escapeRegex(word), 'i')
        return [
          { originalName: pattern },
          { generatedName: pattern },
          { description: pattern },
          { tags: pattern },
          { extractedText: pattern }
        ]
      })
    }

    const keywordFiles = await File.find(keywordFilter)
      .select('originalName generatedName description tags extractedText categoryId folderId extension mimeType size createdAt isFavorite')
      .lean()

    const matchedFiles = keywordFiles.filter(file => {
      const searchable = [
        file.originalName,
        file.generatedName,
        file.description,
        file.extractedText,
        ...(file.tags || [])
      ].filter(Boolean).join(' ')

      return expandedWords.some(w => hasWord(searchable, w))
    })

    console.log(`[Search] Keyword matches: ${matchedFiles.length}`)

    if (matchedFiles.length > 0) {
      const scoredKeywordFiles = matchedFiles.map(file => {
        const searchable = [
          file.originalName,
          file.generatedName,
          file.description,
          file.extractedText,
          ...(file.tags || [])
        ].filter(Boolean).join(' ').toLowerCase()

        const originalMatchCount = queryWords.filter(w => hasWord(searchable, w)).length
        const expandedOnlyCount = expandedWords.filter(w => hasWord(searchable, w)).length - originalMatchCount

        return { ...file, originalMatchCount, expandedOnlyCount }
      })

      const relevant = scoredKeywordFiles.filter(f =>
        f.originalMatchCount > 0 || f.expandedOnlyCount > 0
      )

      relevant.sort((a, b) =>
        b.originalMatchCount - a.originalMatchCount ||
        b.expandedOnlyCount - a.expandedOnlyCount ||
        b.createdAt - a.createdAt
      )

      const total = relevant.length
      const skip = (pageNum - 1) * limitNum
      const paginatedFiles = relevant.slice(skip, skip + limitNum)

      const results = paginatedFiles.map(({ originalMatchCount, expandedOnlyCount, ...file }) => ({
        ...file,
        relevance: originalMatchCount > 0 ? 'high' : 'medium'
      }))

      console.log(`[Search] Returning ${results.length} keyword results of ${total}`)

      SearchHistory.create({
        userId: req.user._id,
        query: searchTerm,
        resultCount: total
      }).catch(err => console.error('Failed to save search history:', err.message))

      return res.json({
        success: true,
        count: results.length,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        data: results,
        mode: 'semantic-keyword'
      })
    }

    console.log(`[Search] No keyword matches for "${searchTerm}", trying embeddings...`)

    let queryEmbedding
    try {
      queryEmbedding = await embedQuery(searchTerm)
    } catch (embedError) {
      console.error('[Search] Embedding failed:', embedError.message)
      return res.json({
        success: true,
        count: 0,
        total: 0,
        page: 1,
        pages: 0,
        data: [],
        mode: 'semantic',
        hint: 'No files match your search'
      })
    }

    const embFilter = {
      ...baseFilter,
      embedding: { $ne: null }
    }

    const files = await File.find(embFilter)
      .select('+embedding originalName generatedName description tags categoryId folderId extension mimeType size createdAt isFavorite')
      .lean()

    console.log(`[Search] Semantic: comparing against ${files.length} embedded files`)

    const ABSOLUTE_FLOOR = parseFloat(process.env.SEMANTIC_SIMILARITY_THRESHOLD) || 0.15
    const RELATIVE_RETENTION = 0.92

    const allScored = files
      .map(file => ({
        ...file,
        score: cosineSimilarity(queryEmbedding, file.embedding)
      }))
      .filter(f => f.score >= ABSOLUTE_FLOOR)
      .sort((a, b) => b.score - a.score)

    if (allScored.length === 0) {
      console.log(`[Search] Semantic: no files above floor ${ABSOLUTE_FLOOR}`)

      SearchHistory.create({
        userId: req.user._id,
        query: searchTerm,
        resultCount: 0
      }).catch(err => console.error('Failed to save search history:', err.message))

      return res.json({
        success: true,
        count: 0,
        total: 0,
        page: 1,
        pages: 0,
        data: [],
        mode: 'semantic',
        hint: 'No files match your search. Try different keywords.'
      })
    }

    const topScore = allScored[0].score
    const cutoffScore = topScore * RELATIVE_RETENTION

    const scoredFiles = allScored.filter(f => f.score >= cutoffScore)

    console.log(`[Search] Semantic: top=${topScore.toFixed(3)}, cutoff=${cutoffScore.toFixed(3)}, kept=${scoredFiles.length}/${allScored.length}`)

    const total = scoredFiles.length
    const skip = (pageNum - 1) * limitNum
    const paginatedFiles = scoredFiles.slice(skip, skip + limitNum)

    const results = paginatedFiles.map(({ embedding, score, ...file }) => ({
      ...file,
      similarityScore: Math.round(score * 1000) / 1000,
      relevance: score >= topScore * 0.98 ? 'high' : 'medium'
    }))

    console.log(`[Search] Semantic results: ${results.map(r =>
      `${r.originalName}=${r.similarityScore} [${r.relevance}]`
    ).join(', ')}`)

    SearchHistory.create({
      userId: req.user._id,
      query: searchTerm,
      resultCount: total
    }).catch(err => console.error('Failed to save search history:', err.message))

    res.json({
      success: true,
      count: results.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: results,
      mode: 'semantic'
    })
  } catch (error) {
    next(error)
  }
}
