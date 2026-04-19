import { getPublicStorageUrl, PRODUCT_IMAGE_BUCKET, supabase } from '../lib/supabaseClient'
import { SetOrderPaymentStatusDTO } from './dto'
import { guardDto } from './guards'

const normalize = (value) => String(value ?? '').trim().toLowerCase().replace(/[^a-z]/g, '')

const COMPLETED_STATUSES = new Set(['completed', 'complete', 'done', 'served', 'closed', 'finished'])
const PAID_STATUSES = new Set(['paid', 'settled', 'complete'])
const PREPARING_STATUSES = new Set(['preparing'])
const CANCELLED_STATUSES = new Set(['cancelled', 'canceled'])

// Simple in-memory cache so switching pages doesn't re-fetch from scratch.
// Cache entries expire after CACHE_TTL ms and are invalidated by realtime changes.
const CACHE_TTL = 30000
const _ordersCache = new Map()

export function invalidateOrdersCache() {
  _ordersCache.clear()
}

export const isCompletedStatus = (value) => COMPLETED_STATUSES.has(normalize(value))

const isPaidStatus = (value) => PAID_STATUSES.has(normalize(value))

export const isPreparingStatus = (value) => PREPARING_STATUSES.has(normalize(value))

export const isCancelledStatus = (value) => CANCELLED_STATUSES.has(normalize(value))

const getField = (obj, keys) => {
  if (!obj) return undefined
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key]
  }
  return undefined
}

const buildProductImageUrl = (productObj) => {
  if (!productObj) return null

  const imagePath = getField(productObj, ['image_path', 'imagePath'])
  if (imagePath) return getPublicStorageUrl(PRODUCT_IMAGE_BUCKET, imagePath)

  const imageUrl = getField(productObj, ['image_url', 'imageUrl'])
  if (imageUrl) return imageUrl

  const legacy = getField(productObj, ['image'])
  if (legacy) return legacy

  return null
}

const mapOrderRowToUi = (row, { includeServedFlag = false } = {}) => {
  const id = getField(row, ['orderID', 'orderId', 'order_id', 'id'])
  const status = getField(row, ['status'])
  const timestamp = getField(row, ['orderTimestamp', 'order_timestamp', 'created_at', 'createdAt'])
  const completeTimestamp = getField(row, ['completeTimestamp', 'complete_timestamp', 'completedTimestamp', 'completed_at'])
  const orderType = getField(row, ['orderType', 'order_type']) || ''
  const paymentstatus = getField(row, ['paymentstatus', 'paymentStatus', 'payment_status'])
  const sessionID = getField(row, ['sessionID', 'session_id']) || null
  const queueNumber = getField(row, ['queueNumber', 'queue_number']) || null
  const discountType = getField(row, ['discountType', 'discount_type']) || 'None'
  const cancelledBy = getField(row, ['cancelled_by', 'cancelledBy']) || null
  const isCustomerOrder = sessionID != null

  const orderItems = row?.order_items || row?.orderItems || []
  const payments = row?.payments || []

  const firstPayment = Array.isArray(payments) ? payments[0] : (payments || null)
  const paymentMethod = getField(firstPayment, ['paymentMethod', 'payment_method']) || null
  const transactionRef = getField(firstPayment, ['transactionRef', 'transaction_ref', 'referenceNumber']) || null
  const paidTotal = firstPayment ? Number(getField(firstPayment, ['totalAmount', 'total_amount']) || 0) : null

  const paid = paymentstatus != null
    ? isPaidStatus(paymentstatus)
    : Array.isArray(payments)
      ? payments.some((p) => Number(getField(p, ['totalAmount', 'total_amount']) || 0) > 0)
      : false

  const items = (Array.isArray(orderItems) ? orderItems : []).map((oi) => {
    const productObj = oi?.products || oi?.product || null
    const name = getField(productObj, ['productName', 'name']) || 'Item'
    const image = buildProductImageUrl(productObj)
    const quantity = Number(getField(oi, ['quantity', 'qty']) || 0)
    const price = Number(
      getField(oi, ['price']) ??
        getField(productObj, ['price']) ??
        0,
    )

    const itemId = getField(oi, ['orderItemID', 'orderItemId', 'order_item_id', 'id'])

    const selectedAddons = Array.isArray(oi?.selectedAddons) ? oi.selectedAddons : []

    const base = {
      id: itemId != null ? String(itemId) : `${String(id ?? 'order')}-${name}`,
      name,
      image,
      qty: quantity,
      price,
      selectedAddons,
    }

    if (!includeServedFlag) return base
    return { ...base, served: isCompletedStatus(status) }
  })

  return {
    id,
    status,
    date: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
    orderTimestamp: timestamp ? new Date(timestamp).toISOString() : null,
    completeTimestamp: completeTimestamp ? new Date(completeTimestamp).toISOString() : null,
    orderType,
    paid,
    paymentstatus: paymentstatus ?? (paid ? 'Paid' : 'Unpaid'),
    sessionID,
    queueNumber,
    discountType,
    cancelledBy,
    isCustomerOrder,
    paymentMethod,
    transactionRef,
    paidTotal,
    items,
  }
}

