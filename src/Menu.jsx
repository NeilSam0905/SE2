import { useMemo, useState, useEffect, useCallback } from 'react'
import Navbar from './elements/Navbar'
import './styles/Menu.css'
import ConfirmModal from './elements/ConfirmModal'
import {
  fetchProducts as fetchProductsFromDb,
  fetchPreviousPrices,
  createProduct,
  updateProduct,
  updateProductStatus,
} from './data/products'
import { ADD_PRODUCT_BUTTON_ICON } from './utils/publicAsset'
import placeholderSvg from '/placeholder.svg'
import { supabase } from './lib/supabaseClient'

const PRODUCTS_CACHE_KEY = 'products_cache_v1'
const PRODUCTS_CACHE_MAX_AGE_MS = 5 * 60 * 1000

const normalizeText = (value) => String(value || '').trim().toLowerCase()
const normalizeKey = (value) => normalizeText(value).replace(/\s+/g, ' ')

const normalizeProductType = (raw) => {
  const t = normalizeText(raw)
  if (t === 'meat') return 'Meat'
  if (t === 'fish' || t === 'seafood') return 'Fish'
  if (t === 'vegetable' || t === 'vegetables') return 'Vegetable'
  if (t === 'drinks' || t === 'drink') return 'Drinks'
  if (t === 'others' || t === 'other') return 'Others'
  if (t === 'food') return 'Others'
  return 'Others'
}

const PRODUCT_TYPE_OPTIONS = [
  { key: 'Meat', label: 'Meat' },
  { key: 'Fish', label: 'Fish' },
  { key: 'Vegetable', label: 'Vegetable' },
  { key: 'Drinks', label: 'Drinks' },
  { key: 'Others', label: 'Others' },
]

