import { useState, useRef } from 'react'
import api from '../../services/api'

export default function FileUpload({ onUploadSuccess, folderId }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [uploadCount, setUploadCount] = useState(0)
  const fileInputRef = useRef(null)

  async function handleFileChange(e) {
    const selectedFiles = Array.from(e.target.files)
    if (selectedFiles.length === 0) return

    setError('')
    setUploading(true)
    setUploadCount(selectedFiles.length)

    let successCount = 0
    let failCount = 0

    for (const file of selectedFiles) {
      const formData = new FormData()
      formData.append('file', file)
      if (folderId) {
        formData.append('folderId', folderId)
      }

      try {
        await api.post('/files/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        successCount++
      } catch {
        failCount++
      }
    }

    setUploading(false)
    setUploadCount(0)

    if (failCount > 0 && successCount > 0) {
      setError(`${successCount} uploaded, ${failCount} failed`)
    } else if (failCount > 0) {
      setError(`${failCount} upload(s) failed`)
    }

    if (onUploadSuccess) onUploadSuccess()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="upload-section">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".png,.jpg,.jpeg,.webp,.pdf"
        multiple
        id="file-upload"
        style={{ display: 'none' }}
      />
      <label htmlFor="file-upload" className="upload-btn">
        {uploading ? `Uploading ${uploadCount} file(s)...` : 'Upload Files'}
      </label>
      {error && <div className="error">{error}</div>}
    </div>
  )
}
