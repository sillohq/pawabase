import { Head, Link, router } from '@inertiajs/react'
import { useEffect, useState } from 'react'
import { money, useCan, useDebounced } from '@/js/hooks'
import {
  ButtonLink,
  Empty,
  Pager,
  PageHeader,
  SearchInput,
  StatusBadge,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  Tabs,
} from '@/views/ui/kit'
import { IconPlus, IconProduct } from '@/views/ui/icons'
import type { Pagination, ProductRow } from '@/js/types'

type Props = {
  products: ProductRow[]
  status: string
  search: string
  counts: Record<string, number>
  pagination: Pagination
}

export default function ProductsIndex({ products, status, search, counts, pagination }: Props) {
  const can = useCan()
  const [query, setQuery] = useState(search)
  const settled = useDebounced(query, 350)

  useEffect(() => {
    if (settled === search) return
    router.get(
      '/products',
      { status, q: settled || undefined },
      { preserveState: true, preserveScroll: true, replace: true },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled])

  return (
    <>
      <Head title="Products" />
      <PageHeader
        title="Products"
        description="What you sell, and how much of it is left."
        actions={
          can('products.create') && (
            <ButtonLink href="/products/new" tone="primary" size="sm">
              <IconPlus className="h-3.5 w-3.5" />
              New product
            </ButtonLink>
          )
        }
      />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          tabs={[
            { key: 'all', label: 'All', count: counts.all },
            { key: 'active', label: 'Active', count: counts.active },
            { key: 'draft', label: 'Draft', count: counts.draft },
            { key: 'archived', label: 'Archived', count: counts.archived },
          ]}
          active={status}
          onSelect={(key) => router.get('/products', { status: key }, { preserveState: true })}
        />
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search products…"
          className="w-full sm:w-64"
        />
      </div>

      {products.length === 0 ? (
        <div className="panel">
          <Empty
            icon={<IconProduct className="h-6 w-6" />}
            title={search ? `Nothing matching “${search}”` : 'No products yet'}
            body={
              search
                ? 'Try a different title.'
                : 'Add your first product and it will appear on your storefront.'
            }
            action={
              can('products.create') &&
              !search && (
                <ButtonLink href="/products/new" tone="primary" size="sm">
                  <IconPlus className="h-3.5 w-3.5" />
                  Add a product
                </ButtonLink>
              )
            }
          />
        </div>
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Product</TH>
              <TH>Status</TH>
              <TH>Stock</TH>
              <TH align="right">Variants</TH>
              <TH align="right">Price</TH>
            </tr>
          </THead>
          <TBody>
            {products.map((product) => (
              <TR key={product.id} href={`/products/${product.id}`}>
                <TD>
                  <div className="flex items-center gap-2.5">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt=""
                        className="h-8 w-8 shrink-0 rounded-[var(--radius-xs)] border border-[var(--color-line)] object-cover"
                      />
                    ) : (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-xs)] border border-[var(--color-line)] bg-[var(--color-sunken)] text-[var(--color-ink-faint)]">
                        <IconProduct className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <Link
                        href={`/products/${product.id}`}
                        className="block truncate font-medium text-[var(--color-ink)] hover:text-[var(--color-accent)]"
                      >
                        {product.title}
                      </Link>
                      {product.product_type && (
                        <span className="block truncate text-[11.5px] text-[var(--color-ink-faint)]">
                          {product.product_type}
                        </span>
                      )}
                    </div>
                  </div>
                </TD>
                <TD><StatusBadge status={product.status} /></TD>
                <TD>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={product.stock_state} />
                    {product.stock_state !== 'untracked' && (
                      <span className="text-[12px] text-[var(--color-ink-faint)] tabular">
                        {product.stock}
                      </span>
                    )}
                  </div>
                </TD>
                <TD align="right" className="text-[var(--color-ink-soft)]">
                  {product.variant_count}
                </TD>
                <TD align="right" className="font-medium">
                  {money(product.price)}
                  {product.price_max && (
                    <span className="text-[var(--color-ink-faint)]">
                      {' '}– {money(product.price_max)}
                    </span>
                  )}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {products.length > 0 && (
        <div className="panel mt-3">
          <Pager
            page={pagination.page}
            pages={pagination.pages}
            total={pagination.total}
            onPage={(page) =>
              router.get('/products', { status, q: search || undefined, page }, { preserveState: true })
            }
          />
        </div>
      )}
    </>
  )
}
