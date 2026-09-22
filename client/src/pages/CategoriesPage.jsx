import { useState, useEffect } from 'react'
import api from '../services/api'
import CategoryList from '../components/categories/CategoryList'

export default function CategoriesPage() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories')
      setCategories(response.data.data)
    } catch (err) {
      console.error('Failed to fetch categories:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Categories</h2>
        <span className="page-count">{categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}</span>
      </div>
      {loading ? (
        <div className="loading-inline">Loading categories...</div>
      ) : (
        <CategoryList categories={categories} onRefresh={fetchCategories} />
      )}
    </div>
  )
}
