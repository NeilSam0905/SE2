import Navbar from './elements/Navbar'
import './CompletedOrders.css'

function CompletedOrders({ onLogout, onNavigate }) {
  return (
    <div className="page-container">
      <Navbar onLogout={onLogout} activePage="completed" onNavigate={onNavigate} />
      <div className="page-content">
        <h1>Completed Orders</h1>
        <p>Completed orders content coming soon...</p>
      </div>
    </div>
  )
}

export default CompletedOrders
