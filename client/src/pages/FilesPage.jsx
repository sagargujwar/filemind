import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import FileUpload from '../components/upload/FileUpload'
import FileList from '../components/files/FileList'

export default function FilesPage() {
  const [files, setFiles] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchFiles = async () => {
    try {
      const response = await api.get('/files')
      setFiles(response.data.data)
    } catch (err) {
      console.error('Failed to fetch files:', err)
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

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchFiles(), fetchCategories()])
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">All Files</h2>
        <span className="page-count">{files.length} file{files.length !== 1 ? 's' : ''}</span>
      </div>
      <FileUpload onUploadSuccess={fetchAll} />
      {loading ? (
        <div className="loading-inline">Loading files...</div>
      ) : (
        <FileList files={files} categories={categories} onRefresh={fetchAll} />
      )}
    </div>
  )
}
