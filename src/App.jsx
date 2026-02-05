import { useState } from 'react'
import './App.css'
import logoImage from '../images/Staff View.png'
import UserPage from './UserPage'

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
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

  if (isLoggedIn) {
    return <UserPage onLogout={() => setIsLoggedIn(false)} />
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
          <h2>Login</h2>
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