export async function fetchOrdersWithItems({ completed }) {
  const cacheKey = completed === 'cancelled' ? 'cancelled' : completed ? 'completed' : 'pending'
  const cached = _ordersCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data
  }

  // Server-side status filter — drastically reduces rows returned for large datasets.
  // The JS filter below still runs as a safety net for edge-case status values.
  const COMPLETED_VALS = ['Completed', 'Complete', 'Done', 'Served', 'Closed', 'Finished']
  const CANCELLED_VALS = ['Cancelled', 'Canceled']
  const applyStatusFilter = (q) => {
    if (completed === 'cancelled') return q.in('status', CANCELLED_VALS)
    if (completed) return q.in('status', COMPLETED_VALS)
    const notIn = `(${[...COMPLETED_VALS, ...CANCELLED_VALS].join(',')})`
    return q.not('status', 'in', notIn)
  }

  const baseSelect = `
      orderID,
      orderType,
      status,
      orderTimestamp,
      completeTimestamp,
      paymentstatus,
      sessionID,
      queueNumber,
      discountType,
      cancelled_by,
      order_items(
        orderItemID,
        quantity,
        price,
        productID,
        selectedAddons,
        products(productName, price, image_path)
      ),
      payments!fk_payments_orderid(paymentID, totalAmount, paymentMethod, transactionRef, paymentTimestamp)
    `

  let data
  let error

  {
    const res = await applyStatusFilter(supabase.from('orders').select(baseSelect))
    data = res.data
    error = res.error
    if (error) console.warn('[orders] baseSelect failed:', error.message)
  }

  // Backward-compatible fallback for DBs that haven't added product image columns yet.
  if (error) {
    const fallbackSelect = `
      orderID,
      orderType,
      status,
      orderTimestamp,
      completeTimestamp,
      paymentstatus,
      sessionID,
      queueNumber,
      discountType,
      order_items(
        orderItemID,
        quantity,
        price,
        productID,
        selectedAddons,
        products(productName, price)
      ),
      payments!fk_payments_orderid(paymentID, totalAmount, paymentMethod, transactionRef, paymentTimestamp)
    `

    const fb = await applyStatusFilter(supabase.from('orders').select(fallbackSelect))
    data = fb.data
    error = fb.error
    if (error) console.warn('[orders] fallbackSelect failed:', error.message)
  }

  // Fallback: try with unqualified payments (pre-migration DB without the named FK)
  if (error) {
    const fallbackUnqualified = `
      orderID,
      orderType,
      status,
      orderTimestamp,
      completeTimestamp,
      paymentstatus,
      order_items(
        orderItemID,
        quantity,
        price,
        productID,
        products(productName, price)
      ),
      payments(paymentID, totalAmount, paymentMethod, transactionRef, paymentTimestamp)
    `

    const fb2 = await applyStatusFilter(supabase.from('orders').select(fallbackUnqualified))
    data = fb2.data
    error = fb2.error
    if (error) console.warn('[orders] fallbackUnqualified failed:', error.message)
  }

  // Last resort: no payments join at all
  if (error) {
    const legacySelect = `
      orderID,
      orderType,
      status,
      orderTimestamp,
      completeTimestamp,
      paymentstatus,
      order_items(
        orderItemID,
        quantity,
        price,
        productID,
        products(productName, price)
      )
    `

    const legacy = await applyStatusFilter(supabase.from('orders').select(legacySelect))
    data = legacy.data
    error = legacy.error
    if (error) console.warn('[orders] legacySelect (no payments) failed:', error.message)
  }

  if (error) throw error

  console.log('[orders] query succeeded, rows:', Array.isArray(data) ? data.length : 0)

  const rows = Array.isArray(data) ? data : []
  const mapped = rows.map((r) => mapOrderRowToUi(r, { includeServedFlag: !completed }))

  // Defensive dedupe: in case relationships are misconfigured and return duplicate order rows.
  const deduped = Array.from(
    mapped.reduce((acc, o) => {
      const key = o?.id
      if (key == null) return acc

      if (!acc.has(key)) {
        acc.set(key, o)
        return acc
      }

      const prev = acc.get(key)
      const mergedItems = new Map()
      ;(prev.items || []).forEach((it) => mergedItems.set(it.id, it))
      ;(o.items || []).forEach((it) => mergedItems.set(it.id, it))

      acc.set(key, {
        ...prev,
        ...o,
        paid: Boolean(prev.paid || o.paid),
        items: Array.from(mergedItems.values()),
      })

      return acc
    }, new Map()).values(),
  )

  const filtered = deduped.filter((o) => {
    const done = isCompletedStatus(o.status)
    const cancelled = isCancelledStatus(o.status)
    if (completed === 'cancelled') return cancelled
    if (completed) return done
    // Pending: exclude completed AND cancelled
    return !done && !cancelled
  })

  filtered.sort((a, b) => {
    const ta = new Date(a.date).getTime()
    const tb = new Date(b.date).getTime()
    return tb - ta
  })

  _ordersCache.set(cacheKey, { data: filtered, ts: Date.now() })

  return filtered
}

