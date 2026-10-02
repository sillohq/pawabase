import { Head, router } from '@inertiajs/react'
import { useState } from 'react'
import { useShared } from '@/js/hooks'
import { Container, ShopButton } from '@/views/ui/shop'
import type { Money } from '@/js/types'

type ShippingOption = {
  id: number | null
  name: string
  description: string | null
  price: Money
  price_minor: number
  delivery_estimate: string | null
}

type Props = {
  cart: {
    items: { id: number; title: string; variant_title: string | null; quantity: number; image_url: string | null; line_total: Money }[]
    subtotal: Money
    discount: Money
    shipping: Money
    total: Money
    discount_code: string | null
    free_shipping: boolean
  }
  shipping_options: ShippingOption[]
  providers: { key: string; label: string; is_default: boolean; is_test_mode: boolean }[]
  default_country: string
  theme: { store: { name: string } }
}

export default function Checkout({ cart, shipping_options, providers, default_country, theme }: Props) {
  const { errors } = useShared()
  const [submitting, setSubmitting] = useState(false)
  const [rate, setRate] = useState<number | null>(shipping_options[0]?.id ?? null)
  const [provider, setProvider] = useState(
    providers.find((entry) => entry.is_default)?.key ?? providers[0]?.key ?? '',
  )
  const [form, setForm] = useState({
    email: '', first_name: '', last_name: '', company: '',
    line1: '', line2: '', city: '', province: '', postal_code: '',
    country: default_country, phone: '', accepts_marketing: false,
  })

  function set(key: keyof typeof form, value: string | boolean) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const chosen = shipping_options.find((option) => option.id === rate)
  const shippingMinor = cart.free_shipping ? 0 : chosen?.price_minor ?? cart.shipping.minor
  const totalMinor = cart.subtotal.minor - cart.discount.minor + shippingMinor
  const currency = cart.total.currency

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    router.post('/checkout', { ...form, shipping_rate_id: rate, provider, same_billing: true },
      { onFinish: () => setSubmitting(false) })
  }

  return (
    <>
      <Head title={`Checkout · ${theme.store.name}`} />

      <Container className="py-10 sm:py-14">
        <h1 className="mb-8 text-[26px] font-semibold tracking-[-0.02em]">Checkout</h1>

        <form onSubmit={submit} className="grid gap-10 lg:grid-cols-[1fr_360px]">
          <div className="space-y-8">
            <section>
              <h2 className="mb-3 text-[16px] font-semibold">Contact</h2>
              <ShopField label="Email" error={errors.email} required>
                <ShopInput type="email" value={form.email} autoComplete="email" required
                  onChange={(value) => set('email', value)} placeholder="you@example.com" />
              </ShopField>
              <label className="mt-3 flex cursor-pointer items-start gap-2 text-[14px]">
                <input type="checkbox" checked={form.accepts_marketing} className="mt-1"
                  onChange={(event) => set('accepts_marketing', event.target.checked)} />
                <span style={{ color: 'var(--shop-muted)' }}>Email me about new products and offers</span>
              </label>
            </section>

            <section>
              <h2 className="mb-3 text-[16px] font-semibold">Delivery address</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <ShopField label="First name">
                  <ShopInput value={form.first_name} autoComplete="given-name"
                    onChange={(value) => set('first_name', value)} />
                </ShopField>
                <ShopField label="Last name">
                  <ShopInput value={form.last_name} autoComplete="family-name"
                    onChange={(value) => set('last_name', value)} />
                </ShopField>
                <ShopField label="Address" required className="sm:col-span-2">
                  <ShopInput value={form.line1} autoComplete="address-line1" required
                    onChange={(value) => set('line1', value)} />
                </ShopField>
                <ShopField label="Apartment, suite, etc." className="sm:col-span-2">
                  <ShopInput value={form.line2} autoComplete="address-line2"
                    onChange={(value) => set('line2', value)} />
                </ShopField>
                <ShopField label="City" required>
                  <ShopInput value={form.city} autoComplete="address-level2" required
                    onChange={(value) => set('city', value)} />
                </ShopField>
                <ShopField label="State or province">
                  <ShopInput value={form.province} autoComplete="address-level1"
                    onChange={(value) => set('province', value)} />
                </ShopField>
                <ShopField label="Postcode">
                  <ShopInput value={form.postal_code} autoComplete="postal-code"
                    onChange={(value) => set('postal_code', value)} />
                </ShopField>
                <ShopField label="Country">
                  <ShopInput value={form.country} autoComplete="country" maxLength={2}
                    onChange={(value) => set('country', value.toUpperCase())} />
                </ShopField>
                <ShopField label="Phone" className="sm:col-span-2">
                  <ShopInput type="tel" value={form.phone} autoComplete="tel"
                    onChange={(value) => set('phone', value)} />
                </ShopField>
              </div>
            </section>

            {shipping_options.length > 0 && (
              <section>
                <h2 className="mb-3 text-[16px] font-semibold">Delivery</h2>
                <div className="space-y-2">
                  {shipping_options.map((option) => (
                    <label key={option.id ?? 'none'}
                      className="flex cursor-pointer items-center gap-3 border p-3.5"
                      style={{
                        borderColor: rate === option.id ? 'var(--shop-primary)' : 'var(--shop-line)',
                        borderRadius: 'var(--shop-radius)',
                      }}>
                      <input type="radio" name="shipping" checked={rate === option.id}
                        onChange={() => setRate(option.id)} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-medium">{option.name}</span>
                        {option.delivery_estimate && (
                          <span className="block text-[13px]" style={{ color: 'var(--shop-muted)' }}>
                            {option.delivery_estimate}
                          </span>
                        )}
                      </span>
                      <span className="text-[14px] font-medium tabular">
                        {cart.free_shipping || option.price_minor === 0 ? 'Free' : option.price.formatted}
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            )}

            {providers.length > 1 && (
              <section>
                <h2 className="mb-3 text-[16px] font-semibold">Payment</h2>
                <div className="space-y-2">
                  {providers.map((entry) => (
                    <label key={entry.key} className="flex cursor-pointer items-center gap-3 border p-3.5"
                      style={{
                        borderColor: provider === entry.key ? 'var(--shop-primary)' : 'var(--shop-line)',
                        borderRadius: 'var(--shop-radius)',
                      }}>
                      <input type="radio" name="provider" checked={provider === entry.key}
                        onChange={() => setProvider(entry.key)} />
                      <span className="flex-1 text-[14px] font-medium">{entry.label}</span>
                      {entry.is_test_mode && (
                        <span className="text-[12px]" style={{ color: 'var(--shop-muted)' }}>test mode</span>
                      )}
                    </label>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="border p-5" style={{
              borderColor: 'var(--shop-line)', background: 'var(--shop-surface)',
              borderRadius: 'var(--shop-radius)',
            }}>
              <h2 className="text-[16px] font-semibold">Your order</h2>

              <div className="mt-4 space-y-3">
                {cart.items.map((line) => (
                  <div key={line.id} className="flex gap-3">
                    <div className="relative h-14 w-12 shrink-0 overflow-hidden"
                      style={{ background: 'var(--shop-bg)', borderRadius: 'var(--shop-radius)' }}>
                      {line.image_url && <img src={line.image_url} alt="" className="h-full w-full object-cover" />}
                      <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-medium"
                        style={{ background: 'var(--shop-primary)', color: 'var(--shop-bg)' }}>
                        {line.quantity}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px]">{line.title}</p>
                      {line.variant_title && (
                        <p className="text-[12px]" style={{ color: 'var(--shop-muted)' }}>
                          {line.variant_title}
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 text-[13px] tabular">{line.line_total.formatted}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2 border-t pt-4 text-[14px]"
                style={{ borderColor: 'var(--shop-line)' }}>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--shop-muted)' }}>Subtotal</span>
                  <span className="tabular">{cart.subtotal.formatted}</span>
                </div>
                {cart.discount.minor > 0 && (
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--shop-muted)' }}>
                      Discount{cart.discount_code && ` (${cart.discount_code})`}
                    </span>
                    <span className="tabular" style={{ color: 'var(--shop-accent)' }}>
                      −{cart.discount.formatted}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span style={{ color: 'var(--shop-muted)' }}>Shipping</span>
                  <span className="tabular">
                    {shippingMinor === 0
                      ? 'Free'
                      : new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(shippingMinor / 100)}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-baseline justify-between border-t pt-4"
                style={{ borderColor: 'var(--shop-line)' }}>
                <span className="text-[15px] font-medium">Total</span>
                <span className="text-[19px] font-semibold tabular">
                  {new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(totalMinor / 100)}
                </span>
              </div>

              <ShopButton type="submit" className="mt-5 w-full" disabled={submitting}>
                {submitting ? 'Taking you to payment…' : 'Pay now'}
              </ShopButton>

              <p className="mt-3 text-center text-[12px]" style={{ color: 'var(--shop-muted)' }}>
                You will be taken to your payment provider. Your card details never reach this shop.
              </p>
            </div>
          </div>
        </form>
      </Container>
    </>
  )
}

function ShopField({
  label, children, error, required, className = '',
}: {
  label: string
  children: React.ReactNode
  error?: string
  required?: boolean
  className?: string
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-[13px] font-medium">
        {label}
        {required && <span style={{ color: 'var(--shop-accent)' }}> *</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-[13px]" style={{ color: 'var(--shop-accent)' }}>{error}</p>
      )}
    </div>
  )
}

function ShopInput({
  value, onChange, type = 'text', ...rest
}: {
  value: string
  onChange: (value: string) => void
  type?: string
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'>) {
  return (
    <input
      type={type} value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full border px-3 py-2.5 text-[15px] outline-none transition-colors focus:border-current"
      style={{
        background: 'var(--shop-bg)', color: 'var(--shop-text)',
        borderColor: 'var(--shop-line)', borderRadius: 'var(--shop-radius)',
      }}
      {...rest}
    />
  )
}
