import Navbar from './elements/Navbar'
import './PendingOrders.css'

function PendingOrders({ onLogout, onNavigate }) {
  return (
    <div className="page-container">
      <Navbar onLogout={onLogout} activePage="pending" onNavigate={onNavigate} />
      <div className="page-content">
        <h1>Pending Orders</h1>
        <p>Pending orders content coming soon...</p>
      </div>
    </div>
  )
}

export default PendingOrders
