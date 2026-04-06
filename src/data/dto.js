/**
 * Data Transfer Objects (DTOs) for the SE2-new data layer.
 *
 * Each DTO is a plain class that:
 *  1. Sanitises raw input in the constructor (trims strings, coerces types).
 *  2. Exposes a validate() method that returns an array of error strings.
 *     An empty array means the input is valid.
 *
 * Usage:
 *   import { CreateProductDTO } from './dto'
 *   const dto = new CreateProductDTO(rawFormValues)
 *   const errors = dto.validate()
 *   if (errors.length) throw new Error(errors.join(', '))
 *   // use dto.name, dto.price, etc. — already sanitised
 */

// ─── Shared helpers ───────────────────────────────────────────

const VALID_ROLES = new Set(['Admin', 'Staff'])
const VALID_PRODUCT_TYPES = new Set(['Meat', 'Fish', 'Vegetable', 'Drinks', 'Others'])
const VALID_PRODUCT_STATUSES = new Set(['AVAILABLE', 'UNAVAILABLE'])
const VALID_PAYMENT_METHODS = new Set(['Cash', 'GCash'])
const VALID_DISCOUNT_TYPES = new Set(['None', 'PWD', 'Senior'])
const VALID_PAYMENT_STATUSES = new Set(['Paid', 'Unpaid'])
const GCASH_REF_PATTERN = /^\d{10,15}$/

// ─── Auth ─────────────────────────────────────────────────────

export class LoginDTO {
  constructor(raw = {}) {
    this.name = String(raw.name ?? '').trim()
    this.password = String(raw.password ?? '')
  }

  validate() {
    const errors = []
    if (!this.name) errors.push('Username is required')
    if (this.name.length > 100) errors.push('Username must be at most 100 characters')
    if (!this.password) errors.push('Password is required')
    if (this.password.length > 128) errors.push('Password must be at most 128 characters')
    return errors
  }
}

// ─── Users ────────────────────────────────────────────────────

export class CreateUserDTO {
  constructor(raw = {}) {
    this.name = String(raw.name ?? '').trim()
    this.role = String(raw.role ?? 'Staff').trim()
    this.password = String(raw.password ?? '').trim()
  }

  validate() {
    const errors = []
    if (!this.name) errors.push('Name is required')
    if (this.name.length > 100) errors.push('Name must be at most 100 characters')
    if (!VALID_ROLES.has(this.role))
      errors.push(`Role must be one of: ${[...VALID_ROLES].join(', ')}`)
    if (!this.password) errors.push('Password is required')
    if (this.password.length < 6) errors.push('Password must be at least 6 characters')
    if (this.password.length > 128) errors.push('Password must be at most 128 characters')
    return errors
  }
}

export class UpdateUserDTO {
  constructor(raw = {}) {
    this.name = String(raw.name ?? '').trim()
    this.role = String(raw.role ?? 'Staff').trim()
    this.active = raw.active !== false
    // null means "no password change"
    const pw = String(raw.password ?? '').trim()
    this.password = pw.length > 0 ? pw : null
  }

  validate() {
    const errors = []
    if (!this.name) errors.push('Name is required')
    if (this.name.length > 100) errors.push('Name must be at most 100 characters')
    if (!VALID_ROLES.has(this.role))
      errors.push(`Role must be one of: ${[...VALID_ROLES].join(', ')}`)
    if (this.password !== null) {
      if (this.password.length < 6) errors.push('New password must be at least 6 characters')
      if (this.password.length > 128) errors.push('New password must be at most 128 characters')
    }
    return errors
  }
}

// ─── Products ─────────────────────────────────────────────────

export class CreateProductDTO {
  constructor(raw = {}) {
    this.name = String(raw.name ?? '').trim()
    this.price = Number(raw.price)
    this.status = String(raw.status ?? 'AVAILABLE').trim().toUpperCase()
    this.type = String(raw.type ?? 'Others').trim()
    this.description =
      raw.description != null && String(raw.description).trim() !== ''
        ? String(raw.description).trim()
        : null
    this.isBestSeller = Boolean(raw.isBestSeller)
  }

