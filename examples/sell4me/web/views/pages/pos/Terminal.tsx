/**
 * The POS terminal — a full-screen two-panel layout.
 *
 * LEFT PANEL  (flex-1)  — product grid + search
 *   · Search bar at top, debounced, hits /pos/search
 *   · Scrollable product grid below — one card per variant
 *   · Tap a card to add it to the cart
 *
 * RIGHT PANEL (fixed 380px) — cart + charge
 *   · Customer lookup (optional)
 *   · Line items with quantity +/- and remove
 *   · Discount dropdown — the store's order-scoped discounts
 *   · Totals summary
 *   · "Charge" button → Payment modal
 *
 * Payment modal
 *   · Cash tab — enter amount tendered, shows change due
 *   · Card tab  — initiates Paystack, opens popup / redirect
 *
 * Receipt modal — shown after a successful cash payment
 *
 * Session bar — thin strip at the top of the right panel showing the open
 *   session (if any), with an "Open session" / "Close session" affordance.
 */

import { Head, router } from '@inertiajs/react'
import { useEffect, useRef, useState } from 'react'
import { cx, money, useDebounced } from '@/js/hooks'
import type { Money } from '@/js/types'
import {
  IconClose,
  IconCustomers,
  IconOrders,
  IconPlus,
  IconSearch,
  IconTag,
  IconTrash,
} from '@/views/ui/icons'
import { Button, Select } from '@/views/ui/kit'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Variant = {
  id: number
  product_id: number
  product_title: string
  variant_title: string | null
  sku: string | null
  barcode: string | null
  price: Money
  price_minor: number
  stock: number
  track_inventory: boolean
  image_url: string | null
}

type CartLine = {
  variant: Variant
  quantity: number
}

type CustomerResult = {
  id: number
  name: string
  email: string
  phone: string | null
}

type Session = {
  id: number
  status: string
  device_label: string | null
  opened_by: string | null
  opening_float: Money
  opened_at: string | null
}

type CompletedSale = {
  order_id: number
  order_number: number
  total_minor: number
  change_minor: number
  currency: string
}

type PosDiscount = {
  id: number
  code: string
  title: string
  kind: 'percentage' | 'fixed_amount'
  value: number
  minimum_order_minor: number
  maximum_discount_minor: number | null
}

