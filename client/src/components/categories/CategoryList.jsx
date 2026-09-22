import { useState } from 'react'
import api from '../../services/api'

export default function CategoryList({ categories, onRefresh, onCategoryClick }) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')

  async function handleCreate() {
    if (!newName.trim()) return

    try {
      await api.post('/categories', { name: newName })
      setNewName('')
      setCreating(false)
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Create category failed:', err)
    }
  }

  async function handleRename(id) {
    if (!editName.trim()) return

    try {
      await api.patch(`/categories/${id}`, { name: editName })
      setEditingId(null)
      setEditName('')
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Rename category failed:', err)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this category? Files will not be deleted.')) return
    try {
      await api.delete(`/categories/${id}`)
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Delete category failed:', err)
    }
  }

  function startEditing(category) {
    setEditingId(category._id)
    setEditName(category.name)
  }

  return (
    <div className="category-section">
      <div className="section-header">
        <h3>Categories</h3>
        <button className="add-btn" onClick={() => setCreating(true)}>+ New</button>
      </div>

      {creating && (
        <div className="create-form">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Category name"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <button onClick={handleCreate}>Create</button>
          <button onClick={() => { setCreating(false); setNewName('') }}>Cancel</button>
        </div>
      )}

      {categories.length === 0 ? (
        <p className="empty-text">No categories yet</p>
      ) : (
        <div className="category-list">
          {categories.map((category) => (
            <div key={category._id} className="category-item">
              {editingId === category._id ? (
                <div className="edit-form">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename(category._id)}
                    autoFocus
                  />
                  <button onClick={() => handleRename(category._id)}>Save</button>
                  <button onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              ) : (
                <>
                  <span
                    className="category-name category-clickable"
                    onClick={() => onCategoryClick && onCategoryClick(category._id)}
                  >
                    {category.name}
                  </span>
                  <span className="category-count">{category.fileCount} files</span>
                  <div className="category-actions">
                    <button onClick={() => startEditing(category)}>Edit</button>
                    <button onClick={() => handleDelete(category._id)}>Delete</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
