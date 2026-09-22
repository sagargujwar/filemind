import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/common/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import Dashboard from './pages/Dashboard'
import FilesPage from './pages/FilesPage'
import FoldersPage from './pages/FoldersPage'
import CategoriesPage from './pages/CategoriesPage'
import FavoritesPage from './pages/FavoritesPage'
import RecentPage from './pages/RecentPage'
import TrashPage from './pages/TrashPage'
import SettingsPage from './pages/SettingsPage'

function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading">
        <span>Loading...</span>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return children
}

function NotFound() {
  return (
    <div className="empty-state">
      <p>Page not found.</p>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="files" element={<FilesPage />} />
            <Route path="folders" element={<FoldersPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="favorites" element={<FavoritesPage />} />
            <Route path="recent" element={<RecentPage />} />
            <Route path="trash" element={<TrashPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
