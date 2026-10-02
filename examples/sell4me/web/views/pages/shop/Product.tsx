import { Head, router } from '@inertiajs/react'
import { useMemo, useState } from 'react'
import { Card, Container, Price, ShopButton, type ProductCard } from '@/views/ui/shop'
import type { Money } from '@/js/types'

type Variant = {
  id: number
  title: string
  sku: string | null
  price: Money
  compare_at: Money | null
  available: boolean
  stock_state: string
  remaining: number | null
  options: string[]
}

type Props = {
  product: {
    id: number
    title: string
    slug: string
    description: string
    summary: string | null
    vendor: string | null
    images: { url: string; alt: string | null }[]
    options: { name: string; values: string[] }[]
    variants: Variant[]
    seo: { title: string; description: string | null }
  }
  related: ProductCard[]
  theme: { store: { name: string } }
}

export default function Product({ product, related, theme }: Props) {
  const [selected, setSelected] = useState<string[]>(
    () => product.variants.find((variant) => variant.available)?.options ?? product.variants[0]?.options ?? [],
  )
  const [quantity, setQuantity] = useState(1)
  const [image, setImage] = useState(0)
  const [adding, setAdding] = useState(false)

  // The variant whose option set matches the selection. Compared as a set
  // rather than positionally, so the order the options were saved in cannot
  // break the match.
  const variant = useMemo(() => {
    if (product.options.length === 0) return product.variants[0]
    return product.variants.find(
      (candidate) =>
        candidate.options.length === selected.length &&
        candidate.options.every((value) => selected.includes(value)),
    )
  }, [product, selected])

  function choose(optionIndex: number, value: string) {
    const next = [...selected]
    next[optionIndex] = value
    setSelected(next)
  }

  return (
    <>
      <Head>
        <title>{`${product.seo.title} · ${theme.store.name}`}</title>
        {product.seo.description && <meta name="description" content={product.seo.description} />}
      </Head>

      <Container className="py-10 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <div className="aspect-square w-full overflow-hidden"
              style={{ background: 'var(--shop-surface)', borderRadius: 'var(--shop-radius)' }}>
              {product.images[image] ? (
                <img src={product.images[image]!.url} alt={product.images[image]!.alt ?? product.title}
                  className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-[14px]"
                  style={{ color: 'var(--shop-muted)' }}>
                  No image
                </div>
              )}
            </div>

            {product.images.length > 1 && (
              <div className="mt-3 flex gap-2.5 overflow-x-auto">
                {product.images.map((entry, index) => (
                  <button key={index} type="button" onClick={() => setImage(index)}
                    aria-label={`View image ${index + 1}`}
                    className="h-16 w-16 shrink-0 overflow-hidden border-2 transition-opacity"
                    style={{
                      borderColor: index === image ? 'var(--shop-primary)' : 'transparent',
                      borderRadius: 'var(--shop-radius)',
                      opacity: index === image ? 1 : 0.65,
                    }}>
                    <img src={entry.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            {product.vendor && (
              <p className="text-[13px] uppercase tracking-[0.06em]" style={{ color: 'var(--shop-muted)' }}>
                {product.vendor}
              </p>
            )}
            <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-[-0.02em]">
              {product.title}
            </h1>

            {variant && (
              <Price price={variant.price} compareAt={variant.compare_at}
                className="mt-3 text-[22px] font-medium" />
            )}

            {product.summary && (
              <p className="mt-4 text-[15px] leading-relaxed" style={{ color: 'var(--shop-muted)' }}>
                {product.summary}
              </p>
            )}

            {product.options.map((option, optionIndex) => (
              <div key={option.name} className="mt-7">
                <p className="mb-2 text-[14px] font-medium">{option.name}</p>
                <div className="flex flex-wrap gap-2">
                  {option.values.map((value) => {
                    const active = selected[optionIndex] === value
                    // Whether choosing this value leads to anything buyable —
                    // so a sold-out combination is visibly unavailable before
                    // the shopper picks it.
                    const reachable = product.variants.some(
                      (candidate) => candidate.options.includes(value) && candidate.available,
                    )
                    return (
                      <button key={value} type="button" onClick={() => choose(optionIndex, value)}
                        className="border px-4 py-2 text-[14px] transition-colors"
                        style={{
                          borderColor: active ? 'var(--shop-primary)' : 'var(--shop-line)',
                          background: active ? 'var(--shop-primary)' : 'transparent',
                          color: active ? 'var(--shop-bg)' : reachable ? 'var(--shop-text)' : 'var(--shop-muted)',
                          borderRadius: 'var(--shop-radius)',
                          textDecoration: reachable ? 'none' : 'line-through',
                        }}>
                        {value}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <div className="flex items-center border" style={{
                borderColor: 'var(--shop-line)', borderRadius: 'var(--shop-radius)',
              }}>
                <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3.5 py-2.5 text-[16px] hover:opacity-60" aria-label="Decrease quantity">
                  −
                </button>
                <span className="w-9 text-center text-[14px] tabular">{quantity}</span>
                <button type="button" onClick={() => setQuantity(quantity + 1)}
                  className="px-3.5 py-2.5 text-[16px] hover:opacity-60" aria-label="Increase quantity">
                  +
                </button>
              </div>

              <ShopButton
                disabled={!variant?.available || adding}
                className="flex-1 sm:flex-none sm:px-10"
                onClick={() => {
                  if (!variant) return
                  setAdding(true)
                  router.post('/cart/add', { variant_id: variant.id, quantity },
                    { preserveScroll: true, onFinish: () => setAdding(false) })
                }}
              >
                {variant?.available ? (adding ? 'Adding…' : 'Add to basket') : 'Sold out'}
              </ShopButton>
            </div>

            {variant?.remaining !== null && variant?.remaining !== undefined && variant.available && (
              <p className="mt-2.5 text-[13px]" style={{ color: 'var(--shop-accent)' }}>
                Only {variant.remaining} left
              </p>
            )}

            {product.description && (
              <div className="mt-9 border-t pt-7" style={{ borderColor: 'var(--shop-line)' }}>
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed"
                  style={{ color: 'var(--shop-muted)' }}>
                  {product.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-20 border-t pt-12" style={{ borderColor: 'var(--shop-line)' }}>
            <h2 className="mb-7 text-[20px] font-semibold tracking-[-0.015em]">You might also like</h2>
            <div className="grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-4">
              {related.map((entry) => <Card key={entry.id} product={entry} />)}
            </div>
          </section>
        )}
      </Container>
    </>
  )
}
