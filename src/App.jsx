import { useState } from 'react'
import './App.css'
import logoImage from '../images/Staff View.png'
import Dashboard from './Dashboard.jsx'
import Menu from './Menu.jsx'
import PendingOrders from './PendingOrders.jsx'
import CompletedOrders from './CompletedOrders.jsx'
import ManageUsers from './ManageUsers.jsx'

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [error, setError] = useState('')
  const [userRole, setUserRole] = useState('admin')
  const [userName, setUserName] = useState('Admin User')

  const handleLogin = (e) => {
    e.preventDefault()
    setError('')

    if (email === 'admin' && password === 'admin123') {
      setUserRole('admin')
      setUserName('Admin User')
      setIsLoggedIn(true)
      setCurrentPage('dashboard')
      return
    }

    if (email === 'staff' && password === 'staff123') {
      setUserRole('staff')
      setUserName('Staff User')
      setIsLoggedIn(true)
      setCurrentPage('pending')
      return
    }

    {
      setError('Invalid email or password')
      setEmail('')
      setPassword('')
    }
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setUserRole('admin')
    setUserName('Admin User')
    setCurrentPage('dashboard')
  }

  const handleNavigate = (page) => {
    if (userRole === 'staff') {
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
              <label htmlFor="email">Email:</label>
              <input
                type="text"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder=""
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password:</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=""
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="login-btn">Login</button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default App
