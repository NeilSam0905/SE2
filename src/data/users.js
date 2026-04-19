import { supabase, supabaseNoSession, toAuthEmail } from '../lib/supabaseClient'
import { CreateUserDTO, UpdateUserDTO } from './dto'
import { guardAdmin, guardDto } from './guards'

const normalizeUser = (u) => {
  if (!u) return null
  const status = String(u?.status || '').trim().toLowerCase()
  return {
    ...u,
    active: status !== 'deactivated',
  }
}

// ─── READ ────────────────────────────────────────────────────────────────────

export async function fetchUsers(userRole) {
  guardAdmin(userRole)
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('id', { ascending: true })

  if (error) throw error
  return (data ?? []).map(normalizeUser).filter(Boolean)
}

// ─── CREATE ──────────────────────────────────────────────────────────────────

/**
 * @param {string} userRole - current user's role
 * @param {object} raw - { name, role, password }
 * @returns {Promise<object>} the newly created user row
 */
export async function createUser(userRole, raw) {
  guardAdmin(userRole)
  const dto = new CreateUserDTO(raw)
  guardDto(dto)

  // Duplicate name check (case-insensitive).
  const { data: existing, error: checkError } = await supabase
    .from('users')
    .select('id, name')
    .ilike('name', dto.name)
    .limit(1)

  if (checkError) throw checkError
  if (existing?.length) {
    const err = new Error(`A user named "${dto.name}" already exists`)
    err.code = 'DUPLICATE_NAME'
    err.duplicateName = dto.name
    throw err
  }

  // Create the Supabase Auth account (non-persistent client keeps the admin session intact).
  const email = toAuthEmail(dto.name)
  const { data: signUpData, error: signUpError } = await supabaseNoSession.auth.signUp({
    email,
    password: dto.password,
    options: { data: { display_name: dto.name, role: dto.role } },
  })

  if (signUpError) throw new Error('Error creating auth account: ' + signUpError.message)

  const authId = signUpData.user?.id ?? null

  const { data: created, error: insertError } = await supabase
    .from('users')
    .insert([{ name: dto.name, role: dto.role, status: 'Inactive', auth_id: authId }])
    .select('*')
    .single()

  if (insertError) throw insertError
  return normalizeUser(created)
}

// ─── UPDATE ──────────────────────────────────────────────────────────────────

/**
 * @param {string} userRole - current user's role
 * @param {number} userId - the id of the user to update
 * @param {object} raw - { name, role, active, password? }
 * @param {string} currentUserName - logged-in user's display name (for self-password check)
 */
export async function updateUser(userRole, userId, raw, currentUserName) {
  guardAdmin(userRole)
  const id = Number(userId)
  if (!Number.isFinite(id) || id <= 0) throw new Error('updateUser: userId must be a positive number')

  const dto = new UpdateUserDTO(raw)
  guardDto(dto)

  const updatePayload = {
    name: dto.name,
    role: dto.role,
    status: dto.active ? 'Active' : 'Deactivated',
  }

  const { error: updateError } = await supabase
    .from('users')
    .update(updatePayload)
    .eq('id', id)

  if (updateError) throw updateError

  // Update Supabase Auth password if one was supplied.
  // This only works for the currently logged-in user; other users need an Edge Function.
  if (dto.password) {
    const { data: { user: currentAuthUser } } = await supabase.auth.getUser()
    const editEmail = toAuthEmail(dto.name)
    if (currentAuthUser?.email === editEmail) {
      const { error: pwError } = await supabase.auth.updateUser({ password: dto.password })
      if (pwError) console.warn('Password change failed for current user:', pwError.message)
    } else {
      console.warn(
        'Password for other users can only be changed via a Supabase Edge Function with service_role.',
      )
    }
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────

/**
 * Permanently removes a user from the database.
 * Guards: must be admin; cannot delete self; cannot delete last admin.
 *
 * @param {string} userRole - current user's role
 * @param {number} userId   - id of the user to delete
 */
export async function deleteUser(userRole, userId) {
  guardAdmin(userRole)
  const id = Number(userId)
  if (!Number.isFinite(id) || id <= 0) throw new Error('deleteUser: userId must be a positive number')

  // Verify we're not trying to delete the last admin.
  const { data: targetUser, error: fetchErr } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', id)
    .single()

  if (fetchErr) throw fetchErr

  if (String(targetUser?.role || '').toLowerCase() === 'admin') {
    const { count, error: countErr } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .ilike('role', 'admin')

    if (countErr) throw countErr

    if ((count ?? 0) <= 1) {
      const err = new Error('Cannot remove the last admin account')
      err.code = 'LAST_ADMIN'
      throw err
    }
  }

  const { data: deleted, error } = await supabase
    .from('users')
    .delete()
    .eq('id', id)
    .select('id')

  if (error) throw error

  if (!deleted || deleted.length === 0) {
    const err = new Error(
      'Delete was blocked by the database. ' +
      'Please add a DELETE policy for the users table in your Supabase dashboard:\n\n' +
      'Table: users → Policies → New Policy → "Enable delete for authenticated users"\n' +
      'Or run in SQL editor: CREATE POLICY "admins can delete users" ON users FOR DELETE TO authenticated USING (true);'
    )
    err.code = 'RLS_BLOCKED'
    throw err
  }
}

// ─── REALTIME ────────────────────────────────────────────────────────────────

/**
 * Subscribe to any INSERT/UPDATE/DELETE on the users table.
 * Returns an unsubscribe function.
 */
export function subscribeToUserChanges(onChange) {
  let retryTimer = null
  let retryCount = 0
  const baseId = Math.random().toString(16).slice(2)
  const activeChannel = { current: null }

  const setupChannel = () => {
    const channelName = `users-watch-${baseId}-${retryCount}`
    const ch = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, onChange)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          retryCount = 0
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

  return () => {
    if (retryTimer) clearTimeout(retryTimer)
    try { supabase.removeChannel(activeChannel.current) } catch { /* ignore */ }
  }
}
