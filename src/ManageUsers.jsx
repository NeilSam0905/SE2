import { useEffect, useMemo, useState } from 'react'
import Navbar from './elements/Navbar'
import './styles/ManageUsers.css'
import { formatInteger } from './utils/numberFormat'
import ConfirmModal from './elements/ConfirmModal'
import { supabase } from './lib/supabaseClient'
import { ADD_PRODUCT_BUTTON_ICON } from './utils/publicAsset'

function ManageUsers({ onLogout, onNavigate, userRole = 'admin', userName = 'Admin User' }) {
  const [searchTerm, setSearchTerm] = useState('')

  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [confirmState, setConfirmState] = useState({ open: false, mode: null })
  const [showRoleFilter, setShowRoleFilter] = useState(false)
  const [roleFilter, setRoleFilter] = useState('All')
  const [editingUser, setEditingUser] = useState(null)
  const [originalUser, setOriginalUser] = useState(null)
  const [newUser, setNewUser] = useState({ name: '', role: 'Staff', active: true, password: '' })

  const [duplicateUserModal, setDuplicateUserModal] = useState({ open: false, name: '' })

  const [users, setUsers] = useState([])

  const normalizeName = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase()

  const isDuplicateUserName = (candidateName) => {
    const candidateKey = normalizeName(candidateName)
    if (!candidateKey) return false
    return users.some((u) => normalizeName(u?.name) === candidateKey)
  }

  const getStatusText = (u) => String(u?.status || '').trim().toLowerCase()

  // Enabled/disabled state for Manage Users toggle.
  const isEnabledAccount = (u) => {
    if (typeof u?.active === 'boolean') return u.active
    const status = getStatusText(u)
    if (!status) return true
    return status !== 'deactivated'
  }

  // Online/offline (login presence) for the "Active Staff/Admin" cards.
  const isOnline = (u) => getStatusText(u) === 'active'

  const normalizeUser = (u) => {
    if (!u) return null
    return {
      ...u,
      active: isEnabledAccount(u),
    }
  }

  const getUsers = async () => {
    try {
      const { data, error } = await supabase.from('users').select('*').order('id', { ascending: true })
      if (error) {
        console.error('Error fetching users:', error)
        return
      }
      setUsers((data || []).map(normalizeUser).filter(Boolean))
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  useEffect(() => {
    getUsers()

    const onFocus = () => {
      getUsers()
    }

    window.addEventListener('focus', onFocus)
    const intervalId = setInterval(() => {
      getUsers()
    }, 5000)

    return () => {
      window.removeEventListener('focus', onFocus)
      clearInterval(intervalId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openSaveConfirm = (mode) => {
    setConfirmState({ open: true, mode })
  }

  const closeSaveConfirm = () => {
    setConfirmState({ open: false, mode: null })
  }

  const handleOpenAdd = () => {
    setNewUser({ name: '', role: 'Staff', active: true, password: '' })
    setShowAddModal(true)
  }

  const handleAttemptAddUserSave = async () => {
    const proposedName = String(newUser.name || '').trim()
    if (!proposedName) return

    // Fast local check (covers most cases without a network call).
    if (isDuplicateUserName(proposedName)) {
      setDuplicateUserModal({ open: true, name: proposedName })
      return
    }

    // Defensive server-side check (prevents duplicates if the list is stale).
    try {
      const { data, error } = await supabase.from('users').select('id, name').ilike('name', proposedName).limit(1)
      if (!error && (data || []).length) {
        setDuplicateUserModal({ open: true, name: proposedName })
        return
      }
    } catch (error) {
      // If the check fails, we still allow the user to proceed to the normal confirmation.
      console.error('Duplicate user check failed:', error)
    }

    openSaveConfirm('add')
  }

  const handleOpenEdit = (id) => {
    const u = users.find((x) => x.id === id)
    if (!u) return
    const normalized = normalizeUser(u)
    setEditingUser({ ...normalized, password: '' })
    setOriginalUser({ ...normalized })
    setShowEditModal(true)
  }

  const buildEditSummary = () => {
    if (!originalUser || !editingUser) return 'No changes detected.'
    const changes = []
    if ((originalUser.name || '') !== (editingUser.name || '')) {
      changes.push(`Name: ${originalUser.name} → ${editingUser.name}`)
    }
    if ((originalUser.role || '') !== (editingUser.role || '')) {
      changes.push(`Role: ${originalUser.role} → ${editingUser.role}`)
    }
    if (String(editingUser.password || '').trim()) {
      changes.push('Password: updated')
    }
    return changes.length ? changes.join('\n') : 'No changes detected.'
  }

  const addSaveDisabled = !newUser.name.trim() || !String(newUser.password || '').trim()
  const editSaveDisabled = !editingUser?.name?.trim()

  const runConfirmedSave = async () => {
    if (confirmState.mode === 'add') {
      const trimmed = {
        name: newUser.name.trim(),
        role: newUser.role,
        // 'Inactive' means enabled but logged out; 'Deactivated' blocks login.
        status: newUser.active ? 'Inactive' : 'Deactivated',
        password: String(newUser.password || '').trim(),
      }

      // Re-check duplicates right before insert (guards against race conditions).
      try {
        const { data, error } = await supabase.from('users').select('id, name').ilike('name', trimmed.name).limit(1)
        if (!error && (data || []).length) {
          closeSaveConfirm()
          setDuplicateUserModal({ open: true, name: trimmed.name })
          return
        }
      } catch (error) {
        console.error('Duplicate user re-check failed:', error)
      }

      try {
        const { error } = await supabase.from('users').insert([trimmed])
        if (error) {
          console.error('Supabase insert error:', error)
          alert('Error adding user: ' + error.message)
          return
        }
        setShowAddModal(false)
        closeSaveConfirm()
        setNewUser({ name: '', role: 'Staff', active: true, password: '' })
        await getUsers()
      } catch (error) {
        console.error('Error adding user:', error)
        alert('Error adding user')
      }
      return
    }

    if (confirmState.mode === 'edit' && editingUser) {
      const updatePayload = {
        name: String(editingUser.name || '').trim(),
        role: editingUser.role,
        status: editingUser.active ? 'Inactive' : 'Deactivated',
      }

      const nextPassword = String(editingUser.password || '').trim()
      if (nextPassword) updatePayload.password = nextPassword

      try {
        const { error } = await supabase.from('users').update(updatePayload).eq('id', editingUser.id)
        if (error) {
          console.error('Supabase update error:', error)
          alert('Error updating user: ' + error.message)
          return
        }
        setShowEditModal(false)
        setEditingUser(null)
        setOriginalUser(null)
        closeSaveConfirm()
        await getUsers()
      } catch (error) {
        console.error('Error updating user:', error)
        alert('Error updating user')
      }
    }
  }

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    const normalizedRole = String(roleFilter || 'All').toLowerCase()
    return users.filter((u) => {
      const role = String(u.role || '').toLowerCase()
      const matchesRole = normalizedRole === 'all' || role === normalizedRole

      if (!matchesRole) return false
      if (!q) return true
      const name = String(u.name || '').toLowerCase()
      return name.includes(q) || role.includes(q)
    })
  }, [users, searchTerm, roleFilter])

  const counts = useMemo(() => {
    const onlineUsers = users.filter((u) => isOnline(u))
    const activeStaff = onlineUsers.filter((u) => String(u.role).toLowerCase() === 'staff').length
    const activeAdmins = onlineUsers.filter((u) => String(u.role).toLowerCase() === 'admin').length
    return { activeStaff, activeAdmins }
  }, [users])

  const activeStaffUsers = useMemo(() => {
    return users
      .filter((u) => isOnline(u) && String(u.role || '').toLowerCase() === 'staff')
      .map((u) => ({ id: u.id, name: u.name }))
  }, [users])

  const activeAdminUsers = useMemo(() => {
    return users
      .filter((u) => isOnline(u) && String(u.role || '').toLowerCase() === 'admin')
      .map((u) => ({ id: u.id, name: u.name }))
  }, [users])

  return (
    <div className="page-container manage-users-page">
      <Navbar
        onLogout={onLogout}
        activePage="users"
        onNavigate={onNavigate}
        role={userRole}
        user={{ name: userName, role: userRole === 'admin' ? 'Administrator' : 'Staff' }}
      />

      <div className="manage-users-content">
        <h1 className="manage-users-title">Manager Users</h1>

        <div className="mu-stats">
          <div className="mu-stat-card" tabIndex={0} aria-label="Active staff (hover to view list)">
            <div className="mu-stat-text">
              <div className="mu-stat-label">Active Staff</div>
              <div className="mu-stat-value">{formatInteger(counts.activeStaff)}</div>
            </div>
            <div className="mu-stat-icon" aria-hidden="true">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
                <path d="M9 2H15V4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4H9V2Z" stroke="#5BC0BE" strokeWidth="1.8" />
                <path d="M8 10H16" stroke="#5BC0BE" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M8 14H13" stroke="#5BC0BE" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M16.5 14.5V18.5" stroke="#5BC0BE" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M14.5 16.5H18.5" stroke="#5BC0BE" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>

            <div className="mu-stat-tooltip" role="tooltip" aria-hidden="true">
              <div className="mu-stat-tooltip-title">Active Staff</div>
              {activeStaffUsers.length ? (
                <div className="mu-stat-tooltip-list">
                  {activeStaffUsers.map((u) => (
                    <div key={u.id} className="mu-stat-tooltip-item">
                      <div className="mu-stat-tooltip-name" title={u.name}>
                        {u.name}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mu-stat-tooltip-empty">No active staff.</div>
              )}
            </div>
          </div>

          <div className="mu-stat-card admin" tabIndex={0} aria-label="Active admin (hover to view list)">
            <div className="mu-stat-text">
              <div className="mu-stat-label">Active Admin</div>
              <div className="mu-stat-value">{formatInteger(counts.activeAdmins)}</div>
            </div>
            <div className="mu-stat-icon" aria-hidden="true">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
                <path d="M9 2H15V4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4H9V2Z" stroke="#5BC0BE" strokeWidth="1.8" />
                <path d="M8 10H16" stroke="#5BC0BE" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M8 14H13" stroke="#5BC0BE" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M16.5 14.5V18.5" stroke="#5BC0BE" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M14.5 16.5H18.5" stroke="#5BC0BE" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>

            <div className="mu-stat-tooltip" role="tooltip" aria-hidden="true">
              <div className="mu-stat-tooltip-title">Active Admin</div>
              {activeAdminUsers.length ? (
                <div className="mu-stat-tooltip-list">
                  {activeAdminUsers.map((u) => (
                    <div key={u.id} className="mu-stat-tooltip-item">
                      <div className="mu-stat-tooltip-name" title={u.name}>
                        {u.name}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mu-stat-tooltip-empty">No active admin.</div>
              )}
            </div>
          </div>
        </div>

        <div className="mu-panel">
          <div className="mu-controls">
            <div className="mu-search" role="search">
              <svg className="mu-search-icon" width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="9" cy="9" r="6" stroke="#000" strokeWidth="2" />
                <path d="M14 14L18 18" stroke="#000" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                className="mu-search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search users"
                aria-label="Search users"
              />
              {searchTerm.trim() ? (
                <button
                  type="button"
                  className="mu-search-clear"
                  onClick={() => setSearchTerm('')}
                  aria-label="Clear search"
                >
                  x
                </button>
              ) : null}
            </div>

            <div className="mu-filter-wrapper">
              <button
                type="button"
                className="mu-pill-btn mu-filter-btn"
                onClick={() => setShowRoleFilter((v) => !v)}
              >
                FILTER
              </button>
              {showRoleFilter ? (
                <div className="mu-filter-menu">
                  {['All', 'Admin', 'Staff', 'Customer'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={`mu-filter-item ${roleFilter === opt ? 'active' : ''}`}
                      onClick={() => {
                        setRoleFilter(opt)
                        setShowRoleFilter(false)
                      }}
                    >
                      {opt === 'Customer' ? 'Customers' : opt}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <button type="button" className="mu-pill-btn mu-add-btn" onClick={handleOpenAdd}>
              <span className="mu-add-icon" aria-hidden="true">
                <img src={ADD_PRODUCT_BUTTON_ICON} alt="" />
              </span>
              ADD USER
            </button>
          </div>

          <div className="mu-table">
            <div className="mu-table-head">
              <div className="mu-col-user">User</div>
              <div className="mu-col-role">Role</div>
              <div className="mu-col-action">Action</div>
            </div>

            <div className="mu-table-body mu-table-scroll">
              {filteredUsers.map((u) => {
                const initials = String(u.name || '')
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase())
                  .join('')

                const roleKey = String(u.role || '').toLowerCase()
                return (
                  <div key={u.id} className="mu-row">
                    <div className="mu-col-user">
                      <div className={`mu-avatar ${roleKey === 'admin' ? 'admin' : roleKey === 'customer' ? 'customer' : 'staff'}`}>
                        {initials || '?'}
                      </div>
                      <div className="mu-user-text">
                        <div className="mu-user-name" title={u.name}>
                          {u.name}
                        </div>
                      </div>
                    </div>

                    <div className="mu-col-role">
                      <span
                        className={`mu-role-pill ${roleKey === 'admin' ? 'admin' : roleKey === 'customer' ? 'customer' : 'staff'}`}
                      >
                        {u.role}
                      </span>
                    </div>

                    <div className="mu-col-action">
                      <button type="button" className="mu-edit-btn" onClick={() => handleOpenEdit(u.id)}>
                        EDIT
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>ADD USER</h2>
              <button className="exit-btn" type="button" onClick={() => setShowAddModal(false)}>
                EXIT ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-right">
                <div className="form-group">
                  <label>NAME</label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="Juan Dela Cruz"
                  />
                </div>
                <div className="form-group">
                  <label>PASSWORD</label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>ROLE</label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    >
                      <option value="Admin">Admin</option>
                      <option value="Staff">Staff</option>
                      <option value="Customer">Customer</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>STATUS</label>
                    <select
                      value={newUser.active ? 'Active' : 'Inactive'}
                      onChange={(e) => setNewUser({ ...newUser, active: e.target.value === 'Active' })}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <button
                  className="save-btn"
                  type="button"
                  onClick={handleAttemptAddUserSave}
                  disabled={addSaveDisabled}
                  style={addSaveDisabled ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
                >
                  <img src={ADD_PRODUCT_BUTTON_ICON} alt="" className="save-icon-img" />
                  SAVE USER
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>EDIT USER</h2>
              <button className="exit-btn" type="button" onClick={() => setShowEditModal(false)}>
                EXIT ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-right">
                <div className="form-group">
                  <label>NAME</label>
                  <input
                    type="text"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>NEW PASSWORD</label>
                  <input
                    type="password"
                    value={editingUser.password}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                    placeholder="Leave blank to keep"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>ROLE</label>
                    <select
                      value={editingUser.role}
                      onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                    >
                      <option value="Admin">Admin</option>
                      <option value="Staff">Staff</option>
                      <option value="Customer">Customer</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>STATUS</label>
                    <select
                      value={editingUser.active ? 'Active' : 'Inactive'}
                      onChange={(e) => setEditingUser({ ...editingUser, active: e.target.value === 'Active' })}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <button
                  className="save-btn save-edit"
                  type="button"
                  onClick={() => openSaveConfirm('edit')}
                  disabled={editSaveDisabled}
                  style={editSaveDisabled ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
                >
                  <img src={ADD_PRODUCT_BUTTON_ICON} alt="" className="save-icon-img" />
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
            ? `Add user: ${newUser.name || '—'}\nRole: ${newUser.role}\nPassword: ${String(newUser.password || '').trim() ? '(set)' : '(missing)'}`
            : `Update user: ${editingUser?.name || '—'}\n\n${buildEditSummary()}`
        }
        cancelText="Cancel"
        confirmText={
          (confirmState.mode === 'add' && addSaveDisabled) || (confirmState.mode === 'edit' && editSaveDisabled)
            ? 'Fix fields'
            : 'Yes'
        }
        onCancel={closeSaveConfirm}
        onConfirm={() => {
          if ((confirmState.mode === 'add' && addSaveDisabled) || (confirmState.mode === 'edit' && editSaveDisabled)) return
          runConfirmedSave()
        }}
      />

      <ConfirmModal
        open={duplicateUserModal.open}
        title="User already added"
        message={duplicateUserModal.name ? `A user named "${duplicateUserModal.name}" already exists.` : 'This user already exists.'}
        showCancel={false}
        confirmText="OK"
        onCancel={() => setDuplicateUserModal({ open: false, name: '' })}
        onConfirm={() => setDuplicateUserModal({ open: false, name: '' })}
      />
    </div>
  )
}

export default ManageUsers

