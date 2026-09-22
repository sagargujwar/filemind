import { useState } from 'react'
import { formatSize } from '../../utils/format'

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

function isImageFile(extension) {
  return ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg'].includes(extension)
}

function isPdfFile(extension) {
  return extension === '.pdf'
}

export default function SearchResults({ results, query, total, pages, page, onPageChange, mode }) {
  const [previewFile, setPreviewFile] = useState(null)

  if (!query) return null

  if (results.length === 0) {
    return (
      <div className="search-results">
        <div className="search-header">
          <span className="search-query">"{query}"</span>
          <span className="search-count">No results found</span>
        </div>
        <div className="empty-state">
          <p>No files match your search. Try different keywords.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="search-results">
      <div className="search-header">
        <span className="search-query">"{query}"</span>
        <span className="search-count">{total} result{total !== 1 ? 's' : ''}</span>
      </div>

      <div className="file-list">
        {results.map((file) => (
          <div key={file._id} className="file-item">
            <span className="file-icon">{getFileIcon(file.extension)}</span>
            <div className="file-info">
              <span className="file-name">{file.generatedName || file.originalName}</span>
              <span className="file-meta">
                {formatSize(file.size)} • {new Date(file.createdAt).toLocaleString()}
              </span>
              {file.description && (
                <span className="file-description">{file.description}</span>
              )}
              {file.tags && file.tags.length > 0 && (
                <div className="file-tags">
                  {file.tags.map((tag, idx) => (
                    <span key={idx} className="tag">{tag}</span>
                  ))}
                </div>
              )}
              {file.relevance === 'high' && (
                <span className="search-relevance high">
                  {mode === 'semantic' ? 'Semantic match' : 'Strong match'}
                </span>
              )}
              {file.relevance === 'medium' && file.similarityScore != null && mode === 'semantic' && (
                <span className="search-relevance">
                  Similarity: {Math.round(file.similarityScore * 100)}%
                </span>
              )}
            </div>
            <div className="file-actions">
              <button className="view-btn" onClick={() => setPreviewFile(file)}>View</button>
            </div>
          </div>
        ))}
      </div>

      {pages > 1 && (
        <div className="search-pagination">
          <button
            className="page-btn"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </button>
          <span className="page-info">
            Page {page} of {pages}
          </span>
          <button
            className="page-btn"
            disabled={page >= pages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </button>
        </div>
      )}

      {previewFile && (
        <div className="preview-overlay" onClick={() => setPreviewFile(null)}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <span className="preview-name">{previewFile.generatedName || previewFile.originalName}</span>
              <button className="preview-close" onClick={() => setPreviewFile(null)}>×</button>
            </div>
            <div className="preview-body">
              {isImageFile(previewFile.extension) ? (
                <img
                  src={`/api/v1/files/${previewFile._id}/serve`}
                  alt={previewFile.generatedName || previewFile.originalName}
                  className="preview-image"
                />
              ) : isPdfFile(previewFile.extension) ? (
                <iframe
                  src={`/api/v1/files/${previewFile._id}/serve`}
                  className="preview-pdf"
                  title={previewFile.originalName}
                />
              ) : (
                <div className="preview-no-preview">
                  <span className="preview-no-icon">{getFileIcon(previewFile.extension)}</span>
                  <span>Preview not available for this file type</span>
                </div>
              )}
            </div>
            <div className="preview-footer">
              <span>{formatSize(previewFile.size)}</span>
              {previewFile.description && <span>{previewFile.description}</span>}
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
