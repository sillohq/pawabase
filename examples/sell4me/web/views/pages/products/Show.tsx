import { Deferred, Head, router, WhenVisible, usePage } from '@inertiajs/react'
import { dateTime, money, percent, useCan } from '@/js/hooks'
import {
  Badge,
  ButtonLink,
  Button,
  Empty,
  KeyValue,
  Mono,
  Panel,
  PanelHeader,
  PageHeader,
  Skeleton,
  Stat,
  StatRow,
  StatusBadge,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from '@/views/ui/kit'
import type { Money, VariantRow } from '@/js/types'

type Props = {
  product: {
    id: number
    title: string
    slug: string
    summary: string | null
    description: string
    status: string
    vendor: string | null
    product_type: string | null
    tags: string[]
    requires_shipping: boolean
    images: { id: number; url: string; alt: string | null }[]
    options: { id: number; name: string; values: string[] }[]
    variants: VariantRow[]
    created_at: string | null
  }
  performance?: {
    revenue: Money
    units: number
    views: number
    add_to_carts: number
    conversion_rate: number | null
    refunded_units: number
  }
  movements?: {
    id: number
    delta: number
    balance_after: number
    reason: string
    note: string | null
    sku: string | null
    variant_title: string
    actor: string
    created_at: string | null
  }[]
}

export default function ProductShow({ product }: Props) {
  const can = useCan()

  return (
    <>
      <Head title={product.title} />
      <PageHeader
        breadcrumb={[{ label: 'Products', href: '/products' }, { label: product.title }]}
        title={product.title}
        description={
          <span className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={product.status} />
            <span className="text-[var(--color-ink-faint)]">
              {product.variants.length}{' '}
              {product.variants.length === 1 ? 'variant' : 'variants'} ·{' '}
              <Mono>{product.slug}</Mono>
            </span>
          </span>
        }
        actions={
          <>
            {can('products.delete') && product.status !== 'archived' && (
              <Button
                tone="danger"
                size="sm"
                onClick={() => router.post(`/products/${product.id}/archive`)}
              >
                Archive
              </Button>
            )}
            {can('products.update') && (
              <ButtonLink href={`/products/${product.id}/edit`} tone="primary" size="sm">
                Edit
              </ButtonLink>
            )}
          </>
        }
      />

      <Deferred data="performance" fallback={<PerformanceSkeleton />}>
        <Performance />
      </Deferred>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel padded={false}>
            <PanelHeader
              title="Variants"
              description="Price and stock, per buyable configuration"
            />
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <THead>
                  <tr>
                    <TH>Variant</TH>
                    <TH>SKU</TH>
                    <TH align="right">Price</TH>
                    <TH align="right">Stock</TH>
                    <TH>State</TH>
                  </tr>
                </THead>
                <TBody>
                  {product.variants.map((variant) => (
                    <TR key={variant.id}>
                      <TD className="font-medium">
                        {variant.is_default ? 'Default' : variant.title}
                      </TD>
                      <TD className="text-[var(--color-ink-soft)]">
                        {variant.sku ? <Mono>{variant.sku}</Mono> : '—'}
                      </TD>
                      <TD align="right" className="font-medium">
                        {money(variant.price)}
                        {variant.compare_at && (
                          <span className="ml-1 text-[11.5px] text-[var(--color-ink-faint)] line-through">
                            {money(variant.compare_at)}
                          </span>
                        )}
                      </TD>
                      <TD align="right">
                        {variant.track_inventory ? (
                          <>
                            {variant.stock}
                            {variant.reserved > 0 && (
                              <span className="ml-1 text-[11.5px] text-[var(--color-ink-faint)]">
                                ({variant.reserved} held)
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-[var(--color-ink-faint)]">untracked</span>
                        )}
                      </TD>
                      <TD><StatusBadge status={variant.stock_state} /></TD>
                    </TR>
                  ))}
                </TBody>
              </table>
            </div>
          </Panel>

          {product.description && (
            <Panel>
              <PanelHeader title="Description" />
              <div className="whitespace-pre-wrap pt-3 text-[13px] leading-relaxed text-[var(--color-ink-soft)]">
                {product.description}
              </div>
            </Panel>
          )}

          <Panel padded={false}>
            <PanelHeader title="Stock history" description="Every change, and why" />
            <div className="p-3">
              <WhenVisible data="movements" fallback={<Skeleton rows={4} />}>
                <Movements />
              </WhenVisible>
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          {product.images.length > 0 && (
            <Panel>
              <PanelHeader title="Images" />
              <div className="grid grid-cols-3 gap-2 pt-3">
                {product.images.map((image) => (
                  <img
                    key={image.id}
                    src={image.url}
                    alt={image.alt ?? ''}
                    className="aspect-square w-full rounded-[var(--radius-sm)] border border-[var(--color-line)] object-cover"
                  />
                ))}
              </div>
            </Panel>
          )}

          <Panel>
            <PanelHeader title="Organisation" />
            <div className="pt-2">
              <KeyValue
                rows={[
                  { label: 'Type', value: product.product_type ?? '—' },
                  { label: 'Vendor', value: product.vendor ?? '—' },
                  { label: 'Shipping', value: product.requires_shipping ? 'Required' : 'Digital' },
                  { label: 'Created', value: dateTime(product.created_at) },
                ]}
              />
              {product.tags.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {product.tags.map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
          </Panel>

          {product.options.length > 0 && (
            <Panel>
              <PanelHeader title="Options" />
              <div className="space-y-2.5 pt-3">
                {product.options.map((option) => (
                  <div key={option.id}>
                    <p className="text-[12px] font-medium text-[var(--color-ink)]">{option.name}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {option.values.map((value) => (
                        <Badge key={value}>{value}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </>
  )
}

function PerformanceSkeleton() {
  return (
    <div className="mt-4">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-line)] sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="bg-[var(--color-surface)] p-4">
            <div className="skeleton h-3 w-14" />
            <div className="skeleton mt-2.5 h-6 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

function Performance() {
  const { performance } = usePage().props as unknown as Props
  if (!performance) return <PerformanceSkeleton />

  return (
    <div className="mt-4">
      <StatRow>
        <Stat label="Revenue" value={money(performance.revenue)} hint="last 30 days" />
        <Stat label="Units sold" value={performance.units} />
        <Stat label="Views" value={performance.views} />
        <Stat label="Added to cart" value={performance.add_to_carts} />
        <Stat
          label="Conversion"
          value={percent(performance.conversion_rate)}
          hint={performance.views === 0 ? 'no views yet' : 'purchases per view'}
        />
      </StatRow>
    </div>
  )
}

function Movements() {
  const { movements = [] } = usePage().props as unknown as Props

  if (movements.length === 0) {
    return (
      <Empty
        title="No stock changes yet"
        body="Sales, restocks and manual adjustments all show up here."
      />
    )
  }

  return (
    <Table>
      <THead>
        <tr>
          <TH>When</TH>
          <TH>Variant</TH>
          <TH>Reason</TH>
          <TH align="right">Change</TH>
          <TH align="right">Balance</TH>
        </tr>
      </THead>
      <TBody>
        {movements.map((movement) => (
          <TR key={movement.id}>
            <TD className="whitespace-nowrap text-[var(--color-ink-faint)]">
              {dateTime(movement.created_at)}
            </TD>
            <TD className="text-[var(--color-ink-soft)]">{movement.variant_title}</TD>
            <TD>
              <Badge>{movement.reason}</Badge>
              {movement.note && (
                <span className="ml-1.5 text-[11.5px] text-[var(--color-ink-faint)]">
                  {movement.note}
                </span>
              )}
            </TD>
            <TD
              align="right"
              className={
                movement.delta >= 0
                  ? 'font-medium text-[var(--color-positive)]'
                  : 'font-medium text-[var(--color-critical)]'
              }
            >
              {movement.delta >= 0 ? '+' : ''}
              {movement.delta}
            </TD>
            <TD align="right">{movement.balance_after}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  )
}
