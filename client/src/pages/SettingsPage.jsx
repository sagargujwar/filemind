import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function SettingsPage() {
  const { user } = useAuth()
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [profileMsg, setProfileMsg] = useState('')
  const [passwordMsg, setPasswordMsg] = useState('')
  const [profileError, setProfileError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)

  async function handleProfileUpdate(e) {
    e.preventDefault()
    setProfileLoading(true)
    setProfileMsg('')
    setProfileError('')
    try {
      const response = await api.put('/auth/me', { name, email })
      setProfileMsg('Profile updated')
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Update failed')
    } finally {
      setProfileLoading(false)
    }
  }

  async function handlePasswordUpdate(e) {
    e.preventDefault()
    setPasswordLoading(true)
    setPasswordMsg('')
    setPasswordError('')
    try {
      await api.put('/auth/me/password', { currentPassword, newPassword })
      setPasswordMsg('Password updated')
      setCurrentPassword('')
      setNewPassword('')
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Update failed')
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">Settings</h2>
      </div>

      <div className="settings-section">
        <h3 className="settings-heading">Profile</h3>
        <form onSubmit={handleProfileUpdate} className="settings-form">
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {profileMsg && <div className="success-msg">{profileMsg}</div>}
          {profileError && <div className="error">{profileError}</div>}
          <button type="submit" disabled={profileLoading}>
            {profileLoading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>

      <div className="settings-section">
        <h3 className="settings-heading">Change Password</h3>
        <form onSubmit={handlePasswordUpdate} className="settings-form">
          <div className="form-group">
            <label>Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          {passwordMsg && <div className="success-msg">{passwordMsg}</div>}
          {passwordError && <div className="error">{passwordError}</div>}
          <button type="submit" disabled={passwordLoading}>
            {passwordLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      <div className="settings-section">
        <h3 className="settings-heading">Storage</h3>
        <div className="settings-storage">
          <span>{((user.storageUsed || 0) / 1024 / 1024).toFixed(2)} MB of {((user.storageLimit || 0) / 1024 / 1024).toFixed(0)} MB used</span>
          <div className="storage-bar">
            <div
              className="storage-fill"
              style={{ width: `${Math.min(((user.storageUsed || 0) / (user.storageLimit || 1)) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
