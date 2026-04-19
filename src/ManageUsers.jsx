import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Navbar from './elements/Navbar'
import './styles/ManageUsers.css'
import { formatInteger } from './utils/numberFormat'
import ConfirmModal from './elements/ConfirmModal'
import { fetchUsers, createUser, updateUser, deleteUser, subscribeToUserChanges } from './data/users'
import { ADD_PRODUCT_BUTTON_ICON } from './utils/publicAsset'

function ManageUsers({ onLogout, onNavigate, userRole = 'admin', userName = 'Admin User', userId = null }) {
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
  const [selfDemoteModal, setSelfDemoteModal] = useState(false)

  // Account status change confirm
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false)
  const [pendingStatusChange, setPendingStatusChange] = useState(null)

  // Delete / remove account
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteBlockModal, setDeleteBlockModal] = useState({ open: false, reason: '', message: '' })
  const [isDeleting, setIsDeleting] = useState(false)

  const [users, setUsers] = useState([])
  const refreshTimerRef = useRef(null)

  const normalizeName = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase()

  const isDuplicateUserName = (candidateName) => {
    const candidateKey = normalizeName(candidateName)
    if (!candidateKey) return false
    return users.some((u) => normalizeName(u?.name) === candidateKey)
  }

  const isEnabledAccount = (u) => {
    const status = String(u?.status || '').trim().toLowerCase()
    if (!status) return true
    return status !== 'deactivated'
  }

  const normalizeUser = (u) => {
    if (!u) return null
    return { ...u, active: isEnabledAccount(u) }
  }

  const getUsers = useCallback(async () => {
    try {
      const data = await fetchUsers(userRole)
      setUsers(data)
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }, [userRole])

  useEffect(() => {
    getUsers()

    const onFocus = () => getUsers()
    window.addEventListener('focus', onFocus)

    const unsubscribe = subscribeToUserChanges(() => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = setTimeout(() => getUsers(), 300)
    })

    return () => {
      window.removeEventListener('focus', onFocus)
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      unsubscribe()
    }
  }, [getUsers])

  const openSaveConfirm = (mode) => setConfirmState({ open: true, mode })
  const closeSaveConfirm = () => setConfirmState({ open: false, mode: null })

  const handleOpenAdd = () => {
    setNewUser({ name: '', role: 'Staff', active: true, password: '' })
    setShowAddModal(true)
  }

  const handleAttemptAddUserSave = () => {
    const proposedName = String(newUser.name || '').trim()
    if (!proposedName) return
    if (isDuplicateUserName(proposedName)) {
      setDuplicateUserModal({ open: true, name: proposedName })
      return
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
    if ((originalUser.name || '') !== (editingUser.name || ''))
      changes.push(`Name: ${originalUser.name} → ${editingUser.name}`)
    if ((originalUser.role || '') !== (editingUser.role || ''))
      changes.push(`Role: ${originalUser.role} → ${editingUser.role}`)
    if (Boolean(originalUser.active) !== Boolean(editingUser.active))
      changes.push(`Access: ${originalUser.active ? 'Enabled' : 'Disabled'} → ${editingUser.active ? 'Enabled' : 'Disabled'}`)
    if (String(editingUser.password || '').trim())
      changes.push('Password: updated')
    return changes.length ? changes.join('\n') : 'No changes detected.'
  }

  // Editing self: compare by ID first (most reliable), fall back to name match
  const isEditingSelf = editingUser && (
    (userId != null && editingUser.id === userId) ||
    normalizeName(editingUser.name) === normalizeName(userName)
  )

  const addSaveDisabled = !newUser.name.trim() || !String(newUser.password || '').trim()
  const editSaveDisabled = !editingUser?.name?.trim()

  const runConfirmedSave = async () => {
    if (confirmState.mode === 'add') {
      try {
        await createUser(userRole, {
          name: newUser.name,
          role: newUser.role,
          password: String(newUser.password || ''),
        })
        setShowAddModal(false)
        closeSaveConfirm()
        setNewUser({ name: '', role: 'Staff', active: true, password: '' })
        await getUsers()
      } catch (err) {
        if (err.code === 'DUPLICATE_NAME') {
          closeSaveConfirm()
          setDuplicateUserModal({ open: true, name: err.duplicateName })
          return
        }
        console.error('Error adding user:', err)
        alert('Error adding user: ' + err.message)
      }
      return
    }

    if (confirmState.mode === 'edit' && editingUser) {
      try {
        await updateUser(
          userRole,
          editingUser.id,
          {
            name: editingUser.name,
            role: editingUser.role,
            active: editingUser.active,
            password: String(editingUser.password || '').trim() || null,
          },
          userName,
        )
        setShowEditModal(false)
        setEditingUser(null)
        setOriginalUser(null)
        closeSaveConfirm()
        await getUsers()
      } catch (err) {
        console.error('Error updating user:', err)
        alert('Error updating user: ' + err.message)
      }
    }
  }

  // ── Account status toggle ────────────────────────────────────────────────────
  const handleRequestStatusChange = (newActive) => {
    setPendingStatusChange(newActive)
    setStatusConfirmOpen(true)
  }

  const handleConfirmStatusChange = () => {
    setEditingUser((prev) => prev ? { ...prev, active: pendingStatusChange } : prev)
    setStatusConfirmOpen(false)
    setPendingStatusChange(null)
  }

  // ── Delete / remove account ──────────────────────────────────────────────────
  const handleRequestDelete = () => {
    if (!editingUser) return

    // Cannot delete self
    if ((userId != null && editingUser.id === userId) ||
        normalizeName(editingUser.name) === normalizeName(userName)) {
      setDeleteBlockModal({ open: true, reason: 'self', message: '' })
      return
    }

    // Cannot remove the last admin
    const adminCount = users.filter((u) => String(u.role || '').toLowerCase() === 'admin').length
    if (String(editingUser.role || '').toLowerCase() === 'admin' && adminCount <= 1) {
      setDeleteBlockModal({ open: true, reason: 'last_admin' })
      return
    }

    setDeleteConfirmOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!editingUser || isDeleting) return
    setIsDeleting(true)
    try {
      await deleteUser(userRole, editingUser.id)
      setDeleteConfirmOpen(false)
      setShowEditModal(false)
      setEditingUser(null)
      setOriginalUser(null)
      await getUsers()
    } catch (err) {
      setDeleteConfirmOpen(false)
      if (err.code === 'LAST_ADMIN') {
        setDeleteBlockModal({ open: true, reason: 'last_admin', message: '' })
        return
      }
      console.error('Error removing account:', err)
      setDeleteBlockModal({ open: true, reason: 'error', message: err.message })
    } finally {
      setIsDeleting(false)
    }
  }

  // ── Filtering / display ──────────────────────────────────────────────────────
  const ROLE_ORDER = { admin: 0, staff: 1, customer: 2 }

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    const normalizedRole = String(roleFilter || 'All').toLowerCase()
    return users
      .filter((u) => {
        const role = String(u.role || '').toLowerCase()
        const matchesRole = normalizedRole === 'all' || role === normalizedRole
        if (!matchesRole) return false
        if (!q) return true
        const name = String(u.name || '').toLowerCase()
        return name.includes(q) || role.includes(q)
      })
      .sort((a, b) => {
        const roleA = ROLE_ORDER[String(a.role || '').toLowerCase()] ?? 99
        const roleB = ROLE_ORDER[String(b.role || '').toLowerCase()] ?? 99
        if (roleA !== roleB) return roleA - roleB
        return String(a.name || '').localeCompare(String(b.name || ''))
      })
  }, [users, searchTerm, roleFilter])

  // Cards now count enabled (non-deactivated) accounts instead of online presence
  const counts = useMemo(() => {
    const enabled = users.filter((u) => isEnabledAccount(u))
    return {
      enabledStaff: enabled.filter((u) => String(u.role).toLowerCase() === 'staff').length,
      enabledAdmins: enabled.filter((u) => String(u.role).toLowerCase() === 'admin').length,
    }
  }, [users])

  const enabledStaffUsers = useMemo(() =>
    users.filter((u) => isEnabledAccount(u) && String(u.role || '').toLowerCase() === 'staff')
         .map((u) => ({ id: u.id, name: u.name })),
  [users])

  const enabledAdminUsers = useMemo(() =>
    users.filter((u) => isEnabledAccount(u) && String(u.role || '').toLowerCase() === 'admin')
         .map((u) => ({ id: u.id, name: u.name })),
  [users])

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
              <div className="mu-stat-value">{formatInteger(counts.enabledStaff)}</div>
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
              {enabledStaffUsers.length ? (
                <div className="mu-stat-tooltip-list">
                  {enabledStaffUsers.map((u) => (
                    <div key={u.id} className="mu-stat-tooltip-item">
                      <div className="mu-stat-tooltip-name" title={u.name}>{u.name}</div>
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
              <div className="mu-stat-value">{formatInteger(counts.enabledAdmins)}</div>
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
              {enabledAdminUsers.length ? (
                <div className="mu-stat-tooltip-list">
                  {enabledAdminUsers.map((u) => (
                    <div key={u.id} className="mu-stat-tooltip-item">
                      <div className="mu-stat-tooltip-name" title={u.name}>{u.name}</div>
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
                <button type="button" className="mu-search-clear" onClick={() => setSearchTerm('')} aria-label="Clear search">x</button>
              ) : null}
            </div>

            <div className="mu-filter-wrapper">
              <button type="button" className="mu-pill-btn mu-filter-btn" onClick={() => setShowRoleFilter((v) => !v)}>
                FILTER
              </button>
              {showRoleFilter ? (
                <div className="mu-filter-menu">
                  {['All', 'Admin', 'Staff', 'Customer'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={`mu-filter-item ${roleFilter === opt ? 'active' : ''}`}
                      onClick={() => { setRoleFilter(opt); setShowRoleFilter(false) }}
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
              {filteredUsers.length === 0 && (
                <div className="mu-empty">No users found.</div>
              )}
              {filteredUsers.map((u) => {
                const initials = String(u.name || '').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')
                const roleKey = String(u.role || '').toLowerCase()
                const enabled = isEnabledAccount(u)
                return (
                  <div key={u.id} className={`mu-row ${!enabled ? 'mu-row-disabled' : ''}`}>
                    <div className="mu-col-user">
                      <div className={`mu-avatar ${roleKey === 'admin' ? 'admin' : roleKey === 'customer' ? 'customer' : 'staff'}`}>
                        {initials || '?'}
                      </div>
                      <div className="mu-user-text">
                        <div className="mu-user-name" title={u.name}>{u.name}</div>
                        {!enabled && <div className="mu-user-disabled-badge">Disabled</div>}
                      </div>
                    </div>
                    <div className="mu-col-role">
                      <span className={`mu-role-pill ${roleKey === 'admin' ? 'admin' : roleKey === 'customer' ? 'customer' : 'staff'}`}>
                        {u.role}
                      </span>
                    </div>
                    <div className="mu-col-action">
                      <button type="button" className="mu-edit-btn" onClick={() => handleOpenEdit(u.id)}>EDIT</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Add User Modal ──────────────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>ADD USER</h2>
              <button className="exit-btn" type="button" onClick={() => setShowAddModal(false)}>EXIT ✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-right">
                <div className="form-group">
                  <label>NAME</label>
                  <input type="text" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} placeholder="Juan Dela Cruz" />
                </div>
                <div className="form-group">
                  <label>PASSWORD</label>
                  <input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="••••••••" />
                </div>
                <div className="form-group">
                  <label>ROLE</label>
                  <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                    <option value="Admin">Admin</option>
                    <option value="Staff">Staff</option>
                    <option value="Customer">Customer</option>
                  </select>
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

      {/* ── Edit User Modal ─────────────────────────────────────────────────────── */}
      {showEditModal && editingUser && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>EDIT USER</h2>
              <button className="exit-btn" type="button" onClick={() => setShowEditModal(false)}>EXIT ✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-right">
                <div className="form-group">
                  <label>NAME</label>
                  <input type="text" value={editingUser.name} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>NEW PASSWORD</label>
                  <input type="password" value={editingUser.password} onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })} placeholder="Leave blank to keep" />
                </div>
                <div className="form-group">
                  <label>ROLE</label>
                  <select value={editingUser.role} onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}>
                    <option value="Admin">Admin</option>
                    <option value="Staff">Staff</option>
                    <option value="Customer">Customer</option>
                  </select>
                </div>

                {/* Account Status — only admin can change; cannot change own account */}
                {userRole === 'admin' && (
                  <div className="form-group">
                    <label>ACCOUNT STATUS</label>
                    {isEditingSelf ? (
                      <div className="account-access-note">You cannot change your own account status.</div>
                    ) : (
                      <div className="account-access-row">
                        <button
                          type="button"
                          className={`access-btn ${editingUser.active ? 'access-enabled' : ''}`}
                          onClick={() => { if (!editingUser.active) handleRequestStatusChange(true) }}
                        >
                          Active
                        </button>
                        <button
                          type="button"
                          className={`access-btn ${!editingUser.active ? 'access-disabled' : ''}`}
                          onClick={() => { if (editingUser.active) handleRequestStatusChange(false) }}
                        >
                          Inactive
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Remove account — admin only, placed before Save */}
                {userRole === 'admin' && (
                  <button type="button" className="remove-user-btn" onClick={handleRequestDelete}>
                    REMOVE ACCOUNT
                  </button>
                )}

                <button
                  className="save-btn save-edit"
                  type="button"
                  onClick={() => {
                    if (
                      isEditingSelf &&
                      originalUser &&
                      String(originalUser.role || '').toLowerCase() === 'admin' &&
                      String(editingUser.role || '').toLowerCase() !== 'admin'
                    ) {
                      setSelfDemoteModal(true)
                      return
                    }
                    openSaveConfirm('edit')
                  }}
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

      {/* ── Confirm Modals ──────────────────────────────────────────────────────── */}
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

      <ConfirmModal
        open={selfDemoteModal}
        title="Cannot Change Own Role"
        message="You cannot demote your own account. Please ask another admin to change your role."
        showCancel={false}
        confirmText="OK"
        onCancel={() => setSelfDemoteModal(false)}
        onConfirm={() => {
          setSelfDemoteModal(false)
          setEditingUser((prev) => prev ? { ...prev, role: originalUser?.role || 'Admin' } : prev)
        }}
      />

      {/* Account status change confirm */}
      <ConfirmModal
        open={statusConfirmOpen}
        title={pendingStatusChange ? 'Set Account Active?' : 'Set Account Inactive?'}
        message={
          pendingStatusChange
            ? `Set ${editingUser?.name || 'this user'} to Active? They will be able to log in.`
            : `Set ${editingUser?.name || 'this user'} to Inactive? They will no longer be able to log in.`
        }
        cancelText="Cancel"
        confirmText={pendingStatusChange ? 'Yes, Activate' : 'Yes, Deactivate'}
        onCancel={() => { setStatusConfirmOpen(false); setPendingStatusChange(null) }}
        onConfirm={handleConfirmStatusChange}
      />

      {/* Delete / remove confirm */}
      <ConfirmModal
        open={deleteConfirmOpen}
        title="Remove Account?"
        message={`Permanently remove ${editingUser?.name || 'this user'}? This cannot be undone.`}
        cancelText="Cancel"
        confirmText={isDeleting ? 'Removing…' : 'Yes, Remove'}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
      />

      {/* Delete blocked */}
      <ConfirmModal
        open={deleteBlockModal.open}
        title={
          deleteBlockModal.reason === 'self' ? 'Cannot Remove Your Own Account'
          : deleteBlockModal.reason === 'last_admin' ? 'Cannot Remove Last Admin'
          : 'Failed to Remove Account'
        }
        message={
          deleteBlockModal.reason === 'self'
            ? 'You cannot remove your own account.'
            : deleteBlockModal.reason === 'last_admin'
            ? 'There is only 1 admin left in the system. Add another admin before removing this account.'
            : deleteBlockModal.message || 'An unexpected error occurred.'
        }
        showCancel={false}
        confirmText="OK"
        onCancel={() => setDeleteBlockModal({ open: false, reason: '', message: '' })}
        onConfirm={() => setDeleteBlockModal({ open: false, reason: '', message: '' })}
      />
    </div>
  )
}

export default ManageUsers
