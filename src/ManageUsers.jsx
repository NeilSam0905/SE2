import Navbar from './elements/Navbar'
import './ManageUsers.css'

function ManageUsers({ onLogout, onNavigate }) {
  return (
    <div className="page-container">
      <Navbar onLogout={onLogout} activePage="users" onNavigate={onNavigate} />
      <div className="page-content">
        <h1>Manage Users</h1>
        <p>User management content coming soon...</p>
      </div>
    </div>
  )
}

export default ManageUsers
