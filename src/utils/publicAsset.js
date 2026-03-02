export const publicAsset = (path) => {
  const cleaned = String(path || '').replace(/^\/+/, '')
  return `${import.meta.env.BASE_URL}${cleaned}`
}

export const ADD_PRODUCT_BUTTON_ICON = publicAsset('add_product_button.png')
