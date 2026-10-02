import { Head, Link } from '@inertiajs/react'
import { Container, PageTitle } from '@/views/ui/shop'

type Props = {
  collections: { title: string; slug: string; description: string; image_url: string | null }[]
  theme: { store: { name: string } }
}

export default function Collections({ collections, theme }: Props) {
  return (
    <>
      <Head title={`Collections · ${theme.store.name}`} />
      <PageTitle>Collections</PageTitle>

      <Container className="py-10">
        {collections.length === 0 ? (
          <p className="py-16 text-center text-[15px]" style={{ color: 'var(--shop-muted)' }}>
            No collections yet.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection) => (
              <Link key={collection.slug} href={`/collections/${collection.slug}`} className="group block">
                <div className="aspect-[16/10] w-full overflow-hidden"
                  style={{ background: 'var(--shop-surface)', borderRadius: 'var(--shop-radius)' }}>
                  {collection.image_url && (
                    <img src={collection.image_url} alt="" loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                  )}
                </div>
                <h2 className="mt-3 text-[16px] font-medium">{collection.title}</h2>
                {collection.description && (
                  <p className="mt-1 line-clamp-2 text-[14px]" style={{ color: 'var(--shop-muted)' }}>
                    {collection.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </Container>
    </>
  )
}
