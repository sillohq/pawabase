import { Head, router } from '@inertiajs/react'
import { useEffect, useState } from 'react'
import { useDebounced } from '@/js/hooks'
import { Container, PageTitle, ProductGrid, type ProductCard } from '@/views/ui/shop'

type Props = { query: string; products: ProductCard[]; theme: { store: { name: string } } }

export default function Search({ query, products, theme }: Props) {
  const [term, setTerm] = useState(query)
  const settled = useDebounced(term, 300)

  useEffect(() => {
    if (settled === query) return
    router.get('/search', { q: settled }, { preserveState: true, preserveScroll: true, replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled])

  return (
    <>
      <Head title={`Search · ${theme.store.name}`} />
      <PageTitle>Search</PageTitle>

      <Container className="py-10">
        <input
          type="search" value={term} autoFocus
          onChange={(event) => setTerm(event.target.value)}
          placeholder="What are you looking for?"
          className="w-full max-w-xl border px-4 py-3 text-[16px] outline-none"
          style={{
            background: 'var(--shop-bg)', color: 'var(--shop-text)',
            borderColor: 'var(--shop-line)', borderRadius: 'var(--shop-radius)',
          }}
        />

        <div className="mt-9">
          {term.length < 2 ? (
            <p className="text-[15px]" style={{ color: 'var(--shop-muted)' }}>
              Type at least two characters.
            </p>
          ) : products.length === 0 ? (
            <p className="text-[15px]" style={{ color: 'var(--shop-muted)' }}>
              Nothing matching &ldquo;{term}&rdquo;.
            </p>
          ) : (
            <>
              <p className="mb-6 text-[14px]" style={{ color: 'var(--shop-muted)' }}>
                {products.length} {products.length === 1 ? 'result' : 'results'}
              </p>
              <ProductGrid products={products} />
            </>
          )}
        </div>
      </Container>
    </>
  )
}
