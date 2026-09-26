import { useState, useEffect, useRef } from 'react'
import api from '../../services/api'

export default function SearchBar({ onSearch, onClear, searchMode, onSearchModeChange }) {
  const [query, setQuery] = useState('')
  const [history, setHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)
  const wrapperRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowHistory(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function fetchHistory() {
    try {
      const response = await api.get('/search/history', { params: { limit: 4 } })
      setHistory(response.data.data)
    } catch {
      setHistory([])
    }
  }

  function handleFocus() {
    fetchHistory()
    setShowHistory(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setShowHistory(false)
    try {
      await onSearch(query.trim())
    } finally {
      setLoading(false)
    }
  }

  async function handleHistoryClick(searchQuery) {
    setQuery(searchQuery)
    setShowHistory(false)
    setLoading(true)
    try {
      await onSearch(searchQuery)
    } finally {
      setLoading(false)
    }
  }

  function handleClear() {
    setQuery('')
    if (onClear) onClear()
    inputRef.current?.focus()
  }

  return (
    <div className="search-bar" ref={wrapperRef}>
      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-input-wrap">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleFocus}
            placeholder={searchMode === 'semantic' ? 'Search by meaning...' : 'Search files...'}
            className="search-input"
          />
          {query && (
            <button type="button" className="search-clear" onClick={handleClear}>
              ×
            </button>
          )}
        </div>
        <button
          type="button"
          className={`search-mode-toggle ${searchMode === 'semantic' ? 'active' : ''}`}
          onClick={() => onSearchModeChange(searchMode === 'semantic' ? 'regex' : 'semantic')}
          title={searchMode === 'semantic' ? 'Switch to keyword search' : 'Switch to smart search (synonyms)'}
        >
          {searchMode === 'semantic' ? '🧠' : '🔍'}
        </button>
        <button type="submit" className="search-submit" disabled={loading || !query.trim()}>
          {loading ? '...' : 'Search'}
        </button>
      </form>

      {showHistory && history.length > 0 && (
        <div className="search-history">
          <div className="search-history-header">
            <span>Recent searches</span>
          </div>
          {history.map((item) => (
            <button
              key={item._id}
              className="search-history-item"
              onClick={() => handleHistoryClick(item.query)}
            >
              <span className="history-query">{item.query}</span>
              <span className="history-count">{item.resultCount} results</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
