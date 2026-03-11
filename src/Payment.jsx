import { useMemo, useState } from 'react'
import Navbar from './elements/Navbar'
import ConfirmModal from './elements/ConfirmModal'
import './styles/Payment.css'
import { supabase, getPublicStorageUrl, PRODUCT_IMAGE_BUCKET } from './lib/supabaseClient'
import { formatMoney } from './utils/numberFormat'

const DISCOUNT_RATE = 0.2
const GCashRefPattern = /^\d{10,15}$/

const normalize = (value) => String(value ?? '').trim().toLowerCase().replace(/[^a-z]/g, '')
const isPaidStatus = (value) => {
  const v = normalize(value)
  return v === 'paid' || v === 'settled' || v === 'complete'
}

const coerceNumber = (raw) => {
  if (raw === null || raw === undefined) return NaN
  const s = String(raw)
    .replace(/,/g, '')
    .replace(/[^0-9.-]/g, '')
    .trim()
  if (!s) return NaN
  const n = Number(s)
  return Number.isFinite(n) ? n : NaN
}

function Payment({ onLogout, onNavigate, userRole = 'staff', userName = 'Staff User' }) {
  const [searchOrderId, setSearchOrderId] = useState('')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [showAlreadyPaidModal, setShowAlreadyPaidModal] = useState(false)
  const [alreadyPaidOrderId, setAlreadyPaidOrderId] = useState(null)

  const [showOrderNotFoundModal, setShowOrderNotFoundModal] = useState(false)
  const [notFoundOrderId, setNotFoundOrderId] = useState(null)

  const [discountApplied, setDiscountApplied] = useState(false)

  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [amountReceived, setAmountReceived] = useState('')

  const [showCashlessModal, setShowCashlessModal] = useState(false)
  const [showGcashRefModal, setShowGcashRefModal] = useState(false)
  const [gcashRefDraft, setGcashRefDraft] = useState('')
  const [gcashRef, setGcashRef] = useState('')

  const [showSuccessModal, setShowSuccessModal] = useState(false)

  const resetCheckoutState = () => {
    setDiscountApplied(false)
    setPaymentMethod('Cash')
    setAmountReceived('')
    setGcashRefDraft('')
    setGcashRef('')
    setShowCashlessModal(false)
    setShowGcashRefModal(false)
  }

  const clearAll = () => {
    setSearchOrderId('')
    setOrder(null)
    setError('')
    resetCheckoutState()
  }

  const subtotal = useMemo(() => {
    if (!order) return 0
    return (order.items || []).reduce(
      (sum, it) => sum + Number(it.price || 0) * Number(it.qty || 0),
      0,
    )
  }, [order])

  const discount = useMemo(() => (discountApplied ? subtotal * DISCOUNT_RATE : 0), [discountApplied, subtotal])
  const total = useMemo(() => subtotal - discount, [discount, subtotal])

  const amountReceivedNum = useMemo(() => coerceNumber(amountReceived), [amountReceived])

  const isCash = paymentMethod === 'Cash'
  const isGcash = paymentMethod === 'GCash'

  const change = useMemo(() => {
    if (!order) return 0
    if (!isCash) return 0
    if (!Number.isFinite(amountReceivedNum)) return 0
    return amountReceivedNum - total
  }, [amountReceivedNum, isCash, order, total])

  const changeDisplay = useMemo(() => {
    if (!order) return { value: 0, negative: false }
    if (!isCash) return { value: 0, negative: false }
    if (!Number.isFinite(amountReceivedNum)) return { value: 0, negative: false }
    const delta = amountReceivedNum - total
    if (delta >= 0) return { value: delta, negative: false }
    return { value: Math.abs(delta), negative: true }
  }, [amountReceivedNum, isCash, order, total])

  const canComplete = useMemo(() => {
    if (!order) return false
    if (loading) return false

    if (isCash) {
      if (!Number.isFinite(amountReceivedNum)) return false
      return amountReceivedNum >= total
    }

    if (isGcash) {
      return GCashRefPattern.test(String(gcashRef || '').trim())
    }

    return false
  }, [amountReceivedNum, gcashRef, isCash, isGcash, loading, order, total])

  const loadOrderById = async (e) => {
    if (e?.preventDefault) e.preventDefault()

    setError('')
    setOrder(null)
    resetCheckoutState()

    const idNum = Number(String(searchOrderId || '').trim())
    if (!Number.isFinite(idNum) || idNum <= 0) {
      setError('Please enter a valid Order #.')
      return
    }

    setLoading(true)

    try {
      const preferredSelect = `
        orderID,
        status,
        paymentstatus,
        order_items(
          orderItemID,
          quantity,
          price,
          products(productName, price, image_path)
        )
      `

      let data
      let fetchError
      {
        const res = await supabase.from('orders').select(preferredSelect).eq('orderID', idNum).maybeSingle()
        data = res.data
        fetchError = res.error
      }

      if (fetchError) {
        const fallbackSelect = `
          orderID,
          status,
          paymentstatus,
          order_items(
            orderItemID,
            quantity,
            price,
            products(productName, price)
          )
        `

        const fb = await supabase.from('orders').select(fallbackSelect).eq('orderID', idNum).maybeSingle()
        data = fb.data
        fetchError = fb.error
      }

      if (fetchError) throw fetchError
      if (!data) {
        setNotFoundOrderId(idNum)
        setShowOrderNotFoundModal(true)
        return
      }

      if (isPaidStatus(data.paymentstatus)) {
        setAlreadyPaidOrderId(idNum)
        setShowAlreadyPaidModal(true)
        return
      }

      const rawItems = Array.isArray(data.order_items) ? data.order_items : []
      const items = rawItems.map((oi) => {
        const productObj = oi?.products || null
        const name = productObj?.productName || 'Item'
        const imagePath = productObj?.image_path
        const image = imagePath ? getPublicStorageUrl(PRODUCT_IMAGE_BUCKET, imagePath) : null
        const qty = Number(oi?.quantity || 0)
        const price = Number(oi?.price ?? productObj?.price ?? 0)
        const id = oi?.orderItemID != null ? String(oi.orderItemID) : `${idNum}-${name}`
        return { id, name, image, qty, price }
      })

      setOrder({ id: data.orderID, status: data.status, paymentstatus: data.paymentstatus, items })
    } catch (err) {
      console.error('Failed to load order:', err)
      setError('Failed to fetch order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const openCashless = () => {
    if (!order) {
      setError('Search an unpaid order first.')
      return
    }
    setError('')
    setShowCashlessModal(true)
  }

  const confirmGcashReference = () => {
    const trimmed = String(gcashRefDraft || '').trim()
    if (!GCashRefPattern.test(trimmed)) return

    setGcashRef(trimmed)
    setPaymentMethod('GCash')
    setShowGcashRefModal(false)
    setShowCashlessModal(false)

    // For cashless, amount received matches total.
    setAmountReceived(total.toFixed(2))
  }

  const processPayment = async () => {
    if (!order) return

    setError('')
    setLoading(true)

    try {
      if (!canComplete) {
        setError('Please complete the required payment details first.')
        return
      }

      const nowIso = new Date().toISOString()

      const payload = {
        orderID: order.id,
        subtotal: Number(subtotal || 0),
        tax: 0,
        discount: Number(discount || 0),
        totalAmount: Number(total || 0),
        paymentMethod: isGcash ? 'GCash' : 'Cash',
        transactionRef: isGcash ? String(gcashRef || '').trim() : null,
        paymentTimestamp: nowIso,
      }

      // Upsert (by selecting existing payment row first).
      const { data: existing, error: existingError } = await supabase
        .from('payments')
        .select('paymentID')
        .eq('orderID', order.id)
        .limit(1)

      if (existingError) throw existingError

      const row = Array.isArray(existing) ? existing[0] : existing

      if (row?.paymentID != null) {
        const { error: updateError } = await supabase.from('payments').update(payload).eq('paymentID', row.paymentID)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from('payments').insert(payload)
        if (insertError) throw insertError
      }

      const { error: orderError } = await supabase
        .from('orders')
        .update({ paymentstatus: 'Paid' })
        .eq('orderID', order.id)

      if (orderError) throw orderError

      setShowSuccessModal(true)
    } catch (err) {
      console.error('Payment error:', err)
      setError('Failed to process payment. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const userLabelRole = userRole === 'admin' ? 'Administrator' : 'Staff'

  return (
    <div className="page-container payment-page">
      <Navbar
        onLogout={onLogout}
        activePage="payment"
        onNavigate={onNavigate}
        role={userRole}
        user={{ name: userName, role: userLabelRole }}
      />

      <div className="page-content payment-content">
        <div className="payment-layout">
          <div className="payment-left">
            <div className="payment-left-header">
              <form className="payment-top-row" onSubmit={loadOrderById}>
                <div className="payment-order-label">Order #:</div>
                <input
                  className="payment-order-input"
                  type="text"
                  inputMode="numeric"
                  value={searchOrderId}
                  onChange={(e) => setSearchOrderId(e.target.value)}
                  placeholder=""
                  aria-label="Order number"
                  disabled={loading}
                />
                <button
                  type="button"
                  className={`payment-pill ${paymentMethod === 'GCash' ? 'active' : ''}`}
                  onClick={openCashless}
                  disabled={!order}
                >
                  Cashless
                </button>
                <button
                  type="button"
                  className={`payment-pill ${discountApplied ? 'active' : ''}`}
                  onClick={() => setDiscountApplied((v) => !v)}
                  disabled={!order}
                >
                  PWD/Senior
                </button>
                {/* Hidden submit to enable Enter-to-search */}
                <button type="submit" className="payment-hidden-submit" aria-hidden tabIndex={-1} />
              </form>

              {error ? <div className="payment-error">{error}</div> : null}

              <div className="payment-item-header">
                <div className="payment-item-col name">Item</div>
                <div className="payment-item-col price">Price</div>
                <div className="payment-item-col qty">Quantity</div>
              </div>
            </div>

            <div className="payment-items-card">
              {!order ? <div className="payment-empty">Search an unpaid order to start.</div> : null}
              {order ? (
                <div className="payment-items-scroll">
                  {(order.items || []).map((it) => (
                    <div key={it.id} className="payment-item-row">
                      <img className="payment-item-img" src={it.image || '/product1.jpg'} alt={it.name} loading="lazy" />
                      <div className="payment-item-name">{it.name}</div>
                      <div className="payment-item-price">₱ {formatMoney(Number(it.price || 0) * Number(it.qty || 0))}</div>
                      <div className="payment-item-qty">{it.qty}</div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="payment-right">
            <div className="payment-summary-card">
              <div className="payment-summary-title">Subtotal</div>

              <div className="payment-summary-lines">
                {(order?.items || []).map((it) => (
                  <div key={it.id} className="payment-summary-line">
                    <span className="payment-summary-line-name">{it.name} x{it.qty}</span>
                    <span className="payment-summary-line-amount">₱ {formatMoney(Number(it.price || 0) * Number(it.qty || 0))}</span>
                  </div>
                ))}
              </div>

              <div className="payment-summary-total-row">
                <span className="payment-summary-total-label">Subtotal</span>
                <span className="payment-summary-total">₱ {formatMoney(subtotal)}</span>
              </div>

              <div className="payment-summary-divider" />

              <div className="payment-summary-math">
                <div className="payment-math-row">
                  <span className="payment-math-label">Discount (PWD)</span>
                  <span className={`payment-math-value ${discountApplied ? 'negative' : ''}`}>
                    {discountApplied ? `-₱ ${formatMoney(discount)}` : '₱ 0.00'}
                  </span>
                </div>
                <div className="payment-math-row total">
                  <span className="payment-math-label">Total</span>
                  <span className="payment-math-value">₱ {formatMoney(total)}</span>
                </div>
              </div>

              <div className="payment-input-row">
                <label className="payment-input-label" htmlFor="amountReceived">Amount Received</label>
                <input
                  id="amountReceived"
                  className="payment-input"
                  type="text"
                  inputMode="decimal"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder={isGcash ? formatMoney(total) : '0.00'}
                  disabled={!order || isGcash}
                />
              </div>

              <div className="payment-change-row">
                <div className="payment-change-label">Change</div>
                <div className={`payment-change-value ${changeDisplay.negative ? 'negative' : ''}`}>
                  {changeDisplay.negative ? '-₱' : '₱'} {formatMoney(changeDisplay.value)}
                </div>
              </div>

              <div className="payment-actions">
                <button type="button" className="payment-btn cancel" onClick={clearAll} disabled={loading}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="payment-btn complete"
                  onClick={processPayment}
                  disabled={!canComplete}
                >
                  Complete Payment
                </button>
              </div>

              {isGcash && gcashRef ? (
                <div className="payment-gcash-note">GCash Ref: {gcashRef}</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Cashless Method Modal */}
      {showCashlessModal ? (
        <div className="payment-modal-overlay" role="presentation" onClick={() => setShowCashlessModal(false)}>
          <div className="payment-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="payment-modal-title">CASHLESS PAYMENT</div>
            <div className="payment-modal-actions">
              <button
                type="button"
                className="payment-modal-pill"
                onClick={() => {
                  setShowCashlessModal(false)
                  setGcashRefDraft(gcashRef || '')
                  setShowGcashRefModal(true)
                }}
              >
                G-CASH
              </button>
            </div>
            <button type="button" className="payment-modal-cancel" onClick={() => setShowCashlessModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {/* Enter GCash Reference Modal */}
      {showGcashRefModal ? (
        <div className="payment-modal-overlay" role="presentation" onClick={() => setShowGcashRefModal(false)}>
          <div className="payment-modal small" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="payment-modal-close" onClick={() => setShowGcashRefModal(false)} aria-label="Close">
              ×
            </button>
            <div className="payment-modal-title left">Enter GCash Transaction Reference #</div>
            <input
              className="payment-modal-input"
              type="text"
              inputMode="numeric"
              value={gcashRefDraft}
              onChange={(e) => setGcashRefDraft(e.target.value)}
              placeholder="e.g. 1754903891"
            />
            <div className="payment-modal-subrow">
              <div className="payment-modal-sub">Order# {order ? order.id : '—'}</div>
              <button
                type="button"
                className="payment-modal-confirm"
                onClick={confirmGcashReference}
                disabled={!GCashRefPattern.test(String(gcashRefDraft || '').trim())}
                title="Transaction reference must be 10-15 digits"
              >
                Confirm
              </button>
            </div>
            <div className="payment-modal-hint">Must be a 10–15 digit code.</div>
          </div>
        </div>
      ) : null}

      {/* Success modal */}
      <ConfirmModal
        open={showSuccessModal}
        title={
          <>
            Payment Complete
            <br />
            Order #{order?.id ?? ''}
          </>
        }
        message={isGcash ? 'GCash payment recorded successfully.' : 'Cash payment recorded successfully.'}
        showCancel={false}
        confirmText="OK"
        onConfirm={() => {
          setShowSuccessModal(false)
          clearAll()
        }}
      />

      <ConfirmModal
        open={showAlreadyPaidModal}
        title={
          <>
            Order Already Paid
            <br />
            Order #{alreadyPaidOrderId ?? ''}
          </>
        }
        message="This order is already paid and cannot be processed again."
        showCancel={false}
        confirmText="OK"
        onConfirm={() => {
          setShowAlreadyPaidModal(false)
          setAlreadyPaidOrderId(null)
        }}
      />

      <ConfirmModal
        open={showOrderNotFoundModal}
        title={
          <>
            Order Not Found
            <br />
            Order #{notFoundOrderId ?? ''}
          </>
        }
        message="No order exists for that order number."
        showCancel={false}
        confirmText="OK"
        onConfirm={() => {
          setShowOrderNotFoundModal(false)
          setNotFoundOrderId(null)
        }}
      />
    </div>
  )
}

export default Payment
