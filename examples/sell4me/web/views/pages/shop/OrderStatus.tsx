import { Head } from '@inertiajs/react'
import { Container, PageTitle, ShopButton } from '@/views/ui/shop'
import type { Money } from '@/js/types'
import { ReceiptCard, type ReceiptData } from './ReceiptCard'

type Props = {
  order: {
    number: number
    email: string
    status: string
    payment_status: string
    fulfilment_status: string
    placed_at: string | null
    tracking_number: string | null
    tracking_url: string | null
    shipping_method: string | null
    subtotal: Money
    discount: Money
    shipping: Money
    total: Money
    refunded: Money
    items: { title: string; variant_title: string | null; quantity: number; total: Money }[]
    shipping_address: {
      name: string; line1: string; line2: string | null
      city: string; province: string | null; postal_code: string | null; country: string
    } | null
    timeline: { kind: string; message: string; created_at: string | null }[]
  }
  receipt: ReceiptData | null
  receipt_url: string
  theme: { store: { name: string } }
}

const STEPS = ['pending', 'paid', 'shipped', 'delivered']
const STEP_LABEL: Record<string, string> = {
  pending: 'Placed', paid: 'Paid', shipped: 'Shipped', delivered: 'Delivered',
}

export default function OrderStatus({ order, receipt, receipt_url, theme }: Props) {
  const current = STEPS.indexOf(order.status)
  const cancelled = ['cancelled', 'refunded'].includes(order.status)

  return (
    <>
      <Head title={`Order #${order.number} · ${theme.store.name}`} />
      <PageTitle description={order.placed_at
        ? `Placed ${new Date(order.placed_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}`
        : undefined}>
        Order #{order.number}
      </PageTitle>

      <Container className="max-w-3xl py-10">
        {cancelled ? (
          <div className="border p-4 text-center" style={{
            borderColor: 'var(--shop-line)', background: 'var(--shop-surface)',
            borderRadius: 'var(--shop-radius)',
          }}>
            <p className="text-[15px] font-medium capitalize">This order was {order.status}</p>
            {order.refunded.minor > 0 && (
              <p className="mt-1 text-[14px]" style={{ color: 'var(--shop-muted)' }}>
                {order.refunded.formatted} has been refunded.
              </p>
            )}
          </div>
        ) : (
          <ol className="flex items-center">
            {STEPS.map((step, index) => {
              const done = index <= current
              return (
                <li key={step} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-medium"
                      style={{
                        background: done ? 'var(--shop-primary)' : 'var(--shop-surface)',
                        color: done ? 'var(--shop-bg)' : 'var(--shop-muted)',
                      }}>
                      {index + 1}
                    </span>
                    <span className="whitespace-nowrap text-[12.5px]"
                      style={{ color: done ? 'var(--shop-text)' : 'var(--shop-muted)' }}>
                      {STEP_LABEL[step]}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <span className="mx-2 mb-5 h-px flex-1"
                      style={{ background: index < current ? 'var(--shop-primary)' : 'var(--shop-line)' }} />
                  )}
                </li>
              )
            })}
          </ol>
        )}

        {order.tracking_number && (
          <div className="mt-8 border p-4" style={{
            borderColor: 'var(--shop-line)', borderRadius: 'var(--shop-radius)',
          }}>
            <p className="text-[14px] font-medium">On its way</p>
            <p className="mt-0.5 text-[14px]" style={{ color: 'var(--shop-muted)' }}>
              {order.shipping_method && `${order.shipping_method} · `}
              Tracking {order.tracking_number}
            </p>
            {order.tracking_url && (
              <ShopButton href={order.tracking_url} variant="outline" className="mt-3">
                Track parcel
              </ShopButton>
            )}
          </div>
        )}

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="border p-5" style={{
            borderColor: 'var(--shop-line)', borderRadius: 'var(--shop-radius)',
          }}>
            <h2 className="text-[15px] font-semibold">Items</h2>
            <div className="mt-3 space-y-2.5">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between gap-3 text-[14px]">
                  <span className="min-w-0">
                    {item.title}
                    {item.variant_title && (
                      <span style={{ color: 'var(--shop-muted)' }}> · {item.variant_title}</span>
                    )}
                    <span style={{ color: 'var(--shop-muted)' }}> × {item.quantity}</span>
                  </span>
                  <span className="shrink-0 tabular">{item.total.formatted}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-1.5 border-t pt-4 text-[14px]"
              style={{ borderColor: 'var(--shop-line)' }}>
              <div className="flex justify-between">
                <span style={{ color: 'var(--shop-muted)' }}>Subtotal</span>
                <span className="tabular">{order.subtotal.formatted}</span>
              </div>
              {order.discount.minor > 0 && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--shop-muted)' }}>Discount</span>
                  <span className="tabular">−{order.discount.formatted}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span style={{ color: 'var(--shop-muted)' }}>Shipping</span>
                <span className="tabular">{order.shipping.formatted}</span>
              </div>
              <div className="flex justify-between pt-1.5 font-medium">
                <span>Total</span>
                <span className="tabular">{order.total.formatted}</span>
              </div>
            </div>
          </div>

          {order.shipping_address && (
            <div className="border p-5" style={{
              borderColor: 'var(--shop-line)', borderRadius: 'var(--shop-radius)',
            }}>
              <h2 className="text-[15px] font-semibold">Delivering to</h2>
              <address className="mt-3 space-y-0.5 text-[14px] not-italic leading-relaxed"
                style={{ color: 'var(--shop-muted)' }}>
                <div>{order.shipping_address.name}</div>
                <div>{order.shipping_address.line1}</div>
                {order.shipping_address.line2 && <div>{order.shipping_address.line2}</div>}
                <div>
                  {order.shipping_address.city}
                  {order.shipping_address.province && `, ${order.shipping_address.province}`}{' '}
                  {order.shipping_address.postal_code}
                </div>
                <div>{order.shipping_address.country}</div>
              </address>
            </div>
          )}
        </div>

        {order.timeline.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-[15px] font-semibold">History</h2>
            <ol className="space-y-2.5">
              {order.timeline.map((event, index) => (
                <li key={index} className="flex justify-between gap-4 text-[14px]">
                  <span>{event.message}</span>
                  <span className="shrink-0" style={{ color: 'var(--shop-muted)' }}>
                    {event.created_at
                      ? new Date(event.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
                      : ''}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {receipt && (
          <div className="mt-12">
            <h2 className="mb-5 text-center text-[15px] font-semibold">Your receipt</h2>
            <ReceiptCard receipt={receipt} url={receipt_url} />
          </div>
        )}

        <div className="mt-10 text-center">
          <ShopButton href="/products" variant="outline">Continue shopping</ShopButton>
        </div>
      </Container>
    </>
  )
}