function Menu({ onLogout, onNavigate, userRole = 'admin', userName = 'Admin User' }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [originalProduct, setOriginalProduct] = useState(null)
  const [confirmState, setConfirmState] = useState({ open: false, mode: null })
  const [resultState, setResultState] = useState({ open: false, title: '', message: '' })
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [showCategoryFilter, setShowCategoryFilter] = useState(false)
  
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    status: 'AVAILABLE',
    type: 'Meat',
    image: placeholderSvg,
    description: '',
    isBestSeller: false,
  })

  const [newProductImageFile, setNewProductImageFile] = useState(null)
  const [editingProductImageFile, setEditingProductImageFile] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  const [products, setProducts] = useState([])
  const [previousPrices, setPreviousPrices] = useState({})

  // --- Addons ---
  const [addons, setAddons] = useState([])
  const [addonsLoaded, setAddonsLoaded] = useState(false)
  const [addonsError, setAddonsError] = useState('')
  const [editingAddon, setEditingAddon] = useState(null)
  const [addonSaving, setAddonSaving] = useState(false)

  const fetchAddons = useCallback(async () => {
    setAddonsError('')
    const { data, error } = await supabase
      .from('addons')
      .select('id, name, price, is_available')
      .order('name')
    if (error) {
      console.error('[addons] fetch error:', error.code, error.message, error.details)
      setAddonsError(error.message || 'Unknown error')
    } else {
      setAddons(Array.isArray(data) ? data : [])
    }
    setAddonsLoaded(true)
  }, [])

  const handleSaveAddon = async () => {
    if (!editingAddon || addonSaving) return
    setAddonSaving(true)
    try {
      const { error } = await supabase
        .from('addons')
        .update({ price: Number(editingAddon.price), is_available: editingAddon.is_available })
        .eq('id', editingAddon.id)
      if (error) throw error
      setAddons((prev) => prev.map((a) => a.id === editingAddon.id ? { ...a, price: Number(editingAddon.price), is_available: editingAddon.is_available } : a))
      setEditingAddon(null)
    } catch (err) {
      console.error('Failed to save addon:', err.message)
    } finally {
      setAddonSaving(false)
    }
  }

  const duplicateNewProduct = useMemo(() => {
    const key = normalizeKey(newProduct.name)
    if (!key) return null
    return products.find((p) => normalizeKey(p.name) === key) || null
  }, [newProduct.name, products])

  const duplicateEditProduct = useMemo(() => {
    const key = normalizeKey(editingProduct?.name)
    if (!key || !editingProduct?.id) return null
    return products.find((p) => p.id !== editingProduct.id && normalizeKey(p.name) === key) || null
  }, [editingProduct?.id, editingProduct?.name, products])

  // --- 1. READ (Fetch from Supabase) ---
  const fetchProducts = async () => {
    try {
      const mappedData = await fetchProductsFromDb()
      setProducts(mappedData)

      try {
        const prevMap = await fetchPreviousPrices()
        setPreviousPrices(prevMap)
      } catch {
        // ignore history fetch failures
      }

      try {
        localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: mappedData }))
      } catch {
        // ignore cache failures
      }
    } catch (err) {
      console.error('Error fetching products:', err.message)
    }
  }

  useEffect(() => {
    // Instant paint: show last menu snapshot (if any), then refresh.
    try {
      const raw = localStorage.getItem(PRODUCTS_CACHE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        const age = Date.now() - Number(parsed?.ts || 0)
        if (Array.isArray(parsed?.data) && age < PRODUCTS_CACHE_MAX_AGE_MS) {
          setProducts(parsed.data)
        }
      }
    } catch {
      // ignore cache parse failures
    }

    fetchProducts()
    fetchAddons()
  }, [fetchAddons])

  // --- 2. UPDATE STATUS ---
  const handleStatusChange = async (id, newStatus) => {
    // Optimistic update
    setProducts(products.map(product =>
      product.id === id ? { ...product, status: newStatus } : product
    ))
    try {
      await updateProductStatus(userRole, id, newStatus)
    } catch (err) {
      console.error('Status update failed:', err.message)
      fetchProducts() // revert optimistic update
    }
  }

  // --- 3. CREATE PRODUCT ---
  const handleSaveNewProduct = async () => {
    await createProduct(userRole, newProduct, newProductImageFile)
    await fetchProducts()
    setShowAddModal(false)
  }

  // --- 4. UPDATE PRODUCT ---
  const handleSaveEdit = async () => {
    await updateProduct(userRole, editingProduct.id, editingProduct, editingProductImageFile)
    await fetchProducts()
    setShowEditModal(false)
  }

  // --- FILTERING & CATEGORIES ---
  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return products.filter((p) => {
      const matchesQuery = !q || String(p.name || '').toLowerCase().includes(q)
      const type = normalizeProductType(p.type)
      const matchesType = categoryFilter === 'ALL' || type.toUpperCase() === categoryFilter.toUpperCase()
      return matchesQuery && matchesType
    })
  }, [products, searchTerm, categoryFilter])

  const categorizedProducts = useMemo(() => {
    const order = [
      { key: 'Meat', label: 'Meat' },
      { key: 'Fish', label: 'Fish' },
      { key: 'Vegetable', label: 'Vegetable' },
      { key: 'Drinks', label: 'Drinks' },
      { key: 'Others', label: 'Others' },
    ]

    const grouped = filteredProducts.reduce((acc, product) => {
      const type = normalizeProductType(product.type)
      acc[type] = acc[type] || []
      acc[type].push(product)
      return acc
    }, {})

    return order
      .filter((group) => grouped[group.key] && grouped[group.key].length)
      .map((group) => ({
        label: group.label,
        items: [...grouped[group.key]].sort((a, b) =>
          String(a.name || '').localeCompare(String(b.name || ''))
        ),
      }))
  }, [filteredProducts])

  // --- UI HANDLERS ---
  const handleEdit = (id) => {
    const product = products.find(p => p.id === id)
    setEditingProduct({ ...product })
    setOriginalProduct({ ...product })
    setEditingProductImageFile(null)
    setShowEditModal(true)
  }

  const handleAddProduct = () => {
    setNewProduct({
      name: '',
      price: '',
      status: 'AVAILABLE',
      type: 'Meat',
      image: '/product1.jpg',
      description: '',
      isBestSeller: false,
    })
    setNewProductImageFile(null)
    setShowAddModal(true)
  }

  const openSaveConfirm = (mode) => setConfirmState({ open: true, mode })
  const closeSaveConfirm = () => setConfirmState({ open: false, mode: null })

  const handleRequestAddSave = () => {
    if (duplicateNewProduct) {
      setResultState({
        open: true,
        title: 'Duplicate Product',
        message: `"${String(newProduct.name || '').trim() || 'This product'}" already exists in the menu.`,
      })
      return
    }
    openSaveConfirm('add')
  }

  const handleRequestEditSave = () => {
    if (duplicateEditProduct) {
      setResultState({
        open: true,
        title: 'Duplicate Product',
        message: `"${String(editingProduct?.name || '').trim() || 'This product'}" already exists in the menu.`,
      })
      return
    }
    openSaveConfirm('edit')
  }

  const runConfirmedSave = async () => {
    if (isSaving) return
    setIsSaving(true)
    try {
      if (confirmState.mode === 'add') {
        await handleSaveNewProduct()
        setResultState({
          open: true,
          title: 'Product Added',
          message: `Added: ${newProduct.name}\nPrice: ₱ ${Number(newProduct.price || 0).toFixed(2)}\nStatus: ${newProduct.status}`,
        })
      }

      if (confirmState.mode === 'edit') {
        const summary = buildEditSummary()
        await handleSaveEdit()
        setResultState({
          open: true,
          title: 'Product Updated',
          message: summary,
        })
      }
    } catch (err) {
      console.error('Save failed:', err)
      setResultState({
        open: true,
        title: 'Save Failed',
        message: String(err?.message || err || 'Unknown error'),
      })
    } finally {
      setIsSaving(false)
      closeSaveConfirm()
    }
  }

  const MAX_IMAGE_SIZE_MB = 5
  const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024

  const handleImageUpload = (e, isEdit = false) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setResultState({
        open: true,
        title: 'Image Too Large',
        message: `The selected image is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Please choose an image smaller than ${MAX_IMAGE_SIZE_MB} MB.`,
      })
      e.target.value = ''
      return
    }

    const previewUrl = URL.createObjectURL(file)
    if (isEdit) {
      setEditingProductImageFile(file)
      setEditingProduct((prev) => (prev ? { ...prev, image: previewUrl } : prev))
    } else {
      setNewProductImageFile(file)
      setNewProduct((prev) => ({ ...prev, image: previewUrl }))
    }
  }

  const saveDisabled = useMemo(() => {
    if (confirmState.mode === 'add') return !newProduct.name?.trim() || !newProduct.price || Number(newProduct.price) <= 0 || Boolean(duplicateNewProduct)
    if (confirmState.mode === 'edit') return !editingProduct?.name?.trim() || !editingProduct?.price || Number(editingProduct.price) <= 0 || Boolean(duplicateEditProduct)
    return false
  }, [confirmState.mode, duplicateEditProduct, duplicateNewProduct, editingProduct, newProduct.name, newProduct.price])

  const buildEditSummary = () => {
    if (!originalProduct || !editingProduct) return 'No changes detected.'
    const changes = []
    if ((originalProduct.name || '') !== (editingProduct.name || '')) changes.push(`Name: ${originalProduct.name} → ${editingProduct.name}`)
    if (Number(originalProduct.price) !== Number(editingProduct.price)) changes.push(`Price: ₱ ${Number(originalProduct.price).toFixed(2)} → ₱ ${Number(editingProduct.price).toFixed(2)}`)
    if ((originalProduct.status || '') !== (editingProduct.status || '')) changes.push(`Status: ${originalProduct.status} → ${editingProduct.status}`)
    if ((originalProduct.type || '') !== (editingProduct.type || '')) changes.push(`Type: ${(originalProduct.type || '—')} → ${(editingProduct.type || '—')}`)
    if ((originalProduct.image || '') !== (editingProduct.image || '')) changes.push('Image: updated')
    return changes.length ? changes.join('\n') : 'No changes detected.'
  }

  return (
    <div className="page-container menu-page">
      <Navbar onLogout={onLogout} activePage="menu" onNavigate={onNavigate} role={userRole} user={{ name: userName, role: userRole === 'admin' ? 'Administrator' : 'Staff' }} />
      <div className="page-content menu-content">
        <div className="menu-controls">
          <div className="menu-mu-search" role="search">
            <svg className="menu-mu-search-icon" width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="9" cy="9" r="6" stroke="#000" strokeWidth="2" />
              <path d="M14 14L18 18" stroke="#000" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input className="menu-mu-search-input" type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search the menu" aria-label="Search products" />
            {searchTerm.trim() ? (
              <button type="button" className="menu-mu-search-clear" onClick={() => setSearchTerm('')} aria-label="Clear search">x</button>
            ) : null}
          </div>

          <div className="menu-mu-filter-wrapper">
            <button type="button" className="menu-mu-pill-btn" onClick={() => setShowCategoryFilter((v) => !v)}>FILTER</button>
            {showCategoryFilter ? (
              <div className="menu-mu-filter-menu">
                {[
                  { key: 'ALL', label: 'All' },
                    ...PRODUCT_TYPE_OPTIONS.map((t) => ({ key: t.key, label: t.label })),
                  { key: 'ADDONS', label: 'Addons' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    className={`menu-mu-filter-item ${categoryFilter === opt.key ? 'active' : ''}`}
                    onClick={() => { setCategoryFilter(opt.key); setShowCategoryFilter(false); }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button className="add-product-btn menu-mu-add" onClick={handleAddProduct} type="button">
            <img src={ADD_PRODUCT_BUTTON_ICON} alt="Add" className="add-icon-img" />
            ADD PRODUCT
          </button>
        </div>

        <div className="menu-table menu-table-box">
          <div className="menu-table-head">
            <div>Product</div><div>Status</div><div>Price</div><div>Action</div>
          </div>

          <div className="menu-table-scroll">
            {categorizedProducts.map((group) => (
              <div key={group.label} className="menu-category-group">
                <div className="menu-category-header">
                  <div className="menu-category-pill">
                    <span>{group.label}</span>
                  </div>
                </div>

                {group.items.map((product) => (
                  <div key={product.id} className="menu-row menu-row-grid">
                    <div className="menu-cell product-cell">
                      <img src={product.image || placeholderSvg} alt={product.name} className="product-image" loading="lazy" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = placeholderSvg }} />
                      <span className="product-name">{product.name}</span>
                    </div>
                    <div className="menu-cell status-cell">
                      <select
                        value={product.status}
                        onChange={(e) => handleStatusChange(product.id, e.target.value)}
                        className={`status-select ${product.status === 'AVAILABLE' ? 'available' : 'not-available'}`}
                      >
                        <option value="AVAILABLE">AVAILABLE</option>
                        <option value="NOT AVAILABLE">NOT AVAILABLE</option>
                      </select>
                    </div>
                    <div className="menu-cell price-cell price-cell-hover">
                      ₱ {Number(product.price).toFixed(2)}
                      {previousPrices[product.id] != null && Number(previousPrices[product.id]) !== Number(product.price) && (
                        <div className="price-tooltip">
                          <span className="price-tooltip-prev">Previous: ₱ {Number(previousPrices[product.id]).toFixed(2)}</span>
                          <span className="price-tooltip-curr">Current: ₱ {Number(product.price).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                    <div className="menu-cell action-cell">
                      <button className="edit-btn" onClick={() => handleEdit(product.id)} type="button">EDIT</button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
            {/* Addons category — visible when filter is ALL or ADDONS */}
            {(categoryFilter === 'ALL' || categoryFilter === 'ADDONS') && (
              <div className="menu-category-group">
                <div className="menu-category-header">
                  <div className="menu-category-pill"><span>Addons</span></div>
                </div>
                {!addonsLoaded ? (
                  <div className="menu-row" style={{ padding: '1rem 1.25rem', opacity: 0.6 }}>Loading addons…</div>
                ) : addonsError ? (
                  <div className="menu-row" style={{ padding: '1rem 1.25rem', color: '#c0392b' }}>Error loading addons: {addonsError}</div>
                ) : addons.length === 0 ? (
                  <div className="menu-row" style={{ padding: '1rem 1.25rem', opacity: 0.6 }}>No addons found. (Check the addons table exists and has data)</div>
                ) : addons.map((addon) => (
                  <div key={addon.id} className="menu-row menu-row-grid">
                    <div className="menu-cell product-cell">
                      <span className="product-name">{addon.name}</span>
                    </div>
                    <div className="menu-cell status-cell">
                      <select
                        value={addon.is_available ? 'AVAILABLE' : 'NOT AVAILABLE'}
                        onChange={(e) => {
                          const isAvail = e.target.value === 'AVAILABLE'
                          setAddons((prev) => prev.map((a) => a.id === addon.id ? { ...a, is_available: isAvail } : a))
                          supabase.from('addons').update({ is_available: isAvail }).eq('id', addon.id)
                            .then(({ error }) => { if (error) { console.error(error.message); fetchAddons() } })
                        }}
                        className={`status-select ${addon.is_available ? 'available' : 'not-available'}`}
                      >
                        <option value="AVAILABLE">AVAILABLE</option>
                        <option value="NOT AVAILABLE">NOT AVAILABLE</option>
                      </select>
                    </div>
                    <div className="menu-cell price-cell">
                      ₱ {Number(addon.price).toFixed(2)}
                    </div>
                    <div className="menu-cell action-cell">
                      <button className="edit-btn" type="button" onClick={() => setEditingAddon({ ...addon })}>EDIT</button>
                    </div>
                  </div>
                ))}
              </div>
            )}          </div>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>ADD PRODUCT</h2>
              <button className="exit-btn" onClick={() => setShowAddModal(false)}>EXIT ✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-left">
                <div className="image-preview">
                  <img src={newProduct.image || placeholderSvg} alt="Product" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = placeholderSvg }} />
                </div>
                <button className="upload-btn">
                  <span className="upload-icon">↓</span> UPLOAD IMAGE
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e)} />
                </button>
              </div>
              <div className="modal-right">
                <div className="form-group">
                  <label>PRODUCT NAME</label>
                  <input type="text" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} placeholder="Add Product Name" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>STATUS</label>
                    <select value={newProduct.status} onChange={(e) => setNewProduct({...newProduct, status: e.target.value})} className={`modal-status-select ${newProduct.status === 'AVAILABLE' ? 'available' : 'not-available'}`}>
                      <option value="AVAILABLE">AVAILABLE</option>
                      <option value="NOT AVAILABLE">NOT AVAILABLE</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>TYPE</label>
                    <select value={newProduct.type} onChange={(e) => setNewProduct({...newProduct, type: e.target.value})}>
                      {PRODUCT_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.key} value={opt.key}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group price-wide">
                  <label>PRICE</label>
                  <div className="price-input-group">
                    <span className="price-prefix">₱</span>
                    <input type="number" min="0" step="0.01" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} placeholder="150.00" />
                  </div>
                  {newProduct.price !== '' && Number(newProduct.price) <= 0 && (
                    <div className="price-error">Price must be greater than 0</div>
                  )}
                </div>
                <div className="form-group">
                  <label>DESCRIPTION</label>
                  <textarea className="modal-textarea" value={newProduct.description} onChange={(e) => setNewProduct({...newProduct, description: e.target.value})} placeholder="Product description (shown to customers)" rows={3} />
                </div>
                <button className="save-btn" onClick={handleRequestAddSave}>
                  <img src={ADD_PRODUCT_BUTTON_ICON} alt="" className="save-icon-img" /> SAVE PRODUCT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && editingProduct && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>EDIT PRODUCT</h2>
              <button className="exit-btn" onClick={() => setShowEditModal(false)}>EXIT ✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-left">
                <div className="image-preview">
                  <img src={editingProduct.image || placeholderSvg} alt="Product" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = placeholderSvg }} />
                </div>
                <button className="upload-btn">
                  <span className="upload-icon">↓</span> UPLOAD IMAGE
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true)} />
                </button>
              </div>
              <div className="modal-right">
                <div className="form-group">
                  <label>PRODUCT NAME</label>
                  <input type="text" value={editingProduct.name} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>STATUS</label>
                    <select value={editingProduct.status} onChange={(e) => setEditingProduct({...editingProduct, status: e.target.value})} className={`modal-status-select ${editingProduct.status === 'AVAILABLE' ? 'available' : 'not-available'}`}>
                      <option value="AVAILABLE">AVAILABLE</option>
                      <option value="NOT AVAILABLE">NOT AVAILABLE</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>TYPE</label>
                    <select value={normalizeProductType(editingProduct.type) || 'Meat'} onChange={(e) => setEditingProduct({...editingProduct, type: e.target.value})}>
                      {PRODUCT_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.key} value={opt.key}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group price-wide">
                  <label>PRICE</label>
                  <div className="price-input-group">
                    <span className="price-prefix">₱</span>
                    <input type="number" min="0" step="0.01" value={editingProduct.price} onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})} placeholder="150.00" />
                  </div>
                  {editingProduct.price !== '' && Number(editingProduct.price) <= 0 && (
                    <div className="price-error">Price must be greater than 0</div>
                  )}
                </div>
                <div className="form-group">
                  <label>DESCRIPTION</label>
                  <textarea className="modal-textarea" value={editingProduct.description || ''} onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})} placeholder="Product description (shown to customers)" rows={3} />
                </div>
                <button className="save-btn save-edit" onClick={handleRequestEditSave}>
                  <img src={ADD_PRODUCT_BUTTON_ICON} alt="" className="save-icon-img" /> SAVE EDIT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal open={confirmState.open} title="Are you sure you want to save?" message={confirmState.mode === 'add' ? `Add product: ${newProduct.name || '—'}\nPrice: ₱ ${Number(newProduct.price || 0).toFixed(2)}\nStatus: ${newProduct.status}` : `Update product: ${editingProduct?.name || '—'}\n\n${buildEditSummary()}`} cancelText="Cancel" confirmText={isSaving ? 'Saving…' : saveDisabled ? 'Fix fields' : 'Yes'} onCancel={closeSaveConfirm} onConfirm={() => { if (saveDisabled || isSaving) return; runConfirmedSave(); }} />

      <ConfirmModal open={resultState.open} title={resultState.title} message={resultState.message} showCancel={false} confirmText="OK" onConfirm={() => setResultState({ open: false, title: '', message: '' })} />

      {/* Edit Addon Modal */}
      {editingAddon && (
        <div className="modal-overlay" onClick={() => setEditingAddon(null)}>
          <div className="modal-content" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>EDIT ADDON</h2>
              <button className="exit-btn" onClick={() => setEditingAddon(null)}>EXIT ✕</button>
            </div>
            <div className="modal-body" style={{ flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>ADDON NAME</label>
                <input type="text" value={editingAddon.name} readOnly style={{ background: '#f0f0f0', cursor: 'not-allowed' }} />
              </div>
              <div className="form-group">
                <label>AVAILABILITY</label>
                <select
                  value={editingAddon.is_available ? 'AVAILABLE' : 'NOT AVAILABLE'}
                  onChange={(e) => setEditingAddon((prev) => ({ ...prev, is_available: e.target.value === 'AVAILABLE' }))}
                  className={`modal-status-select ${editingAddon.is_available ? 'available' : 'not-available'}`}
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="NOT AVAILABLE">NOT AVAILABLE</option>
                </select>
              </div>
              <div className="form-group price-wide">
                <label>PRICE</label>
                <div className="price-input-group">
                  <span className="price-prefix">₱</span>
                  <input
                    type="number" min="0" step="0.01"
                    value={editingAddon.price}
                    onChange={(e) => setEditingAddon((prev) => ({ ...prev, price: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                {Number(editingAddon.price) < 0 && (
                  <div className="price-error">Price cannot be negative</div>
                )}
              </div>
              <button
                className="save-btn"
                onClick={handleSaveAddon}
                disabled={addonSaving || Number(editingAddon.price) < 0}
              >
                {addonSaving ? 'SAVING…' : 'SAVE ADDON'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Menu