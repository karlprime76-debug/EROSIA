'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trash2, ShoppingBag } from 'lucide-react'
import { getCart, removeFromCart, clearCart, cartTotal, type CartItem } from '@/lib/cart-storage'

const fmt = (n: number) => n.toLocaleString('fr-FR')

export default function CartPage() {
  const router = useRouter()
  const [cart, setCartState] = useState<CartItem[]>([])

  useEffect(() => {
    const timer = setTimeout(() => setCartState(getCart()), 0)
    const handler = () => setCartState(getCart())
    window.addEventListener('cart-updated', handler)
    return () => { clearTimeout(timer); window.removeEventListener('cart-updated', handler) }
  }, [])

  const total = cartTotal(cart)

  return (
    <div className="bg-transparent flex-1 flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button type="button" onClick={() => router.push('/gifts')} aria-label="Retour" className="p-1"><ArrowLeft size={22} /></button>
        <h2 className="text-2xl font-bold">Mon panier</h2>
        {cart.length > 0 && (
          <button type="button" onClick={() => { clearCart(); setCartState([]) }} className="ml-auto text-sm text-secondary flex items-center gap-1">
            <Trash2 size={14} /> Vider
          </button>
        )}
      </header>
      <div className="flex-1 px-4 pb-8 overflow-y-auto space-y-4">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)]/10 to-transparent mx-auto mb-4 flex items-center justify-center border border-[var(--primary)]/10">
              <ShoppingBag size={24} className="opacity-40 text-secondary" />
            </div>
            <p className="text-sm text-secondary">Ton panier est vide.</p>
            <button type="button" onClick={() => router.push('/gifts')} className="mt-4 px-6 py-2.5 rounded-full text-sm font-semibold text-on-primary" style={{ background: 'var(--primary)' }}>
              Découvrir les cadeaux
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {cart.map(g => (
                <div key={g.id} className="glass-card rounded-xl px-4 py-3 flex items-center gap-3">
                  <span className="text-2xl">{g.emoji || '🎁'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{g.name}</p>
                    <p className="text-xs text-primary font-bold">{fmt(Math.round(g.price_cents * 655.957 / 100))} F</p>
                  </div>
                  <button type="button" onClick={() => { removeFromCart(g.id); setCartState(getCart()) }} aria-label="Retirer du panier" className="p-2 rounded-full hover:bg-[var(--surfaceElevated)] transition">
                    <Trash2 size={16} className="text-secondary" />
                  </button>
                </div>
              ))}
            </div>
            <div className="glass-card rounded-xl p-4 flex items-center justify-between">
              <span className="text-sm font-semibold">Total</span>
              <span className="text-xl font-black text-primary">{fmt(total)} F</span>
            </div>
            <button type="button" onClick={() => router.push('/gifts/checkout')}
              className="w-full py-3.5 rounded-full font-semibold text-on-primary transition-all active:scale-95 shadow-lg"
              style={{ background: 'linear-gradient(135deg, var(--primary), #FF6B35)' }}>
              Commander ({fmt(total)} F)
            </button>
          </>
        )}
      </div>
    </div>
  )
}
