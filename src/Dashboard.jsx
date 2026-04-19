import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './styles/Dashboard.css'
import Navbar from './elements/Navbar'
import { supabase } from './lib/supabaseClient'
import { getPublicStorageUrl, PRODUCT_IMAGE_BUCKET } from './lib/supabaseClient'
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatInteger, formatMoney } from './utils/numberFormat'
import { subscribeToOrderRelatedChanges } from './data/orders'
import placeholderSvg from '/placeholder.svg'

const normalizeText = (value) => String(value || '').toLowerCase().replace(/[^a-z]/g, '')
const COMPLETED_STATUSES = new Set(['completed', 'complete', 'done', 'served', 'closed', 'finished'])
const isCompletedStatusValue = (value) => COMPLETED_STATUSES.has(normalizeText(value))

const startOfDay = (d) => {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  return out
}

const endOfDay = (d) => {
  const out = new Date(d)
  out.setHours(23, 59, 59, 999)
  return out
}

const addDays = (d, delta) => {
  const out = new Date(d)
  out.setDate(out.getDate() + delta)
  return out
}

const toIso = (d) => d.toISOString()

const parseStamp = (stamp) => {
  if (!stamp) return null
  const d = new Date(stamp)
  if (Number.isNaN(d.getTime())) return null
  return d
}

