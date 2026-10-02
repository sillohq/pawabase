import { Head, router } from '@inertiajs/react'
import { Container, PageTitle, ProductGrid, ShopButton, type ProductCard } from '@/views/ui/shop'

type Props = {
  products: ProductCard[]
  sort: string
  pagination: { page: number; pages: number; total: number }
  theme: { store: { name: string } }
}

export default function Products({ products, sort, pagination, theme }: Props) {
  return (
    <>
      <Head title={`Shop · ${theme.store.name}`} />
      <PageTitle description={`${pagination.total} ${pagination.total === 1 ? 'product' : 'products'}`}>
        Everything
      </PageTitle>

      <Container className="py-10">
        <div className="mb-7 flex justify-end">
          <select
            value={sort}
            onChange={(event) => router.get('/products', { sort: event.target.value }, { preserveScroll: true })}
            className="border px-3 py-1.5 text-[14px]"
            style={{
              background: 'var(--shop-bg)', color: 'var(--shop-text)',
              borderColor: 'var(--shop-line)', borderRadius: 'var(--shop-radius)',
            }}
            aria-label="Sort products"
          >
            <option value="featured">Featured</option>
            <option value="newest">Newest</option>
            <option value="title">A–Z</option>
          </select>
        </div>

        <ProductGrid products={products} />

        {pagination.pages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-3">
            <ShopButton variant="outline" disabled={pagination.page <= 1}
              onClick={() => router.get('/products', { sort, page: pagination.page - 1 })}>
              Previous
            </ShopButton>
            <span className="text-[14px] tabular" style={{ color: 'var(--shop-muted)' }}>
              {pagination.page} of {pagination.pages}
            </span>
            <ShopButton variant="outline" disabled={pagination.page >= pagination.pages}
              onClick={() => router.get('/products', { sort, page: pagination.page + 1 })}>
              Next
            </ShopButton>
          </div>
        )}
      </Container>
    </>
  )
}
