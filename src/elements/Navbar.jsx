import { useState } from 'react'
import './Navbar.css'
import logoImage from '../../images/Staff View.png'

function Navbar({ onLogout, activePage, onNavigate }) {
  const [showDropdown, setShowDropdown] = useState(false)

  return (
    <nav className="navbar">
      <div className="navbar-top">
        <div className="navbar-left">
          <img src={logoImage} alt="Tatun's Kambingan Logo" className="navbar-logo" />
          <h1 className="navbar-title">Tatun's Kambingan</h1>
        </div>

        <div className="navbar-account">
          <div 
            className="account-circle"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <img 
              src="/logo_placeholder.png" 
              alt="Account" 
              className="account-img"
            />
            <svg 
              className={`dropdown-arrow ${showDropdown ? 'open' : ''}`}
              width="12" 
              height="8" 
              viewBox="0 0 12 8" 
              fill="none"
            >
              <path d="M1 1L6 6L11 1" stroke="#f4c27a" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          
          {showDropdown && (
            <div className="account-dropdown">
              <button onClick={onLogout} className="dropdown-item">Logout</button>
            </div>
          )}
        </div>
      </div>

      <div className="navbar-tabs">
        <button 
          className={`nav-tab ${activePage === 'dashboard' ? 'active' : ''}`}
          onClick={() => onNavigate && onNavigate('dashboard')}
        >
          Dashboard
        </button>
        <button 
          className={`nav-tab ${activePage === 'menu' ? 'active' : ''}`}
          onClick={() => onNavigate && onNavigate('menu')}
        >
          Menu
        </button>
        <button 
          className={`nav-tab ${activePage === 'pending' ? 'active' : ''}`}
          onClick={() => onNavigate && onNavigate('pending')}
        >
          Pending Orders
        </button>
        <button 
          className={`nav-tab ${activePage === 'completed' ? 'active' : ''}`}
          onClick={() => onNavigate && onNavigate('completed')}
        >
          Completed Orders
        </button>
        <button 
          className={`nav-tab ${activePage === 'users' ? 'active' : ''}`}
          onClick={() => onNavigate && onNavigate('users')}
        >
          Manage Users
        </button>
      </div>
    </nav>
  )
}

export default Navbar
