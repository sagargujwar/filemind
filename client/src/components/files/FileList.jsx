import { useState } from 'react'
import api from '../../services/api'
import AISuggestion from '../ai/AISuggestion'
import { formatSize } from '../../utils/format'

function httpUrl(url) {
  return url && /^https?:\/\//i.test(url) ? url : null
}

function FileThumbnail({ cloudinaryUrl, filePath }) {
  const [imgError, setImgError] = useState(false)

  if (imgError) {
    return <span className="file-emoji">🖼️</span>
  }

  const src = httpUrl(cloudinaryUrl) || `/uploads/${filePath}`

  return (
    <img
      src={src}
      alt="thumbnail"
      className="file-thumbnail"
      onError={() => setImgError(true)}
    />
  )
}

function getFileIcon(extension, filePath, cloudinaryUrl) {
  const imageExts = ['.png', '.jpg', '.jpeg', '.webp']
  if (imageExts.includes(extension) && (cloudinaryUrl || filePath)) {
    return <FileThumbnail cloudinaryUrl={cloudinaryUrl} filePath={filePath} />
  }
  const icons = {
    '.pdf': '📄',
    '.doc': '📝',
    '.docx': '📝',
    '.txt': '📃',
    '.mp4': '🎬',
    '.mp3': '🎵',
    '.zip': '📦'
  }
  return <span className="file-emoji">{icons[extension] || '📎'}</span>
}

