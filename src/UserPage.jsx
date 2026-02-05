import './UserPage.css'
import logoImage from '../images/Staff View.png'

function UserPage({ onLogout }) {
  return (
    <div className="user-page-container">
      <header className="user-header">
        <div className="user-header-content">
          <img src={logoImage} alt="Tatun's Kambingan Logo" className="user-logo-img" />
          <h1>Tatun's Kambingan</h1>
        </div>
        <button className="logout-btn" onClick={onLogout}>Logout</button>
      </header>

      <div className="user-content">
        <div className="welcome-card">
          <h2>Welcome, Admin!</h2>
          <p>You have successfully logged in to Tatun's Kambingan.</p>
          <div className="user-info">
            <p><strong>Email:</strong> admin</p>
            <p><strong>Role:</strong> Administrator</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserPage
