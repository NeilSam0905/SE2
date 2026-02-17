import { useMemo, useState } from 'react'
import Navbar from './elements/Navbar'
import './PendingOrders.css'
import { formatMoney } from './utils/numberFormat'

function PendingOrders({ onLogout, onNavigate, userRole = 'admin', userName = 'Admin User' }) {
  const [orders, setOrders] = useState([
    {
      id: 263,
      orderType: 'Dine - In',
      paid: false,
      items: [
        { id: 'a', name: 'Sinigang na Baka', qty: 1, price: 199.0, served: true },
        { id: 'b', name: 'Pork Shanghai', qty: 1, price: 170.0, served: false },
        { id: 'c', name: 'Ensalada', qty: 2, price: 170.0, served: true },
        { id: 'd', name: 'Daing na Bangus', qty: 1, price: 189.0, served: false },
      ],
    },
    {
      id: 268,
      orderType: 'Dine - In',
      paid: false,
      items: [
        { id: 'a', name: 'Coke', qty: 2, price: 60.0, served: false },
        { id: 'b', name: 'Rice', qty: 3, price: 40.0, served: false },
        { id: 'c', name: 'Tokwa\'t Baboy', qty: 1, price: 110.0, served: false },
      ],
    },
  ])

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState(null)

  const pushCompletedOrder = (order) => {
    try {
      const key = 'completedOrders'
      const raw = localStorage.getItem(key)
      const current = raw ? JSON.parse(raw) : []
      const list = Array.isArray(current) ? current : []

      const completed = {
        id: order.id,
        date: new Date().toISOString(),
        orderType: order.orderType,
        paid: Boolean(order.paid),
        items: (order.items || []).map(({ served, ...rest }) => rest),
      }

      const deduped = [completed, ...list.filter((o) => o && o.id !== completed.id)]
      localStorage.setItem(key, JSON.stringify(deduped))
    } catch {
      // ignore storage failures
    }
  }

  const ordersWithTotals = useMemo(() => {
    return orders.map((o) => {
      const total = o.items.reduce((sum, it) => sum + Number(it.price || 0) * Number(it.qty || 0), 0)
      const servedCount = o.items.filter((it) => it.served).length
      const totalCount = o.items.length
      return { ...o, total, servedCount, totalCount }
    })
  }, [orders])

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null
    return ordersWithTotals.find((o) => o.id === selectedOrderId) || null
  }, [ordersWithTotals, selectedOrderId])

  const setItemServed = (orderId, itemId, served) => {
    setOrders((prev) => {
      const next = prev.map((o) => {
        if (o.id !== orderId) return o
        return {
          ...o,
          items: o.items.map((it) => (it.id === itemId ? { ...it, served: Boolean(served) } : it)),
        }
      })

      const updated = next.find((o) => o.id === orderId)
      const allServed = updated ? updated.items.every((it) => Boolean(it.served)) : false
      if (!allServed) return next

      if (updated) pushCompletedOrder(updated)
      if (selectedOrderId === orderId) {
        setDetailsOpen(false)
        setSelectedOrderId(null)
      }
      return next.filter((o) => o.id !== orderId)
    })
  }

  const setAllServed = (orderId) => {
    setOrders((prev) => {
      const next = prev.map((o) => {
        if (o.id !== orderId) return o
        return { ...o, items: o.items.map((it) => ({ ...it, served: true })) }
      })

      const updated = next.find((o) => o.id === orderId)
      const allServed = updated ? updated.items.every((it) => Boolean(it.served)) : false
      if (!allServed) return next

      if (updated) pushCompletedOrder(updated)
      if (selectedOrderId === orderId) {
        setDetailsOpen(false)
        setSelectedOrderId(null)
      }
      return next.filter((o) => o.id !== orderId)
    })
  }

  return (
    <div className="page-container pending-orders-page">
      <Navbar
        onLogout={onLogout}
        activePage="pending"
        onNavigate={onNavigate}
        role={userRole}
        user={{ name: userName, role: userRole === 'admin' ? 'Administrator' : 'Staff' }}
      />

      <div className="page-content pending-orders-content">
        <div className="orders-layout">
          <div className="orders-list-panel">
            <div className="orders-list-header">
              <div className="orders-list-col left">Pending Orders</div>
              <div className="orders-list-col">Total</div>
              <div className="orders-list-col right">Status</div>
            </div>

            <div className="order-cards">
              {ordersWithTotals.map((o) => (
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
                    <div className="order-card-status-text">
                      Status: {o.servedCount}/{o.totalCount} Preparing
                    </div>
                    <div className="status-pill unpaid">UNPAID</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {detailsOpen && selectedOrder ? (
            <div className="order-details-panel">
              <button className="details-close" type="button" onClick={() => setDetailsOpen(false)}>
                {'<'} Close
              </button>

              <div className="details-title">Order Details:</div>
              <div className="details-order">Order #{selectedOrder.id}</div>
              <div className="details-status">
                Status: {selectedOrder.servedCount}/{selectedOrder.totalCount} Served
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
                      <button
                        type="button"
                        className={`serve-btn ${it.served ? 'served' : 'unserved'}`}
                        onClick={() => setItemServed(selectedOrder.id, it.id, !it.served)}
                      >
                        {it.served ? 'SERVED' : 'UNSERVED'}
                      </button>
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
                <button type="button" className="all-served-btn" onClick={() => setAllServed(selectedOrder.id)}>
                  ALL SERVED
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default PendingOrders
