import { useState } from 'react'
import './Dashboard.css'
import Navbar from './elements/Navbar'
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function Dashboard({ onLogout, onNavigate }) {
  const [timeFilter, setTimeFilter] = useState('Daily')
  const [trendFilter, setTrendFilter] = useState('Today')

  // Data based on time filter
  const getStatsData = () => {
    switch(timeFilter) {
      case 'Daily':
        return { revenue: '75,745', orders: 231, prepTime: '5 mins', revenue2: '75,745', revenueChange: '+12.15%', ordersChange: '+12.15%', prepChange: '-4.15%', revenue2Change: '-2.15%' }
      case 'Monthly':
        return { revenue: '2,250,323', orders: 6840, prepTime: '6 mins', revenue2: '2,150,000', revenueChange: '+18.5%', ordersChange: '+15.2%', prepChange: '-2.8%', revenue2Change: '+5.3%' }
      case 'Yearly':
        return { revenue: '25,000,000', orders: 78500, prepTime: '5.5 mins', revenue2: '24,500,000', revenueChange: '+22.7%', ordersChange: '+19.8%', prepChange: '-5.2%', revenue2Change: '+8.9%' }
      default:
        return { revenue: '75,745', orders: 231, prepTime: '5 mins', revenue2: '75,745', revenueChange: '+12.15%', ordersChange: '+12.15%', prepChange: '-4.15%', revenue2Change: '-2.15%' }
    }
  }

  const statsData = getStatsData()

  const mostSoldProducts = [
    { name: 'Sinigang na Baka', orders: 24, revenue: '₱2480' },
    { name: 'Daing na Bangus', orders: 20, revenue: '₱2400' },
    { name: 'Labong Saluyot', orders: 18, revenue: '₱1400' },
    { name: 'Dinuguan', orders: 18, revenue: '₱1400' },
    { name: 'Crispy Pork Sisig', orders: 15, revenue: '₱980' },
    { name: 'Bagis Kalabaw', orders: 8, revenue: '₱960' },
  ]

  const salesData = [
    { name: 'Food', value: 60, color: '#5BC0BE' },
    { name: 'Drinks', value: 25, color: '#E07A5F' },
    { name: 'Others', value: 15, color: '#F2CC8F' },
  ]

  const getHourlyData = () => {
    switch(trendFilter) {
      case 'Today':
        return [
          { time: '8 am', sales: 1000 },
          { time: '9 am', sales: 1500 },
          { time: '10 am', sales: 2000 },
          { time: '11 am', sales: 3000 },
          { time: '12 am', sales: 5000 },
          { time: '1 pm', sales: 4500 },
          { time: '2 pm', sales: 3500 },
          { time: '3 pm', sales: 2800 },
          { time: '4 pm', sales: 2500 },
        ]
      case 'Yesterday':
        return [
          { time: '8 am', sales: 900 },
          { time: '9 am', sales: 1400 },
          { time: '10 am', sales: 1900 },
          { time: '11 am', sales: 2800 },
          { time: '12 am', sales: 4800 },
          { time: '1 pm', sales: 4200 },
          { time: '2 pm', sales: 3400 },
          { time: '3 pm', sales: 2600 },
          { time: '4 pm', sales: 2400 },
        ]
      case 'This Week':
        return [
          { time: 'Mon', sales: 15000 },
          { time: 'Tue', sales: 18000 },
          { time: 'Wed', sales: 22000 },
          { time: 'Thu', sales: 20000 },
          { time: 'Fri', sales: 25000 },
          { time: 'Sat', sales: 30000 },
          { time: 'Sun', sales: 28000 },
        ]
      default:
        return [
          { time: '8 am', sales: 1000 },
          { time: '9 am', sales: 1500 },
          { time: '10 am', sales: 2000 },
          { time: '11 am', sales: 3000 },
          { time: '12 am', sales: 5000 },
          { time: '1 pm', sales: 4500 },
          { time: '2 pm', sales: 3500 },
          { time: '3 pm', sales: 2800 },
          { time: '4 pm', sales: 2500 },
        ]
    }
  }

  const hourlyData = getHourlyData()

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

        {/* First Section */}
        <div className="dashboard-section-wrapper">
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Revenue</h3>
              <div className="stat-value">₱ {statsData.revenue}</div>
              <div className="stat-change positive">
                <span className="arrow-up">↑</span> {statsData.revenueChange} <span className="vs-text">vs Yesterday</span>
              </div>
            </div>

            <div className="stat-card">
              <h3>Total Orders</h3>
              <div className="stat-value">{statsData.orders}</div>
              <div className="stat-change positive">
                <span className="arrow-up">↑</span> {statsData.ordersChange} <span className="vs-text">vs Yesterday</span>
              </div>
            </div>

            <div className="stat-card">
              <h3>Avg Prep time</h3>
              <div className="stat-value">{statsData.prepTime}</div>
              <div className="stat-change negative">
                <span className="arrow-down">↓</span> {statsData.prepChange} <span className="vs-text">vs Yesterday</span>
              </div>
            </div>

            <div className="stat-card">
              <h3>di ko pa alam</h3>
              <div className="stat-value">₱ {statsData.revenue2}</div>
              <div className="stat-change negative">
                <span className="arrow-down">↓</span> {statsData.revenue2Change} <span className="vs-text">vs Yesterday</span>
              </div>
            </div>
          </div>

          <div className="main-grid">
            <div className="dashboard-section total-sales-section">
              <h2>Total Sales</h2>
              <div className="sales-content">
                <div className="pie-chart-container">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={salesData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {salesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => `${value}%`}
                        contentStyle={{ backgroundColor: '#fff', border: '2px solid #000', borderRadius: '8px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="chart-center-text">
                    <div className="center-label"></div>
                    <div className="center-value"></div>
                  </div>
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

            <div className="dashboard-section most-sold-section">
              <div className="most-sold-header-row">
                <h2>Most Sold Item</h2>
              </div>
              <div className="most-sold-table-header">
                <span>Product</span>
                <span>Orders</span>
                <span>Revenue</span>
              </div>
              <div className="most-sold-list">
                {mostSoldProducts.map((product, index) => (
                  <div key={index} className="product-item">
                    <div className="product-info">
                      <div className="product-image"></div>
                      <span className="product-name">{product.name}</span>
                    </div>
                    <span className="product-orders">{product.orders}</span>
                    <span className="product-revenue">{product.revenue}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Second Section */}
        <div className="dashboard-section-wrapper second-section">
          <div className="lower-grid">
            <div className="dashboard-section sales-trend-section">
              <div className="trend-header">
                <h2>Sales Trend (Hourly)</h2>
                <div className="trend-filter">
                  <button 
                    className={`filter-btn ${trendFilter === 'Today' ? 'active' : ''}`}
                    onClick={() => setTrendFilter('Today')}
                  >
                    Today <span className="arrow">▼</span>
                  </button>
                  <button 
                    className={`filter-btn ${trendFilter === 'Yesterday' ? 'active' : ''}`}
                    onClick={() => setTrendFilter('Yesterday')}
                  >
                    Yesterday <span className="arrow">▼</span>
                  </button>
                  <button 
                    className={`filter-btn ${trendFilter === 'This Week' ? 'active' : ''}`}
                    onClick={() => setTrendFilter('This Week')}
                  >
                    This Week <span className="arrow">▼</span>
                  </button>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={hourlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
                  <XAxis dataKey="time" stroke="#666" />
                  <YAxis 
                    stroke="#666" 
                    tickFormatter={(value) => `₱${value}`}
                  />
                  <Tooltip 
                    formatter={(value) => [`₱${value}`, 'Sales']}
                    contentStyle={{ backgroundColor: '#fff', border: '2px solid #000', borderRadius: '8px' }}
                  />
                  <Line type="monotone" dataKey="sales" stroke="#5BC0BE" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="dashboard-section real-time-order-section">
              <h2>Real Time Order</h2>
              <div className="order-list">
                <div className="order-item completed">
                  <div className="order-indicator"></div>
                  <div className="order-details">
                    <div className="order-number">Order 4 - Completed</div>
                    <div className="order-description">3x Baka, 4x Rice, 2x Coke</div>
                    <div className="order-time">2 mins ago</div>
                  </div>
                </div>
                <div className="order-item preparing">
                  <div className="order-indicator"></div>
                  <div className="order-details">
                    <div className="order-number">Order 2 - Preparing</div>
                    <div className="order-description">2x Bangus, 3x Rice, 1x Sprite</div>
                    <div className="order-time">5 mins ago</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="dashboard-section monitoring-section">
              <h2>Real Time Order Monitoring</h2>
              <div className="monitoring-content">
                <div className="monitoring-row">
                  <span className="monitoring-label">Pending Orders</span>
                  <span className="monitoring-count">17</span>
                </div>
                <div className="monitoring-row">
                  <span className="monitoring-label">Completed Orders</span>
                  <span className="monitoring-count">23</span>
                </div>
              </div>
              <div className="orders-text">Orders</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
