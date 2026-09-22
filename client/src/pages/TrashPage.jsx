import { useState, useEffect } from 'react'
import api from '../services/api'
import { formatSize } from '../utils/format'

function getFileIcon(extension) {
  const icons = {
    '.pdf': '📄',
    '.doc': '📝',
    '.docx': '📝',
    '.txt': '📃',
    '.png': '🖼️',
    '.jpg': '🖼️',
    '.jpeg': '🖼️',
    '.webp': '🖼️',
    '.mp4': '🎬',
    '.mp3': '🎵',
    '.zip': '📦'
  }
  return icons[extension] || '📎'
}

export default function TrashPage() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchFiles = async () => {
    try {
      const response = await api.get('/files', { params: { deleted: 'true' } })
      setFiles(response.data.data)
    } catch (err) {
      console.error('Failed to fetch trash:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [])

  async function handleRestore(id) {
    try {
      await api.patch(`/files/${id}/restore`)
      fetchFiles()
    } catch (err) {
      console.error('Restore failed:', err)
    }
  }

  async function handlePermanentDelete(id) {
    if (!window.confirm('Permanently delete this file? This cannot be undone.')) return
    try {
      await api.delete(`/files/${id}/permanent`)
      fetchFiles()
    } catch (err) {
      console.error('Permanent delete failed:', err)
    }
  }

  async function handleEmptyTrash() {
    if (!window.confirm('Permanently delete ALL files in trash? This cannot be undone.')) return
    try {
      await api.delete('/files/trash')
      fetchFiles()
    } catch (err) {
      console.error('Empty trash failed:', err)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Trash</h2>
        <span className="page-count">{files.length} file{files.length !== 1 ? 's' : ''}</span>
        {files.length > 0 && (
          <button className="empty-trash-btn" onClick={handleEmptyTrash}>Empty Trash</button>
        )}
      </div>
      {loading ? (
        <div className="loading-inline">Loading trash...</div>
      ) : files.length === 0 ? (
        <div className="empty-state">
          <p>Trash is empty.</p>
        </div>
      ) : (
        <div className="file-list">
          {files.map((file) => (
            <div key={file._id} className="file-item trash-item">
              <span className="file-icon">{getFileIcon(file.extension)}</span>
              <div className="file-info">
                <span className="file-name">{file.generatedName || file.originalName}</span>
                <span className="file-meta">
                  {formatSize(file.size)} • Deleted {new Date(file.updatedAt).toLocaleString()}
                </span>
              </div>
              <div className="file-actions">
                <button className="restore-btn" onClick={() => handleRestore(file._id)}>Restore</button>
                <button className="permanent-delete-btn" onClick={() => handlePermanentDelete(file._id)}>Delete Forever</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
