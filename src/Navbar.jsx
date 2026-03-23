import { useState } from 'react'
import './styles/NavbarLegacy.css'
import logoImage from '../images/Staff View.png'
const menuIcon = new URL('/Menu Icon Logo.webp', import.meta.url).href

function Navbar({ onLogout, activePage, user = { name: 'Admin User', role: 'Administrator' } }) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [showMenu, setShowMenu] = useState(true)

  return (
    <nav className="navbar">
      <div className="navbar-top">
        <div className="navbar-left">
          <img src={logoImage} alt="Tatun's Kambingan Logo" className="navbar-logo" />
          <h1 className="navbar-title">Tatun's Kambingan</h1>
        </div>
        
        <div className="navbar-search">
          <svg className="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="9" cy="9" r="6" stroke="#333" strokeWidth="2"/>
            <path d="M14 14L18 18" stroke="#333" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input 
            type="text" 
            placeholder="Search our menu!" 
            className="search-input"
          />
        </div>

        <div className="navbar-account">
          <button 
            className="menu-toggle"
            onClick={() => setShowMenu(!showMenu)}
            aria-label="Toggle menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M3 12h18M3 18h18" stroke="#f4c27a" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <div className="user-info">
            <div className="user-text">
              <span className="user-name">{user.name}</span>
              <span className="user-role">{user.role}</span>
            </div>
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
          </div>
          
          {showDropdown && (
            <div className="account-dropdown">
              <button onClick={onLogout} className="dropdown-item">Logout</button>
            </div>
          )}
        </div>
      </div>

      {showMenu && (
      <div className="navbar-tabs">
        <button className={`nav-tab ${activePage === 'dashboard' ? 'active' : ''}`}>
          Dashboard
        </button>
        <button className={`nav-tab ${activePage === 'menu' ? 'active' : ''}`}>
          <img src={menuIcon} alt="Menu" className="nav-tab-icon" />
          Menu
        </button>
        <button className={`nav-tab ${activePage === 'pending' ? 'active' : ''}`}>
          Pending Orders
        </button>
        <button className={`nav-tab ${activePage === 'completed' ? 'active' : ''}`}>
          Completed Orders
        </button>
      </div>
      )}
    </nav>
  )
}

export default Navbar
