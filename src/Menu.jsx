import Navbar from './elements/Navbar'
import './Menu.css'

function Menu({ onLogout, onNavigate }) {
  return (
    <div className="page-container">
      <Navbar onLogout={onLogout} activePage="menu" onNavigate={onNavigate} />
      <div className="page-content">
        <h1>Menu Page</h1>
        <p>Menu content coming soon...</p>
      </div>
    </div>
  )
}

export default Menu
