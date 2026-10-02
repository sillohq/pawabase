import { Head } from '@inertiajs/react'
import { Container, ShopButton } from '@/views/ui/shop'

/**
 * The shop is open but cannot take money.
 *
 * A real state, and one worth a real page: the merchant has launched without a
 * verified payment provider. Showing a broken checkout form instead would waste
 * the shopper's time and lose the sale twice.
 */
export default function CheckoutUnavailable({ theme }: { theme: { store: { name: string; support_email: string | null } } }) {
  return (
    <>
      <Head title={`Checkout unavailable · ${theme.store.name}`} />
      <Container className="max-w-lg py-24 text-center">
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">
          We can&rsquo;t take payment right now
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed" style={{ color: 'var(--shop-muted)' }}>
          This shop is still setting up its payments. Your basket is saved — come back shortly
          and it will be exactly where you left it.
        </p>

        {theme.store.support_email && (
          <p className="mt-4 text-[14px]" style={{ color: 'var(--shop-muted)' }}>
            Need it sooner?{' '}
            <a href={`mailto:${theme.store.support_email}`} className="underline underline-offset-2"
              style={{ color: 'var(--shop-accent)' }}>
              {theme.store.support_email}
            </a>
          </p>
        )}

        <div className="mt-8 flex justify-center gap-3">
          <ShopButton href="/cart" variant="outline">Back to basket</ShopButton>
          <ShopButton href="/products">Keep browsing</ShopButton>
        </div>
      </Container>
    </>
  )
}
