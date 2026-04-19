import { useEffect, useRef, useState } from 'react'
import './styles/App.css'
import logoImage from '../images/Staff View.png'
import Dashboard from './Dashboard.jsx'
import Menu from './Menu.jsx'
import PendingOrders from './PendingOrders.jsx'
import CompletedOrders from './CompletedOrders.jsx'
import ManageUsers from './ManageUsers.jsx'
import Payment from './Payment.jsx'
import { supabase, toAuthEmail } from './lib/supabaseClient'

function App() {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentPage, setCurrentPage] = useState(() => {
    const saved = localStorage.getItem('currentPage')
    return saved || 'dashboard'
  })
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

  const [userId, setUserId] = useState(() => {
    const saved = localStorage.getItem('userId')
    if (!saved) return null
    const n = Number(saved)
    return Number.isFinite(n) ? n : null
  })

  // Ref so the onAuthStateChange closure always reads the current logged-in
  // state, not the stale mount-time value captured by the [] useEffect.
  const isLoggedInRef = useRef(isLoggedIn)
  useEffect(() => {
    isLoggedInRef.current = isLoggedIn
  }, [isLoggedIn])


  // On every launch: clear any persisted Supabase auth session so that a fresh
  // login is always required when the app is restarted.
  // We directly remove the localStorage token keys instead of calling
  // supabase.auth.signOut() — signOut() dispatches a SIGNED_OUT event even
  // with scope:'local', which races with a rapid login attempt and causes
  // "can't login" failures on some machines.
  useEffect(() => {
    localStorage.removeItem('isLoggedIn')
    try {
      // Supabase auth token key format: sb-<project-ref>-auth-token
      Object.keys(localStorage)
        .filter((k) => /^sb-.+-auth-token/.test(k))
        .forEach((k) => localStorage.removeItem(k))
    } catch { /* ignore storage access errors */ }
  }, [])


  useEffect(() => {
    localStorage.setItem('isLoggedIn', JSON.stringify(isLoggedIn))
  }, [isLoggedIn])

  useEffect(() => {
    localStorage.setItem('currentPage', currentPage)
  }, [currentPage])

  useEffect(() => {
    localStorage.setItem('userRole', userRole)
  }, [userRole])

  useEffect(() => {
    localStorage.setItem('userName', userName)
  }, [userName])

  useEffect(() => {
    if (userId == null) localStorage.removeItem('userId')
    else localStorage.setItem('userId', String(userId))
  }, [userId])


  // Restore session from Supabase Auth on page reload.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user && !isLoggedInRef.current) {
        const authId = session.user.id
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('auth_id', authId)
          .single()

        if (profile && String(profile.status || '').toLowerCase() !== 'deactivated') {
          const role = String(profile.role || 'staff').toLowerCase()
          const uid = profile.id != null ? Number(profile.id) : null
          setUserId(uid)
          setUserRole(role)
          setUserName(profile.name || 'User')
          setCurrentPage(role === 'admin' ? 'dashboard' : 'pending')
          setIsLoggedIn(true)
        }
      }

      if (event === 'SIGNED_OUT') {
        // Only act if we were actually logged in — prevents spurious events
        // (e.g. from the startup storage wipe) from disrupting the login form.
        if (isLoggedInRef.current) {
          setIsLoggedIn(false)
          setUserId(null)
        }
      }
    })

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const email = toAuthEmail(name)

      const tryLogin = async (timeoutMs) => {
        return Promise.race([
          supabase.auth.signInWithPassword({ email, password }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Connection timed out. The server may be unavailable.')), timeoutMs)
          ),
        ])
      }

      let authResult
      try {
        authResult = await tryLogin(30000)
      } catch {
        // First attempt timed out — retry once with a longer timeout
        authResult = await tryLogin(45000)
      }
      const { data: authData, error: authError } = authResult

      if (authError) {
        const msg = String(authError.message || '').toLowerCase()
        if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('password') || msg.includes('email')) {
          setError('Invalid name or password.')
        } else if (msg.includes('rate') || msg.includes('too many')) {
          setError('Too many login attempts. Please wait a moment and try again.')
        } else {
          // Show the actual Supabase error so issues can be identified.
          setError(`Login failed: ${authError.message}`)
        }
        setName('')
        setPassword('')
        setLoading(false)
        return
      }

      const authId = authData.user.id

      // Look up the profile from the users table (by auth_id, fallback to name).
      let profile = null
      {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('auth_id', authId)
          .single()
        profile = data
      }

      if (!profile) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('name', name)
          .single()
        profile = data

        // Link the auth_id for future logins.
        if (profile && profile.id != null) {
          await supabase.from('users').update({ auth_id: authId }).eq('id', profile.id)
        }
      }

      if (!profile) {
        await supabase.auth.signOut()
        setError('Invalid name or password')
        setName('')
        setPassword('')
        setLoading(false)
        return
      }

      if (String(profile.status || '').toLowerCase() === 'deactivated') {
        await supabase.auth.signOut()
        setError('Your account has been deactivated. Please contact an administrator.')
        setName('')
        setPassword('')
        setLoading(false)
        return
      }

      const nextRole = String(profile.role || 'staff').toLowerCase()
      const nextUserId = profile.id != null ? Number(profile.id) : null

      if (nextUserId != null) {
        setUserId(nextUserId)
        await setOnlineStatus(nextUserId, true)
      } else {
        setUserId(null)
      }

      setUserRole(nextRole)
      setUserName(profile.name || 'User')
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
    setUserId(null)
    setUserRole('admin')
    setUserName('Admin User')
    setCurrentPage('dashboard')
    localStorage.removeItem('currentPage')
    setName('')
    setPassword('')
    supabase.auth.signOut().catch(() => {})
  }

  const handleNavigate = (page) => {
    if ((userRole || '').toLowerCase() === 'staff') {
      const allowed = new Set(['payment', 'pending', 'completed'])
      setCurrentPage(allowed.has(page) ? page : 'pending')
      return
    }

    setCurrentPage(page)
  }

  if (isLoggedIn) {
    switch (currentPage) {
      case 'menu':
        return <Menu onLogout={handleLogout} onNavigate={handleNavigate} userRole={userRole} userName={userName} />
      case 'payment':
        return <Payment onLogout={handleLogout} onNavigate={handleNavigate} userRole={userRole} userName={userName} />
      case 'pending':
        return <PendingOrders onLogout={handleLogout} onNavigate={handleNavigate} userRole={userRole} userName={userName} />
      case 'completed':
        return <CompletedOrders onLogout={handleLogout} onNavigate={handleNavigate} userRole={userRole} userName={userName} />
      case 'users':
        return <ManageUsers onLogout={handleLogout} onNavigate={handleNavigate} userRole={userRole} userName={userName} userId={userId} />
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
