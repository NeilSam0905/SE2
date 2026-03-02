import { useMemo, useState, useEffect } from 'react'
import Navbar from './elements/Navbar'
import './styles/Menu.css'
import ConfirmModal from './elements/ConfirmModal'
import { getPublicStorageUrl, PRODUCT_IMAGE_BUCKET, supabase, uploadProductImage } from './lib/supabaseClient'
import { ADD_PRODUCT_BUTTON_ICON } from './utils/publicAsset'

const PRODUCTS_CACHE_KEY = 'products_cache_v1'
const PRODUCTS_CACHE_MAX_AGE_MS = 5 * 60 * 1000

const normalizeText = (value) => String(value || '').trim().toLowerCase()

const normalizeProductType = (raw) => {
  const t = normalizeText(raw)
  if (t === 'meat') return 'Meat'
  if (t === 'vegetable' || t === 'vegetables') return 'Vegetable'
  if (t === 'drinks' || t === 'drink') return 'Drinks'
  if (t === 'others' || t === 'other') return 'Others'
  if (t === 'food') return 'Others'
  return 'Others'
}

const PRODUCT_TYPE_OPTIONS = [
  { key: 'Meat', label: 'Meat' },
  { key: 'Vegetable', label: 'Vegetable' },
  { key: 'Drinks', label: 'Drinks' },
  { key: 'Others', label: 'Others' },
]

const buildProductImageUrl = (row) => {
  const imagePath = row?.image_path || row?.imagePath
  if (imagePath) return getPublicStorageUrl(PRODUCT_IMAGE_BUCKET, imagePath)

  const imageUrl = row?.image_url || row?.imageUrl
  if (imageUrl) return imageUrl

  const legacy = row?.image
  if (legacy) return legacy

  return '/product1.jpg'
}

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
    image: '/product1.jpg'
  })

  const [newProductImageFile, setNewProductImageFile] = useState(null)
  const [editingProductImageFile, setEditingProductImageFile] = useState(null)

  const [products, setProducts] = useState([])

  // --- 1. READ (Fetch from Supabase) ---
  const fetchProducts = async () => {
    try {
      const preferredSelect = 'productID, productName, price, status, type, image_path, image_url, image'
      let { data, error } = await supabase.from('products').select(preferredSelect).order('productID', { ascending: true })

      // Backward-compatible fallback if the DB doesn't have the new image columns yet.
      if (error) {
        const fallback = await supabase.from('products').select('*').order('productID', { ascending: true })
        data = fallback.data
        error = fallback.error
      }

      if (error) throw error
      
      if (data) {
        const mappedData = data.map(p => ({
          id: p.productID,
          name: p.productName,
          price: p.price,
          status: p.status,
          type: normalizeProductType(p.type),
          imagePath: p.image_path || null,
          image: buildProductImageUrl(p),
        }))
        setProducts(mappedData)

        try {
          localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: mappedData }))
        } catch {
          // ignore cache failures
        }
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
  }, [])

  // --- 2. UPDATE STATUS ---
  const handleStatusChange = async (id, newStatus) => {
    setProducts(products.map(product => 
      product.id === id ? { ...product, status: newStatus } : product
    ))

    const { error } = await supabase
      .from('products')
      .update({ status: newStatus })
      .eq('productID', id)

    if (error) fetchProducts() 
  }

  // --- 3. CREATE PRODUCT (With dynamic ID fix) ---
  const handleSaveNewProduct = async () => {
    const insertPayload = {
      productName: newProduct.name,
      price: Number(newProduct.price),
      status: newProduct.status,
      type: newProduct.type,
    }

    const { data: created, error } = await supabase
      .from('products')
      .insert([insertPayload])
      .select('productID')
      .single()

    if (error) throw error

    const createdId = created?.productID
    if (createdId == null) throw new Error('Insert succeeded but no productID was returned')

    if (newProductImageFile) {
      const uploaded = await uploadProductImage({ file: newProductImageFile, productId: createdId })
      const { error: imgError } = await supabase
        .from('products')
        .update({ image_path: uploaded.path })
        .eq('productID', createdId)

      if (imgError) throw imgError
    }

    await fetchProducts()
    setShowAddModal(false)
  }

  // --- 4. UPDATE PRODUCT (Edit) ---
  const handleSaveEdit = async () => {
    const { error } = await supabase
      .from('products')
      .update({
        productName: editingProduct.name,
        price: Number(editingProduct.price),
        status: editingProduct.status,
        type: editingProduct.type,
      })
      .eq('productID', editingProduct.id)

    if (error) throw error

    if (editingProductImageFile) {
      const uploaded = await uploadProductImage({ file: editingProductImageFile, productId: editingProduct.id })
      const { error: imgError } = await supabase
        .from('products')
        .update({ image_path: uploaded.path })
        .eq('productID', editingProduct.id)

      if (imgError) throw imgError
    }

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
      .map((group) => ({ label: group.label, items: grouped[group.key] }))
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
      image: '/product1.jpg'
    })
    setNewProductImageFile(null)
    setShowAddModal(true)
  }

  const openSaveConfirm = (mode) => setConfirmState({ open: true, mode })
  const closeSaveConfirm = () => setConfirmState({ open: false, mode: null })

  const runConfirmedSave = async () => {
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
      closeSaveConfirm()
    }
  }

  const handleImageUpload = (e, isEdit = false) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return

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
    if (confirmState.mode === 'add') return !newProduct.name?.trim() || !newProduct.price || Number(newProduct.price) <= 0
    if (confirmState.mode === 'edit') return !editingProduct?.name?.trim() || !editingProduct?.price || Number(editingProduct.price) <= 0
    return false
  }, [confirmState.mode, editingProduct, newProduct.name, newProduct.price])

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
                      <img src={product.image} alt={product.name} className="product-image" loading="lazy" />
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
                    <div className="menu-cell price-cell">₱ {Number(product.price).toFixed(2)}</div>
                    <div className="menu-cell action-cell">
                      <button className="edit-btn" onClick={() => handleEdit(product.id)} type="button">EDIT</button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
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
                  <img src={newProduct.image} alt="Product" />
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
                </div>
                <button className="save-btn" onClick={() => openSaveConfirm('add')}>
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
                  <img src={editingProduct.image} alt="Product" />
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
                </div>
                <button className="save-btn save-edit" onClick={() => openSaveConfirm('edit')}>
                  <img src={ADD_PRODUCT_BUTTON_ICON} alt="" className="save-icon-img" /> SAVE EDIT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal open={confirmState.open} title="Are you sure you want to save?" message={confirmState.mode === 'add' ? `Add product: ${newProduct.name || '—'}\nPrice: ₱ ${Number(newProduct.price || 0).toFixed(2)}\nStatus: ${newProduct.status}` : `Update product: ${editingProduct?.name || '—'}\n\n${buildEditSummary()}`} cancelText="Cancel" confirmText={saveDisabled ? 'Fix fields' : 'Yes'} onCancel={closeSaveConfirm} onConfirm={() => { if (saveDisabled) return; runConfirmedSave(); }} />

      <ConfirmModal open={resultState.open} title={resultState.title} message={resultState.message} showCancel={false} confirmText="OK" onConfirm={() => setResultState({ open: false, title: '', message: '' })} />
    </div>
  )
}

export default Menu