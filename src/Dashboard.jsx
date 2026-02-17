import { useMemo, useState } from 'react'
import './Dashboard.css'
import Navbar from './elements/Navbar'
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatInteger } from './utils/numberFormat'

function Dashboard({ onLogout, onNavigate, userRole = 'admin', userName = 'Admin User' }) {
  const [timeFilter, setTimeFilter] = useState('Daily')
  const [showDailyCalendar, setShowDailyCalendar] = useState(false)
  const [showWeeklyCalendar, setShowWeeklyCalendar] = useState(false)
  const [showMonthlyCalendar, setShowMonthlyCalendar] = useState(false)
  const [showYearlyCalendar, setShowYearlyCalendar] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())

  const [prepItemFilter, setPrepItemFilter] = useState('ALL')
  const [showPrepFilter, setShowPrepFilter] = useState(false)

  const prepFilterItems = useMemo(() => {
    return [
      { key: 'ALL', label: 'All' },
      { key: 'Sinigang na Baka', label: 'Sinigang na Baka' },
      { key: 'Lumpiang Shanghai', label: 'Lumpiang Shanghai' },
      { key: 'Ensalada', label: 'Ensalada' },
      { key: 'Daing na Bangus', label: 'Daing na Bangus' },
      { key: 'Kare-Kare', label: 'Kare-Kare' },
      { key: 'Bulalo', label: 'Bulalo' },
      { key: 'Sisig', label: 'Sisig' },
      { key: 'Coke', label: 'Coke' },
      { key: 'Iced Tea', label: 'Iced Tea' },
      { key: 'Calamansi Juice', label: 'Calamansi Juice' },
      { key: 'Bottled Water', label: 'Bottled Water' },
      { key: 'Hot Coffee', label: 'Hot Coffee' },
    ]
  }, [])

  const prepTimeByItem = useMemo(() => {
    return {
      'Sinigang na Baka': '6 mins',
      'Lumpiang Shanghai': '4 mins',
      Ensalada: '3 mins',
      'Daing na Bangus': '7 mins',
      'Kare-Kare': '8 mins',
      Bulalo: '9 mins',
      Sisig: '5 mins',
      Coke: '1 min',
      'Iced Tea': '2 mins',
      'Calamansi Juice': '2 mins',
      'Bottled Water': '1 min',
      'Hot Coffee': '3 mins',
    }
  }, [])

  const handleTimeFilterClick = (filter) => {
    setTimeFilter(filter)
    if (filter === 'Daily') {
      setShowDailyCalendar(!showDailyCalendar)
      setShowWeeklyCalendar(false)
      setShowMonthlyCalendar(false)
      setShowYearlyCalendar(false)
    } else if (filter === 'Weekly') {
      setShowWeeklyCalendar(!showWeeklyCalendar)
      setShowDailyCalendar(false)
      setShowMonthlyCalendar(false)
      setShowYearlyCalendar(false)
    } else if (filter === 'Monthly') {
      setShowMonthlyCalendar(!showMonthlyCalendar)
      setShowDailyCalendar(false)
      setShowWeeklyCalendar(false)
      setShowYearlyCalendar(false)
    } else if (filter === 'Yearly') {
      setShowYearlyCalendar(!showYearlyCalendar)
      setShowDailyCalendar(false)
      setShowWeeklyCalendar(false)
      setShowMonthlyCalendar(false)
    }
  }

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    return { firstDay, daysInMonth, year, month }
  }

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December']
  
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i)

  // Data based on time filter
  const getStatsData = () => {
    switch (timeFilter) {
      case 'Daily':
        return {
          revenue: 75745,
          orders: 231,
          prepTime: '5 mins',
          dineInPct: 62,
          takeOutPct: 38,
          revenueChange: '+12.15%',
          ordersChange: '+12.15%',
          prepChange: '-4.15%',
        }
      case 'Weekly':
        return {
          revenue: 510120,
          orders: 1620,
          prepTime: '6 mins',
          dineInPct: 58,
          takeOutPct: 42,
          revenueChange: '+6.8%',
          ordersChange: '+5.1%',
          prepChange: '-1.2%',
        }
      case 'Monthly':
        return {
          revenue: 2250323,
          orders: 6840,
          prepTime: '6 mins',
          dineInPct: 55,
          takeOutPct: 45,
          revenueChange: '+18.5%',
          ordersChange: '+15.2%',
          prepChange: '-2.8%',
        }
      case 'Yearly':
        return {
          revenue: 25000000,
          orders: 78500,
          prepTime: '5.5 mins',
          dineInPct: 60,
          takeOutPct: 40,
          revenueChange: '+22.7%',
          ordersChange: '+19.8%',
          prepChange: '-5.2%',
        }
      default:
        return {
          revenue: 75745,
          orders: 231,
          prepTime: '5 mins',
          dineInPct: 62,
          takeOutPct: 38,
          revenueChange: '+12.15%',
          ordersChange: '+12.15%',
          prepChange: '-4.15%',
        }
    }
  }

  const statsData = getStatsData()

  const displayedPrepTime = useMemo(() => {
    if (prepItemFilter === 'ALL') return statsData.prepTime
    return prepTimeByItem[prepItemFilter] || statsData.prepTime
  }, [prepItemFilter, prepTimeByItem, statsData.prepTime])

  const comparisonLabel = useMemo(() => {
    switch (timeFilter) {
      case 'Daily':
        return 'vs Yesterday'
      case 'Weekly':
        return 'vs Last Week'
      case 'Monthly':
        return 'vs Last Month'
      case 'Yearly':
        return 'vs Last Year'
      default:
        return 'vs Yesterday'
    }
  }, [timeFilter])

  const salesAmount = useMemo(() => `₱ ${formatInteger(statsData.revenue)}`, [statsData.revenue])

  const salesData = useMemo(() => {
    switch (timeFilter) {
      case 'Daily':
        return [
          { name: 'Food', value: 62, color: '#5BC0BE' },
          { name: 'Drinks', value: 23, color: '#E07A5F' },
          { name: 'Others', value: 15, color: '#F2CC8F' },
        ]
      case 'Weekly':
        return [
          { name: 'Food', value: 60, color: '#5BC0BE' },
          { name: 'Drinks', value: 25, color: '#E07A5F' },
          { name: 'Others', value: 15, color: '#F2CC8F' },
        ]
      case 'Monthly':
        return [
          { name: 'Food', value: 58, color: '#5BC0BE' },
          { name: 'Drinks', value: 27, color: '#E07A5F' },
          { name: 'Others', value: 15, color: '#F2CC8F' },
        ]
      case 'Yearly':
        return [
          { name: 'Food', value: 61, color: '#5BC0BE' },
          { name: 'Drinks', value: 24, color: '#E07A5F' },
          { name: 'Others', value: 15, color: '#F2CC8F' },
        ]
      default:
        return [
          { name: 'Food', value: 60, color: '#5BC0BE' },
          { name: 'Drinks', value: 25, color: '#E07A5F' },
          { name: 'Others', value: 15, color: '#F2CC8F' },
        ]
    }
  }, [timeFilter])

  const mostSoldProducts = useMemo(() => {
    // Categorized list for display
    switch (timeFilter) {
      case 'Daily':
        return [
          { category: 'Meat', name: 'Sinigang na Baka', orders: 24, revenue: 2480 },
          { category: 'Meat', name: 'Crispy Pork Sisig', orders: 15, revenue: 980 },
          { category: 'Vegetables', name: 'Labong Saluyot', orders: 18, revenue: 1400 },
          { category: 'Drinks', name: 'Coke', orders: 20, revenue: 2400 },
          { category: 'Others', name: 'Rice', orders: 32, revenue: 1600 },
        ]
      case 'Weekly':
        return [
          { category: 'Meat', name: 'Daing na Bangus', orders: 120, revenue: 14400 },
          { category: 'Meat', name: 'Dinuguan', orders: 98, revenue: 9800 },
          { category: 'Vegetables', name: 'Pinakbet', orders: 76, revenue: 7600 },
          { category: 'Drinks', name: 'Iced Tea', orders: 110, revenue: 8800 },
          { category: 'Others', name: 'Rice', orders: 260, revenue: 13000 },
        ]
      case 'Monthly':
        return [
          { category: 'Meat', name: 'Sinigang na Baka', orders: 620, revenue: 62000 },
          { category: 'Meat', name: 'Crispy Pork Sisig', orders: 510, revenue: 38250 },
          { category: 'Vegetables', name: 'Labong Saluyot', orders: 430, revenue: 32250 },
          { category: 'Drinks', name: 'Coke', orders: 740, revenue: 59200 },
          { category: 'Others', name: 'Rice', orders: 1800, revenue: 90000 },
        ]
      case 'Yearly':
        return [
          { category: 'Meat', name: 'Sinigang na Baka', orders: 7200, revenue: 720000 },
          { category: 'Meat', name: 'Crispy Pork Sisig', orders: 6100, revenue: 457500 },
          { category: 'Vegetables', name: 'Labong Saluyot', orders: 4800, revenue: 360000 },
          { category: 'Drinks', name: 'Coke', orders: 8200, revenue: 656000 },
          { category: 'Others', name: 'Rice', orders: 25000, revenue: 1250000 },
        ]
      default:
        return [
          { category: 'Meat', name: 'Sinigang na Baka', orders: 24, revenue: 2480 },
          { category: 'Vegetables', name: 'Labong Saluyot', orders: 18, revenue: 1400 },
          { category: 'Drinks', name: 'Coke', orders: 20, revenue: 2400 },
          { category: 'Others', name: 'Rice', orders: 32, revenue: 1600 },
        ]
    }
  }, [timeFilter])

  const categorizedMostSold = useMemo(() => {
    const order = ['Meat', 'Vegetables', 'Drinks', 'Others']
    const grouped = mostSoldProducts.reduce((acc, item) => {
      const key = item.category || 'Others'
      acc[key] = acc[key] || []
      acc[key].push(item)
      return acc
    }, {})
    return order
      .filter((k) => grouped[k] && grouped[k].length)
      .map((k) => ({ category: k, items: grouped[k] }))
  }, [mostSoldProducts])

  const trendXAxisLabel = useMemo(() => {
    switch (timeFilter) {
      case 'Daily':
        return 'Hours'
      case 'Weekly':
        return 'Day'
      case 'Monthly':
        return 'Day'
      case 'Yearly':
        return 'Months'
      default:
        return 'Hours'
    }
  }, [timeFilter])

  const trendData = useMemo(() => {
    switch (timeFilter) {
      case 'Daily':
        return [
          { time: '8 am', sales: 1000 },
          { time: '9 am', sales: 1500 },
          { time: '10 am', sales: 2000 },
          { time: '11 am', sales: 3000 },
          { time: '12 pm', sales: 5000 },
          { time: '1 pm', sales: 4500 },
          { time: '2 pm', sales: 3500 },
          { time: '3 pm', sales: 2800 },
          { time: '4 pm', sales: 2500 },
        ]
      case 'Weekly':
        return [
          { time: 'Mon', sales: 15000 },
          { time: 'Tue', sales: 18000 },
          { time: 'Wed', sales: 22000 },
          { time: 'Thu', sales: 20000 },
          { time: 'Fri', sales: 25000 },
          { time: 'Sat', sales: 30000 },
          { time: 'Sun', sales: 28000 },
        ]
      case 'Monthly':
        // Include month in the x-axis labels (e.g., "Feb 1") instead of plain numbers.
        const monthAbbr = months[selectedDate.getMonth()].slice(0, 3)
        return [
          { time: `${monthAbbr} 1`, sales: 72000 },
          { time: `${monthAbbr} 5`, sales: 98000 },
          { time: `${monthAbbr} 10`, sales: 105000 },
          { time: `${monthAbbr} 15`, sales: 112000 },
          { time: `${monthAbbr} 20`, sales: 96000 },
          { time: `${monthAbbr} 25`, sales: 120000 },
          { time: `${monthAbbr} 30`, sales: 115000 },
        ]
      case 'Yearly':
        return [
          { time: 'Jan', sales: 1800000 },
          { time: 'Feb', sales: 1650000 },
          { time: 'Mar', sales: 1950000 },
          { time: 'Apr', sales: 2100000 },
          { time: 'May', sales: 2250000 },
          { time: 'Jun', sales: 2050000 },
          { time: 'Jul', sales: 2400000 },
          { time: 'Aug', sales: 2350000 },
          { time: 'Sep', sales: 2200000 },
          { time: 'Oct', sales: 2500000 },
          { time: 'Nov', sales: 2650000 },
          { time: 'Dec', sales: 2800000 },
        ]
      default:
        return [
          { time: '8 am', sales: 1000 },
          { time: '9 am', sales: 1500 },
          { time: '10 am', sales: 2000 },
          { time: '11 am', sales: 3000 },
          { time: '12 pm', sales: 5000 },
          { time: '1 pm', sales: 4500 },
          { time: '2 pm', sales: 3500 },
          { time: '3 pm', sales: 2800 },
          { time: '4 pm', sales: 2500 },
        ]
    }
  }, [timeFilter, months, selectedDate])

  const formatMilitaryTime = (date) => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  const now = Date.now()
  const order4Time = formatMilitaryTime(new Date(now - 2 * 60 * 1000))
  const order2Time = formatMilitaryTime(new Date(now - 5 * 60 * 1000))

  return (
    <div className="dashboard-container">
      <Navbar
        onLogout={onLogout}
        activePage="dashboard"
        onNavigate={onNavigate}
        role={userRole}
        user={{ name: userName, role: userRole === 'admin' ? 'Administrator' : 'Staff' }}
      />

      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>Manager Dashboard</h1>
          <div className="time-filters">
            <div className="filter-wrapper">
              <button 
                className={`filter-btn ${timeFilter === 'Daily' ? 'active' : ''}`}
                onClick={() => handleTimeFilterClick('Daily')}
              >
                Daily <span className="arrow">▼</span>
              </button>
              {showDailyCalendar && (
                <div className="calendar-dropdown">
                  <div className="calendar-header">
                    <button onClick={() => {
                      const newDate = new Date(selectedDate)
                      newDate.setMonth(selectedDate.getMonth() - 1)
                      setSelectedDate(newDate)
                    }}>‹</button>
                    <span>{months[selectedDate.getMonth()]} {selectedDate.getFullYear()}</span>
                    <button onClick={() => {
                      const newDate = new Date(selectedDate)
                      newDate.setMonth(selectedDate.getMonth() + 1)
                      setSelectedDate(newDate)
                    }}>›</button>
                  </div>
                  <div className="calendar-grid">
                    <div className="calendar-day-header">Sun</div>
                    <div className="calendar-day-header">Mon</div>
                    <div className="calendar-day-header">Tue</div>
                    <div className="calendar-day-header">Wed</div>
                    <div className="calendar-day-header">Thu</div>
                    <div className="calendar-day-header">Fri</div>
                    <div className="calendar-day-header">Sat</div>
                    {(() => {
                      const { firstDay, daysInMonth } = getDaysInMonth(selectedDate)
                      const days = []
                      for (let i = 0; i < firstDay; i++) {
                        days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>)
                      }
                      for (let day = 1; day <= daysInMonth; day++) {
                        const isToday = day === new Date().getDate() && 
                                      selectedDate.getMonth() === new Date().getMonth() &&
                                      selectedDate.getFullYear() === new Date().getFullYear()
                        days.push(
                          <div 
                            key={day} 
                            className={`calendar-day ${isToday ? 'today' : ''}`}
                            onClick={() => {
                              const newDate = new Date(selectedDate)
                              newDate.setDate(day)
                              setSelectedDate(newDate)
                              setShowDailyCalendar(false)
                            }}
                          >
                            {day}
                          </div>
                        )
                      }
                      return days
                    })()}
                  </div>
                </div>
              )}
            </div>
            <div className="filter-wrapper">
              <button 
                className={`filter-btn ${timeFilter === 'Weekly' ? 'active' : ''}`}
                onClick={() => handleTimeFilterClick('Weekly')}
              >
                Weekly <span className="arrow">▼</span>
              </button>
              {showWeeklyCalendar && (
                <div className="calendar-dropdown">
                  <div className="calendar-header">
                    <span>Week</span>
                  </div>
                  <div className="calendar-week-note">
                    Weekly view uses the current week.
                  </div>
                </div>
              )}
            </div>
            <div className="filter-wrapper">
              <button 
                className={`filter-btn ${timeFilter === 'Monthly' ? 'active' : ''}`}
                onClick={() => handleTimeFilterClick('Monthly')}
              >
                Monthly <span className="arrow">▼</span>
              </button>
              {showMonthlyCalendar && (
                <div className="calendar-dropdown monthly">
                  <div className="calendar-header">
                    <button onClick={() => {
                      const newDate = new Date(selectedDate)
                      newDate.setFullYear(selectedDate.getFullYear() - 1)
                      setSelectedDate(newDate)
                    }}>‹</button>
                    <span>{selectedDate.getFullYear()}</span>
                    <button onClick={() => {
                      const newDate = new Date(selectedDate)
                      newDate.setFullYear(selectedDate.getFullYear() + 1)
                      setSelectedDate(newDate)
                    }}>›</button>
                  </div>
                  <div className="months-grid">
                    {months.map((month, index) => (
                      <div 
                        key={month}
                        className={`month-item ${selectedDate.getMonth() === index ? 'selected' : ''}`}
                        onClick={() => {
                          const newDate = new Date(selectedDate)
                          newDate.setMonth(index)
                          setSelectedDate(newDate)
                          setShowMonthlyCalendar(false)
                        }}
                      >
                        {month.slice(0, 3)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="filter-wrapper">
              <button 
                className={`filter-btn ${timeFilter === 'Yearly' ? 'active' : ''}`}
                onClick={() => handleTimeFilterClick('Yearly')}
              >
                Yearly <span className="arrow">▼</span>
              </button>
              {showYearlyCalendar && (
                <div className="calendar-dropdown yearly">
                  <div className="years-grid">
                    {years.map((year) => (
                      <div 
                        key={year}
                        className={`year-item ${selectedDate.getFullYear() === year ? 'selected' : ''}`}
                        onClick={() => {
                          const newDate = new Date(selectedDate)
                          newDate.setFullYear(year)
                          setSelectedDate(newDate)
                          setShowYearlyCalendar(false)
                        }}
                      >
                        {year}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* First Section */}
        <div className="dashboard-section-wrapper">
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Sales</h3>
              <div className="stat-value">₱ {formatInteger(statsData.revenue)}</div>
              <div className="stat-change positive">
                <span className="arrow-up">↑</span> {statsData.revenueChange} <span className="vs-text">{comparisonLabel}</span>
              </div>
            </div>

            <div className="stat-card">
              <h3>Total Orders</h3>
              <div className="stat-value">{formatInteger(statsData.orders)}</div>
              <div className="stat-change positive">
                <span className="arrow-up">↑</span> {statsData.ordersChange} <span className="vs-text">{comparisonLabel}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-head">
                <h3>Avg Prep Time</h3>
                <div className="prep-filter-row prep-filter-row--top">
                  <button
                    type="button"
                    className="prep-filter-btn"
                    onClick={() => setShowPrepFilter((v) => !v)}
                  >
                    {prepItemFilter === 'ALL' ? 'All' : prepItemFilter} <span className="arrow">▼</span>
                  </button>
                  {showPrepFilter ? (
                    <div className="prep-filter-menu">
                      {prepFilterItems.map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          className={`prep-filter-item ${prepItemFilter === opt.key ? 'active' : ''}`}
                          onClick={() => {
                            setPrepItemFilter(opt.key)
                            setShowPrepFilter(false)
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="stat-value">{displayedPrepTime}</div>
              <div className="stat-change negative">
                <span className="arrow-down">↓</span> {statsData.prepChange} <span className="vs-text">{comparisonLabel}</span>
              </div>
            </div>

            <div className="stat-card">
              <h3>Dine - In & Take-Out Ratio</h3>
              <div className="ratio-value">
                <span className="ratio-part dinein">{statsData.dineInPct}%</span>
                <span className="ratio-sep">/</span>
                <span className="ratio-part takeout">{statsData.takeOutPct}%</span>
              </div>
              <div className="ratio-labels">
                <span className="ratio-label">Dine-In</span>
                <span className="ratio-label">Take-Out</span>
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
                  <div className="sales-amount">{salesAmount}</div>
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
                <span>Sales</span>
              </div>
              <div className="most-sold-list">
                {categorizedMostSold.map((group) => (
                  <div key={group.category} className="most-sold-category">
                    <div className="most-sold-category-title">{group.category}</div>
                    {group.items.map((product, index) => (
                      <div key={`${group.category}-${index}`} className="product-item">
                        <div className="product-info">
                          <div className="product-image"></div>
                          <span className="product-name">{product.name}</span>
                        </div>
                        <span className="product-orders">{formatInteger(product.orders)}</span>
                        <span className="product-revenue">₱{formatInteger(product.revenue)}</span>
                      </div>
                    ))}
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
                <h2>Sales Trend</h2>
                <div className="trend-axis-label">{trendXAxisLabel}</div>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={trendData} margin={{ top: 20, right: 30, left: 90, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
                  <XAxis dataKey="time" stroke="#666" />
                  <YAxis 
                    stroke="#666" 
                    tickFormatter={(value) => `₱${formatInteger(value)}`}
                  />
                  <Tooltip 
                    formatter={(value) => [`₱${formatInteger(value)}`, 'Sales']}
                    contentStyle={{ backgroundColor: '#fff', border: '2px solid #000', borderRadius: '8px' }}
                  />
                  <Line type="monotone" dataKey="sales" stroke="#6a1b1a" strokeWidth={3} dot={{ r: 4 }} />
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
                  </div>
                  <div className="order-stamp">{order4Time}</div>
                </div>
                <div className="order-item preparing">
                  <div className="order-indicator"></div>
                  <div className="order-details">
                    <div className="order-number">Order 2 - Preparing</div>
                    <div className="order-description">2x Bangus, 3x Rice, 1x Sprite</div>
                  </div>
                  <div className="order-stamp">{order2Time}</div>
                </div>
              </div>
            </div>

            <div className="dashboard-section monitoring-section">
              <h2>Real Time Order Monitoring</h2>
              <div className="monitoring-content">
                <div className="monitoring-row">
                  <span className="monitoring-label">Pending Orders</span>
                  <span className="monitoring-count">{formatInteger(17)}</span>
                </div>
                <div className="monitoring-row">
                  <span className="monitoring-label">Completed Orders</span>
                  <span className="monitoring-count">{formatInteger(23)}</span>
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

