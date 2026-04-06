/**
 * Guards for the SE2-new data layer.
 *
 * Guards are lightweight checks that throw a descriptive Error when a
 * precondition is not met. They are called at the top of data-layer
 * functions so an unauthorized or invalid call fails fast before any
 * Supabase request is made.
 *
 * Usage:
 *   import { guardAdmin, guardDto } from './guards'
 *
 *   export async function createProduct(userRole, dto) {
 *     guardAdmin(userRole)
 *     guardDto(dto)
 *     // ... Supabase call
 *   }
 */

/**
 * Throws if userRole is not 'admin'.
 * @param {string} userRole - the current user's role (lowercase)
 */
export function guardAdmin(userRole) {
  if (String(userRole ?? '').toLowerCase() !== 'admin') {
    throw new Error('Admin access required')
  }
}

/**
 * Throws if the DTO has validation errors.
 * The DTO must have a validate() method that returns string[].
 * @param {{ validate(): string[] }} dto
 */
export function guardDto(dto) {
  if (!dto || typeof dto.validate !== 'function') {
    throw new Error('Invalid DTO: missing validate() method')
  }
  const errors = dto.validate()
  if (errors.length > 0) {
    throw new Error(errors.join('; '))
  }
}