const formatMilitaryTime = (date) => {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

const mapProductCategoryForPie = (type) => {
  const t = normalizeText(type)
  if (t === 'drinks' || t === 'drink') return 'Drinks'
  if (t === 'others' || t === 'other') return 'Others'
  // Meat/Vegetables (and anything else) counts as Food for the pie chart.
  return 'Food'
}

const mapProductCategoryForMostSold = (type) => {
  const t = normalizeText(type)
  if (t === 'meat') return 'Meat'
  if (t === 'fish' || t === 'seafood') return 'Fish'
  if (t === 'vegetables' || t === 'vegetable') return 'Vegetable'
  if (t === 'drinks' || t === 'drink') return 'Drinks'
  if (t === 'others' || t === 'other') return 'Others'
  return 'Others'
}

const buildProductImageUrl = (productObj) => {
  if (!productObj) return null

  const imagePath = productObj?.image_path || productObj?.imagePath
  if (imagePath) return getPublicStorageUrl(PRODUCT_IMAGE_BUCKET, imagePath)

  const imageUrl = productObj?.image_url || productObj?.imageUrl
  if (imageUrl) return imageUrl

  const legacy = productObj?.image
  if (legacy) return legacy

  return null
}

const buildOrderDescription = (items) => {
  const list = Array.isArray(items) ? items : []
  const parts = list
    .filter(Boolean)
    .slice(0, 3)
    .map((it) => {
      const qty = Number(it?.quantity || 0)
      const name = it?.products?.productName || 'Item'
      return `${qty}x ${name}`
    })
  return parts.join(', ')
}

async function fetchOrdersInRange(start, end) {
  const { data, error } = await supabase
    .from('orders')
    .select('orderID, orderType, status, orderTimestamp, completeTimestamp')
    .gte('orderTimestamp', toIso(start))
    .lte('orderTimestamp', toIso(end))

  if (error) throw error
  return Array.isArray(data) ? data : []
}

async function fetchPaymentsInRange(start, end) {
  const { data, error } = await supabase
    .from('payments')
    .select('orderID, totalAmount, paymentTimestamp')
    .gte('paymentTimestamp', toIso(start))
    .lte('paymentTimestamp', toIso(end))

  if (error) throw error
  return Array.isArray(data) ? data : []
}

async function fetchOrderItemsForOrderIds(orderIds) {
  const ids = Array.isArray(orderIds) ? orderIds.filter((x) => x != null) : []
  if (!ids.length) return []

  const { data, error } = await supabase
    .from('order_items')
    .select('orderItemID, orderID, quantity, price, selectedAddons, products(productID, productName, type, price, image_path)')
    .in('orderID', ids)

  if (error) throw error
  return Array.isArray(data) ? data : []
}

function Dashboard({ onLogout, onNavigate, userRole = 'admin', userName = 'Admin User' }) {
  const [timeFilter, setTimeFilter] = useState('Daily')
  const [showDailyCalendar, setShowDailyCalendar] = useState(false)
  const [showWeeklyCalendar, setShowWeeklyCalendar] = useState(false)
  const [showMonthlyCalendar, setShowMonthlyCalendar] = useState(false)
  const [showYearlyCalendar, setShowYearlyCalendar] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedWeek, setSelectedWeek] = useState(() => Math.min(4, Math.ceil(new Date().getDate() / 7)))

  const [orders, setOrders] = useState([])
  const [payments, setPayments] = useState([])
  const [orderItems, setOrderItems] = useState([])

  const [prevOrders, setPrevOrders] = useState([])
  const [prevPayments, setPrevPayments] = useState([])

  const [trendPayments, setTrendPayments] = useState([])

  const [realtimeCards, setRealtimeCards] = useState([])
  const [monitoringCounts, setMonitoringCounts] = useState({ pending: 0, completed: 0 })

  const [trendFilter, setTrendFilter] = useState('Daily')
  const [showTrendFilter, setShowTrendFilter] = useState(false)

  const [mostSoldCategoryFilter, setMostSoldCategoryFilter] = useState('ALL')
  const [showMostSoldFilter, setShowMostSoldFilter] = useState(false)

  const refreshTimerRef = useRef(null)
  const fetchVersionRef = useRef(0)
  const getPrimaryRange = useMemo(() => {
    const anchor = selectedDate ? new Date(selectedDate) : new Date()
    if (timeFilter === 'Daily') {
      const start = startOfDay(anchor)
      const end = endOfDay(anchor)
      return { start, end }
    }

    if (timeFilter === 'Weekly') {
      const year = anchor.getFullYear()
      const month = anchor.getMonth()
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      const dayStart = (selectedWeek - 1) * 7 + 1
      const dayEnd = selectedWeek === 4 ? daysInMonth : selectedWeek * 7
      const start = new Date(year, month, dayStart, 0, 0, 0, 0)
      const end = new Date(year, month, Math.min(dayEnd, daysInMonth), 23, 59, 59, 999)
      return { start, end }
    }

    if (timeFilter === 'Monthly') {
      const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
      start.setHours(0, 0, 0, 0)
      const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999)
      return { start, end }
    }

    if (timeFilter === 'Yearly') {
      const start = new Date(anchor.getFullYear(), 0, 1)
      start.setHours(0, 0, 0, 0)
      const end = new Date(anchor.getFullYear(), 11, 31, 23, 59, 59, 999)
      return { start, end }
    }

    const start = startOfDay(anchor)
    const end = endOfDay(anchor)
    return { start, end }
  }, [selectedDate, selectedWeek, timeFilter])

  const getComparisonRange = useMemo(() => {
    const { start, end } = getPrimaryRange
    if (timeFilter === 'Daily') return { start: addDays(start, -1), end: addDays(end, -1) }
    if (timeFilter === 'Weekly') return { start: addDays(start, -7), end: addDays(end, -7) }
    if (timeFilter === 'Monthly') {
      const anchor = new Date(start)
      const prevStart = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1)
      prevStart.setHours(0, 0, 0, 0)
      const prevEnd = new Date(anchor.getFullYear(), anchor.getMonth(), 0, 23, 59, 59, 999)
      return { start: prevStart, end: prevEnd }
    }
    if (timeFilter === 'Yearly') {
      const anchor = new Date(start)
      const prevStart = new Date(anchor.getFullYear() - 1, 0, 1)
      prevStart.setHours(0, 0, 0, 0)
      const prevEnd = new Date(anchor.getFullYear() - 1, 11, 31, 23, 59, 59, 999)
      return { start: prevStart, end: prevEnd }
    }
    return { start, end }
  }, [getPrimaryRange, timeFilter])

  const pctChange = (current, previous) => {
    const c = Number(current || 0)
    const p = Number(previous || 0)
    if (!p && !c) return '0.00%'
    if (!p && c) return '+100.00%'
    const pct = ((c - p) / p) * 100
    const sign = pct >= 0 ? '+' : ''
    return `${sign}${pct.toFixed(2)}%`
  }

  const fetchRealtimeCards = useCallback(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('orderID, status, orderType, orderTimestamp, paymentstatus, order_items(quantity, price, products(productName))')
      .order('orderTimestamp', { ascending: false })
      .limit(15)

    if (error) throw error

    const rows = Array.isArray(data) ? data : []
    // Keep the 3 most recent orders that are still active (not completed/cancelled).
    const activeOrders = rows
      .filter((r) => {
        const s = normalizeText(r?.status || '')
        return !isCompletedStatusValue(r?.status) && s !== 'cancelled' && s !== 'canceled'
      })
      .slice(0, 3)

    const toCard = (row) => {
      if (!row) return null
      const stamp = parseStamp(row?.orderTimestamp)
      const rawType = String(row?.orderType || '').toLowerCase().replace(/[^a-z]/g, '')
      const orderType = rawType === 'takeout' ? 'Take-Out' : rawType === 'dinein' ? 'Dine-In' : null
      const items = Array.isArray(row.order_items) ? row.order_items : []
      const totalPrice = items.reduce((sum, it) => sum + Number(it?.price || 0) * Number(it?.quantity || 0), 0)
      const totalItems = items.reduce((sum, it) => sum + Number(it?.quantity || 0), 0)
      const paymentStatus = String(row?.paymentstatus || '').toLowerCase()
      const isPaid = paymentStatus === 'paid' || paymentStatus === 'settled' || paymentStatus === 'complete'
      return {
        label: String(row?.status || 'Pending'),
        orderID: row.orderID,
        orderType,
        totalPrice,
        totalItems,
        isPaid,
        time: stamp ? formatMilitaryTime(stamp) : '--:--',
        date: stamp ? stamp.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null,
      }
    }

    setRealtimeCards(activeOrders.map(toCard).filter(Boolean))
  }, [])

  const fetchMonitoringCounts = useCallback(async () => {
    const completedQuery = await supabase
      .from('orders')
      .select('orderID', { count: 'exact', head: true })
      .eq('status', 'Completed')

    const pendingQuery = await supabase
      .from('orders')
      .select('orderID', { count: 'exact', head: true })
      .neq('status', 'Completed')

    if (completedQuery.error) throw completedQuery.error
    if (pendingQuery.error) throw pendingQuery.error

    setMonitoringCounts({
      pending: pendingQuery.count || 0,
      completed: completedQuery.count || 0,
    })
  }, [])

  const getTrendRange = useMemo(() => {
    const anchor = selectedDate ? new Date(selectedDate) : new Date()
    const end = endOfDay(anchor)
    if (trendFilter === 'Daily') return { start: startOfDay(addDays(anchor, -6)), end }
    if (trendFilter === 'Weekly') return { start: startOfDay(addDays(anchor, -27)), end }
    if (trendFilter === 'Monthly') {
      const start = new Date(anchor.getFullYear(), anchor.getMonth() - 11, 1)
      start.setHours(0, 0, 0, 0)
      return { start, end }
    }
    if (trendFilter === 'Yearly') {
      const start = new Date(anchor.getFullYear() - 4, 0, 1)
      start.setHours(0, 0, 0, 0)
      return { start, end }
    }
    return { start: startOfDay(addDays(anchor, -6)), end }
  }, [selectedDate, trendFilter])

  // Always-current ref so the stable refresh callback never reads stale range values.
  const latestRangesRef = useRef({ primary: getPrimaryRange, comparison: getComparisonRange, trend: getTrendRange })
  useEffect(() => {
    latestRangesRef.current = { primary: getPrimaryRange, comparison: getComparisonRange, trend: getTrendRange }
  }, [getPrimaryRange, getComparisonRange, getTrendRange])

  // Stable async refresh — increments its own version counter so only the most
  // recent concurrent call commits its results; older in-flight fetches self-cancel.
  const refresh = useCallback(async () => {
    fetchVersionRef.current += 1
    const myVersion = fetchVersionRef.current
    const isStale = () => fetchVersionRef.current !== myVersion

    try {
      const { primary: { start, end }, comparison: { start: prevStart, end: prevEnd }, trend: trendRange } = latestRangesRef.current

      // Fire sidebar cards immediately — independent of date range.
      fetchRealtimeCards().catch(console.error)
      fetchMonitoringCounts().catch(console.error)

      // Phase 1: current period — paints KPI cards right away.
      const [ordersNow, paymentsNow] = await Promise.all([
        fetchOrdersInRange(start, end),
        fetchPaymentsInRange(start, end),
      ])
      if (isStale()) return
      setOrders(ordersNow)
      setPayments(paymentsNow)

      // Phase 2: order items + comparison + trend all in parallel.
      const ids = ordersNow.map((o) => o.orderID)
      const [items, ordersThen, paymentsThen, trend] = await Promise.all([
        fetchOrderItemsForOrderIds(ids),
        fetchOrdersInRange(prevStart, prevEnd),
        fetchPaymentsInRange(prevStart, prevEnd),
        fetchPaymentsInRange(trendRange.start, trendRange.end),
      ])
      if (isStale()) return
      setOrderItems(items)
      setPrevOrders(ordersThen)
      setPrevPayments(paymentsThen)
      setTrendPayments(trend)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    }
  }, [fetchMonitoringCounts, fetchRealtimeCards])

  // Re-fetch whenever any filter-driven range changes (debounced for rapid clicks).
  useEffect(() => {
    const timer = setTimeout(refresh, 120)
    return () => clearTimeout(timer)
  }, [refresh, getPrimaryRange, getComparisonRange, getTrendRange])

  // Realtime subscription — created ONCE on mount, never torn down on filter changes.
  // Keeping it stable avoids the reconnect delay that caused missed updates.
  useEffect(() => {
    const unsubscribe = subscribeToOrderRelatedChanges(
      () => {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
        refreshTimerRef.current = setTimeout(refresh, 15)
      },
      () => refresh(),
    )
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      unsubscribe()
    }
  }, [refresh])

  const normalizeOrderType = (value) => String(value || '').toLowerCase().replace(/[^a-z]/g, '')

  const filteredOrders = useMemo(() => orders || [], [orders])
  const filteredPayments = useMemo(() => payments || [], [payments])

  const computedStats = useMemo(() => {
    const ordersCount = filteredOrders.length
    const totalSales = filteredPayments.reduce((sum, p) => sum + Number(p?.totalAmount || p?.total_amount || 0), 0)

    if (!ordersCount) {
      return { ordersCount: 0, totalSales, dineInPct: 0, takeOutPct: 0 }
    }

    const dineInCount = filteredOrders.filter((o) => {
      const t = normalizeOrderType(o?.orderType)
      return t === 'dinein'
    }).length
    const takeOutCount = filteredOrders.filter((o) => {
      const t = normalizeOrderType(o?.orderType)
      return t === 'takeout'
    }).length

    const dineInPct = Math.round((dineInCount / ordersCount) * 100)
    const takeOutPct = Math.max(0, 100 - dineInPct)
    return { ordersCount, totalSales, dineInPct, takeOutPct, dineInCount, takeOutCount }
  }, [filteredOrders, filteredPayments])

  const computedPrevStats = useMemo(() => {
    const prevOrdersCount = (prevOrders || []).length
    const prevTotalSales = (prevPayments || []).reduce((sum, p) => sum + Number(p?.totalAmount || 0), 0)
    return { prevOrdersCount, prevTotalSales }
  }, [prevOrders, prevPayments])

  const computeAvgPrepMinutes = (ordersList) => {
    const mins = []
    ;(ordersList || []).forEach((o) => {
      if (!isCompletedStatusValue(o?.status)) return
      const orderTs = parseStamp(o?.orderTimestamp)
      const completeTs = parseStamp(o?.completeTimestamp)
      if (!orderTs || !completeTs) return
      const diffMin = Math.max(0, (completeTs.getTime() - orderTs.getTime()) / 60000)
      mins.push(diffMin)
    })

    if (!mins.length) return 0
    return mins.reduce((a, b) => a + b, 0) / mins.length
  }

  const closeAllCalendars = () => {
    setShowDailyCalendar(false)
    setShowWeeklyCalendar(false)
    setShowMonthlyCalendar(false)
    setShowYearlyCalendar(false)
  }

  const selectTimeFilter = (filter) => {
    setTimeFilter(filter)
    closeAllCalendars()
  }

  const toggleTimeFilterCalendar = (filter) => {
    setTimeFilter(filter)
    if (filter === 'Daily') {
      setShowDailyCalendar((v) => !v)
      setShowWeeklyCalendar(false)
      setShowMonthlyCalendar(false)
      setShowYearlyCalendar(false)
    } else if (filter === 'Weekly') {
      setShowWeeklyCalendar((v) => !v)
      setShowDailyCalendar(false)
      setShowMonthlyCalendar(false)
      setShowYearlyCalendar(false)
    } else if (filter === 'Monthly') {
      setShowMonthlyCalendar((v) => !v)
      setShowDailyCalendar(false)
      setShowWeeklyCalendar(false)
      setShowYearlyCalendar(false)
    } else if (filter === 'Yearly') {
      setShowYearlyCalendar((v) => !v)
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

  const months = useMemo(
    () => [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
    [],
  )
  
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i)

  // Data based on time filter
  const getStatsData = () => {
    const base = {
      revenue: computedStats.totalSales || 0,
      orders: computedStats.ordersCount || 0,
      dineInPct: computedStats.dineInPct || 0,
      takeOutPct: computedStats.takeOutPct || 0,
    }

    const avgPrep = computeAvgPrepMinutes(filteredOrders)
    const prevAvgPrep = computeAvgPrepMinutes(prevOrders)

    return {
      ...base,
      prepTime: `${Math.round(avgPrep || 0)} mins`,
      revenueChange: pctChange(base.revenue, computedPrevStats.prevTotalSales),
      ordersChange: pctChange(base.orders, computedPrevStats.prevOrdersCount),
      prepChange: pctChange(avgPrep, prevAvgPrep),
    }
  }

  const statsData = getStatsData()

  const displayedPrepTime = useMemo(() => statsData.prepTime, [statsData.prepTime])

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

  const salesAmount = useMemo(() => `₱ ${formatMoney(statsData.revenue)}`, [statsData.revenue])

  const salesData = useMemo(() => {
    const paidOrders = new Set((filteredPayments || []).map((p) => p?.orderID).filter((x) => x != null))
    const totals = { Food: 0, Drinks: 0, Others: 0 }

    ;(orderItems || []).forEach((oi) => {
      if (!paidOrders.has(oi?.orderID)) return
      const qty = Number(oi?.quantity || 0)
      const unit = Number(oi?.price ?? oi?.products?.price ?? 0)
      const revenue = qty * unit
      const bucket = mapProductCategoryForPie(oi?.products?.type)
      totals[bucket] = (totals[bucket] || 0) + revenue
      // Count addon revenue under Others so the pie matches payment totals.
      const addons = Array.isArray(oi?.selectedAddons) ? oi.selectedAddons : []
      addons.forEach((addon) => {
        totals.Others = (totals.Others || 0) + Number(addon?.price || 0) * qty
      })
    })

    const total = Object.values(totals).reduce((a, b) => a + b, 0)
    const toPct = (v) => {
      if (!total) return 0
      return Math.round((v / total) * 100)
    }

    const raw = [
      { name: 'Food', value: toPct(totals.Food), amount: Math.round(totals.Food), color: '#5BC0BE' },
      { name: 'Drinks', value: toPct(totals.Drinks), amount: Math.round(totals.Drinks), color: '#E07A5F' },
      { name: 'Others', value: toPct(totals.Others), amount: Math.round(totals.Others), color: '#F2CC8F' },
    ]

    // Fix rounding to exactly 100 when possible.
    const sum = raw.reduce((s, r) => s + r.value, 0)
    if (sum !== 100 && total) {
      const idx = raw.reduce((maxIdx, r, i) => (r.value > raw[maxIdx].value ? i : maxIdx), 0)
      raw[idx].value = Math.max(0, raw[idx].value + (100 - sum))
    }

    return raw
  }, [filteredPayments, orderItems])

  const hasSalesBreakdown = useMemo(() => {
    return Array.isArray(salesData) && salesData.some((d) => Number(d?.value || 0) > 0)
  }, [salesData])

  const mostSoldProducts = useMemo(() => {
    const paidOrders = new Set((filteredPayments || []).map((p) => p?.orderID).filter((x) => x != null))
    const byProduct = new Map()
    const distinctOrdersByProduct = new Map()

    // Build a map of orderID -> orderTimestamp for date tracking
    const orderTimestampMap = new Map()
    ;(filteredOrders || []).forEach((o) => {
      if (o?.orderID != null) orderTimestampMap.set(o.orderID, o.orderTimestamp)
    })

    ;(orderItems || []).forEach((oi) => {
      if (!paidOrders.has(oi?.orderID)) return
      const name = oi?.products?.productName || 'Item'
      const type = oi?.products?.type
      const category = mapProductCategoryForMostSold(type)
      const image = buildProductImageUrl(oi?.products)
      const qty = Number(oi?.quantity || 0)
      const unit = Number(oi?.price ?? oi?.products?.price ?? 0)
      const currentPrice = Number(oi?.products?.price ?? 0)
      const revenue = qty * unit

      if (!byProduct.has(name)) {
        byProduct.set(name, { category, name, image: image || null, orders: 0, revenue: 0, unitPrice: unit, currentPrice, lastOrderDate: null })
      }
      const agg = byProduct.get(name)
      agg.orders += qty
      agg.revenue += revenue
      if (!agg.image && image) agg.image = image

      // Track the most recent order date for this product
      const ts = orderTimestampMap.get(oi?.orderID)
      if (ts) {
        const d = parseStamp(ts)
        if (d && (!agg.lastOrderDate || d > agg.lastOrderDate)) agg.lastOrderDate = d
      }

      byProduct.set(name, agg)

      if (!distinctOrdersByProduct.has(name)) distinctOrdersByProduct.set(name, new Set())
      distinctOrdersByProduct.get(name).add(oi.orderID)
    })

    // Also aggregate selected addons under 'Others'.
    ;(orderItems || []).forEach((oi) => {
      if (!paidOrders.has(oi?.orderID)) return
      const qty = Number(oi?.quantity || 0)
      const addons = Array.isArray(oi?.selectedAddons) ? oi.selectedAddons : []
      addons.forEach((addon) => {
        const addonName = addon?.name
        if (!addonName) return
        const addonPrice = Number(addon?.price || 0)
        if (!byProduct.has(addonName)) {
          byProduct.set(addonName, { category: 'Others', name: addonName, image: null, orders: 0, revenue: 0, unitPrice: addonPrice, currentPrice: addonPrice, lastOrderDate: null })
        }
        const agg = byProduct.get(addonName)
        agg.orders += qty
        agg.revenue += addonPrice * qty
        byProduct.set(addonName, agg)
        if (!distinctOrdersByProduct.has(addonName)) distinctOrdersByProduct.set(addonName, new Set())
        distinctOrdersByProduct.get(addonName).add(oi.orderID)
      })
    })

    // Sort globally (per-category top-5 is applied in categorizedMostSold).
    const list = Array.from(byProduct.values())
      .map((p) => ({ ...p, distinctOrders: distinctOrdersByProduct.get(p.name)?.size || 0 }))
      .sort((a, b) => {
        const ao = Number(a.distinctOrders || 0)
        const bo = Number(b.distinctOrders || 0)
        if (bo !== ao) return bo - ao
        return Number(b.revenue || 0) - Number(a.revenue || 0)
      })
      .map((p) => ({
        category: p.category,
        name: p.name,
        image: p.image || null,
        orders: p.orders,
        revenue: Math.round(p.revenue),
        unitPrice: p.unitPrice,
        currentPrice: p.currentPrice,
        priceChanged: Math.abs((p.unitPrice || 0) - (p.currentPrice || 0)) > 0.01,
        lastOrderDate: p.lastOrderDate,
      }))

    return list
  }, [filteredPayments, filteredOrders, orderItems])

  const categorizedMostSold = useMemo(() => {
    const order = ['Meat', 'Fish', 'Vegetable', 'Drinks', 'Others']
    const grouped = mostSoldProducts.reduce((acc, item) => {
      const key = item.category || 'Others'
      acc[key] = acc[key] || []
      acc[key].push(item)
      return acc
    }, {})
    return order
      .filter((k) => grouped[k] && grouped[k].length)
      // Top 5 per category — items are already globally sorted so first-5 = per-category top-5.
      .map((k) => ({ category: k, items: grouped[k].slice(0, 5) }))
  }, [mostSoldProducts])

  const filteredCategorizedMostSold = useMemo(() => {
    if (mostSoldCategoryFilter === 'ALL') return categorizedMostSold
    return categorizedMostSold.filter((g) => g.category === mostSoldCategoryFilter)
  }, [categorizedMostSold, mostSoldCategoryFilter])

  const hasMostSold = filteredCategorizedMostSold.length > 0

  const hasAnyData = useMemo(() => {
    return filteredOrders.length > 0 || filteredPayments.length > 0
  }, [filteredOrders, filteredPayments])

  const trendData = useMemo(() => {
    const list = Array.isArray(trendPayments) ? trendPayments : []

    const weekdayAbbr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const monthAbbr = (date) => months[date.getMonth()].slice(0, 3)

    const anchor = selectedDate ? new Date(selectedDate) : new Date()
    anchor.setHours(12, 0, 0, 0)

    const startOfWeekMonday = (date) => {
      const d = new Date(date)
      const day = d.getDay()
      const diff = (day + 6) % 7
      d.setDate(d.getDate() - diff)
      d.setHours(12, 0, 0, 0)
      return d
    }

    const weekOfMonth = (date) => Math.floor((date.getDate() - 1) / 7) + 1

    if (trendFilter === 'Daily') {
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(anchor)
        d.setDate(anchor.getDate() - (6 - i))
        const key = d.toDateString()
        const sum = list
          .filter((p) => {
            const ts = parseStamp(p?.paymentTimestamp)
            return ts && ts.toDateString() === key
          })
          .reduce((acc, p) => acc + Number(p?.totalAmount || 0), 0)
        return { time: weekdayAbbr[d.getDay()], sales: Math.round(sum) }
      })
      return days
    }

    if (trendFilter === 'Weekly') {
      const endWeekStart = startOfWeekMonday(anchor)
      return Array.from({ length: 4 }, (_, i) => {
        const weekStart = new Date(endWeekStart)
        weekStart.setDate(endWeekStart.getDate() - (3 - i) * 7)
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        weekEnd.setHours(23, 59, 59, 999)
        const wom = weekOfMonth(weekStart)
        const label = `${monthAbbr(weekStart)} W${wom}`
        const sum = list
          .filter((p) => {
            const ts = parseStamp(p?.paymentTimestamp)
            return ts && ts >= weekStart && ts <= weekEnd
          })
          .reduce((acc, p) => acc + Number(p?.totalAmount || 0), 0)
        return { time: label, sales: Math.round(sum) }
      })
    }

    if (trendFilter === 'Monthly') {
      return Array.from({ length: 12 }, (_, i) => {
        const d = new Date(anchor)
        d.setMonth(anchor.getMonth() - (11 - i))
        const y = d.getFullYear()
        const m = d.getMonth()
        const start = new Date(y, m, 1)
        start.setHours(0, 0, 0, 0)
        const end = new Date(y, m + 1, 0, 23, 59, 59, 999)
        const sum = list
          .filter((p) => {
            const ts = parseStamp(p?.paymentTimestamp)
            return ts && ts >= start && ts <= end
          })
          .reduce((acc, p) => acc + Number(p?.totalAmount || 0), 0)
        return { time: months[m].slice(0, 3), sales: Math.round(sum) }
      })
    }

    if (trendFilter === 'Yearly') {
      const y = anchor.getFullYear()
      const yearsRange = Array.from({ length: 5 }, (_, i) => y - (4 - i))
      return yearsRange.map((year) => {
        const start = new Date(year, 0, 1)
        start.setHours(0, 0, 0, 0)
        const end = new Date(year, 11, 31, 23, 59, 59, 999)
        const sum = list
          .filter((p) => {
            const ts = parseStamp(p?.paymentTimestamp)
            return ts && ts >= start && ts <= end
          })
          .reduce((acc, p) => acc + Number(p?.totalAmount || 0), 0)
        return { time: String(year), sales: Math.round(sum) }
      })
    }

    return []
  }, [months, selectedDate, trendFilter, trendPayments])

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
              <div className="filter-row">
                <button
                  className={`filter-btn ${timeFilter === 'Daily' ? 'active' : ''}`}
                  onClick={() => selectTimeFilter('Daily')}
                >
                  Daily
                </button>
                <button
                  type="button"
                  className={`filter-drop-btn ${timeFilter === 'Daily' ? 'active' : ''}`}
                  onClick={() => toggleTimeFilterCalendar('Daily')}
                  aria-label="Open daily dropdown"
                >
                  ▼
                </button>
              </div>
              {showDailyCalendar && (
                <div className="calendar-dropdown">
                  <div className="calendar-header">
                    <button
                      type="button"
                      onClick={() => {
                        const newDate = new Date(selectedDate)
                        newDate.setMonth(selectedDate.getMonth() - 1)
                        setSelectedDate(newDate)
                      }}
                    >
                      ‹
                    </button>
                    <span>
                      {months[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const newDate = new Date(selectedDate)
                        newDate.setMonth(selectedDate.getMonth() + 1)
                        setSelectedDate(newDate)
                      }}
                    >
                      ›
                    </button>
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
                        const now = new Date()
                        const isToday =
                          day === now.getDate() &&
                          selectedDate.getMonth() === now.getMonth() &&
                          selectedDate.getFullYear() === now.getFullYear()
                        const isSelected = day === selectedDate.getDate()

                        days.push(
                          <div
                            key={day}
                            className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday && !isSelected ? 'today' : ''}`}
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
              <div className="filter-row">
                <button
                  className={`filter-btn ${timeFilter === 'Weekly' ? 'active' : ''}`}
                  onClick={() => selectTimeFilter('Weekly')}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  className={`filter-drop-btn ${timeFilter === 'Weekly' ? 'active' : ''}`}
                  onClick={() => toggleTimeFilterCalendar('Weekly')}
                  aria-label="Open weekly dropdown"
                >
                  ▼
                </button>
              </div>
              {showWeeklyCalendar && (
                <div className="calendar-dropdown weekly">
                  <div className="calendar-header">
                    <button
                      type="button"
                      onClick={() => {
                        const newDate = new Date(selectedDate)
                        newDate.setMonth(selectedDate.getMonth() - 1)
                        setSelectedDate(newDate)
                      }}
                    >
                      ‹
                    </button>
                    <span>
                      {months[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const newDate = new Date(selectedDate)
                        newDate.setMonth(selectedDate.getMonth() + 1)
                        setSelectedDate(newDate)
                      }}
                    >
                      ›
                    </button>
                  </div>
                  <div className="weeks-grid">
                    {[1, 2, 3, 4].map((week) => {
                      const year = selectedDate.getFullYear()
                      const month = selectedDate.getMonth()
                      const daysInMonth = new Date(year, month + 1, 0).getDate()
                      const dayStart = (week - 1) * 7 + 1
                      const dayEnd = week === 4 ? daysInMonth : week * 7
                      return (
                        <div
                          key={week}
                          className={`week-item ${selectedWeek === week ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedWeek(week)
                            setTimeFilter('Weekly')
                            setShowWeeklyCalendar(false)
                          }}
                        >
                          <div className="week-label">Week {week}</div>
                          <div className="week-range">{dayStart} – {Math.min(dayEnd, daysInMonth)}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="filter-wrapper">
              <div className="filter-row">
                <button
                  className={`filter-btn ${timeFilter === 'Monthly' ? 'active' : ''}`}
                  onClick={() => selectTimeFilter('Monthly')}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  className={`filter-drop-btn ${timeFilter === 'Monthly' ? 'active' : ''}`}
                  onClick={() => toggleTimeFilterCalendar('Monthly')}
                  aria-label="Open monthly dropdown"
                >
                  ▼
                </button>
              </div>
              {showMonthlyCalendar && (
                <div className="calendar-dropdown monthly">
                  <div className="calendar-header">
                    <button
                      type="button"
                      onClick={() => {
                        const newDate = new Date(selectedDate)
                        newDate.setFullYear(selectedDate.getFullYear() - 1)
                        setSelectedDate(newDate)
                      }}
                    >
                      ‹
                    </button>
                    <span>{selectedDate.getFullYear()}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const newDate = new Date(selectedDate)
                        newDate.setFullYear(selectedDate.getFullYear() + 1)
                        setSelectedDate(newDate)
                      }}
                    >
                      ›
                    </button>
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
              <div className="filter-row">
                <button
                  className={`filter-btn ${timeFilter === 'Yearly' ? 'active' : ''}`}
                  onClick={() => selectTimeFilter('Yearly')}
                >
                  Yearly
                </button>
                <button
                  type="button"
                  className={`filter-drop-btn ${timeFilter === 'Yearly' ? 'active' : ''}`}
                  onClick={() => toggleTimeFilterCalendar('Yearly')}
                  aria-label="Open yearly dropdown"
                >
                  ▼
                </button>
              </div>
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
        {!hasAnyData && (
          <div className="dashboard-no-data-banner">
            No data available for this period.
          </div>
        )}
        <div className="dashboard-section-wrapper">
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Sales</h3>
              <div className="stat-value">₱ {formatMoney(statsData.revenue)}</div>
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
                {hasSalesBreakdown ? (
                  <>
                    <div className="pie-chart-container">
                      <PieChart width={200} height={200}>
                          <Pie
                            data={salesData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            dataKey="value"
                            isAnimationActive={false}
                          >
                            {salesData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value, name, entry) => [`${value}% (₱ ${formatMoney(entry.payload.amount)})`, name]}
                            contentStyle={{ backgroundColor: '#fff', border: '2px solid #000', borderRadius: '8px' }}
                          />
                        </PieChart>
                      <div className="chart-center-text">
                        <div className="center-label"></div>
                        <div className="center-value"></div>
                      </div>
                    </div>
                    <div className="sales-info">
                      <div className="sales-amount">{salesAmount}</div>
                      <div className="sales-legend">
                        <div className="legend-item">
                          <span className="legend-color" style={{ backgroundColor: '#5BC0BE' }}></span>
                          <span>Food</span>
                        </div>
                        <div className="legend-item">
                          <span className="legend-color" style={{ backgroundColor: '#E07A5F' }}></span>
                          <span>Drinks</span>
                        </div>
                        <div className="legend-item">
                          <span className="legend-color" style={{ backgroundColor: '#F2CC8F' }}></span>
                          <span>Others</span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="dashboard-empty-note">No Data Available</div>
                )}
              </div>
            </div>

            <div className="dashboard-section most-sold-section">
              <div className="most-sold-header-row">
                <h2>Most Sold Item</h2>
                <div className="prep-filter-row prep-filter-row--top">
                  <button
                    type="button"
                    className="prep-filter-btn"
                    onClick={() => setShowMostSoldFilter((v) => !v)}
                    aria-label="Most sold category filter"
                  >
                    {mostSoldCategoryFilter} ▼
                  </button>
                  {showMostSoldFilter ? (
                    <div className="prep-filter-menu" role="menu" aria-label="Most sold category filter menu">
                      {['ALL', 'Meat', 'Fish', 'Vegetable', 'Drinks', 'Others'].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          className={`prep-filter-item ${mostSoldCategoryFilter === opt ? 'active' : ''}`}
                          onClick={() => {
                            setMostSoldCategoryFilter(opt)
                            setShowMostSoldFilter(false)
                          }}
                          role="menuitem"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="most-sold-table-header">
                <span>Product</span>
                <span>Orders</span>
                <span>Sales</span>
              </div>
              <div className="most-sold-list">
                {hasMostSold ? (
                  filteredCategorizedMostSold.map((group) => (
                    <div key={group.category} className="most-sold-category">
                      <div className="most-sold-category-title">{group.category}</div>
                      {group.items.map((product, index) => (
                        <div key={`${group.category}-${index}`} className="product-item">
                          <div className="product-info">
                            <img
                              className="product-image"
                              src={product.image || placeholderSvg}
                              alt={product.name}
                              loading="lazy"
                              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = placeholderSvg }}
                            />
                            <div className="product-info-text">
                              <span className="product-name">{product.name}</span>
                              <div className="product-price-row">
                                <span className="product-unit-price">₱ {formatMoney(product.unitPrice)}</span>
                                {product.priceChanged && (
                                  <span
                                    className="product-price-changed"
                                    title={`Price has changed since ${product.lastOrderDate ? product.lastOrderDate.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : 'previous orders'}`}
                                  >
                                    ⚠ Changed
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className="product-orders">{formatInteger(product.orders)}</span>
                          <span className="product-revenue">₱ {formatMoney(product.revenue)}</span>
                        </div>
                      ))}
                    </div>
                  ))
                ) : (
                  <div className="dashboard-empty-note">No Data Available</div>
                )}
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
                <div className="trend-right">
                  <div className="prep-filter-row prep-filter-row--top">
                    <button
                      type="button"
                      className="prep-filter-btn"
                      onClick={() => setShowTrendFilter((v) => !v)}
                      aria-label="Sales trend filter"
                    >
                      {trendFilter} ▼
                    </button>
                    {showTrendFilter ? (
                      <div className="prep-filter-menu" role="menu" aria-label="Sales trend filter menu">
                        {['Daily', 'Weekly', 'Monthly', 'Yearly'].map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            className={`prep-filter-item ${trendFilter === opt ? 'active' : ''}`}
                            onClick={() => {
                              setTrendFilter(opt)
                              setShowTrendFilter(false)
                            }}
                            role="menuitem"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={trendData} margin={{ top: 20, right: 30, left: 90, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
                  <XAxis dataKey="time" stroke="#666" />
                  <YAxis 
                    stroke="#666" 
                    tickFormatter={(value) => `₱ ${formatMoney(value)}`}
                  />
                  <Tooltip 
                    formatter={(value) => [`₱ ${formatMoney(value)}`, 'Sales']}
                    contentStyle={{ backgroundColor: '#fff', border: '2px solid #000', borderRadius: '8px', textAlign: 'center', padding: '0.5rem 1rem' }}
                    labelStyle={{ display: 'none' }}
                    itemStyle={{ display: 'flex', justifyContent: 'center' }}
                  />
                  <Line type="monotone" dataKey="sales" stroke="#6a1b1a" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="dashboard-section real-time-order-section">
              <h2>Real Time Order</h2>
              <div className="order-list">
                {realtimeCards.length === 0 ? (
                  <div className="rto-card preparing" style={{ opacity: 0.5, justifyContent: 'center' }}>No active orders</div>
                ) : realtimeCards.map((card) => (
                  <div key={card.orderID} className="rto-card preparing">
                    <div className="rto-left">
                      <div className="rto-order-id">Order #{card.orderID ?? '--'}</div>
                      {card.orderType && <div className="rto-order-type">{card.orderType}</div>}
                    </div>
                    <div className="rto-center">
                      <div className="rto-price">₱ {formatMoney(Number(card.totalPrice || 0))}</div>
                    </div>
                    <div className="rto-right">
                      <div className="rto-status preparing">
                        {card.label} · {card.totalItems} item{card.totalItems !== 1 ? 's' : ''}
                      </div>
                      <div className="rto-bottom-row">
                        <div className="rto-stamp-wrapper">
                          <span className="rto-stamp">{card.time}</span>
                          {card.date && <span className="rto-date-tooltip">{card.date}</span>}
                        </div>
                        <div className={`rto-paid-badge ${card.isPaid ? 'paid' : 'unpaid'}`}>
                          {card.isPaid ? 'PAID' : 'UNPAID'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="dashboard-section monitoring-section">
              <h2>Real Time Order Monitoring</h2>
              <div className="monitoring-content">
                <div className="monitoring-row">
                  <span className="monitoring-label">Pending Orders</span>
                  <span className="monitoring-count">{formatInteger(monitoringCounts.pending)}</span>
                </div>
                <div className="monitoring-row">
                  <span className="monitoring-label">Completed Orders</span>
                  <span className="monitoring-count">{formatInteger(monitoringCounts.completed)}</span>
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

