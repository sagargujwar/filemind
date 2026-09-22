import { useState, useEffect } from 'react'
import api from '../services/api'
import FileList from '../components/files/FileList'

export default function RecentPage() {
  const [files, setFiles] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchFiles = async () => {
    try {
      const response = await api.get('/files', { params: { sort: '-createdAt' } })
      setFiles(response.data.data)
    } catch (err) {
      console.error('Failed to fetch recent files:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories')
      setCategories(response.data.data)
    } catch (err) {
      console.error('Failed to fetch categories:', err)
    }
  }

  useEffect(() => {
    Promise.all([fetchFiles(), fetchCategories()])
  }, [])

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Recent</h2>
        <span className="page-count">{files.length} file{files.length !== 1 ? 's' : ''}</span>
      </div>
      {loading ? (
        <div className="loading-inline">Loading recent files...</div>
      ) : files.length === 0 ? (
        <div className="empty-state">
          <p>No files uploaded yet.</p>
        </div>
      ) : (
        <FileList files={files} categories={categories} onRefresh={fetchFiles} />
      )}
    </div>
  )
}
