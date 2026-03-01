import { useMemo, useState, useEffect } from 'react'
import Navbar from './elements/Navbar'
import './Menu.css'
import ConfirmModal from './elements/ConfirmModal'
import { supabase } from './supabaseClient'

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
    type: 'Food',
    image: '/product1.jpg'
  })

  const [products, setProducts] = useState([])

  // --- 1. READ (Fetch from Supabase) ---
  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase.from('products').select('*')
      if (error) throw error
      
      if (data) {
        const mappedData = data.map(p => ({
          id: p.productID,
          name: p.productName,
          price: p.price,
          status: p.status,
          type: p.type || 'OTHERS',
          image: p.image || '/product1.jpg'
        }))
        setProducts(mappedData)
      }
    } catch (err) {
      console.error('Error fetching products:', err.message)
    }
  }

  useEffect(() => {
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
    // Calculate the next ID based on existing products
    const highestId = products.length > 0 ? Math.max(...products.map(p => p.id)) : 100
    const nextId = highestId + 1

    const { error } = await supabase.from('products').insert([{
      productID: nextId, 
      productName: newProduct.name,
      price: Number(newProduct.price),
      status: newProduct.status,
      type: newProduct.type,
      // image: newProduct.image // Uncomment when ready to handle real image saving
    }])

    if (!error) {
      fetchProducts()
      setShowAddModal(false)
    } else {
      console.error("Error inserting:", error)
    }
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
        // image: editingProduct.image // Uncomment when ready to handle real image saving
      })
      .eq('productID', editingProduct.id)

    if (!error) {
      fetchProducts()
      setShowEditModal(false)
    } else {
      console.error("Error updating:", error)
    }
  }

  // --- FILTERING & CATEGORIES ---
  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return products.filter((p) => {
      const matchesQuery = !q || String(p.name || '').toLowerCase().includes(q)
      const type = p.type || 'OTHERS'
      const matchesType = categoryFilter === 'ALL' || type.toUpperCase() === categoryFilter.toUpperCase()
      return matchesQuery && matchesType
    })
  }, [products, searchTerm, categoryFilter])

  const categorizedProducts = useMemo(() => {
    const order = [
      { key: 'Food', label: 'Food Items' },
      { key: 'Drink', label: 'Drinks' },
      { key: 'OTHERS', label: 'Others' },
    ]

    const grouped = filteredProducts.reduce((acc, product) => {
      const type = product.type || 'OTHERS'
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
    setShowEditModal(true)
  }

  const handleAddProduct = () => {
    setNewProduct({
      name: '',
      price: '',
      status: 'AVAILABLE',
      type: 'Food',
      image: '/product1.jpg'
    })
    setShowAddModal(true)
  }

  const openSaveConfirm = (mode) => setConfirmState({ open: true, mode })
  const closeSaveConfirm = () => setConfirmState({ open: false, mode: null })

  const runConfirmedSave = () => {
    if (confirmState.mode === 'add') {
      handleSaveNewProduct()
      setResultState({
        open: true,
        title: 'Product Added',
        message: `Added: ${newProduct.name}\nPrice: ₱ ${Number(newProduct.price || 0).toFixed(2)}\nStatus: ${newProduct.status}`,
      })
    }

    if (confirmState.mode === 'edit') {
      const summary = buildEditSummary()
      handleSaveEdit()
      setResultState({
        open: true,
        title: 'Product Updated',
        message: summary,
      })
    }
    closeSaveConfirm()
  }

  const handleImageUpload = (e, isEdit = false) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result)
      if (isEdit) {
        setEditingProduct((prev) => (prev ? { ...prev, image: dataUrl } : prev))
      } else {
        setNewProduct((prev) => ({ ...prev, image: dataUrl }))
      }
    }
    reader.readAsDataURL(file)
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
                  { key: 'Food', label: 'Food' },
                  { key: 'Drink', label: 'Drinks' },
                  { key: 'OTHERS', label: 'Others' },
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
            <img src="/add_product_button.png" alt="Add" className="add-icon-img" />
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
                      <img src={product.image} alt={product.name} className="product-image" />
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
                      <option value="Food">Food</option>
                      <option value="Drink">Drink</option>
                      <option value="OTHERS">Others</option>
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
                  <img src="/add_product_button.png" alt="" className="save-icon-img" /> SAVE PRODUCT
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
                    <select value={editingProduct.type || 'Food'} onChange={(e) => setEditingProduct({...editingProduct, type: e.target.value})}>
                      <option value="Food">Food</option>
                      <option value="Drink">Drink</option>
                      <option value="OTHERS">Others</option>
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
                  <img src="/add_product_button.png" alt="" className="save-icon-img" /> SAVE EDIT
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