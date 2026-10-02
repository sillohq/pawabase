import { Head } from '@inertiajs/react'
import { Container, ShopButton } from '@/views/ui/shop'
import type { Money } from '@/js/types'
import { ReceiptCard, type ReceiptData } from './ReceiptCard'

type Props = {
  order: {
    number: number
    email: string
    status: string
    payment_status: string
    total: Money
    status_url: string
    items: { title: string; variant_title: string | null; quantity: number; total: Money }[]
  }
  receipt: ReceiptData | null
  receipt_url: string
  theme: { store: { name: string } }
}

export default function Confirmation({ order, receipt, receipt_url, theme }: Props) {
  const paid = order.payment_status === 'paid'

  return (
    <>
      <Head title={`Order #${order.number} · ${theme.store.name}`} />

      <Container className="max-w-2xl py-16">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: paid ? 'var(--shop-primary)' : 'var(--shop-surface)' }}>
            {paid ? (
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="var(--shop-bg)"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-6 w-6 animate-spin" fill="none"
                stroke="var(--shop-muted)" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="12" r="9" strokeOpacity="0.25" />
                <path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round" />
              </svg>
            )}
          </div>

          <h1 className="mt-5 text-[28px] font-semibold tracking-[-0.02em]">
            {paid ? 'Thank you' : 'Confirming your payment'}
          </h1>
          <p className="mt-2 text-[15px]" style={{ color: 'var(--shop-muted)' }}>
            {paid ? (
              <>Order <strong style={{ color: 'var(--shop-text)' }}>#{order.number}</strong> is confirmed.
              Your receipt is below, and a copy is on its way to {order.email}.</>
            ) : (
              <>We are checking with your payment provider. This page updates itself — or come
              back to it from the link below.</>
            )}
          </p>
        </div>

        {receipt ? (
          <div className="mt-10"><ReceiptCard receipt={receipt} url={receipt_url} /></div>
        ) : (
        <div className="mt-10 border p-5" style={{
          borderColor: 'var(--shop-line)', background: 'var(--shop-surface)',
          borderRadius: 'var(--shop-radius)',
        }}>
          <h2 className="text-[15px] font-semibold">What you ordered</h2>
          <div className="mt-4 space-y-2.5">
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
          <div className="mt-4 flex items-baseline justify-between border-t pt-4"
            style={{ borderColor: 'var(--shop-line)' }}>
            <span className="text-[15px] font-medium">Total</span>
            <span className="text-[18px] font-semibold tabular">{order.total.formatted}</span>
          </div>
        </div>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ShopButton href={order.status_url}>Track this order</ShopButton>
          <ShopButton href="/products" variant="outline">Keep shopping</ShopButton>
        </div>

        <p className="mt-6 text-center text-[13px]" style={{ color: 'var(--shop-muted)' }}>
          Bookmark the tracking link — it is how you check this order without an account.
        </p>
      </Container>
    </>
  )
}
