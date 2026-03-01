import { useEffect, useState } from 'react'
import './App.css'
import logoImage from '../images/Staff View.png'
import Dashboard from './Dashboard.jsx'
import Menu from './Menu.jsx'
import PendingOrders from './PendingOrders.jsx'
import CompletedOrders from './CompletedOrders.jsx'
import ManageUsers from './ManageUsers.jsx'
import { supabase } from './supabaseClient'

function App() {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const saved = localStorage.getItem('isLoggedIn')
    return saved ? JSON.parse(saved) : false
  })
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [userRole, setUserRole] = useState(() => {
    const saved = localStorage.getItem('userRole')
    return saved || 'admin'
  })
  const [userName, setUserName] = useState(() => {
    const saved = localStorage.getItem('userName')
    return saved || 'Admin User'
  })

  useEffect(() => {
    localStorage.setItem('isLoggedIn', JSON.stringify(isLoggedIn))
  }, [isLoggedIn])

  useEffect(() => {
    localStorage.setItem('userRole', userRole)
  }, [userRole])

  useEffect(() => {
    localStorage.setItem('userName', userName)
  }, [userName])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('name', name)
        .eq('password', password)
        .single()

      if (dbError || !data) {
        setError('Invalid name or password')
        setName('')
        setPassword('')
        setLoading(false)
        return
      }

      if (String(data.status || '').toLowerCase() === 'inactive') {
        setError('Your account has been deactivated. Please contact an administrator.')
        setName('')
        setPassword('')
        setLoading(false)
        return
      }

      const nextRole = String(data.role || 'staff').toLowerCase()
      setUserRole(nextRole)
      setUserName(data.name || 'User')
      setIsLoggedIn(true)

      if (nextRole === 'admin') {
        setCurrentPage('dashboard')
      } else {
        setCurrentPage('pending')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Login failed. Please try again.')
      setName('')
      setPassword('')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setUserRole('admin')
    setUserName('Admin User')
    setCurrentPage('dashboard')
    setName('')
    setPassword('')
  }

  const handleNavigate = (page) => {
    if ((userRole || '').toLowerCase() === 'staff') {
      const allowed = new Set(['pending', 'completed'])
      setCurrentPage(allowed.has(page) ? page : 'pending')
      return
    }

    setCurrentPage(page)
  }

  if (isLoggedIn) {
    switch (currentPage) {
      case 'menu':
        return <Menu onLogout={handleLogout} onNavigate={handleNavigate} userRole={userRole} userName={userName} />
      case 'pending':
        return <PendingOrders onLogout={handleLogout} onNavigate={handleNavigate} userRole={userRole} userName={userName} />
      case 'completed':
        return <CompletedOrders onLogout={handleLogout} onNavigate={handleNavigate} userRole={userRole} userName={userName} />
      case 'users':
        return <ManageUsers onLogout={handleLogout} onNavigate={handleNavigate} userRole={userRole} userName={userName} />
      default:
        return <Dashboard onLogout={handleLogout} onNavigate={handleNavigate} userRole={userRole} userName={userName} />
    }
  }

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-content">
          <img src={logoImage} alt="Tatun's Kambingan Logo" className="logo-img" />
          <h1>Tatun's Kambingan</h1>
        </div>
      </header>

      <div className="login-container">
        <div className="login-card">
          <h2 className="login-title">Login</h2>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="name">Username:</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your username"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password:</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={loading}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          <p
            className="login-hint"
            style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}
          >
          </p>
        </div>
      </div>
    </div>
  )
}

export default App