type Props = {
  store: { name: string; currency: string; slug: string }
  device: { id: number; label: string; token: string; receipt_header: string | null; receipt_footer: string | null } | null
  open_session: Session | null
  products: Variant[]
  discounts: PosDiscount[]
  paystack_public_key: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMinor(minor: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(minor / 100)
}

function readXsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : ''
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProductCard({ variant, onAdd }: { variant: Variant; onAdd: () => void }) {
  const outOfStock = variant.track_inventory && variant.stock <= 0
  return (
    <button
      type="button"
      disabled={outOfStock}
      onClick={onAdd}
      className={cx(
        'group flex flex-col overflow-hidden rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-surface)] text-left transition',
        'hover:border-[var(--color-accent)] hover:shadow-sm',
        outOfStock && 'cursor-not-allowed opacity-40',
      )}
    >
      {/* Image */}
      <div className="relative aspect-square w-full overflow-hidden bg-[var(--color-canvas)]">
        {variant.image_url ? (
          <img
            src={variant.image_url}
            alt={variant.product_title}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[var(--color-ink-faint)]">
            <IconOrders className="h-8 w-8 opacity-30" />
          </div>
        )}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
              Out of stock
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-0.5 p-2.5">
        <p className="line-clamp-2 text-[12.5px] font-medium leading-tight text-[var(--color-ink)]">
          {variant.product_title}
        </p>
        {variant.variant_title && variant.variant_title !== 'Default' && (
          <p className="text-[11px] text-[var(--color-ink-faint)]">{variant.variant_title}</p>
        )}
        <p className="mt-auto pt-1.5 text-[13px] font-semibold text-[var(--color-ink)]">
          {money(variant.price)}
        </p>
      </div>
    </button>
  )
}

function CartItem({
  line,
  currency,
  onChange,
  onRemove,
}: {
  line: CartLine
  currency: string
  onChange: (qty: number) => void
  onRemove: () => void
}) {
  const lineTotal = line.variant.price_minor * line.quantity
  return (
    <div className="flex items-center gap-3 py-2.5">
      {/* Thumb */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-sm)] bg-[var(--color-canvas)]">
        {line.variant.image_url ? (
          <img src={line.variant.image_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <IconOrders className="h-5 w-5 text-[var(--color-ink-faint)]" />
        )}
      </div>

      {/* Title */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-[var(--color-ink)]">
          {line.variant.product_title}
        </p>
        {line.variant.variant_title && line.variant.variant_title !== 'Default' && (
          <p className="text-[11.5px] text-[var(--color-ink-faint)]">{line.variant.variant_title}</p>
        )}
      </div>

      {/* Qty stepper */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(line.quantity - 1)}
          className="flex h-6 w-6 items-center justify-center rounded border border-[var(--color-line)] text-[var(--color-ink-soft)] transition hover:bg-[var(--color-sunken)]"
        >
          <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M2 6h8" strokeLinecap="round" />
          </svg>
        </button>
        <span className="w-6 text-center text-[13px] font-medium">{line.quantity}</span>
        <button
          type="button"
          onClick={() => onChange(line.quantity + 1)}
          className="flex h-6 w-6 items-center justify-center rounded border border-[var(--color-line)] text-[var(--color-ink-soft)] transition hover:bg-[var(--color-sunken)]"
        >
          <IconPlus className="h-3 w-3" />
        </button>
      </div>

      {/* Line total */}
      <span className="w-20 text-right text-[13px] font-medium text-[var(--color-ink)]">
        {formatMinor(lineTotal, currency)}
      </span>

      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        className="rounded p-1 text-[var(--color-ink-faint)] transition hover:text-[var(--color-critical)]"
      >
        <IconTrash className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Receipt modal
// ---------------------------------------------------------------------------

function ReceiptModal({
  sale,
  currency,
  device,
  onClose,
}: {
  sale: CompletedSale
  currency: string
  device: Props['device']
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-2xl">
        <div className="p-6 text-center">
          {/* Tick */}
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <h2 className="text-[18px] font-bold text-[var(--color-ink)]">Sale complete</h2>
          <p className="mt-1 text-[13px] text-[var(--color-ink-soft)]">
            Order #{sale.order_number}
          </p>

          {device?.receipt_header && (
            <p className="mt-3 text-[12px] text-[var(--color-ink-soft)]">{device.receipt_header}</p>
          )}

          <div className="mt-4 space-y-1 rounded-[var(--radius)] bg-[var(--color-canvas)] p-4 text-left">
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--color-ink-soft)]">Total</span>
              <span className="font-semibold text-[var(--color-ink)]">
                {formatMinor(sale.total_minor, currency)}
              </span>
            </div>
            {sale.change_minor > 0 && (
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--color-ink-soft)]">Change due</span>
                <span className="font-bold text-emerald-600">
                  {formatMinor(sale.change_minor, currency)}
                </span>
              </div>
            )}
          </div>

          {device?.receipt_footer && (
            <p className="mt-3 text-[12px] text-[var(--color-ink-soft)]">{device.receipt_footer}</p>
          )}
        </div>

        <div className="border-t border-[var(--color-line)] p-4 flex gap-2">
          <Button
            className="flex-1"
            onClick={() => router.visit(`/orders/${sale.order_id}`)}
          >
            View order
          </Button>
          <Button
            tone="primary"
            className="flex-1"
            onClick={onClose}
          >
            New sale
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Payment modal
// ---------------------------------------------------------------------------

function PaymentModal({
  lines,
  discountMinor,
  sessionId,
  customerId,
  customerEmail,
  note,
  currency,
  paystackPublicKey,
  onSuccess,
  onClose,
}: {
  lines: CartLine[]
  discountMinor: number
  sessionId: number | null
  customerId: number | null
  customerEmail: string
  note: string
  currency: string
  paystackPublicKey: string | null
  onSuccess: (sale: CompletedSale) => void
  onClose: () => void
}) {
  const subtotal = lines.reduce((s, l) => s + l.variant.price_minor * l.quantity, 0)
  const total = Math.max(0, subtotal - discountMinor)

  const [tab, setTab] = useState<'cash' | 'card'>('cash')
  const [tendered, setTendered] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const tenderedMinor = Math.round(parseFloat(tendered || '0') * 100)
  const changeMinor = Math.max(0, tenderedMinor - total)
  const tenderedOk = tenderedMinor >= total

  const csrfToken = readXsrfToken()

  async function submitSale(paymentMethod: 'cash' | 'card') {
    setSubmitting(true)
    setError('')
    try {
      const body = {
        items: lines.map((l) => ({ variant_id: l.variant.id, quantity: l.quantity })),
        payment_method: paymentMethod,
        amount_tendered: paymentMethod === 'cash' ? tenderedMinor : total,
        customer_id: customerId ?? null,
        customer_email: customerEmail || null,
        discount_minor: discountMinor,
        note: note || null,
        session_id: sessionId ?? null,
      }
      const res = await fetch('/pos/sale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Inertia': 'true',
          'X-XSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || 'Something went wrong.')
        return
      }
      onSuccess(data as CompletedSale)
    } catch (e) {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function startCardPayment() {
    // First create the order, then redirect to Paystack.
    setSubmitting(true)
    setError('')
    try {
      // Create order without payment method set to card — server won't record a payment.
      const orderRes = await fetch('/pos/sale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Inertia': 'true',
          'X-XSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify({
          items: lines.map((l) => ({ variant_id: l.variant.id, quantity: l.quantity })),
          payment_method: 'card',
          customer_id: customerId ?? null,
          customer_email: customerEmail || null,
          discount_minor: discountMinor,
          note: note || null,
          session_id: sessionId ?? null,
        }),
      })
      const orderData = await orderRes.json()
      if (!orderRes.ok || orderData.error) {
        setError(orderData.error || 'Could not create order.')
        return
      }
      // Now initiate card payment.
      const cardRes = await fetch('/pos/sale/card/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Inertia': 'true',
          'X-XSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify({ order_id: orderData.order_id }),
      })
      const cardData = await cardRes.json()
      if (!cardRes.ok || cardData.error) {
        setError(cardData.error || 'Could not start card payment.')
        return
      }
      // Open Paystack in the current tab (POS is already full-screen).
      window.location.href = cardData.authorization_url
    } catch (e) {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-4">
          <h2 className="text-[16px] font-semibold text-[var(--color-ink)]">
            Charge {formatMinor(total, currency)}
          </h2>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-[var(--color-sunken)]">
            <IconClose className="h-4 w-4 text-[var(--color-ink-soft)]" />
          </button>
        </div>

        {/* Tab strip */}
        <div className="flex border-b border-[var(--color-line)]">
          {(['cash', 'card'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              disabled={t === 'card' && !paystackPublicKey}
              className={cx(
                'flex-1 py-3 text-[13.5px] font-medium capitalize transition-colors',
                tab === t
                  ? 'border-b-2 border-brand text-brand'
                  : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]',
                t === 'card' && !paystackPublicKey && 'cursor-not-allowed opacity-40',
              )}
            >
              {t === 'cash' ? '💵 Cash' : '💳 Card'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-5">
          {tab === 'cash' ? (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[12.5px] font-medium text-[var(--color-ink-soft)]">
                  Amount tendered
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] font-medium text-[var(--color-ink-soft)]">
                    {currency}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    autoFocus
                    value={tendered}
                    onChange={(e) => setTendered(e.target.value)}
                    placeholder={(total / 100).toFixed(2)}
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-canvas)] py-2.5 pl-12 pr-4 text-[16px] font-semibold text-[var(--color-ink)] focus:border-brand focus:outline-none"
                  />
                </div>
              </div>

              {/* Quick amounts */}
              <div className="grid grid-cols-4 gap-1.5">
                {[total, ...([500, 1000, 2000, 5000].map(v => v * 100))
                  .filter(v => v > total)
                  .slice(0, 3)
                ].map((amt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setTendered((amt / 100).toFixed(2))}
                    className={cx(
                      'rounded-[var(--radius-sm)] border px-2 py-2 text-[12px] font-medium transition',
                      tenderedMinor === amt
                        ? 'border-brand bg-brand-soft text-brand'
                        : 'border-[var(--color-line)] text-[var(--color-ink-soft)] hover:bg-[var(--color-sunken)]',
                    )}
                  >
                    {i === 0 ? 'Exact' : formatMinor(amt, currency)}
                  </button>
                ))}
              </div>

              {/* Change due */}
              {tenderedMinor > 0 && (
                <div className={cx(
                  'rounded-[var(--radius)] p-3.5 text-center',
                  changeMinor > 0
                    ? 'bg-emerald-50 dark:bg-emerald-900/20'
                    : tenderedOk
                    ? 'bg-[var(--color-canvas)]'
                    : 'bg-red-50 dark:bg-red-900/20',
                )}>
                  {changeMinor > 0 ? (
                    <>
                      <p className="text-[11.5px] text-[var(--color-ink-soft)]">Change due</p>
                      <p className="text-[24px] font-bold text-emerald-600">
                        {formatMinor(changeMinor, currency)}
                      </p>
                    </>
                  ) : tenderedOk ? (
                    <p className="text-[13px] font-medium text-[var(--color-ink-soft)]">Exact amount</p>
                  ) : (
                    <p className="text-[13px] font-medium text-red-600">
                      {formatMinor(total - tenderedMinor, currency)} short
                    </p>
                  )}
                </div>
              )}

              {error && <p className="text-[13px] text-[var(--color-critical)]">{error}</p>}

              <Button
                tone="primary"
                className="w-full py-3 text-[15px]"
                disabled={!tenderedOk || submitting}
                loading={submitting}
                onClick={() => submitSale('cash')}
              >
                Confirm payment
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-[13.5px] text-[var(--color-ink-soft)]">
                The customer will be redirected to Paystack to complete the payment.
                Once paid, the order will be updated automatically.
              </p>
              {error && <p className="text-[13px] text-[var(--color-critical)]">{error}</p>}
              <Button
                tone="primary"
                className="w-full py-3 text-[15px]"
                loading={submitting}
                onClick={startCardPayment}
              >
                Pay {formatMinor(total, currency)} with card
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function Terminal({
  store,
  device,
  open_session,
  products: initialProducts,
  discounts,
  paystack_public_key,
}: Props) {
  // ── Product search ─────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedQuery = useDebounced(searchQuery, 250)
  const [searchResults, setSearchResults] = useState<Variant[]>(initialProducts)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!debouncedQuery) {
      setSearchResults(initialProducts)
      return
    }
    setSearching(true)
    fetch(`/pos/search?q=${encodeURIComponent(debouncedQuery)}`, {
      headers: { 'X-Inertia': 'true' },
    })
      .then((r) => r.json())
      .then((d) => setSearchResults(d.results ?? []))
      .finally(() => setSearching(false))
  }, [debouncedQuery, initialProducts])

  // ── Cart ────────────────────────────────────────────────────────────────
  const [cart, setCart] = useState<CartLine[]>([])
  const [discountId, setDiscountId] = useState<number | null>(null)
  const [note, setNote] = useState('')

  function addToCart(variant: Variant) {
    setCart((prev) => {
      const existing = prev.find((l) => l.variant.id === variant.id)
      if (existing) {
        return prev.map((l) =>
          l.variant.id === variant.id ? { ...l, quantity: l.quantity + 1 } : l,
        )
      }
      return [...prev, { variant, quantity: 1 }]
    })
  }

  function setQty(variantId: number, qty: number) {
    if (qty <= 0) {
      setCart((prev) => prev.filter((l) => l.variant.id !== variantId))
    } else {
      setCart((prev) =>
        prev.map((l) => (l.variant.id === variantId ? { ...l, quantity: qty } : l)),
      )
    }
  }

  function clearCart() {
    setCart([])
    setDiscountId(null)
    setNote('')
    setCustomer(null)
    setCustomerQuery('')
  }

  function discountAmount(subtotal: number, discount: PosDiscount | null): number {
    if (!discount || subtotal <= 0 || subtotal < discount.minimum_order_minor) return 0
    let amount = 0
    if (discount.kind === 'percentage') {
      amount = Math.round((subtotal * discount.value) / 100)
      if (discount.maximum_discount_minor != null) {
        amount = Math.min(amount, discount.maximum_discount_minor)
      }
    } else {
      amount = discount.value
    }
    return Math.min(subtotal, Math.max(0, amount))
  }

  const subtotal = cart.reduce((s, l) => s + l.variant.price_minor * l.quantity, 0)
  const selectedDiscount = discounts.find((d) => d.id === discountId) ?? null
  const discountMinor = discountAmount(subtotal, selectedDiscount)
  const total = subtotal - discountMinor

  // ── Customer lookup ─────────────────────────────────────────────────────
  const [customerQuery, setCustomerQuery] = useState('')
  const debouncedCustomer = useDebounced(customerQuery, 300)
  const [customerResults, setCustomerResults] = useState<CustomerResult[]>([])
  const [customer, setCustomer] = useState<CustomerResult | null>(null)
  const [customerOpen, setCustomerOpen] = useState(false)

  useEffect(() => {
    if (debouncedCustomer.length < 2) { setCustomerResults([]); return }
    fetch(`/pos/customer-search?q=${encodeURIComponent(debouncedCustomer)}`, {
      headers: { 'X-Inertia': 'true' },
    })
      .then((r) => r.json())
      .then((d) => setCustomerResults(d.results ?? []))
  }, [debouncedCustomer])

  // ── Modals ──────────────────────────────────────────────────────────────
  const [showPayment, setShowPayment] = useState(false)
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null)

  function onSaleComplete(sale: CompletedSale) {
    setShowPayment(false)
    setCompletedSale(sale)
  }

  function onReceiptClose() {
    setCompletedSale(null)
    clearCart()
  }

  // ── Keyboard: Escape clears search ─────────────────────────────────────
  const searchRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setSearchQuery(''); searchRef.current?.blur() }
      if (e.key === 'f' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); searchRef.current?.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── Session bar label ───────────────────────────────────────────────────
  const sessionLabel = open_session
    ? `Session open · ${open_session.device_label ?? 'No device'}`
    : 'No open session'

  return (
    <>
      <Head title="POS Terminal" />

      <div className="flex h-full overflow-hidden">
        {/* ── LEFT: product panel ──────────────────────────────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden border-r border-[var(--color-line)]">
          {/* Search bar */}
          <div className="border-b border-[var(--color-line)] px-4 py-3">
            <div className="relative">
              <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-ink-faint)]" />
              <input
                ref={searchRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, SKU, barcode… (⌘F)"
                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-canvas)] py-2.5 pl-10 pr-4 text-[13.5px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-brand focus:outline-none"
              />
              {searching && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[var(--color-ink-faint)]">
                  …
                </span>
              )}
            </div>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {searchResults.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-[var(--color-ink-faint)]">
                <IconOrders className="h-10 w-10 opacity-20" />
                <p className="text-[13px]">No products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {searchResults.map((v) => (
                  <ProductCard key={v.id} variant={v} onAdd={() => addToCart(v)} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: cart panel ────────────────────────────────────────── */}
        <div className="flex w-[380px] shrink-0 flex-col bg-[var(--color-surface)]">
          {/* Session status strip */}
          <div
            className={cx(
              'flex items-center justify-between border-b border-[var(--color-line)] px-4 py-2',
              open_session ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'bg-[var(--color-canvas)]',
            )}
          >
            <span className={cx(
              'text-[11.5px] font-medium',
              open_session ? 'text-emerald-700 dark:text-emerald-400' : 'text-[var(--color-ink-faint)]',
            )}>
              {sessionLabel}
            </span>
            {!open_session && (
              <button
                type="button"
                onClick={() => router.visit('/pos/sessions')}
                className="text-[11.5px] font-medium text-brand hover:underline"
              >
                Open session →
              </button>
            )}
            {open_session && (
              <button
                type="button"
                onClick={() => router.visit('/pos/sessions')}
                className="text-[11.5px] text-[var(--color-ink-soft)] hover:underline"
              >
                Manage
              </button>
            )}
          </div>

          {/* Customer */}
          <div className="border-b border-[var(--color-line)] px-4 py-3">
            {customer ? (
              <div className="flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-canvas)] px-3 py-2">
                <IconCustomers className="h-4 w-4 shrink-0 text-[var(--color-ink-soft)]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-[var(--color-ink)]">{customer.name}</p>
                  <p className="truncate text-[11.5px] text-[var(--color-ink-faint)]">{customer.email}</p>
                </div>
                <button type="button" onClick={() => setCustomer(null)} className="rounded p-1 hover:bg-[var(--color-sunken)]">
                  <IconClose className="h-3.5 w-3.5 text-[var(--color-ink-faint)]" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <IconCustomers className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-ink-faint)]" />
                <input
                  type="text"
                  value={customerQuery}
                  onChange={(e) => { setCustomerQuery(e.target.value); setCustomerOpen(true) }}
                  onFocus={() => setCustomerOpen(true)}
                  onBlur={() => setTimeout(() => setCustomerOpen(false), 150)}
                  placeholder="Customer (optional)"
                  className="w-full rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-canvas)] py-2 pl-9 pr-3 text-[13px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-brand focus:outline-none"
                />
                {customerOpen && customerResults.length > 0 && (
                  <div className="absolute top-full z-20 mt-1 w-full rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-lg">
                    {customerResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={() => { setCustomer(c); setCustomerQuery(''); setCustomerOpen(false) }}
                        className="flex w-full flex-col px-3 py-2 text-left hover:bg-[var(--color-sunken)]"
                      >
                        <span className="text-[13px] font-medium text-[var(--color-ink)]">{c.name}</span>
                        <span className="text-[11.5px] text-[var(--color-ink-faint)]">{c.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-[var(--color-ink-faint)]">
                <IconTag className="h-10 w-10 opacity-20" />
                <p className="text-[13px]">Tap a product to add it</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--color-line-soft)] px-4">
                {cart.map((line) => (
                  <CartItem
                    key={line.variant.id}
                    line={line}
                    currency={store.currency}
                    onChange={(qty) => setQty(line.variant.id, qty)}
                    onRemove={() => setQty(line.variant.id, 0)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Totals + actions */}
          <div className="border-t border-[var(--color-line)] p-4">
            {/* Discount */}
            {cart.length > 0 && discounts.length > 0 && (
              <div className="mb-3 flex items-center gap-2">
                <IconTag className="h-4 w-4 shrink-0 text-[var(--color-ink-faint)]" />
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-[var(--color-ink-faint)]">
                    Discount
                  </span>
                  <Select
                    value={discountId ?? ''}
                    onChange={(e) =>
                      setDiscountId(e.target.value ? Number(e.target.value) : null)
                    }
                    className="w-full py-2 pl-20 pr-9 text-[13px]"
                  >
                    <option value="">No discount</option>
                    {discounts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title} ·{' '}
                        {d.kind === 'percentage'
                          ? `${d.value}% off`
                          : `${formatMinor(d.value, store.currency)} off`}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            )}

            {/* Note */}
            {cart.length > 0 && (
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Order note (optional)"
                className="mb-3 w-full rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-canvas)] px-3 py-2 text-[13px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-brand focus:outline-none"
              />
            )}

            {/* Summary */}
            <div className="mb-3 space-y-1">
              {discountMinor > 0 && (
                <>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-[var(--color-ink-soft)]">Subtotal</span>
                    <span>{formatMinor(subtotal, store.currency)}</span>
                  </div>
                  <div className="flex justify-between text-[13px] text-emerald-600">
                    <span>Discount</span>
                    <span>−{formatMinor(discountMinor, store.currency)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span className="text-[15px] font-bold text-[var(--color-ink)]">Total</span>
                <span className="text-[17px] font-bold text-[var(--color-ink)]">
                  {formatMinor(total, store.currency)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="rounded-[var(--radius-sm)] border border-[var(--color-line)] px-3 py-2.5 text-[13px] text-[var(--color-ink-soft)] transition hover:bg-[var(--color-sunken)]"
                >
                  Clear
                </button>
              )}
              <Button
                tone="primary"
                className="flex-1 py-2.5 text-[15px] font-semibold"
                disabled={cart.length === 0}
                onClick={() => setShowPayment(true)}
              >
                Charge {cart.length > 0 ? formatMinor(total, store.currency) : ''}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Payment modal ──────────────────────────────────────────────── */}
      {showPayment && (
        <PaymentModal
          lines={cart}
          discountMinor={discountMinor}
          sessionId={open_session?.id ?? null}
          customerId={customer?.id ?? null}
          customerEmail={customer?.email ?? ''}
          note={note}
          currency={store.currency}
          paystackPublicKey={paystack_public_key}
          onSuccess={onSaleComplete}
          onClose={() => setShowPayment(false)}
        />
      )}

      {/* ── Receipt modal ──────────────────────────────────────────────── */}
      {completedSale && (
        <ReceiptModal
          sale={completedSale}
          currency={store.currency}
          device={device}
          onClose={onReceiptClose}
        />
      )}
    </>
  )
}
