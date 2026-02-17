import { useMemo, useRef, useState } from 'react'
import Navbar from './elements/Navbar'
import './CompletedOrders.css'
import { formatMoney } from './utils/numberFormat'

function CompletedOrders({ onLogout, onNavigate, userRole = 'admin', userName = 'Admin User' }) {
  const todayKey = new Date().toDateString()
  const isAdmin = userRole === 'admin'

  const contentRef = useRef(null)

  const [orders, setOrders] = useState(() => {
    let persisted = []
    try {
      const raw = localStorage.getItem('completedOrders')
      const parsed = raw ? JSON.parse(raw) : []
      persisted = Array.isArray(parsed) ? parsed : []
    } catch {
      persisted = []
    }

    const base = [
      {
        id: 263,
        date: new Date().toISOString(),
        orderType: 'Dine - In',
        paid: true,
        items: [
          { id: 'a', name: 'Sinigang na Baka', qty: 1, price: 199.0 },
          { id: 'b', name: 'Lumpiang Shanghai', qty: 1, price: 170.0 },
          { id: 'c', name: 'Ensalada', qty: 2, price: 170.0 },
          { id: 'd', name: 'Daing na Bangus', qty: 1, price: 189.0 },
        ],
      },
      {
        id: 268,
        date: new Date().toISOString(),
        orderType: 'Dine - In',
        paid: true,
        items: [
          { id: 'a', name: 'Rice', qty: 2, price: 40.0 },
          { id: 'b', name: 'Coke', qty: 1, price: 60.0 },
          { id: 'c', name: 'Sisig', qty: 1, price: 130.0 },
        ],
      },
      {
        id: 241,
        date: new Date(Date.now() - 86400000).toISOString(),
        orderType: 'Take - Out',
        paid: false,
        items: [
          { id: 'a', name: 'Bulalo', qty: 1, price: 250.0 },
          { id: 'b', name: 'Rice', qty: 2, price: 40.0 },
        ],
      },
      {
        id: 198,
        date: new Date(Date.now() - 4 * 86400000).toISOString(),
        orderType: 'Dine - In',
        paid: true,
        items: [
          { id: 'a', name: 'Kare-Kare', qty: 1, price: 220.0 },
          { id: 'b', name: 'Rice', qty: 3, price: 40.0 },
          { id: 'c', name: 'Iced Tea', qty: 2, price: 60.0 },
        ],
      },
    ]

    const menuPool = [
      { name: 'Sinigang na Baka', price: 199.0 },
      { name: 'Lumpiang Shanghai', price: 170.0 },
      { name: 'Kare-Kare', price: 220.0 },
      { name: 'Bulalo', price: 250.0 },
      { name: 'Sisig', price: 185.0 },
      { name: "Tokwa't Baboy", price: 155.0 },
      { name: 'Rice', price: 40.0 },
      { name: 'Coke', price: 60.0 },
      { name: 'Iced Tea', price: 60.0 },
    ]

    const generated = Array.from({ length: 24 }, (_, idx) => {
      const id = 300 + idx
      const daysAgo = 2 + idx
      const paid = idx % 3 !== 0
      const orderType = idx % 2 === 0 ? 'Dine - In' : 'Take - Out'
      const itemCount = 2 + (idx % 3)
      const items = Array.from({ length: itemCount }, (__, itemIdx) => {
        const pick = menuPool[(idx + itemIdx) % menuPool.length]
        const qty = 1 + ((idx + itemIdx) % 2)
        return { id: String.fromCharCode(97 + itemIdx), name: pick.name, qty, price: pick.price }
      })

      return {
        id,
        date: new Date(Date.now() - daysAgo * 86400000).toISOString(),
        orderType,
        paid,
        items,
      }
    })

    const baseAll = [...base, ...generated]
    const deduped = [...persisted, ...baseAll].filter(Boolean).reduce((acc, o) => {
      if (!o || !o.id) return acc
      if (acc.seen.has(o.id)) return acc
      acc.seen.add(o.id)
      acc.items.push(o)
      return acc
    }, { seen: new Set(), items: [] }).items

    return deduped
  })

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  const [historyPage, setHistoryPage] = useState(1)
  const historyPageSize = 10

  const [exportFormat, setExportFormat] = useState('csv')
  const [exportPeriod, setExportPeriod] = useState('monthly')
  const [exportMonth, setExportMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [exportQuarter, setExportQuarter] = useState('Q1')
  const [exportYear, setExportYear] = useState(String(new Date().getFullYear()))
  const [exportStart, setExportStart] = useState('')
  const [exportEnd, setExportEnd] = useState('')

  const ordersWithTotals = useMemo(() => {
    return orders
      .map((o) => {
        const total = o.items.reduce((sum, it) => sum + Number(it.price || 0) * Number(it.qty || 0), 0)
        const dateObj = new Date(o.date)
        return { ...o, total, dateObj, isToday: dateObj.toDateString() === todayKey }
      })
      .sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime())
  }, [orders, todayKey])

  const todayOrders = useMemo(() => ordersWithTotals.filter((o) => o.isToday), [ordersWithTotals])
  const historyOrders = useMemo(() => ordersWithTotals.filter((o) => !o.isToday), [ordersWithTotals])

  const historyPageCount = useMemo(() => {
    return Math.max(1, Math.ceil(historyOrders.length / historyPageSize))
  }, [historyOrders.length])

  const pagedHistoryOrders = useMemo(() => {
    const safePage = Math.min(Math.max(1, historyPage), historyPageCount)
    const start = (safePage - 1) * historyPageSize
    return historyOrders.slice(start, start + historyPageSize)
  }, [historyOrders, historyPage, historyPageCount])

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null
    return ordersWithTotals.find((o) => o.id === selectedOrderId) || null
  }, [ordersWithTotals, selectedOrderId])

  const togglePaid = (orderId) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, paid: !o.paid } : o)))
  }

  const exportRows = useMemo(() => {
    const yearNum = Number(exportYear)
    const safeYear = Number.isFinite(yearNum) ? yearNum : new Date().getFullYear()

    const inRange = (dateObj, start, end) => {
      if (!start || !end) return false
      const t = dateObj.getTime()
      return t >= start.getTime() && t <= end.getTime()
    }

    const monthStartEnd = () => {
      if (!exportMonth) return null
      const [y, m] = exportMonth.split('-').map((n) => Number(n))
      if (!y || !m) return null
      const start = new Date(y, m - 1, 1)
      const end = new Date(y, m, 0, 23, 59, 59, 999)
      return { start, end }
    }

    const quarterStartEnd = () => {
      const qMap = { Q1: 0, Q2: 3, Q3: 6, Q4: 9 }
      const startMonth = qMap[exportQuarter] ?? 0
      const start = new Date(safeYear, startMonth, 1)
      const end = new Date(safeYear, startMonth + 3, 0, 23, 59, 59, 999)
      return { start, end }
    }

    const yearStartEnd = () => {
      const start = new Date(safeYear, 0, 1)
      const end = new Date(safeYear, 11, 31, 23, 59, 59, 999)
      return { start, end }
    }

    let windowRange = null
    if (exportPeriod === 'monthly') windowRange = monthStartEnd()
    if (exportPeriod === 'quarterly') windowRange = quarterStartEnd()
    if (exportPeriod === 'yearly') windowRange = yearStartEnd()
    if (exportPeriod === 'range') {
      if (!exportStart || !exportEnd) windowRange = null
      else {
        const start = new Date(exportStart)
        const end = new Date(exportEnd)
        end.setHours(23, 59, 59, 999)
        windowRange = { start, end }
      }
    }

    const filtered = windowRange
      ? ordersWithTotals.filter((o) => inRange(o.dateObj, windowRange.start, windowRange.end))
      : []

    return filtered.map((o) => {
      const itemsText = (o.items || [])
        .map((it) => `${it.name} x${it.qty}`)
        .join('; ')

      return {
        orderId: o.id,
        date: o.dateObj.toLocaleDateString(),
        total: Number(o.total || 0).toFixed(2),
        status: o.paid ? 'PAID' : 'UNPAID',
        type: o.orderType,
        items: itemsText,
      }
    })
  }, [ordersWithTotals, exportEnd, exportMonth, exportPeriod, exportQuarter, exportStart, exportYear])

  const exportDisabled = useMemo(() => {
    if (exportPeriod === 'monthly') return !exportMonth
    if (exportPeriod === 'range') return !exportStart || !exportEnd
    if (exportPeriod === 'quarterly') return !String(exportYear || '').trim()
    if (exportPeriod === 'yearly') return !String(exportYear || '').trim()
    return true
  }, [exportEnd, exportMonth, exportPeriod, exportStart, exportYear])

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleExport = async () => {
    const baseName = `completed-orders-${exportPeriod}`

    if (exportFormat === 'csv') {
      const header = ['Order ID', 'Date', 'Total', 'Status', 'Type', 'Items']
      const lines = [header.join(',')]
      exportRows.forEach((r) => {
        const esc = (v) => {
          const s = String(v ?? '')
          const safe = s.replaceAll('"', '""')
          return `"${safe}"`
        }
        lines.push([r.orderId, r.date, r.total, r.status, r.type, r.items].map(esc).join(','))
      })

      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
      downloadBlob(blob, `${baseName}.csv`)
      return
    }

    // Excel export: lazy-load xlsx to keep bundle smaller
    const xlsx = await import('xlsx')
    const ws = xlsx.utils.json_to_sheet(
      exportRows.map((r) => ({
        'Order ID': r.orderId,
        Date: r.date,
        Total: r.total,
        Status: r.status,
        Type: r.type,
        Items: r.items,
      }))
    )
    const wb = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(wb, ws, 'Completed Orders')
    const out = xlsx.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([out], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    downloadBlob(blob, `${baseName}.xlsx`)
  }

  return (
    <div className="page-container completed-orders-page">
      <Navbar
        onLogout={onLogout}
        activePage="completed"
        onNavigate={onNavigate}
        role={userRole}
        user={{ name: userName, role: userRole === 'admin' ? 'Administrator' : 'Staff' }}
      />

      <div className="page-content completed-orders-content" ref={contentRef}>
        <div className="orders-layout">
          <div className="orders-list-panel">
            <div className="orders-list-header">
              <div className="orders-list-col left">Complete</div>
              <div className="orders-list-col">Total</div>
              <div className="orders-list-col right">Status</div>
            </div>

            <div className="order-cards">
              {todayOrders.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={`order-card ${selectedOrderId === o.id && detailsOpen ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedOrderId(o.id)
                    setDetailsOpen(true)
                  }}
                >
                  <div className="order-card-order">
                    <span className="order-link">Order #{o.id}</span>
                  </div>
                  <div className="order-card-total">₱ {formatMoney(o.total)}</div>
                  <div className="order-card-status">
                    <div className={`status-pill ${o.paid ? 'paid' : 'unpaid'}`}>{o.paid ? 'PAID' : 'UNPAID'}</div>
                  </div>
                </button>
              ))}
              {!todayOrders.length ? <div className="empty-note">No completed orders today.</div> : null}
            </div>
          </div>

          {detailsOpen && selectedOrder ? (
            <div className="order-details-panel">
              <button className="details-close" type="button" onClick={() => setDetailsOpen(false)}>
                {'<'} Close
              </button>

              <div className="details-title">Order Details:</div>
              <div className="details-order">Order #{selectedOrder.id}</div>
              <div className="details-sub">
                <span>{selectedOrder.dateObj.toLocaleDateString()}</span>
              </div>

              <div className="details-items">
                {selectedOrder.items.map((it) => (
                  <div key={it.id} className="details-item">
                    <div className="item-image" aria-hidden="true" />
                    <div className="item-main">
                      <div className="item-name">{it.name}</div>
                      <div className="item-qty">Qty. {it.qty}</div>
                    </div>
                    <div className="item-right">
                      <div className="item-price">₱ {formatMoney(Number(it.price || 0) * Number(it.qty || 0))}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="details-footer">
                <div className="details-row">
                  <span>Total:</span>
                  <span className="details-total">₱ {formatMoney(selectedOrder.total)}</span>
                </div>
                <div className="details-row">
                  <span>Order Type:</span>
                  <span className="details-type">{selectedOrder.orderType}</span>
                </div>
                <button
                  type="button"
                  className={`paid-toggle ${selectedOrder.paid ? 'paid' : 'unpaid'}`}
                  onClick={() => togglePaid(selectedOrder.id)}
                >
                  {selectedOrder.paid ? 'MARK AS UNPAID' : 'MARK AS PAID'}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {isAdmin ? (
          <div className="completed-table-section">
            <h2 className="completed-table-title">Completed Order History</h2>
            <div className="completed-table">
              <div className="completed-table-head">
                <div>Order</div>
                <div>Date</div>
                <div>Total</div>
                <div>Status</div>
                <div>Type</div>
                <div>Action</div>
              </div>
              <div className="completed-table-body">
                {pagedHistoryOrders.map((o) => (
                  <div key={o.id} className="completed-row">
                    <div className="cell">Order #{o.id}</div>
                    <div className="cell">{o.dateObj.toLocaleDateString()}</div>
                    <div className="cell">₱ {formatMoney(o.total)}</div>
                    <div className="cell">
                      <button
                        type="button"
                        className={`status-pill ${o.paid ? 'paid' : 'unpaid'} clickable`}
                        onClick={() => togglePaid(o.id)}
                        aria-label="Toggle paid status"
                      >
                        {o.paid ? 'PAID' : 'UNPAID'}
                      </button>
                    </div>
                    <div className="cell">{o.orderType}</div>
                    <div className="cell">
                      <button
                        type="button"
                        className="view-btn"
                        onClick={() => {
                          setSelectedOrderId(o.id)
                          setDetailsOpen(true)
                          if (contentRef.current) {
                            contentRef.current.scrollTop = 0
                          }
                        }}
                      >
                        VIEW
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="completed-table-nav" aria-label="Completed orders navigation">
              <button
                type="button"
                className="completed-nav-btn"
                onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                disabled={historyPage <= 1}
              >
                PREV
              </button>
              <div className="completed-nav-label">
                Page {Math.min(Math.max(1, historyPage), historyPageCount)} of {historyPageCount}
              </div>
              <button
                type="button"
                className="completed-nav-btn"
                onClick={() => setHistoryPage((p) => Math.min(historyPageCount, p + 1))}
                disabled={historyPage >= historyPageCount}
              >
                NEXT
              </button>
            </div>

            <div className="export-section" aria-label="Export completed orders">
              <div className="export-title">Export</div>

              <div className="export-controls">
                <label className="export-field">
                  <span>Format</span>
                  <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
                    <option value="csv">CSV</option>
                    <option value="excel">Excel</option>
                  </select>
                </label>

                <label className="export-field">
                  <span>Period</span>
                  <select value={exportPeriod} onChange={(e) => setExportPeriod(e.target.value)}>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                    <option value="range">Range</option>
                  </select>
                </label>

                {exportPeriod === 'monthly' ? (
                  <label className="export-field">
                    <span>Month</span>
                    <input type="month" value={exportMonth} onChange={(e) => setExportMonth(e.target.value)} />
                  </label>
                ) : null}

                {exportPeriod === 'quarterly' ? (
                  <>
                    <label className="export-field">
                      <span>Quarter</span>
                      <select value={exportQuarter} onChange={(e) => setExportQuarter(e.target.value)}>
                        <option value="Q1">Q1</option>
                        <option value="Q2">Q2</option>
                        <option value="Q3">Q3</option>
                        <option value="Q4">Q4</option>
                      </select>
                    </label>
                    <label className="export-field">
                      <span>Year</span>
                      <input type="number" value={exportYear} onChange={(e) => setExportYear(e.target.value)} />
                    </label>
                  </>
                ) : null}

                {exportPeriod === 'yearly' ? (
                  <label className="export-field">
                    <span>Year</span>
                    <input type="number" value={exportYear} onChange={(e) => setExportYear(e.target.value)} />
                  </label>
                ) : null}

                {exportPeriod === 'range' ? (
                  <>
                    <label className="export-field">
                      <span>Start</span>
                      <input type="date" value={exportStart} onChange={(e) => setExportStart(e.target.value)} />
                    </label>
                    <label className="export-field">
                      <span>End</span>
                      <input type="date" value={exportEnd} onChange={(e) => setExportEnd(e.target.value)} />
                    </label>
                  </>
                ) : null}

                <button type="button" className="export-btn" onClick={handleExport} disabled={exportDisabled}>
                  EXPORT
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default CompletedOrders