export default function FileList({ files, categories, onRefresh }) {
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editingTags, setEditingTags] = useState(null)
  const [tagInput, setTagInput] = useState('')
  const [editingCategory, setEditingCategory] = useState(null)
  const [analyzingIds, setAnalyzingIds] = useState({})
  const [suggestions, setSuggestions] = useState({})
  const [previewFile, setPreviewFile] = useState(null)

  async function handleRename(id) {
    if (!editName.trim()) return

    try {
      await api.patch(`/files/${id}/rename`, { generatedName: editName })
      setEditingId(null)
      setEditName('')
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Rename failed:', err)
    }
  }

  async function handleToggleFavorite(id) {
    try {
      await api.patch(`/files/${id}/favorite`)
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Favorite toggle failed:', err)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this file?')) return
    try {
      await api.delete(`/files/${id}`)
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  async function handleAddTag(fileId, tag) {
    if (!tag.trim()) return

    const file = files.find(f => f._id === fileId)
    if (!file) return
    const newTags = [...new Set([...(file.tags || []), tag.trim().toLowerCase()])]

    try {
      await api.patch(`/files/${fileId}/tags`, { tags: newTags })
      setTagInput('')
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Add tag failed:', err)
    }
  }

  async function handleRemoveTag(fileId, tagToRemove) {
    const file = files.find(f => f._id === fileId)
    if (!file) return
    const newTags = (file.tags || []).filter(tag => tag !== tagToRemove)

    try {
      await api.patch(`/files/${fileId}/tags`, { tags: newTags })
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Remove tag failed:', err)
    }
  }

  async function handleCategoryChange(fileId, categoryId) {
    try {
      await api.patch(`/files/${fileId}/category`, { categoryId: categoryId || null })
      setEditingCategory(null)
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Update category failed:', err)
    }
  }

  async function handleAnalyze(fileId) {
    setAnalyzingIds(prev => ({ ...prev, [fileId]: true }))
    try {
      const response = await api.post(`/ai/analyze/${fileId}`)
      const { suggestion } = response.data.data

      setSuggestions(prev => ({ ...prev, [fileId]: suggestion }))
    } catch (err) {
      console.error('Analyze failed:', err)
    } finally {
      setAnalyzingIds(prev => {
        const next = { ...prev }
        delete next[fileId]
        return next
      })
    }
  }

  function handleAcceptSuggestion(fileId) {
    setSuggestions(prev => {
      const next = { ...prev }
      delete next[fileId]
      return next
    })
    if (onRefresh) onRefresh()
  }

  function handleRejectSuggestion(fileId) {
    setSuggestions(prev => {
      const next = { ...prev }
      delete next[fileId]
      return next
    })
  }

  function startEditing(file) {
    setEditingId(file._id)
    setEditName(file.generatedName || file.originalName)
  }

  function startEditingTags(file) {
    setEditingTags(file._id)
    setTagInput('')
  }

  function handleViewFile(file) {
    const imageExts = ['.png', '.jpg', '.jpeg', '.webp']
    if (imageExts.includes(file.extension)) {
      setPreviewFile(file)
    } else {
      const url = httpUrl(file.cloudinaryUrl) || `/uploads/${file.filePath}`
      window.open(url, '_blank')
    }
  }

  if (files.length === 0) {
    return (
      <div className="empty-state">
        <p>No files uploaded yet.</p>
      </div>
    )
  }

  return (
    <div className="file-list-container">
      {Object.entries(suggestions).map(([fileId, s]) => (
        <AISuggestion
          key={fileId}
          suggestion={s}
          fileId={fileId}
          onAccept={() => handleAcceptSuggestion(fileId)}
          onReject={() => handleRejectSuggestion(fileId)}
        />
      ))}

      <div className="file-list">
        {files.map((file) => (
          <div key={file._id} className={`file-item${analyzingIds[file._id] ? ' analyzing' : ''}`}>
            <span className="file-icon">{getFileIcon(file.extension, file.filePath, file.cloudinaryUrl)}</span>
            <div className="file-info">
              {editingId === file._id ? (
                <div className="file-edit">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename(file._id)}
                    autoFocus
                  />
                  <button onClick={() => handleRename(file._id)}>Save</button>
                  <button onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              ) : (
                <span className="file-name">{file.generatedName || file.originalName}</span>
              )}
              <span className="file-meta">
                {formatSize(file.size)} • {new Date(file.createdAt).toLocaleString()}
              </span>

              {file.description && (
                <span className="file-description">{file.description}</span>
              )}

              {/* Tags */}
              <div className="file-tags">
                {(file.tags || []).map((tag, idx) => (
                  <span key={idx} className="tag">
                    {tag}
                    <button className="tag-remove" onClick={() => handleRemoveTag(file._id, tag)}>×</button>
                  </span>
                ))}
                {editingTags === file._id ? (
                  <div className="tag-input-wrapper">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddTag(file._id, tagInput)
                        if (e.key === 'Escape') setEditingTags(null)
                      }}
                      placeholder="Add tag..."
                      autoFocus
                    />
                    <button onClick={() => handleAddTag(file._id, tagInput)}>Add</button>
                    <button onClick={() => setEditingTags(null)}>×</button>
                  </div>
                ) : (
                  <button className="add-tag-btn" onClick={() => startEditingTags(file)}>+ Tag</button>
                )}
              </div>

              {/* Category */}
              <div className="file-category">
                {editingCategory === file._id ? (
                  <select
                    value={file.categoryId || ''}
                    onChange={(e) => handleCategoryChange(file._id, e.target.value)}
                    autoFocus
                  >
                    <option value="">No category</option>
                    {(categories || []).map((cat) => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                ) : (
                  <button className="category-btn" onClick={() => setEditingCategory(file._id)}>
                    {file.categoryId ? (categories || []).find(c => c._id === file.categoryId)?.name || 'Unknown' : 'Set category'}
                  </button>
                )}
              </div>

              {analyzingIds[file._id] && (
                <div className="analyze-loading">
                  <span className="spinner"></span>
                  <div className="analyze-loading-text">
                    <span>AI is analyzing your file...</span>
                    <span>Reading content and generating suggestions</span>
                  </div>
                </div>
              )}
            </div>
            <div className="file-actions">
              <button className="view-btn" onClick={() => handleViewFile(file)}>View</button>
              <button
                className="analyze-btn"
                onClick={() => handleAnalyze(file._id)}
                disabled={analyzingIds[file._id]}
              >
                {analyzingIds[file._id] ? <><span className="spinner"></span> Analyzing</> : file.aiProcessed ? 'Re-analyze' : 'Analyze'}
              </button>
              <button onClick={() => handleToggleFavorite(file._id)}>
                {file.isFavorite ? '★' : '☆'}
              </button>
              <button onClick={() => startEditing(file)}>Rename</button>
              <button onClick={() => handleDelete(file._id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {previewFile && (
        <div className="preview-overlay" onClick={() => setPreviewFile(null)}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <span className="preview-name">{previewFile.generatedName || previewFile.originalName}</span>
              <button className="preview-close" onClick={() => setPreviewFile(null)}>×</button>
            </div>
            <div className="preview-body">
              <img
                src={httpUrl(previewFile.cloudinaryUrl) || `/api/v1/files/${previewFile._id}/serve`}
                alt={previewFile.generatedName || previewFile.originalName}
                className="preview-image"
              />
            </div>
            <div className="preview-footer">
              <span>{formatSize(previewFile.size)}</span>
              <span>{previewFile.description}</span>
              <a
                href={`/api/v1/files/${previewFile._id}/serve?download=true`}
                download={previewFile.generatedName || previewFile.originalName}
                className="preview-download"
              >
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
