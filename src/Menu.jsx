import { useMemo, useState } from 'react'
import Navbar from './elements/Navbar'
import './Menu.css'
import ConfirmModal from './elements/ConfirmModal'

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
    type: 'MEAT',
    image: '/product1.jpg'
  })

  const [products, setProducts] = useState([
    {
      id: 1,
      name: 'Sinigang na Baka',
      price: 199.00,
      status: 'AVAILABLE',
      type: 'MEAT',
      image: '/product1.jpg'
    },
    {
      id: 2,
      name: 'Lumpiang Shanghai',
      price: 170.00,
      status: 'NOT AVAILABLE',
      type: 'MEAT',
      image: '/product2.jpg'
    },
    {
      id: 3,
      name: 'Ensalada',
      price: 170.00,
      status: 'AVAILABLE',
      type: 'VEGETABLE',
      image: '/product3.jpg'
    },
    {
      id: 4,
      name: 'Daing na Bangus',
      price: 189.00,
      status: 'AVAILABLE',
      type: 'MEAT',
      image: '/product4.jpg'
    },
    {
      id: 5,
      name: 'Corned Beef Shanghai',
      price: 170.00,
      status: 'NOT AVAILABLE',
      type: 'MEAT',
      image: '/product2.jpg'
    },
    {
      id: 6,
      name: 'Nilagang Lumpia',
      price: 170.00,
      status: 'NOT AVAILABLE',
      type: 'MEAT',
      image: '/product2.jpg'
    },
    {
      id: 7,
      name: 'Adobong Pusa',
      price: 170.00,
      status: 'NOT AVAILABLE',
      type: 'MEAT',
      image: '/product2.jpg'
    },
    {
      id: 8,
      name: 'Kare-Kare',
      price: 220.00,
      status: 'AVAILABLE',
      type: 'MEAT',
      image: '/product3.jpg'
    },
    {
      id: 9,
      name: 'Lechon Kawali',
      price: 195.00,
      status: 'AVAILABLE',
      type: 'MEAT',
      image: '/product1.jpg'
    },
    {
      id: 10,
      name: 'Sisig',
      price: 185.00,
      status: 'AVAILABLE',
      type: 'MEAT',
      image: '/product4.jpg'
    },
    {
      id: 11,
      name: 'Bulalo',
      price: 250.00,
      status: 'AVAILABLE',
      type: 'MEAT',
      image: '/product1.jpg'
    },
    {
      id: 12,
      name: 'Pancit Canton',
      price: 150.00,
      status: 'AVAILABLE',
      type: 'OTHERS',
      image: '/product2.jpg'
    }
    ,
    {
      id: 13,
      name: 'Chicken Inasal',
      price: 180.00,
      status: 'AVAILABLE',
      type: 'MEAT',
      image: '/product3.jpg'
    },
    {
      id: 14,
      name: 'Pinakbet',
      price: 165.00,
      status: 'AVAILABLE',
      type: 'VEGETABLE',
      image: '/product4.jpg'
    },
    {
      id: 15,
      name: 'Caldereta',
      price: 210.00,
      status: 'NOT AVAILABLE',
      type: 'MEAT',
      image: '/product1.jpg'
    },
    {
      id: 16,
      name: 'Laing',
      price: 160.00,
      status: 'AVAILABLE',
      type: 'VEGETABLE',
      image: '/product2.jpg'
    },
    {
      id: 17,
      name: 'Tinola',
      price: 175.00,
      status: 'AVAILABLE',
      type: 'MEAT',
      image: '/product3.jpg'
    },
    {
      id: 18,
      name: 'Bistek Tagalog',
      price: 190.00,
      status: 'AVAILABLE',
      type: 'MEAT',
      image: '/product4.jpg'
    },
    {
      id: 19,
      name: 'Tokwa\'t Baboy',
      price: 155.00,
      status: 'AVAILABLE',
      type: 'MEAT',
      image: '/product1.jpg'
    },
    {
      id: 20,
      name: 'Puto Bumbong',
      price: 140.00,
      status: 'NOT AVAILABLE',
      type: 'OTHERS',
      image: '/product2.jpg'
    },
    {
      id: 21,
      name: 'Coke',
      price: 30.00,
      status: 'AVAILABLE',
      type: 'DRINKS',
      image: '/product1.jpg'
    },
    {
      id: 22,
      name: 'Iced Tea',
      price: 45.00,
      status: 'AVAILABLE',
      type: 'DRINKS',
      image: '/product3.jpg'
    },
    {
      id: 23,
      name: 'Calamansi Juice',
      price: 50.00,
      status: 'AVAILABLE',
      type: 'DRINKS',
      image: '/product4.jpg'
    },
    {
      id: 24,
      name: 'Bottled Water',
      price: 20.00,
      status: 'AVAILABLE',
      type: 'DRINKS',
      image: '/product2.jpg'
    },
    {
      id: 25,
      name: 'Hot Coffee',
      price: 55.00,
      status: 'NOT AVAILABLE',
      type: 'DRINKS',
      image: '/product1.jpg'
    }
  ])

  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return products.filter((p) => {
      const matchesQuery = !q || String(p.name || '').toLowerCase().includes(q)
      const type = p.type || 'OTHERS'
      const matchesType = categoryFilter === 'ALL' || type === categoryFilter
      return matchesQuery && matchesType
    })
  }, [products, searchTerm, categoryFilter])

  const categorizedProducts = useMemo(() => {
    const order = [
      { key: 'MEAT', label: 'Meat' },
      { key: 'VEGETABLE', label: 'Vegetables' },
      { key: 'DRINKS', label: 'Drinks' },
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

  const handleStatusChange = (id, newStatus) => {
    setProducts(products.map(product => 
      product.id === id ? { ...product, status: newStatus } : product
    ))
  }

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
      type: 'MEAT',
      image: '/product1.jpg'
    })
    setShowAddModal(true)
  }

  const openSaveConfirm = (mode) => {
    setConfirmState({ open: true, mode })
  }

  const closeSaveConfirm = () => {
    setConfirmState({ open: false, mode: null })
  }

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

  const handleSaveNewProduct = () => {
    const productToAdd = {
      id: products.length + 1,
      name: newProduct.name,
      price: Number(newProduct.price),
      status: newProduct.status,
      type: newProduct.type,
      image: newProduct.image
    }
    setProducts([...products, productToAdd])
    setShowAddModal(false)
  }

  const handleSaveEdit = () => {
    setProducts(products.map(product => 
      product.id === editingProduct.id
        ? { ...editingProduct, price: Number(editingProduct.price) }
        : product
    ))
    setShowEditModal(false)
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
    if (confirmState.mode === 'add') {
      return !newProduct.name?.trim() || !newProduct.price || Number(newProduct.price) <= 0
    }
    if (confirmState.mode === 'edit') {
      return !editingProduct?.name?.trim() || !editingProduct?.price || Number(editingProduct.price) <= 0
    }
    return false
  }, [confirmState.mode, editingProduct, newProduct.name, newProduct.price])

  const buildEditSummary = () => {
    if (!originalProduct || !editingProduct) return 'No changes detected.'
    const changes = []
    if ((originalProduct.name || '') !== (editingProduct.name || '')) {
      changes.push(`Name: ${originalProduct.name} → ${editingProduct.name}`)
    }
    if (Number(originalProduct.price) !== Number(editingProduct.price)) {
      changes.push(`Price: ₱ ${Number(originalProduct.price).toFixed(2)} → ₱ ${Number(editingProduct.price).toFixed(2)}`)
    }
    if ((originalProduct.status || '') !== (editingProduct.status || '')) {
      changes.push(`Status: ${originalProduct.status} → ${editingProduct.status}`)
    }
    if ((originalProduct.type || '') !== (editingProduct.type || '')) {
      if (originalProduct.type || editingProduct.type) {
        changes.push(`Type: ${(originalProduct.type || '—')} → ${(editingProduct.type || '—')}`)
      }
    }
    if ((originalProduct.image || '') !== (editingProduct.image || '')) {
      changes.push('Image: updated')
    }
    return changes.length ? changes.join('\n') : 'No changes detected.'
  }

  return (
    <div className="page-container menu-page">
      <Navbar
        onLogout={onLogout}
        activePage="menu"
        onNavigate={onNavigate}
        role={userRole}
        user={{ name: userName, role: userRole === 'admin' ? 'Administrator' : 'Staff' }}
      />
      <div className="page-content menu-content">
        <div className="menu-controls">
          <div className="menu-mu-search" role="search">
            <svg
              className="menu-mu-search-icon"
              width="22"
              height="22"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="9" cy="9" r="6" stroke="#000" strokeWidth="2" />
              <path d="M14 14L18 18" stroke="#000" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              className="menu-mu-search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search the menu"
              aria-label="Search products"
            />
            {searchTerm.trim() ? (
              <button
                type="button"
                className="menu-mu-search-clear"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
              >
                x
              </button>
            ) : null}
          </div>

          <div className="menu-mu-filter-wrapper">
            <button type="button" className="menu-mu-pill-btn" onClick={() => setShowCategoryFilter((v) => !v)}>
              FILTER
            </button>
            {showCategoryFilter ? (
              <div className="menu-mu-filter-menu">
                {[
                  { key: 'ALL', label: 'All' },
                  { key: 'MEAT', label: 'Meat' },
                  { key: 'VEGETABLE', label: 'Vegetables' },
                  { key: 'DRINKS', label: 'Drinks' },
                  { key: 'OTHERS', label: 'Others' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    className={`menu-mu-filter-item ${categoryFilter === opt.key ? 'active' : ''}`}
                    onClick={() => {
                      setCategoryFilter(opt.key)
                      setShowCategoryFilter(false)
                    }}
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
            <div>Product</div>
            <div>Status</div>
            <div>Price</div>
            <div>Action</div>
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
                      <button className="edit-btn" onClick={() => handleEdit(product.id)} type="button">
                        EDIT
                      </button>
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
              <button className="exit-btn" onClick={() => setShowAddModal(false)}>
                EXIT ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-left">
                <div className="image-preview">
                  <img src={newProduct.image} alt="Product" />
                </div>
                <button className="upload-btn">
                  <span className="upload-icon">↓</span>
                  UPLOAD IMAGE
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e)} />
                </button>
              </div>
              <div className="modal-right">
                <div className="form-group">
                  <label>PRODUCT NAME</label>
                  <input
                    type="text"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                    placeholder="Add Product Name"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>STATUS</label>
                    <select
                      value={newProduct.status}
                      onChange={(e) => setNewProduct({...newProduct, status: e.target.value})}
                      className={`modal-status-select ${newProduct.status === 'AVAILABLE' ? 'available' : 'not-available'}`}
                    >
                      <option value="AVAILABLE">AVAILABLE</option>
                      <option value="NOT AVAILABLE">NOT AVAILABLE</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>TYPE</label>
                    <select
                      value={newProduct.type}
                      onChange={(e) => setNewProduct({...newProduct, type: e.target.value})}
                    >
                      <option value="MEAT">MEAT</option>
                      <option value="VEGETABLE">VEGETABLE</option>
                      <option value="DRINKS">DRINKS</option>
                      <option value="OTHERS">OTHERS</option>
                    </select>
                  </div>
                </div>
                <div className="form-group price-wide">
                  <label>PRICE</label>
                  <div className="price-input-group">
                    <span className="price-prefix">₱</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                      placeholder="150.00"
                    />
                  </div>
                </div>
                <button className="save-btn" onClick={() => openSaveConfirm('add')}>
                  <img src="/add_product_button.png" alt="" className="save-icon-img" />
                  SAVE PRODUCT
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
              <button className="exit-btn" onClick={() => setShowEditModal(false)}>
                EXIT ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-left">
                <div className="image-preview">
                  <img src={editingProduct.image} alt="Product" />
                </div>
                <button className="upload-btn">
                  <span className="upload-icon">↓</span>
                  UPLOAD IMAGE
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true)} />
                </button>
              </div>
              <div className="modal-right">
                <div className="form-group">
                  <label>PRODUCT NAME</label>
                  <input
                    type="text"
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>STATUS</label>
                    <select
                      value={editingProduct.status}
                      onChange={(e) => setEditingProduct({...editingProduct, status: e.target.value})}
                      className={`modal-status-select ${editingProduct.status === 'AVAILABLE' ? 'available' : 'not-available'}`}
                    >
                      <option value="AVAILABLE">AVAILABLE</option>
                      <option value="NOT AVAILABLE">NOT AVAILABLE</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>TYPE</label>
                    <select
                      value={editingProduct.type || 'MEAT'}
                      onChange={(e) => setEditingProduct({...editingProduct, type: e.target.value})}
                    >
                      <option value="MEAT">MEAT</option>
                      <option value="VEGETABLE">VEGETABLE</option>
                      <option value="DRINKS">DRINKS</option>
                      <option value="OTHERS">OTHERS</option>
                    </select>
                  </div>
                </div>
                <div className="form-group price-wide">
                  <label>PRICE</label>
                  <div className="price-input-group">
                    <span className="price-prefix">₱</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingProduct.price}
                      onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})}
                      placeholder="150.00"
                    />
                  </div>
                </div>
                <button className="save-btn save-edit" onClick={() => openSaveConfirm('edit')}>
                  <img src="/add_product_button.png" alt="" className="save-icon-img" />
                  SAVE EDIT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmState.open}
        title="Are you sure you want to save?"
        message={
          confirmState.mode === 'add'
            ? `Add product: ${newProduct.name || '—'}\nPrice: ₱ ${Number(newProduct.price || 0).toFixed(2)}\nStatus: ${newProduct.status}`
            : `Update product: ${editingProduct?.name || '—'}\n\n${buildEditSummary()}`
        }
        cancelText="Cancel"
        confirmText={saveDisabled ? 'Fix fields' : 'Yes'}
        onCancel={closeSaveConfirm}
        onConfirm={() => {
          if (saveDisabled) return
          runConfirmedSave()
        }}
      />

      <ConfirmModal
        open={resultState.open}
        title={resultState.title}
        message={resultState.message}
        showCancel={false}
        confirmText="OK"
        onConfirm={() => setResultState({ open: false, title: '', message: '' })}
      />
    </div>
  )
}

export default Menu