  validate() {
    const errors = []
    if (!this.name) errors.push('Product name is required')
    if (this.name.length > 200) errors.push('Product name must be at most 200 characters')
    if (!Number.isFinite(this.price) || this.price < 0)
      errors.push('Price must be a non-negative number')
    if (!VALID_PRODUCT_STATUSES.has(this.status))
      errors.push(`Status must be one of: ${[...VALID_PRODUCT_STATUSES].join(', ')}`)
    if (!VALID_PRODUCT_TYPES.has(this.type))
      errors.push(`Type must be one of: ${[...VALID_PRODUCT_TYPES].join(', ')}`)
    return errors
  }
}

export class UpdateProductDTO extends CreateProductDTO {
  // Inherits all fields and validation from CreateProductDTO.
  constructor(raw = {}) {
    super(raw)
    this.imagePath = raw.imagePath != null ? String(raw.imagePath) : null
  }
}

export class UpdateProductStatusDTO {
  constructor(raw = {}) {
    this.status = String(raw.status ?? '').trim().toUpperCase()
  }

  validate() {
    const errors = []
    if (!VALID_PRODUCT_STATUSES.has(this.status))
      errors.push(`Status must be one of: ${[...VALID_PRODUCT_STATUSES].join(', ')}`)
    return errors
  }
}

// ─── Orders ───────────────────────────────────────────────────

export class SetOrderPaymentStatusDTO {
  constructor(raw = {}) {
    this.paymentstatus = String(raw.paymentstatus ?? '').trim()
  }

  validate() {
    const errors = []
    if (!VALID_PAYMENT_STATUSES.has(this.paymentstatus))
      errors.push(`paymentstatus must be one of: ${[...VALID_PAYMENT_STATUSES].join(', ')}`)
    return errors
  }
}

// ─── Payments ─────────────────────────────────────────────────

export class ProcessPaymentDTO {
  constructor(raw = {}) {
    this.orderId = Number(raw.orderId)
    this.paymentMethod = String(raw.paymentMethod ?? 'Cash').trim()
    this.amountReceived = raw.amountReceived != null ? Number(raw.amountReceived) : null
    const ref = String(raw.gcashRef ?? '').trim()
    this.gcashRef = ref.length > 0 ? ref : null
    this.discountType = String(raw.discountType ?? 'None').trim()
    this.subtotal = Number(raw.subtotal)
    this.discount = Number(raw.discount ?? 0)
    this.total = Number(raw.total)
  }

  validate() {
    const errors = []
    if (!Number.isFinite(this.orderId) || this.orderId <= 0)
      errors.push('orderId must be a positive number')
    if (!VALID_PAYMENT_METHODS.has(this.paymentMethod))
      errors.push(`paymentMethod must be one of: ${[...VALID_PAYMENT_METHODS].join(', ')}`)
    if (!VALID_DISCOUNT_TYPES.has(this.discountType))
      errors.push(`discountType must be one of: ${[...VALID_DISCOUNT_TYPES].join(', ')}`)
    if (!Number.isFinite(this.subtotal) || this.subtotal < 0)
      errors.push('subtotal must be a non-negative number')
    if (!Number.isFinite(this.total) || this.total < 0)
      errors.push('total must be a non-negative number')
    if (this.paymentMethod === 'Cash') {
      if (this.amountReceived == null || !Number.isFinite(this.amountReceived))
        errors.push('amountReceived is required for Cash payments')
      else if (this.amountReceived < 0)
        errors.push('amountReceived must be non-negative')
    }
    if (this.paymentMethod === 'GCash') {
      if (!this.gcashRef || !GCASH_REF_PATTERN.test(this.gcashRef))
        errors.push('gcashRef must be a 10–15 digit number for GCash payments')
    }
    return errors
  }
}
