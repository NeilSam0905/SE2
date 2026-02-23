import { useEffect, useState } from 'react'
import './Navbar.css'
import logoImage from '../../images/Staff View.png'
import menuIcon from '../../public/Menu Icon Logo.webp'
import ConfirmModal from './ConfirmModal'

function Navbar({
  onLogout,
  activePage,
  onNavigate,
  role = 'admin',
  user = { name: 'Admin User', role: 'Administrator' },
}) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [tabsVisible, setTabsVisible] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const isStaff = role === 'staff'

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <nav className="navbar">
      <div className="navbar-top">
        <div className="navbar-left">
          <img src={logoImage} alt="Tatun's Kambingan Logo" className="navbar-logo" />
          <h1 className="navbar-title">Tatun's Kambingan</h1>
        </div>

        <div className="navbar-account">
          <button 
            className={`menu-toggle ${(isMobile ? showMenu : !tabsVisible) ? 'active' : ''}`}
            onClick={() => {
              if (isMobile) {
                setShowMenu(!showMenu)
              } else {
                setTabsVisible(!tabsVisible)
              }
            }}
            aria-label="Toggle menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M3 12h18M3 18h18" stroke="#f4c27a" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <div className="user-info">
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
              <div className="dropdown-user-info">
                <span className="dropdown-user-name">{user.name}</span>
                <span className="dropdown-user-role">{user.role}</span>
              </div>
              <button
                onClick={() => {
                  setShowDropdown(false)
                  setShowLogoutConfirm(true)
                }}
                className="dropdown-item logout-btn"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={showLogoutConfirm}
        title={
          <>
            Are you sure you want to
            <br />
            sign out?
          </>
        }
        cancelText="Cancel"
        confirmText="Yes"
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          setShowLogoutConfirm(false)
          onLogout && onLogout()
        }}
      />

      {/* Desktop Navigation - can be hidden by toggle */}
      {tabsVisible && (
      <div className="navbar-tabs">
        {!isStaff ? (
          <button 
            className={`nav-tab ${activePage === 'dashboard' ? 'active' : ''}`}
            onClick={() => onNavigate && onNavigate('dashboard')}
          >
            Dashboard
          </button>
        ) : null}
        {!isStaff ? (
          <button 
            className={`nav-tab ${activePage === 'menu' ? 'active' : ''}`}
            onClick={() => onNavigate && onNavigate('menu')}
          >
            <img src={menuIcon} alt="Menu" className="nav-tab-icon" />
            Menu
          </button>
        ) : null}
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
        {!isStaff ? (
          <button 
            className={`nav-tab ${activePage === 'users' ? 'active' : ''}`}
            onClick={() => onNavigate && onNavigate('users')}
          >
            Manage Users
          </button>
        ) : null}
      </div>
      )}

      {/* Mobile Menu Panel (inline) - Only on mobile */}
      {isMobile && showMenu && (
        <div className="mobile-menu-panel" onClick={() => setShowMenu(false)}>
          <div className="mobile-panel-content" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-panel-links">
              {!isStaff ? (
                <button 
                  className={`mobile-link ${activePage === 'dashboard' ? 'active' : ''}`}
                  onClick={() => { onNavigate && onNavigate('dashboard'); setShowMenu(false) }}
                >
                  Dashboard
                </button>
              ) : null}
              {!isStaff ? (
                <button 
                  className={`mobile-link ${activePage === 'menu' ? 'active' : ''}`}
                  onClick={() => { onNavigate && onNavigate('menu'); setShowMenu(false) }}
                >
                  Menu
                </button>
              ) : null}
              <button 
                className={`mobile-link ${activePage === 'pending' ? 'active' : ''}`}
                onClick={() => { onNavigate && onNavigate('pending'); setShowMenu(false) }}
              >
                Pending Orders
              </button>
              <button 
                className={`mobile-link ${activePage === 'completed' ? 'active' : ''}`}
                onClick={() => { onNavigate && onNavigate('completed'); setShowMenu(false) }}
              >
                Completed Orders
              </button>
              {!isStaff ? (
                <button 
                  className={`mobile-link ${activePage === 'users' ? 'active' : ''}`}
                  onClick={() => { onNavigate && onNavigate('users'); setShowMenu(false) }}
                >
                  Manage Users
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

export default Navbar