export async function markOrderCompleted(orderId, { paid: knownPaid } = {}) {
  const id = Number(orderId)
  if (!Number.isFinite(id) || id <= 0) throw new Error('markOrderCompleted: orderId must be a positive number')

  invalidateOrdersCache()
  const nowIso = new Date().toISOString()

  let paid = knownPaid

  // Only hit the DB to determine paid status when the caller didn't supply it.
  if (paid == null) {
    const { data: existingOrder, error: fetchError } = await supabase
      .from('orders')
      .select('paymentstatus')
      .eq('orderID', orderId)
      .maybeSingle()

    if (fetchError) throw fetchError
    paid = isPaidStatus(existingOrder?.paymentstatus)

    if (!paid) {
      const { data: paymentRows, error: paymentsError } = await supabase
        .from('payments')
        .select('paymentID, totalAmount')
        .eq('orderID', orderId)
        .limit(1)

      if (paymentsError) throw paymentsError
      const row = Array.isArray(paymentRows) ? paymentRows[0] : paymentRows
      paid = Boolean(row && Number(row?.totalAmount || 0) > 0)
    }
  }

  const nextPaymentStatus = paid ? 'Paid' : 'Unpaid'

  const { error } = await supabase
    .from('orders')
    .update({ status: 'Completed', completeTimestamp: nowIso, paymentstatus: nextPaymentStatus })
    .eq('orderID', orderId)

  if (error) throw error
  window.dispatchEvent(new CustomEvent('orderCompleted', { detail: { orderId } }))
}

export async function markOrderPreparing(orderId) {
  const id = Number(orderId)
  if (!Number.isFinite(id) || id <= 0) throw new Error('markOrderPreparing: orderId must be a positive number')

  invalidateOrdersCache()

  const { error } = await supabase
    .from('orders')
    .update({ status: 'Preparing' })
    .eq('orderID', id)

  if (error) throw error
}

export async function markOrderCancelled(orderId) {
  const id = Number(orderId)
  if (!Number.isFinite(id) || id <= 0) throw new Error('markOrderCancelled: orderId must be a positive number')

  invalidateOrdersCache()

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'Cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: 'staff',
    })
    .eq('orderID', id)

  if (error) throw error
}

