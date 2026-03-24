import { useEffect, useMemo, useRef, useState } from 'react'
import Navbar from './elements/Navbar'
import ConfirmModal from './elements/ConfirmModal'
import './styles/PendingOrders.css'
import { formatMoney } from './utils/numberFormat'
import { fetchOrdersWithItems, markOrderCompleted, subscribeToOrderRelatedChanges } from './data/orders'

function PendingOrders({ onLogout, onNavigate, userRole = 'admin', userName = 'Admin User' }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [servedOverrides, setServedOverrides] = useState({})
  const servedOverridesRef = useRef(servedOverrides)
  const refreshTimerRef = useRef(null)

  useEffect(() => {
    servedOverridesRef.current = servedOverrides
  }, [servedOverrides])

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState(null)

  const [showAllServedConfirm, setShowAllServedConfirm] = useState(false)
  const [pendingCompleteOrderId, setPendingCompleteOrderId] = useState(null)

  const loadOrders = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const list = await fetchOrdersWithItems({ completed: false })
      const merged = list.map((o) => ({
        ...o,
        items: (o.items || []).map((it) => ({
          ...it,
          served: servedOverridesRef.current[it.id] ?? Boolean(it.served),
        })),
      }))
      setOrders(merged)
    } catch (e) {
      console.error('Failed to load pending orders:', e)
      setLoadError('Failed to load pending orders.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()

    const unsubscribe = subscribeToOrderRelatedChanges(() => {
      // Batch bursts of changes into a single refresh.
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = setTimeout(() => {
        loadOrders()
      }, 150)
    })

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      unsubscribe()
    }
  }, [])

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

  const drawerOpen = Boolean(detailsOpen && selectedOrder)

  const setItemServed = (orderId, itemId, served) => {
    setServedOverrides((prev) => {
      const next = { ...prev, [itemId]: Boolean(served) }
      servedOverridesRef.current = next
      return next
    })
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o
        return {
          ...o,
          items: o.items.map((it) => (it.id === itemId ? { ...it, served: Boolean(served) } : it)),
        }
      }),
    )
  }

  const completeOrder = async (orderId) => {
    try {
      await markOrderCompleted(orderId)
      setOrders((prev) => prev.filter((o) => o.id !== orderId))
      if (selectedOrderId === orderId) {
        setDetailsOpen(false)
        setSelectedOrderId(null)
      }
    } catch (e) {
      console.error('Failed to complete order:', e)
      setLoadError('Failed to complete order.')
    }
  }

  const requestCompleteOrder = (orderId) => {
    setPendingCompleteOrderId(orderId)
    setShowAllServedConfirm(true)
  }

  return (
    <div className={`page-container pending-orders-page ${drawerOpen ? 'drawer-open' : ''}`}>
      <Navbar
        onLogout={onLogout}
        activePage="pending"
        onNavigate={onNavigate}
        role={userRole}
        user={{ name: userName, role: userRole === 'admin' ? 'Administrator' : 'Staff' }}
      />

      <div className="page-content pending-orders-content">
        <div className={`orders-layout ${drawerOpen ? 'drawer-open' : ''}`}>
          <div className="orders-list-panel">
            <div className="orders-list-header">
              <div className="orders-list-col left">Pending Orders</div>
              <div className="orders-list-col">Total</div>
              <div className="orders-list-col right">Status</div>
            </div>

            <div className="order-cards">
              {loadError ? <div className="pending-note">{loadError}</div> : null}
              {loading ? <div className="pending-note">Loading…</div> : null}
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
                    {o.orderType ? <span className="order-card-type">{o.orderType}</span> : null}
                  </div>
                  <div className="order-card-total">₱ {formatMoney(o.total)}</div>
                  <div className="order-card-status">
                    <div
                      className={`order-card-status-text ${
                        o.servedCount === o.totalCount ? 'done' : 'preparing'
                      }`}
                    >
                      {o.servedCount === o.totalCount
                        ? 'Status: Done'
                        : `Status: ${o.servedCount}/${o.totalCount} Preparing`}
                    </div>
                    <div className="status-pill unpaid">{o.paid ? 'PAID' : 'UNPAID'}</div>
                  </div>
                </button>
              ))}
              {!loading && !loadError && !ordersWithTotals.length ? (
                <div className="pending-note">No pending orders.</div>
              ) : null}
            </div>
          </div>

          {detailsOpen && selectedOrder ? (
            <>
              <div className="details-backdrop" role="presentation" onClick={() => setDetailsOpen(false)} />
              <div className="order-details-panel">
              <button className="details-close" type="button" onClick={() => setDetailsOpen(false)}>
                {'<'} Close
              </button>

              <div className="details-title">Order Details:</div>
              <div className="details-order">Order #{selectedOrder.id}</div>
              {selectedOrder.orderType ? (
                <div className="details-order-type">Order Type: {selectedOrder.orderType}</div>
              ) : null}
              <div className="details-status">
                {selectedOrder.servedCount === selectedOrder.totalCount
                  ? 'Status: Done'
                  : `Status: ${selectedOrder.servedCount}/${selectedOrder.totalCount} Served`}
              </div>

              <div className="details-items">
                {selectedOrder.items.map((it) => (
                  <div key={it.id} className="details-item">
                    <div className={`item-image-wrap ${it.served ? 'served' : 'unserved'}`}>
                      <img
                        className="item-image"
                        src={it.image || '/placeholder.svg'}
                        alt={it.name}
                        loading="lazy"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/placeholder.svg' }}
                      />
                    </div>
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
                <button type="button" className="all-served-btn" onClick={() => requestCompleteOrder(selectedOrder.id)}>
                  ALL SERVED
                </button>
              </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <ConfirmModal
        open={showAllServedConfirm}
        title={
          <>
            Confirm order completion?
            <br />
            This will move it to Completed Orders.
          </>
        }
        message="Please double-check all items are served before continuing."
        cancelText="Cancel"
        confirmText="Yes, complete"
        onCancel={() => {
          setShowAllServedConfirm(false)
          setPendingCompleteOrderId(null)
        }}
        onConfirm={() => {
          const orderId = pendingCompleteOrderId
          setShowAllServedConfirm(false)
          setPendingCompleteOrderId(null)
          if (orderId != null) completeOrder(orderId)
        }}
      />
    </div>
  )
}

export default PendingOrders
