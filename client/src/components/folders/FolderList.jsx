import { useState } from 'react'
import api from '../../services/api'

export default function FolderList({ folders, onRefresh, onFolderClick }) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')

  async function handleCreate() {
    if (!newName.trim()) return

    try {
      await api.post('/folders', { name: newName })
      setNewName('')
      setCreating(false)
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Create folder failed:', err)
    }
  }

  async function handleRename(id) {
    if (!editName.trim()) return

    try {
      await api.patch(`/folders/${id}`, { name: editName })
      setEditingId(null)
      setEditName('')
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Rename folder failed:', err)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this folder and all its contents?')) return
    try {
      await api.delete(`/folders/${id}`)
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Delete folder failed:', err)
    }
  }

  function startEditing(folder) {
    setEditingId(folder._id)
    setEditName(folder.name)
  }

  return (
    <div className="folder-section">
      <div className="section-header">
        <h3>Folders</h3>
        <button className="add-btn" onClick={() => setCreating(true)}>+ New</button>
      </div>

      {creating && (
        <div className="create-form">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Folder name"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <button onClick={handleCreate}>Create</button>
          <button onClick={() => { setCreating(false); setNewName('') }}>Cancel</button>
        </div>
      )}

      {folders.length === 0 ? (
        <p className="empty-text">No folders yet</p>
      ) : (
        <div className="folder-grid">
          {folders.map((folder) => (
            <div key={folder._id} className="folder-item">
              {editingId === folder._id ? (
                <div className="edit-form">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename(folder._id)}
                    autoFocus
                  />
                  <button onClick={() => handleRename(folder._id)}>Save</button>
                  <button onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              ) : (
                <>
                  <div className="folder-clickable" onClick={() => onFolderClick && onFolderClick(folder._id)}>
                    <span className="folder-icon">📁</span>
                    <span className="folder-name">{folder.name}</span>
                  </div>
                  <div className="folder-actions">
                    <button onClick={() => startEditing(folder)}>Edit</button>
                    <button onClick={() => handleDelete(folder._id)}>Delete</button>
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