export async function uncancelOrder(orderId) {
  const id = Number(orderId)
  if (!Number.isFinite(id) || id <= 0) throw new Error('uncancelOrder: orderId must be a positive number')

  invalidateOrdersCache()

  const { error } = await supabase
    .from('orders')
    .update({
      status: 'Pending',
      cancelled_at: null,
      cancelled_by: null,
      cancellation_reason: null,
    })
    .eq('orderID', id)

  if (error) throw error
}

export async function setOrderPaymentStatus({ orderId, paymentstatus }) {
  const dto = new SetOrderPaymentStatusDTO({ paymentstatus })
  guardDto(dto)
  const id = Number(orderId)
  if (!Number.isFinite(id) || id <= 0) throw new Error('setOrderPaymentStatus: orderId must be a positive number')

  const { error } = await supabase
    .from('orders')
    .update({ paymentstatus: dto.paymentstatus })
    .eq('orderID', id)

  if (error) throw error
}

export async function setOrderPaidStatus({ orderId, paid, subtotal }) {
  invalidateOrdersCache()
  window.dispatchEvent(new CustomEvent('orderPaidUpdated', { detail: { orderId, paid } }))
  // Keep the denormalized payment status column in sync.
  await setOrderPaymentStatus({ orderId, paymentstatus: paid ? 'Paid' : 'Unpaid' })

  if (!paid) {
    const { error } = await supabase.from('payments').delete().eq('orderID', orderId)
    if (error) throw error
    return
  }

  const nowIso = new Date().toISOString()

  // Prefer update if a payment row already exists.
  const { data: existing, error: existingError } = await supabase
    .from('payments')
    .select('paymentID')
    .eq('orderID', orderId)
    .limit(1)

  if (existingError) throw existingError

  const row = Array.isArray(existing) ? existing[0] : existing

  const payload = {
    orderID: orderId,
    subtotal: Number(subtotal || 0),
    tax: 0,
    discount: 0,
    totalAmount: Number(subtotal || 0),
    paymentMethod: 'Cash',
    transactionRef: null,
    paymentTimestamp: nowIso,
  }

  if (row?.paymentID != null) {
    const { error } = await supabase
      .from('payments')
      .update(payload)
      .eq('paymentID', row.paymentID)
    if (error) throw error
    return
  }

  const { error } = await supabase.from('payments').insert(payload)
  if (error) throw error
}

export function subscribeToOrderRelatedChanges(onChange, onReconnect) {
  let retryTimer = null
  let retryCount = 0

  const baseId = Math.random().toString(16).slice(2)
  // Track the latest channel so retries don't leave zombie subscriptions.
  const activeChannel = { current: null }

  const setupChannel = () => {
    // Use a fresh channel name on every attempt — reusing a closed channel's name
    // can confuse the Supabase client and prevent a clean re-subscription.
    const channelName = `orders-watch-${baseId}-${retryCount}`
    const ch = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { invalidateOrdersCache(); onChange() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => { invalidateOrdersCache(); onChange() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => { invalidateOrdersCache(); onChange() })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          const wasRetrying = retryCount > 0
          retryCount = 0
          // Only re-fetch on actual reconnect, not the initial connect.
          if (wasRetrying && onReconnect) onReconnect()
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          const delay = Math.min(1000 * 2 ** retryCount, 30000)
          retryCount++
          if (retryTimer) clearTimeout(retryTimer)
          retryTimer = setTimeout(() => {
            try { supabase.removeChannel(activeChannel.current) } catch { /* ignore */ }
            activeChannel.current = setupChannel()
          }, delay)
        }
      })

    return ch
  }

  activeChannel.current = setupChannel()

  const handleVisible = () => {
    if (document.visibilityState === 'visible') {
      invalidateOrdersCache()
      if (onReconnect) onReconnect()
    }
  }
  const handleFocus = () => { invalidateOrdersCache(); if (onReconnect) onReconnect() }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisible)
    window.addEventListener('focus', handleFocus)
  }

  return () => {
    if (retryTimer) clearTimeout(retryTimer)
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisible)
      window.removeEventListener('focus', handleFocus)
    }
    try { supabase.removeChannel(activeChannel.current) } catch { /* ignore */ }
  }
}
