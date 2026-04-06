import { getPublicStorageUrl, PRODUCT_IMAGE_BUCKET, supabase } from '../lib/supabaseClient'
import { SetOrderPaymentStatusDTO } from './dto'
import { guardDto } from './guards'

const normalize = (value) => String(value ?? '').trim().toLowerCase().replace(/[^a-z]/g, '')

const COMPLETED_STATUSES = new Set(['completed', 'complete', 'done', 'served', 'closed', 'finished'])
const PAID_STATUSES = new Set(['paid', 'settled', 'complete'])

export const isCompletedStatus = (value) => COMPLETED_STATUSES.has(normalize(value))

const isPaidStatus = (value) => PAID_STATUSES.has(normalize(value))

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
  const isCustomerOrder = sessionID != null

  const orderItems = row?.order_items || row?.orderItems || []
  const payments = row?.payments || []

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
    isCustomerOrder,
    items,
  }
}

export async function fetchOrdersWithItems({ completed }) {
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
      order_items(
        orderItemID,
        quantity,
        price,
        productID,
        selectedAddons,
        products(productName, price, image_path)
      ),
      payments!fk_payments_orderid(paymentID, totalAmount, paymentTimestamp)
    `

  let data
  let error

  {
    const res = await supabase.from('orders').select(baseSelect)
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
      payments!fk_payments_orderid(paymentID, totalAmount, paymentTimestamp)
    `

    const fb = await supabase.from('orders').select(fallbackSelect)
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
      payments(paymentID, totalAmount, paymentTimestamp)
    `

    const fb2 = await supabase.from('orders').select(fallbackUnqualified)
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

    const legacy = await supabase.from('orders').select(legacySelect)
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
    return completed ? done : !done
  })

  filtered.sort((a, b) => {
    const ta = new Date(a.date).getTime()
    const tb = new Date(b.date).getTime()
    return tb - ta
  })

  return filtered
}

export async function markOrderCompleted(orderId) {
  const id = Number(orderId)
  if (!Number.isFinite(id) || id <= 0) throw new Error('markOrderCompleted: orderId must be a positive number')
  const nowIso = new Date().toISOString()

  // If the order was already paid before completion, do not overwrite it.
  const { data: existingOrder, error: fetchError } = await supabase
    .from('orders')
    .select('paymentstatus')
    .eq('orderID', orderId)
    .maybeSingle()

  if (fetchError) throw fetchError

  let paid = isPaidStatus(existingOrder?.paymentstatus)

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

  const nextPaymentStatus = paid ? 'Paid' : (existingOrder?.paymentstatus ?? 'Unpaid')

  const { error } = await supabase
    .from('orders')
    .update({ status: 'Completed', completeTimestamp: nowIso, paymentstatus: nextPaymentStatus })
    .eq('orderID', orderId)

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
  const channel = supabase
    .channel(`orders-watch-${Math.random().toString(16).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, onChange)
    .subscribe((status) => {
      // When the channel (re)connects after a drop, trigger a full refresh so
      // any changes missed during the outage are picked up immediately.
      if (status === 'SUBSCRIBED' && onReconnect) onReconnect()
    })

  return () => {
    supabase.removeChannel(channel)
  }
}
