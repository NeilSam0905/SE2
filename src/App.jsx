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

  const handleLogin = (e) => {
    e.preventDefault()
    setError('')
    
    if (email === 'admin' && password === 'admin123') {
      setIsLoggedIn(true)
    } else {
      setError('Invalid email or password')
      setEmail('')
      setPassword('')
    }
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setCurrentPage('dashboard')
  }

  const handleNavigate = (page) => {
    setCurrentPage(page)
  }

  if (isLoggedIn) {
    switch (currentPage) {
      case 'menu':
        return <Menu onLogout={handleLogout} onNavigate={handleNavigate} />
      case 'pending':
        return <PendingOrders onLogout={handleLogout} onNavigate={handleNavigate} />
      case 'completed':
        return <CompletedOrders onLogout={handleLogout} onNavigate={handleNavigate} />
      case 'users':
        return <ManageUsers onLogout={handleLogout} onNavigate={handleNavigate} />
      default:
        return <Dashboard onLogout={handleLogout} onNavigate={handleNavigate} />
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
