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
    status: dto.active ? 'Inactive' : 'Deactivated',
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
