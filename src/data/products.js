import { supabase, uploadProductImage, getPublicStorageUrl, PRODUCT_IMAGE_BUCKET } from '../lib/supabaseClient'
import { CreateProductDTO, UpdateProductDTO, UpdateProductStatusDTO } from './dto'
import { guardAdmin, guardDto } from './guards'

const normalizeProductType = (raw) => {
  const t = String(raw || '').trim().toLowerCase()
  if (t === 'meat') return 'Meat'
  if (t === 'fish' || t === 'seafood') return 'Fish'
  if (t === 'vegetable' || t === 'vegetables') return 'Vegetable'
  if (t === 'drinks' || t === 'drink') return 'Drinks'
  return 'Others'
}

const buildProductImageUrl = (row) => {
  const imagePath = row?.image_path || row?.imagePath
  if (imagePath) return getPublicStorageUrl(PRODUCT_IMAGE_BUCKET, imagePath)
  const imageUrl = row?.image_url || row?.imageUrl
  if (imageUrl) return imageUrl
  const legacy = row?.image
  if (legacy) return legacy
  return null
}

const mapProductRow = (p) => ({
  id: p.productID,
  sid: p.product_sid ?? null,
  name: p.productName,
  price: p.price,
  status: p.status,
  type: normalizeProductType(p.type),
  imagePath: p.image_path ?? null,
  image: buildProductImageUrl(p),
  description: p.description ?? '',
  isBestSeller: Boolean(p.is_best_seller),
})

// ─── READ ────────────────────────────────────────────────────────────────────

export async function fetchProducts() {
  const preferredSelect =
    'product_sid, productID, productName, price, status, type, image_path, image_url, image, description, is_best_seller'

  let { data, error } = await supabase
    .from('products')
    .select(preferredSelect)
    .eq('is_current', true)
    .order('productID', { ascending: true })

  if (error) {
    // Backward-compatible fallback for older DB schemas.
    const fb = await supabase
      .from('products')
      .select('*')
      .eq('is_current', true)
      .order('productID', { ascending: true })
    data = fb.data
    error = fb.error
  }

  if (error) throw error
  return (data ?? []).map(mapProductRow)
}

export async function fetchPreviousPrices() {
  const { data } = await supabase
    .from('products')
    .select('productID, price, created_at')
    .eq('is_current', false)
    .order('created_at', { ascending: false })

  if (!data) return {}
  const prevMap = {}
  for (const row of data) {
    if (!prevMap[row.productID]) prevMap[row.productID] = row.price
  }
  return prevMap
}

// ─── CREATE ──────────────────────────────────────────────────────────────────

/**
 * @param {string} userRole - current user's role
 * @param {object} raw - raw form values (name, price, status, type, description, isBestSeller)
 * @param {File|null} imageFile - optional image file to upload
 */
export async function createProduct(userRole, raw, imageFile = null) {
  guardAdmin(userRole)
  const dto = new CreateProductDTO(raw)
  guardDto(dto)

  // Server-side duplicate check (case-insensitive and case-sensitive).
  const { data: existingEq } = await supabase
    .from('products')
    .select('productID')
    .eq('productName', dto.name)
    .eq('is_current', true)
    .limit(1)
  if (existingEq?.length) throw new Error('Product already exists in the menu.')

  const { data: existingI } = await supabase
    .from('products')
    .select('productID')
    .ilike('productName', dto.name)
    .eq('is_current', true)
    .limit(1)
  if (existingI?.length) throw new Error('Product already exists in the menu.')

  const { data: created, error } = await supabase
    .from('products')
    .insert([{
      productName: dto.name,
      price: dto.price,
      status: dto.status,
      type: dto.type,
      is_current: true,
      description: dto.description,
      is_best_seller: dto.isBestSeller,
    }])
    .select('productID')
    .single()

  if (error) throw error

  const createdId = created?.productID
  if (createdId == null) throw new Error('Insert succeeded but no productID was returned')

  if (imageFile) {
    const uploaded = await uploadProductImage({ file: imageFile, productId: createdId })
    const { error: imgError } = await supabase
      .from('products')
      .update({ image_path: uploaded.path })
      .eq('productID', createdId)
      .eq('is_current', true)
    if (imgError) throw imgError
  }

  return createdId
}

// ─── UPDATE ──────────────────────────────────────────────────────────────────

/**
 * @param {string} userRole - current user's role
 * @param {number} productId
 * @param {object} raw - raw form values
 * @param {File|null} imageFile - optional new image file
 */
export async function updateProduct(userRole, productId, raw, imageFile = null) {
  guardAdmin(userRole)
  const id = Number(productId)
  if (!Number.isFinite(id) || id <= 0) throw new Error('updateProduct: productId must be a positive number')

  const dto = new UpdateProductDTO(raw)
  guardDto(dto)

  // Prevent name collision with a different product.
  const { data: conflict } = await supabase
    .from('products')
    .select('productID')
    .ilike('productName', dto.name)
    .neq('productID', id)
    .eq('is_current', true)
    .limit(1)
  if (conflict?.length) throw new Error('Another product with the same name already exists in the menu.')

  const { error: updateError } = await supabase
    .from('products')
    .update({
      productName: dto.name,
      price: dto.price,
      status: dto.status,
      type: dto.type,
      image_path: dto.imagePath,
      description: dto.description,
      is_best_seller: dto.isBestSeller,
    })
    .eq('productID', id)
    .eq('is_current', true)

  if (updateError) throw updateError

  if (imageFile) {
    const uploaded = await uploadProductImage({ file: imageFile, productId: id })
    const { error: imgError } = await supabase
      .from('products')
      .update({ image_path: uploaded.path })
      .eq('productID', id)
      .eq('is_current', true)
    if (imgError) throw imgError
  }
}

// ─── UPDATE STATUS ───────────────────────────────────────────────────────────

/**
 * @param {string} userRole
 * @param {number} productId
 * @param {string} status - 'AVAILABLE' | 'UNAVAILABLE'
 */
export async function updateProductStatus(userRole, productId, status) {
  guardAdmin(userRole)
  const id = Number(productId)
  if (!Number.isFinite(id) || id <= 0) throw new Error('updateProductStatus: productId must be a positive number')

  const dto = new UpdateProductStatusDTO({ status })
  guardDto(dto)

  const { error } = await supabase
    .from('products')
    .update({ status: dto.status })
    .eq('productID', id)
    .eq('is_current', true)

  if (error) throw error
}

// ─── DELETE (soft) ───────────────────────────────────────────────────────────

/**
 * Soft-delete: marks is_current = false so history is preserved.
 * @param {string} userRole
 * @param {number} productId
 */
export async function deleteProduct(userRole, productId) {
  guardAdmin(userRole)
  const id = Number(productId)
  if (!Number.isFinite(id) || id <= 0) throw new Error('deleteProduct: productId must be a positive number')

  const { error } = await supabase
    .from('products')
    .update({ is_current: false })
    .eq('productID', id)

  if (error) throw error
}
