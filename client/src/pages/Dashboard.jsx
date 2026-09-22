import { useState, useEffect, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import FileUpload from '../components/upload/FileUpload'
import FileList from '../components/files/FileList'
import FolderList from '../components/folders/FolderList'
import CategoryList from '../components/categories/CategoryList'
import SearchResults from '../components/search/SearchResults'

export default function Dashboard() {
  const { user } = useAuth()
  const {
    searchQuery,
    searchResults,
    searchTotal,
    searchPages,
    searchPage,
    searchLoading,
    searchResultMode,
    onSearchPageChange,
    onClearSearch
  } = useOutletContext()

  const [files, setFiles] = useState([])
  const [folders, setFolders] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentFolder, setCurrentFolder] = useState(null)
  const [currentCategory, setCurrentCategory] = useState(null)
  const [activeTab, setActiveTab] = useState('files')

  const fetchFiles = useCallback(async () => {
    try {
      const params = {}
      if (currentFolder) params.folderId = currentFolder
      if (currentCategory) params.categoryId = currentCategory
      const response = await api.get('/files', { params })
      setFiles(response.data.data)
    } catch (err) {
      console.error('Failed to fetch files:', err)
    } finally {
      setLoading(false)
    }
  }, [currentFolder, currentCategory])

  const fetchFolders = useCallback(async () => {
    try {
      const params = currentFolder ? { parentFolderId: currentFolder } : {}
      const response = await api.get('/folders', { params })
      setFolders(response.data.data)
    } catch (err) {
      console.error('Failed to fetch folders:', err)
    }
  }, [currentFolder])

  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.get('/categories')
      setCategories(response.data.data)
    } catch (err) {
      console.error('Failed to fetch categories:', err)
    }
  }, [])

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchFiles(), fetchFolders(), fetchCategories()])
  }, [fetchFiles, fetchFolders, fetchCategories])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  function handleFolderClick(folderId) {
    setCurrentFolder(folderId)
    setCurrentCategory(null)
    setActiveTab('files')
    onClearSearch()
  }

  function handleCategoryClick(categoryId) {
    setCurrentCategory(categoryId)
    setCurrentFolder(null)
    setActiveTab('files')
    onClearSearch()
  }

  function handleBackClick() {
    setCurrentFolder(null)
    setCurrentCategory(null)
  }

  function handleTabClick(tab) {
    setActiveTab(tab)
    if (searchQuery) onClearSearch()
  }

  return (
    <div className="dashboard-page">
      {searchQuery ? (
        searchLoading ? (
          <div className="loading-inline">Searching...</div>
        ) : (
          <SearchResults
            results={searchResults}
            query={searchQuery}
            total={searchTotal}
            pages={searchPages}
            page={searchPage}
            onPageChange={onSearchPageChange}
            mode={searchResultMode}
          />
        )
      ) : (
        <>
          <div className="stats-bar">
            <div className="stat">
              <span className="stat-label">Files</span>
              <span className="stat-value">{files.length}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Folders</span>
              <span className="stat-value">{folders.length}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Categories</span>
              <span className="stat-value">{categories.length}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Storage</span>
              <span className="stat-value">
                {((user.storageUsed || 0) / 1024 / 1024).toFixed(1)} / {((user.storageLimit || 0) / 1024 / 1024).toFixed(0)} MB
              </span>
              <div className="storage-bar">
                <div
                  className="storage-fill"
                  style={{ width: `${Math.min(((user.storageUsed || 0) / (user.storageLimit || 1)) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="tabs">
            <button
              className={`tab ${activeTab === 'files' ? 'active' : ''}`}
              onClick={() => handleTabClick('files')}
            >
              Files
            </button>
            <button
              className={`tab ${activeTab === 'folders' ? 'active' : ''}`}
              onClick={() => handleTabClick('folders')}
            >
              Folders
            </button>
            <button
              className={`tab ${activeTab === 'categories' ? 'active' : ''}`}
              onClick={() => handleTabClick('categories')}
            >
              Categories
            </button>
          </div>

          {(currentFolder || currentCategory) && (
            <div className="breadcrumb">
              <button onClick={handleBackClick}>Back to root</button>
              {currentCategory && (
                <span className="breadcrumb-label">
                  Viewing: {(categories || []).find(c => c._id === currentCategory)?.name || 'Category'}
                </span>
              )}
            </div>
          )}

          {activeTab === 'files' && (
            <>
              <FileUpload onUploadSuccess={fetchFiles} folderId={currentFolder} />
              {loading ? (
                <div className="loading-inline">Loading files...</div>
              ) : (
                <FileList files={files} categories={categories} onRefresh={fetchAll} />
              )}
            </>
          )}

          {activeTab === 'folders' && (
            <FolderList
              folders={folders}
              onRefresh={fetchAll}
              onFolderClick={handleFolderClick}
            />
          )}

          {activeTab === 'categories' && (
            <CategoryList categories={categories} onRefresh={fetchAll} onCategoryClick={handleCategoryClick} />
          )}
        </>
      )}
    </div>
  )
}
