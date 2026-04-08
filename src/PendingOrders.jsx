import { useEffect, useMemo, useRef, useState } from 'react'
import Navbar from './elements/Navbar'
import ConfirmModal from './elements/ConfirmModal'
import './styles/PendingOrders.css'
import { formatMoney } from './utils/numberFormat'
import { fetchOrdersWithItems, markOrderCompleted, markOrderPreparing, markOrderCancelled, uncancelOrder, isPreparingStatus, isCancelledStatus, subscribeToOrderRelatedChanges } from './data/orders'
import placeholderSvg from '/placeholder.svg'

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

  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [pendingCancelOrderId, setPendingCancelOrderId] = useState(null)

  const [showUncancelConfirm, setShowUncancelConfirm] = useState(false)
  const [pendingUncancelOrderId, setPendingUncancelOrderId] = useState(null)

  const [cancelledOrders, setCancelledOrders] = useState([])
  const [selectedCancelledId, setSelectedCancelledId] = useState(null)

  const initialLoadDone = useRef(false)

  const loadOrders = async ({ silent = false } = {}) => {
    if (!silent) { setLoading(true); setLoadError('') }
    try {
      const [list, cancelled] = await Promise.all([
        fetchOrdersWithItems({ completed: false }),
        fetchOrdersWithItems({ completed: 'cancelled' }),
      ])
      const merged = list.map((o) => ({
        ...o,
        items: (o.items || []).map((it) => ({
          ...it,
          served: servedOverridesRef.current[it.id] ?? Boolean(it.served),
        })),
      }))
      setOrders(merged)
      setCancelledOrders(cancelled)
      if (!silent) setLoadError('')
    } catch (e) {
      console.error('Failed to load pending orders:', e)
      if (!silent) setLoadError('Failed to load pending orders.')
    } finally {
      if (!silent) setLoading(false)
      initialLoadDone.current = true
    }
  }

  useEffect(() => {
    loadOrders()

    const unsubscribe = subscribeToOrderRelatedChanges(
      () => {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
        refreshTimerRef.current = setTimeout(() => {
          loadOrders({ silent: true })
        }, 150)
      },
      () => loadOrders({ silent: true }),
    )

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      unsubscribe()
    }
  }, [])

  const ordersWithTotals = useMemo(() => {
    return orders.map((o) => {
      const total = o.items.reduce((sum, it) => {
        const addonTotal = (it.selectedAddons || []).reduce((a, addon) => a + Number(addon.price || 0), 0)
        return sum + (Number(it.price || 0) + addonTotal) * Number(it.qty || 0)
      }, 0)
      const servedCount = o.items.filter((it) => it.served).length
      const totalCount = o.items.length
      const isPreparing = isPreparingStatus(o.status)
      return { ...o, total, servedCount, totalCount, isPreparing }
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

  const handleMarkPreparing = async (orderId) => {
    try {
      await markOrderPreparing(orderId)
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'Preparing' } : o)))
    } catch (e) {
      console.error('Failed to mark order as preparing:', e)
      setLoadError('Failed to mark order as preparing.')
    }
  }

  const cancelOrder = async (orderId) => {
    try {
      await markOrderCancelled(orderId)
      setOrders((prev) => prev.filter((o) => o.id !== orderId))
      if (selectedOrderId === orderId) {
        setDetailsOpen(false)
        setSelectedOrderId(null)
      }
      loadOrders()
    } catch (e) {
      console.error('Failed to cancel order:', e)
      setLoadError('Failed to cancel order.')
    }
  }

  const requestCancelOrder = (orderId) => {
    setPendingCancelOrderId(orderId)
    setShowCancelConfirm(true)
  }

  const handleUncancelOrder = async (orderId) => {
    try {
      await uncancelOrder(orderId)
      setCancelledOrders((prev) => prev.filter((o) => o.id !== orderId))
      setSelectedCancelledId(null)
      loadOrders({ silent: true })
    } catch (e) {
      console.error('Failed to restore order:', e)
      setLoadError('Failed to restore order.')
    }
  }

  const requestUncancelOrder = (orderId) => {
    setPendingUncancelOrderId(orderId)
    setShowUncancelConfirm(true)
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
              {loading && !initialLoadDone.current ? <div className="pending-note">Loading…</div> : null}
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
                    {o.queueNumber ? <span className="order-card-queue">{o.queueNumber}</span> : null}
                    {o.orderType ? <span className="order-card-type">{o.orderType}</span> : null}
                    {o.isCustomerOrder ? <span className="order-card-customer-badge">Customer</span> : null}
                  </div>
                  <div className="order-card-total">₱ {formatMoney(o.total)}</div>
                  <div className="order-card-status">
                    <div
                      className={`order-card-status-text ${
                        o.servedCount === o.totalCount ? 'done' : o.isPreparing ? 'preparing' : 'pending-status'
                      }`}
                    >
                      {o.servedCount === o.totalCount
                        ? 'Status: Done'
                        : o.isPreparing
                          ? `Status: ${o.servedCount}/${o.totalCount} Preparing`
                          : 'Status: Pending'}
                    </div>
                    <div className={`status-pill ${o.paid ? 'paid' : 'unpaid'}`}>{o.paid ? 'PAID' : 'UNPAID'}</div>
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
              <div className="details-order">
                Order #{selectedOrder.id}
                {selectedOrder.isCustomerOrder ? <span className="details-customer-badge">Customer Order</span> : null}
              </div>
              {selectedOrder.queueNumber ? (
                <div className="details-queue">Queue: {selectedOrder.queueNumber}</div>
              ) : null}
              {selectedOrder.orderType ? (
                <div className="details-order-type">Order Type: {selectedOrder.orderType}</div>
              ) : null}
              {selectedOrder.discountType && selectedOrder.discountType !== 'None' ? (
                <div className="details-discount-info">Discount: {selectedOrder.discountType} (20%)</div>
              ) : null}
              <div className="details-status">
                {selectedOrder.servedCount === selectedOrder.totalCount
                  ? 'Status: Done'
                  : selectedOrder.isPreparing
                    ? `Status: ${selectedOrder.servedCount}/${selectedOrder.totalCount} Served`
                    : 'Status: Pending'}
              </div>

              <div className="details-items">
                {selectedOrder.items.map((it) => (
                  <div key={it.id} className="details-item">
                    <div className={`item-image-wrap ${it.served ? 'served' : 'unserved'}`}>
                      <img
                        className="item-image"
                        src={it.image || placeholderSvg}
                        alt={it.name}
                        loading="lazy"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = placeholderSvg }}
                      />
                    </div>
                    <div className="item-main">
                      <div className="item-name">{it.name}</div>
                      {(it.selectedAddons || []).length > 0 ? (
                        <div className="item-addons">
                          {it.selectedAddons.map((addon) => (
                            <span key={addon.id} className="item-addon-tag">+ {addon.name}{addon.price > 0 ? ` (₱${formatMoney(addon.price)})` : ''}</span>
                          ))}
                        </div>
                      ) : null}
                      <div className="item-qty">Qty. {it.qty}</div>
                    </div>
                    <div className="item-right">
                      <div className="item-price">₱ {formatMoney((Number(it.price || 0) + (it.selectedAddons || []).reduce((a, ad) => a + Number(ad.price || 0), 0)) * Number(it.qty || 0))}</div>
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
                {!selectedOrder.isPreparing ? (
                  <button type="button" className="mark-preparing-btn" onClick={() => handleMarkPreparing(selectedOrder.id)}>
                    MARK AS PREPARING
                  </button>
                ) : null}
                <button type="button" className="all-served-btn" onClick={() => requestCompleteOrder(selectedOrder.id)}>
                  ALL SERVED
                </button>
                <button type="button" className="cancel-order-btn" onClick={() => requestCancelOrder(selectedOrder.id)}>
                  CANCEL ORDER
                </button>
              </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Cancelled Orders Section - table left, detail panel right */}
        {cancelledOrders.length > 0 ? (
        <div className="cancelled-section-layout">
          <div className="cancelled-table-section">
            <h2 className="cancelled-table-title">Cancelled Orders</h2>
            <div className="cancelled-table">
              <div className="cancelled-table-head">
                <div>Order</div>
                <div>Date</div>
                <div>Total</div>
                <div>Type</div>
                <div>Cancelled By</div>
              </div>
              <div className="cancelled-table-body">
                {cancelledOrders.map((o) => {
                  const total = (o.items || []).reduce((sum, it) => {
                    const addonTotal = (it.selectedAddons || []).reduce((a, addon) => a + Number(addon.price || 0), 0)
                    return sum + (Number(it.price || 0) + addonTotal) * Number(it.qty || 0)
                  }, 0)
                  return (
                    <div key={o.id} className={`cancelled-row ${selectedCancelledId === o.id ? 'active' : ''}`} onClick={() => setSelectedCancelledId(selectedCancelledId === o.id ? null : o.id)}>
                      <div className="cell">
                        <span className="cancelled-order-id">Order #{o.id}</span>
                        {o.queueNumber ? <span className="order-card-queue">{o.queueNumber}</span> : null}
                        {o.isCustomerOrder ? <span className="order-card-customer-badge">Customer</span> : null}
                      </div>
                      <div className="cell">{new Date(o.date).toLocaleDateString()}</div>
                      <div className="cell">₱ {formatMoney(total)}</div>
                      <div className="cell">{o.orderType || '—'}</div>
                      <div className="cell">{o.cancelledBy || 'staff'}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {selectedCancelledId ? (() => {
            const co = cancelledOrders.find((o) => o.id === selectedCancelledId)
            if (!co) return null
            const total = (co.items || []).reduce((sum, it) => {
              const addonTotal = (it.selectedAddons || []).reduce((a, addon) => a + Number(addon.price || 0), 0)
              return sum + (Number(it.price || 0) + addonTotal) * Number(it.qty || 0)
            }, 0)
            return (
              <div className="cancelled-detail-panel">
                <button className="details-close" type="button" onClick={() => setSelectedCancelledId(null)}>
                  {'<'} Close
                </button>
                <div className="details-title">Order Details:</div>
                <div className="details-order">
                  Order #{co.id}
                  {co.isCustomerOrder ? <span className="details-customer-badge">Customer Order</span> : null}
                </div>
                {co.queueNumber ? <div className="details-queue">Queue: {co.queueNumber}</div> : null}
                {co.orderType ? <div className="details-order-type">Order Type: {co.orderType}</div> : null}
                <div className="details-status" style={{ color: '#c1121f' }}>Status: Cancelled</div>
                {co.cancelledBy ? <div className="details-order-type">Cancelled by: {co.cancelledBy}</div> : null}

                <div className="details-items">
                  {(co.items || []).map((it) => {
                    const addonTotal = (it.selectedAddons || []).reduce((a, addon) => a + Number(addon.price || 0), 0)
                    const lineTotal = (Number(it.price || 0) + addonTotal) * Number(it.qty || 0)
                    return (
                      <div key={it.id} className="details-item">
                        <div className="item-image-wrap">
                          <img
                            className="item-image"
                            src={it.image || placeholderSvg}
                            alt={it.name}
                            loading="lazy"
                            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = placeholderSvg }}
                          />
                        </div>
                        <div className="item-main">
                          <div className="item-name">{it.name}</div>
                          {(it.selectedAddons || []).length > 0 ? (
                            <div className="item-addons">
                              {it.selectedAddons.map((addon) => (
                                <span key={addon.id} className="item-addon-tag">+ {addon.name}{addon.price > 0 ? ` (₱${formatMoney(addon.price)})` : ''}</span>
                              ))}
                            </div>
                          ) : null}
                          <div className="item-qty">Qty. {it.qty}</div>
                        </div>
                        <div className="item-right">
                          <div className="item-price">₱ {formatMoney(lineTotal)}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="details-footer">
                  <div className="details-row">
                    <span>Total:</span>
                    <span className="details-total">₱ {formatMoney(total)}</span>
                  </div>
                  <div className="details-row">
                    <span>Order Type:</span>
                    <span className="details-type">{co.orderType}</span>
                  </div>
                  <button type="button" className="uncancel-order-btn" onClick={() => requestUncancelOrder(co.id)}>
                    RESTORE ORDER
                  </button>
                </div>
              </div>
            )
          })() : null}
        </div>
        ) : null}
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

      <ConfirmModal
        open={showCancelConfirm}
        title={
          <>
            Cancel this order?
            <br />
            This will move it to Cancelled Orders.
          </>
        }
        message="Are you sure you want to cancel this order?"
        cancelText="Go Back"
        confirmText="Yes, cancel order"
        onCancel={() => {
          setShowCancelConfirm(false)
          setPendingCancelOrderId(null)
        }}
        onConfirm={() => {
          const orderId = pendingCancelOrderId
          setShowCancelConfirm(false)
          setPendingCancelOrderId(null)
          if (orderId != null) cancelOrder(orderId)
        }}
      />

      <ConfirmModal
        open={showUncancelConfirm}
        title={
          <>
            Restore this order?
            <br />
            It will return to Pending Orders.
          </>
        }
        message="The order will be moved back to the pending list."
        cancelText="Go Back"
        confirmText="Yes, restore order"
        onCancel={() => {
          setShowUncancelConfirm(false)
          setPendingUncancelOrderId(null)
        }}
        onConfirm={() => {
          const orderId = pendingUncancelOrderId
          setShowUncancelConfirm(false)
          setPendingUncancelOrderId(null)
          if (orderId != null) handleUncancelOrder(orderId)
        }}
      />
    </div>
  )
}

export default PendingOrders
