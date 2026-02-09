import { useState } from 'react'
import './Dashboard.css'
import Navbar from './elements/Navbar'

function Dashboard({ onLogout, onNavigate }) {
  const [timeFilter, setTimeFilter] = useState('Daily')

  const mostSoldProducts = [
    { name: 'Sinigang na Baka', orders: 24, image: '🍲' },
    { name: 'Daing na Bangus', orders: 20, image: '🐟' },
    { name: 'Labong Saluyot', orders: 18, image: '🥗' },
    { name: 'Dinuguan', orders: 18, image: '🍖' },
    { name: 'Crispy Pork Sisig', orders: 15, image: '🥘' },
    { name: 'Bagis Kalabaw', orders: 8, image: '🍗' },
  ]

  return (
    <div className="dashboard-container">
      <Navbar onLogout={onLogout} activePage="dashboard" onNavigate={onNavigate} />

      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>Manager Dashboard</h1>
          <div className="time-filters">
            <button 
              className={`filter-btn ${timeFilter === 'Daily' ? 'active' : ''}`}
              onClick={() => setTimeFilter('Daily')}
            >
              Daily <span className="arrow">▼</span>
            </button>
            <button 
              className={`filter-btn ${timeFilter === 'Monthly' ? 'active' : ''}`}
              onClick={() => setTimeFilter('Monthly')}
            >
              Monthly <span className="arrow">▼</span>
            </button>
            <button 
              className={`filter-btn ${timeFilter === 'Yearly' ? 'active' : ''}`}
              onClick={() => setTimeFilter('Yearly')}
            >
              Yearly <span className="arrow">▼</span>
            </button>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-section total-sales">
            <h2>Total Sales</h2>
            <div className="sales-content">
              <div className="pie-chart">
                <svg viewBox="0 0 200 200" className="chart-svg">
                  {/* Cyan - Food (60%) */}
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="transparent"
                    stroke="#5BC0BE"
                    strokeWidth="60"
                    strokeDasharray="301.59 502.65"
                    transform="rotate(-90 100 100)"
                  />
                  {/* Red - Drinks (25%) */}
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="transparent"
                    stroke="#E07A5F"
                    strokeWidth="60"
                    strokeDasharray="125.66 502.65"
                    strokeDashoffset="-301.59"
                    transform="rotate(-90 100 100)"
                  />
                  {/* Yellow - Others (15%) */}
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="transparent"
                    stroke="#F2CC8F"
                    strokeWidth="60"
                    strokeDasharray="75.4 502.65"
                    strokeDashoffset="-427.25"
                    transform="rotate(-90 100 100)"
                  />
                  <text x="100" y="95" textAnchor="middle" className="chart-label-small">UD</text>
                  <text x="100" y="115" textAnchor="middle" className="chart-label-small">35K%</text>
                </svg>
              </div>
              <div className="sales-info">
                <div className="sales-amount">₱ 250, 323</div>
                <div className="sales-legend">
                  <div className="legend-item">
                    <span className="legend-color" style={{backgroundColor: '#5BC0BE'}}></span>
                    <span>Food</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color" style={{backgroundColor: '#E07A5F'}}></span>
                    <span>Drinks</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color" style={{backgroundColor: '#F2CC8F'}}></span>
                    <span>Others</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-section real-time-orders">
            <h2>Real Time Order Monitoring</h2>
            <div className="orders-content">
              <div className="order-row">
                <span className="order-label">Pending Orders</span>
                <span className="order-count">17</span>
              </div>
              <div className="order-row">
                <span className="order-label">Completed Orders</span>
                <span className="order-count">23</span>
              </div>
            </div>
            <div className="orders-header">Orders</div>
          </div>

          <div className="dashboard-section most-sold">
            <h2>Most Sold</h2>
            <div className="most-sold-header">
              <span>Product</span>
              <span>Orders</span>
            </div>
            <div className="most-sold-list">
              {mostSoldProducts.map((product, index) => (
                <div key={index} className="product-item">
                  <div className="product-info">
                    <div className="product-image">{product.image}</div>
                    <span className="product-name">{product.name}</span>
                  </div>
                  <span className="product-orders">{product.orders}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
