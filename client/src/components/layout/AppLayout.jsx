import { useState, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import SearchBar from '../search/SearchBar'
import api from '../../services/api'

export default function AppLayout() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchTotal, setSearchTotal] = useState(0)
  const [searchPages, setSearchPages] = useState(1)
  const [searchPage, setSearchPage] = useState(1)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchMode, setSearchMode] = useState('regex')
  const [searchResultMode, setSearchResultMode] = useState('')

  const handleClearSearch = useCallback(() => {
    setSearchQuery('')
    setSearchResults([])
    setSearchTotal(0)
    setSearchPages(1)
    setSearchPage(1)
  }, [])

  async function handleSearch(query) {
    setSearchLoading(true)
    setSearchQuery(query)
    setSearchPage(1)
    try {
      const params = { q: query, page: 1 }
      const endpoint = searchMode === 'semantic' ? '/search/semantic' : '/search'
      const response = await api.get(endpoint, { params })
      setSearchResults(response.data.data)
      setSearchTotal(response.data.total)
      setSearchPages(response.data.pages)
      setSearchResultMode(response.data.mode || '')
    } catch (err) {
      console.error('Search failed:', err)
      setSearchResults([])
      setSearchTotal(0)
    } finally {
      setSearchLoading(false)
    }
  }

  async function handleSearchPageChange(page) {
    setSearchLoading(true)
    setSearchPage(page)
    try {
      const params = { q: searchQuery, page }
      const endpoint = searchMode === 'semantic' ? '/search/semantic' : '/search'
      const response = await api.get(endpoint, { params })
      setSearchResults(response.data.data)
      setSearchTotal(response.data.total)
      setSearchPages(response.data.pages)
      setSearchResultMode(response.data.mode || '')
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setSearchLoading(false)
    }
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <header className="app-header">
          <SearchBar
            onSearch={handleSearch}
            onClear={handleClearSearch}
            searchMode={searchMode}
            onSearchModeChange={setSearchMode}
          />
          {searchLoading && <span className="search-loading">Searching...</span>}
        </header>
        <div className="app-content">
          <Outlet context={{
            searchQuery,
            searchResults,
            searchTotal,
            searchPages,
            searchPage,
            searchLoading,
            searchResultMode,
            onSearchPageChange: handleSearchPageChange,
            onClearSearch: handleClearSearch
          }} />
        </div>
      </div>
    </div>
  )
}
