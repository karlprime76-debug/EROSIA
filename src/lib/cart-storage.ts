export interface CartItem {
  id: string; name: string; emoji: string; price_cents: number
}

const CART_KEY = 'erosia_cart'

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(CART_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function setCart(items: CartItem[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(CART_KEY, JSON.stringify(items))
  window.dispatchEvent(new Event('cart-updated'))
}

export function addToCart(item: CartItem) {
  const cart = getCart()
  if (cart.some(c => c.id === item.id)) return
  setCart([...cart, item])
}

export function removeFromCart(id: string) {
  setCart(getCart().filter(c => c.id !== id))
}

export function clearCart() {
  setCart([])
}

export function cartTotal(cart: CartItem[]) {
  const EUR_TO_XOF = 655.957
  return cart.reduce((sum, g) => sum + Math.round(g.price_cents * EUR_TO_XOF / 100), 0)
}
