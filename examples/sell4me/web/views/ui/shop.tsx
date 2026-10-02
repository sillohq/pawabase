/**
 * Storefront building blocks.
 *
 * Lives in `views/ui/` rather than under `views/pages/shop/` because the page
 * resolver globs that directory — a shared module in there would be offered as
 * a page and blow up on its missing default export.
 *
 * Separate from `views/ui/kit.tsx` on purpose: the shop is not the dashboard.
 * It has its own scale (15px base, generous spacing), its own colours (the
 * merchant's, applied as CSS custom properties by `ShopLayout`), and its own
 * components. Sharing a kit between the two would drag the admin's density
 * onto a page meant to sell things.
 */

import { Link } from '@inertiajs/react'
import type { ReactNode } from 'react'
import type { Money } from '@/js/types'

export type ProductCard = {
  id: number
  title: string
  slug: string
  summary: string | null
  image_url: string | null
  price: Money
  price_max: Money | null
  compare_at: Money | null
  available: boolean
}

export function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 ${className}`}>{children}</div>
}

export function ShopButton({
  children, href, onClick, variant = 'primary', type = 'button', disabled, className = '', download,
}: {
  children: ReactNode
  href?: string
  /** A file, not a page: a plain anchor, so Inertia does not fetch it as JSON. */
  download?: boolean
  onClick?: () => void
  variant?: 'primary' | 'outline'
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
}) {
  const style =
    variant === 'primary'
      ? { background: 'var(--shop-primary)', color: 'var(--shop-bg)', borderColor: 'transparent' }
      : { background: 'transparent', color: 'var(--shop-text)', borderColor: 'var(--shop-line)' }

  const classes =
    'inline-flex items-center justify-center gap-2 border px-5 py-2.5 text-[14px] font-medium ' +
    'transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40 ' +
    className

  if (href && download) {
    return (
      <a href={href} download className={classes} style={{ ...style, borderRadius: 'var(--shop-radius)' }}>
        {children}
      </a>
    )
  }
  if (href) {
    return (
      <Link href={href} className={classes} style={{ ...style, borderRadius: 'var(--shop-radius)' }}>
        {children}
      </Link>
    )
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes}
      style={{ ...style, borderRadius: 'var(--shop-radius)' }}>
      {children}
    </button>
  )
}

export function Price({ price, priceMax, compareAt, className = '' }: {
  price: Money
  priceMax?: Money | null
  compareAt?: Money | null
  className?: string
}) {
  return (
    <span className={`inline-flex items-baseline gap-2 ${className}`}>
      <span className="tabular">
        {price.formatted}
        {priceMax && <span style={{ color: 'var(--shop-muted)' }}> – {priceMax.formatted}</span>}
      </span>
      {compareAt && (
        <span className="text-[0.85em] line-through tabular" style={{ color: 'var(--shop-muted)' }}>
          {compareAt.formatted}
        </span>
      )}
    </span>
  )
}

export function ProductGrid({ products }: { products: ProductCard[] }) {
  if (products.length === 0) {
    return (
      <p className="py-16 text-center text-[14px]" style={{ color: 'var(--shop-muted)' }}>
        Nothing here yet.
      </p>
    )
  }
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => <Card key={product.id} product={product} />)}
    </div>
  )
}

export function Card({ product }: { product: ProductCard }) {
  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative aspect-[4/5] w-full overflow-hidden"
        style={{ background: 'var(--shop-surface)', borderRadius: 'var(--shop-radius)' }}>
        {product.image_url ? (
          <img src={product.image_url} alt={product.title} loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[12px]"
            style={{ color: 'var(--shop-muted)' }}>
            No image
          </div>
        )}
        {!product.available && (
          <span className="absolute left-2.5 top-2.5 px-2 py-0.5 text-[11px] font-medium"
            style={{ background: 'var(--shop-bg)', color: 'var(--shop-muted)', borderRadius: 'var(--shop-radius)' }}>
            Sold out
          </span>
        )}
        {product.compare_at && product.available && (
          <span className="absolute left-2.5 top-2.5 px-2 py-0.5 text-[11px] font-medium"
            style={{ background: 'var(--shop-accent)', color: 'var(--shop-bg)', borderRadius: 'var(--shop-radius)' }}>
            Sale
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-[14px] leading-snug">{product.title}</p>
        <Price price={product.price} priceMax={product.price_max} compareAt={product.compare_at}
          className="mt-1 text-[14px] font-medium" />
      </div>
    </Link>
  )
}

export function PageTitle({ children, description }: { children: ReactNode; description?: ReactNode }) {
  return (
    <div className="border-b py-10" style={{ borderColor: 'var(--shop-line)' }}>
      <Container>
        <h1 className="text-[30px] font-semibold tracking-[-0.02em]">{children}</h1>
        {description && (
          <p className="mt-2 max-w-2xl text-[15px]" style={{ color: 'var(--shop-muted)' }}>
            {description}
          </p>
        )}
      </Container>
    </div>
  )
}
