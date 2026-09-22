import { useState, useEffect } from 'react'
import api from '../services/api'
import FileList from '../components/files/FileList'

export default function FavoritesPage() {
  const [files, setFiles] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchFiles = async () => {
    try {
      const response = await api.get('/files', { params: { favorite: 'true' } })
      setFiles(response.data.data)
    } catch (err) {
      console.error('Failed to fetch favorites:', err)
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
        <h2 className="page-title">Favorites</h2>
        <span className="page-count">{files.length} file{files.length !== 1 ? 's' : ''}</span>
      </div>
      {loading ? (
        <div className="loading-inline">Loading favorites...</div>
      ) : files.length === 0 ? (
        <div className="empty-state">
          <p>No favorite files yet. Click the star on any file to mark it as favorite.</p>
        </div>
      ) : (
        <FileList files={files} categories={categories} onRefresh={fetchFiles} />
      )}
    </div>
  )
}
