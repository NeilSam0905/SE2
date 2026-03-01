import { supabase } from '../supabaseClient'

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

const mapOrderRowToUi = (row, { includeServedFlag = false } = {}) => {
  const id = getField(row, ['orderID', 'orderId', 'order_id', 'id'])
  const status = getField(row, ['status'])
  const timestamp = getField(row, ['orderTimestamp', 'order_timestamp', 'created_at', 'createdAt'])
  const completeTimestamp = getField(row, ['completeTimestamp', 'complete_timestamp', 'completedTimestamp', 'completed_at'])
  const orderType = getField(row, ['orderType', 'order_type']) || ''
  const paymentstatus = getField(row, ['paymentstatus', 'paymentStatus', 'payment_status'])

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
    const quantity = Number(getField(oi, ['quantity', 'qty']) || 0)
    const price = Number(
      getField(oi, ['price']) ??
        getField(productObj, ['price']) ??
        0,
    )

    const itemId = getField(oi, ['orderItemID', 'orderItemId', 'order_item_id', 'id'])

    const base = {
      id: itemId != null ? String(itemId) : `${String(id ?? 'order')}-${name}`,
      name,
      qty: quantity,
      price,
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
    items,
  }
}

export async function fetchOrdersWithItems({ completed }) {
  const { data, error } = await supabase
    .from('orders')
    .select(
      `
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
    `,
    )

  if (error) throw error

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
  const nowIso = new Date().toISOString()
  const { error } = await supabase
    .from('orders')
    .update({ status: 'Completed', completeTimestamp: nowIso, paymentstatus: 'Unpaid' })
    .eq('orderID', orderId)

  if (error) throw error
}

export async function setOrderPaymentStatus({ orderId, paymentstatus }) {
  const { error } = await supabase
    .from('orders')
    .update({ paymentstatus })
    .eq('orderID', orderId)

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

export function subscribeToOrderRelatedChanges(onChange) {
  const channel = supabase
    .channel(`orders-watch-${Math.random().toString(16).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, onChange)
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
