import { Deferred, Head, Link, usePage } from '@inertiajs/react'
import { money, percent } from '@/js/hooks'
import { Empty, PageHeader, Skeleton, StatusBadge, TBody, TD, TH, THead, TR, Table } from '@/views/ui/kit'
import { RangePicker } from './Overview'
import type { Money } from '@/js/types'

type Product = {
  id: number
  title: string
  slug: string
  status: string
  revenue: Money
  revenue_minor: number
  units: number
  refunded_units: number
  views: number
  add_to_carts: number
  conversion_rate: number | null
}

type Props = { range: { key: string; label: string }; products?: Product[] }

export default function AnalyticsProducts({ range }: Props) {
  return (
    <>
      <Head title="Product analytics" />
      <PageHeader
        title="Product analytics"
        description="What each product earned, and the funnel that produced it — views, baskets, purchases."
        actions={<RangePicker path="/analytics/products" active={range.key} />}
      />
      <Deferred data="products" fallback={<div className="panel p-4"><Skeleton rows={8} /></div>}>
        <ProductTable />
      </Deferred>
    </>
  )
}

function ProductTable() {
  const { products = [] } = usePage().props as unknown as Props

  if (products.length === 0) {
    return (
      <div className="panel">
        <Empty title="Nothing to report yet"
          body="Once shoppers browse and buy, each product's funnel appears here." />
      </div>
    )
  }

  return (
    <Table>
      <THead>
        <tr>
          <TH>Product</TH>
          <TH>Status</TH>
          <TH align="right">Views</TH>
          <TH align="right">Added to cart</TH>
          <TH align="right">Units sold</TH>
          <TH align="right">Conversion</TH>
          <TH align="right">Revenue</TH>
        </tr>
      </THead>
      <TBody>
        {products.map((product) => (
          <TR key={product.id} href={`/products/${product.id}`}>
            <TD>
              <Link href={`/products/${product.id}`}
                className="font-medium text-[var(--color-ink)] hover:text-[var(--color-accent)]">
                {product.title}
              </Link>
              {product.refunded_units > 0 && (
                <span className="block text-[11.5px] text-[var(--color-critical)]">
                  {product.refunded_units} refunded
                </span>
              )}
            </TD>
            <TD><StatusBadge status={product.status} /></TD>
            <TD align="right" className="text-[var(--color-ink-soft)]">{product.views || '—'}</TD>
            <TD align="right" className="text-[var(--color-ink-soft)]">{product.add_to_carts || '—'}</TD>
            <TD align="right">{product.units}</TD>
            <TD align="right" className="text-[var(--color-ink-soft)]">
              {percent(product.conversion_rate)}
            </TD>
            <TD align="right" className="font-medium">{money(product.revenue)}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  )
}
