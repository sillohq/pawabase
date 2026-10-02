import { Head } from '@inertiajs/react'
import { Container, PageTitle, ProductGrid, type ProductCard } from '@/views/ui/shop'

type Props = {
  collection: {
    title: string
    slug: string
    description: string
    image_url: string | null
    seo: { title: string; description: string | null }
  }
  products: ProductCard[]
  theme: { store: { name: string } }
}

export default function Collection({ collection, products, theme }: Props) {
  return (
    <>
      <Head>
        <title>{`${collection.seo.title} · ${theme.store.name}`}</title>
        {collection.seo.description && <meta name="description" content={collection.seo.description} />}
      </Head>

      <PageTitle description={collection.description || undefined}>{collection.title}</PageTitle>

      <Container className="py-10">
        <p className="mb-7 text-[14px]" style={{ color: 'var(--shop-muted)' }}>
          {products.length} {products.length === 1 ? 'product' : 'products'}
        </p>
        <ProductGrid products={products} />
      </Container>
    </>
  )
}
