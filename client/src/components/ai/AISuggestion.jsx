import { useState } from 'react'
import api from '../../services/api'

export default function AISuggestion({ suggestion, fileId, onAccept, onReject }) {
  const [editing, setEditing] = useState(false)
  const [generatedName, setGeneratedName] = useState(suggestion.generatedName)
  const [description, setDescription] = useState(suggestion.description)
  const [tags, setTags] = useState(suggestion.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  async function handleAccept() {
    setSaving(true)
    setSaveError('')

    try {
      const updates = [
        { endpoint: `/files/${fileId}/rename`, data: { generatedName } },
        { endpoint: `/files/${fileId}/description`, data: { description } },
        { endpoint: `/files/${fileId}/tags`, data: { tags } },
        { endpoint: `/files/${fileId}/category`, data: { categoryId: suggestion.categoryId } },
        { endpoint: `/files/${fileId}/move`, data: { folderId: suggestion.folderId } }
      ]

      const results = await Promise.allSettled(
        updates.map(({ endpoint, data }) => api.patch(endpoint, data))
      )

      const failed = results.filter(r => r.status === 'rejected')

      if (failed.length > 0) {
        const failedNames = results.map((result, idx) => {
          if (result.status === 'rejected') {
            return updates[idx]?.endpoint.split('/').pop()
          }
          return null
        }).filter(Boolean)
        setSaveError(`Failed to save: ${failedNames.join(', ')}. Please try again.`)
        return
      }

      if (onAccept) onAccept()
    } catch (err) {
      setSaveError('An unexpected error occurred. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function handleAddTag() {
    if (tagInput.trim() && !tags.includes(tagInput.trim().toLowerCase())) {
      setTags([...tags, tagInput.trim().toLowerCase()])
      setTagInput('')
    }
  }

  function handleRemoveTag(tagToRemove) {
    setTags(tags.filter(t => t !== tagToRemove))
  }

  const confidencePercent = Math.round(suggestion.confidence * 100)

  return (
    <div className="ai-suggestion">
      <div className="ai-header">
        <span className="ai-badge">AI Suggestion</span>
        <span className="ai-confidence">{confidencePercent}% confidence</span>
      </div>

      <div className="ai-field">
        <label>Suggested Filename</label>
        {editing ? (
          <input
            type="text"
            value={generatedName}
            onChange={(e) => setGeneratedName(e.target.value)}
          />
        ) : (
          <span className="ai-text-value">{generatedName}</span>
        )}
      </div>

      <div className="ai-field">
        <label>Category</label>
        <span className="ai-category">{suggestion.categoryName}</span>
      </div>

      <div className="ai-field">
        <label>Tags</label>
        <div className="ai-tags">
          {tags.map((tag, idx) => (
            <span key={idx} className="tag">
              {tag}
              {editing && <button className="tag-remove" onClick={() => handleRemoveTag(tag)}>×</button>}
            </span>
          ))}
          {editing && (
            <div className="tag-input-inline">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); handleAddTag() }
                  if (e.key === ',') { e.preventDefault(); handleAddTag() }
                }}
                placeholder="Add tag..."
              />
              <button onClick={handleAddTag}>+</button>
            </div>
          )}
        </div>
      </div>

      <div className="ai-field">
        <label>Description</label>
        {editing ? (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        ) : (
          <span className="ai-text-value">{description}</span>
        )}
      </div>

      {saveError && <div className="ai-error">{saveError}</div>}

      <div className="ai-actions">
        <button className="ai-accept" onClick={handleAccept} disabled={saving}>
          {saving ? 'Saving...' : 'Accept'}
        </button>
        {!editing && (
          <button className="ai-edit" onClick={() => setEditing(true)} disabled={saving}>
            Edit
          </button>
        )}
        {editing && (
          <button className="ai-edit" onClick={() => setEditing(false)} disabled={saving}>
            Cancel
          </button>
        )}
        <button className="ai-reject" onClick={onReject} disabled={saving}>
          Reject
        </button>
      </div>
    </div>
  )
}
