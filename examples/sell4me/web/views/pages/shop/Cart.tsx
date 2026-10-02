import { Head, Link, router } from '@inertiajs/react'
import { useState } from 'react'
import { useShared } from '@/js/hooks'
import { Container, PageTitle, Price, ShopButton } from '@/views/ui/shop'
import type { Money } from '@/js/types'

type Line = {
  id: number
  variant_id: number
  product_id: number
  product_slug: string
  title: string
  variant_title: string | null
  sku: string | null
  image_url: string | null
  quantity: number
  available: number
  unit_price: Money
  line_total: Money
}

type Props = {
  cart: {
    items: Line[]
    item_count: number
    subtotal: Money
    discount: Money
    shipping: Money
    total: Money
    discount_code: string | null
    discount_state: { ok: boolean; reason: string | null } | null
    free_shipping: boolean
  }
  theme: { store: { name: string } }
}

export default function Cart({ cart, theme }: Props) {
  const { errors } = useShared()
  const [code, setCode] = useState(cart.discount_code ?? '')

  if (cart.items.length === 0) {
    return (
      <>
        <Head title={`Basket · ${theme.store.name}`} />
        <Container className="py-24 text-center">
          <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Your basket is empty</h1>
          <p className="mt-2 text-[15px]" style={{ color: 'var(--shop-muted)' }}>
            Nothing here yet.
          </p>
          <ShopButton href="/products" className="mt-7">Start shopping</ShopButton>
        </Container>
      </>
    )
  }

  return (
    <>
      <Head title={`Basket · ${theme.store.name}`} />
      <PageTitle description={`${cart.item_count} ${cart.item_count === 1 ? 'item' : 'items'}`}>
        Your basket
      </PageTitle>

      <Container className="py-10">
        <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
          <div className="divide-y" style={{ borderColor: 'var(--shop-line)' }}>
            {cart.items.map((line) => (
              <div key={line.id} className="flex gap-4 py-5 first:pt-0">
                <Link href={`/products/${line.product_slug}`}
                  className="h-24 w-20 shrink-0 overflow-hidden"
                  style={{ background: 'var(--shop-surface)', borderRadius: 'var(--shop-radius)' }}>
                  {line.image_url && (
                    <img src={line.image_url} alt="" className="h-full w-full object-cover" />
                  )}
                </Link>

                <div className="min-w-0 flex-1">
                  <Link href={`/products/${line.product_slug}`}
                    className="text-[15px] font-medium hover:opacity-70">
                    {line.title}
                  </Link>
                  {line.variant_title && (
                    <p className="text-[13px]" style={{ color: 'var(--shop-muted)' }}>
                      {line.variant_title}
                    </p>
                  )}
                  <p className="mt-0.5 text-[13px]" style={{ color: 'var(--shop-muted)' }}>
                    {line.unit_price.formatted} each
                  </p>

                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex items-center border" style={{
                      borderColor: 'var(--shop-line)', borderRadius: 'var(--shop-radius)',
                    }}>
                      <button type="button" aria-label="Decrease quantity"
                        onClick={() => router.post('/cart/update',
                          { item_id: line.id, quantity: line.quantity - 1 }, { preserveScroll: true })}
                        className="px-2.5 py-1.5 text-[15px] hover:opacity-60">−</button>
                      <span className="w-8 text-center text-[13px] tabular">{line.quantity}</span>
                      <button type="button" aria-label="Increase quantity"
                        disabled={line.quantity >= line.available}
                        onClick={() => router.post('/cart/update',
                          { item_id: line.id, quantity: line.quantity + 1 }, { preserveScroll: true })}
                        className="px-2.5 py-1.5 text-[15px] hover:opacity-60 disabled:opacity-30">+</button>
                    </div>

                    <button type="button"
                      onClick={() => router.post('/cart/update',
                        { item_id: line.id, quantity: 0 }, { preserveScroll: true })}
                      className="text-[13px] underline underline-offset-2 hover:opacity-60"
                      style={{ color: 'var(--shop-muted)' }}>
                      Remove
                    </button>
                  </div>
                </div>

                <p className="shrink-0 text-[15px] font-medium tabular">{line.line_total.formatted}</p>
              </div>
            ))}
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="border p-5" style={{
              borderColor: 'var(--shop-line)', background: 'var(--shop-surface)',
              borderRadius: 'var(--shop-radius)',
            }}>
              <h2 className="text-[16px] font-semibold">Summary</h2>

              <div className="mt-4 space-y-2 text-[14px]">
                <Row label="Subtotal" value={cart.subtotal.formatted} />
                {cart.discount.minor > 0 && (
                  <Row label={`Discount${cart.discount_code ? ` (${cart.discount_code})` : ''}`}
                    value={`−${cart.discount.formatted}`} accent />
                )}
                <Row
                  label="Shipping"
                  value={cart.free_shipping ? 'Free' : cart.shipping.minor > 0 ? cart.shipping.formatted : 'At checkout'}
                />
              </div>

              <div className="mt-4 flex items-baseline justify-between border-t pt-4"
                style={{ borderColor: 'var(--shop-line)' }}>
                <span className="text-[15px] font-medium">Total</span>
                <Price price={cart.total} className="text-[19px] font-semibold" />
              </div>

              <ShopButton href="/checkout" className="mt-5 w-full">Checkout</ShopButton>

              <form
                className="mt-5 border-t pt-5"
                style={{ borderColor: 'var(--shop-line)' }}
                onSubmit={(event) => {
                  event.preventDefault()
                  router.post('/cart/discount', { code }, { preserveScroll: true })
                }}
              >
                <label className="block text-[13px] font-medium">Discount code</label>
                <div className="mt-1.5 flex gap-2">
                  <input value={code} onChange={(event) => setCode(event.target.value)}
                    placeholder="Enter a code"
                    className="min-w-0 flex-1 border px-3 py-2 text-[14px] outline-none"
                    style={{
                      background: 'var(--shop-bg)', color: 'var(--shop-text)',
                      borderColor: 'var(--shop-line)', borderRadius: 'var(--shop-radius)',
                    }} />
                  <ShopButton type="submit" variant="outline">Apply</ShopButton>
                </div>
                {errors.code && (
                  <p className="mt-1.5 text-[13px]" style={{ color: 'var(--shop-accent)' }}>
                    {errors.code}
                  </p>
                )}
                {cart.discount_code && cart.discount_state?.ok && (
                  <button type="button"
                    onClick={() => { setCode(''); router.post('/cart/discount', { code: '' }, { preserveScroll: true }) }}
                    className="mt-1.5 text-[13px] underline underline-offset-2"
                    style={{ color: 'var(--shop-muted)' }}>
                    Remove {cart.discount_code}
                  </button>
                )}
              </form>
            </div>

            <Link href="/products"
              className="mt-4 block text-center text-[14px] underline underline-offset-2 hover:opacity-60"
              style={{ color: 'var(--shop-muted)' }}>
              Continue shopping
            </Link>
          </div>
        </div>
      </Container>
    </>
  )
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <span style={{ color: 'var(--shop-muted)' }}>{label}</span>
      <span className="tabular" style={accent ? { color: 'var(--shop-accent)' } : undefined}>
        {value}
      </span>
    </div>
  )
}
