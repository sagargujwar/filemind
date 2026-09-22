import { useState, useEffect } from 'react'
import api from '../services/api'
import FolderList from '../components/folders/FolderList'

export default function FoldersPage() {
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchFolders = async () => {
    try {
      const response = await api.get('/folders')
      setFolders(response.data.data)
    } catch (err) {
      console.error('Failed to fetch folders:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFolders()
  }, [])

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Folders</h2>
        <span className="page-count">{folders.length} folder{folders.length !== 1 ? 's' : ''}</span>
      </div>
      {loading ? (
        <div className="loading-inline">Loading folders...</div>
      ) : (
        <FolderList folders={folders} onRefresh={fetchFolders} />
      )}
    </div>
  )
}
