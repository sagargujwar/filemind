import { createContext, useContext, useState, useEffect, useRef } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const loginCalled = useRef(false)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    try {
      const response = await api.get('/auth/me')
      setUser(response.data.data)
    } catch {
      if (!loginCalled.current) setUser(null)
    } finally {
      setLoading(false)
    }
  }

  async function login(email, password) {
    loginCalled.current = true
    const response = await api.post('/auth/login', { email, password })
    setUser(response.data.data)
    setLoading(false)
    return response.data.data
  }

  async function register(name, email, password) {
    loginCalled.current = true
    const response = await api.post('/auth/register', { name, email, password })
    setUser(response.data.data)
    setLoading(false)
    return response.data.data
  }

  async function logout() {
    try {
      await api.post('/auth/logout')
    } catch {
      // Ignore logout API errors — clear local state regardless
    }
    loginCalled.current = false
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
