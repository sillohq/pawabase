import { Deferred, Head, Link, router, usePage } from '@inertiajs/react'
import { money, percent } from '@/js/hooks'
import { AreaChart, BarList, Meter } from '@/views/ui/charts'
import { Panel, PanelHeader, PageHeader, Skeleton, Stat, StatRow } from '@/views/ui/kit'
import type { AnalyticsSummary, Money, SeriesPoint } from '@/js/types'

type Product = {
  id: number
  title: string
  revenue: Money
  revenue_minor: number
  units: number
  views: number
  conversion_rate: number | null
}

type Props = {
  range: { key: string; label: string }
  summary: AnalyticsSummary
  series?: SeriesPoint[]
  top_products?: Product[]
}

export const RANGES = [
  ['today', 'Today'], ['7d', '7 days'], ['30d', '30 days'],
  ['90d', '90 days'], ['ytd', 'Year'], ['12m', '12 months'],
]

export function RangePicker({ path, active }: { path: string; active: string }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] p-0.5">
      {RANGES.map(([key, label]) => (
        <button key={key} type="button"
          onClick={() => router.get(path, { range: key }, { preserveState: true, preserveScroll: true })}
          className={'whitespace-nowrap rounded-[var(--radius-xs)] px-2 py-1 text-[12px] transition-colors ' +
            (active === key
              ? 'bg-[var(--color-sunken)] font-medium text-[var(--color-ink)]'
              : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]')}>
          {label}
        </button>
      ))}
    </div>
  )
}

export default function AnalyticsOverview({ range, summary }: Props) {
  return (
    <>
      <Head title="Analytics" />
      <PageHeader
        title="Analytics"
        description="How the store is doing. Where a number cannot honestly be computed it is left blank rather than shown as zero."
        actions={<RangePicker path="/analytics" active={range.key} />}
      />

      <StatRow>
        <Stat label="Gross revenue" value={money(summary.gross)} hint={`${summary.orders} orders`} />
        <Stat label="Net revenue" value={money(summary.net)} hint="after refunds and fees" />
        <Stat label="Average order" value={money(summary.average_order)} />
        <Stat label="New customers" value={summary.new_customers} />
      </StatRow>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel padded={false}>
            <PanelHeader title="Revenue" description="Net of refunds, by day" />
            <div className="p-3">
              <Deferred data="series" fallback={<div className="skeleton h-[200px] w-full" />}>
                <Chart />
              </Deferred>
            </div>
          </Panel>
        </div>

        <Panel>
          <PanelHeader title="Conversion" />
          <div className="space-y-4 pt-4">
            <Meter
              value={summary.conversion_rate}
              label="Sessions that ordered"
              caption={summary.sessions ? `${summary.sessions} sessions` : 'no storefront traffic recorded'}
            />
            <Meter
              value={summary.payment_failure_rate}
              label="Payments that failed"
              caption={`${summary.payments_succeeded} succeeded, ${summary.payments_failed} failed`}
              tone={(summary.payment_failure_rate ?? 0) > 0.1 ? 'critical' : 'accent'}
            />
            <Meter
              value={summary.refund_rate}
              label="Revenue refunded"
              caption={money(summary.refunded)}
              tone={(summary.refund_rate ?? 0) > 0.1 ? 'critical' : 'accent'}
            />
          </div>
        </Panel>
      </div>

      <Panel className="mt-4" padded={false}>
        <PanelHeader
          title="Top products"
          description="By revenue in this period"
          action={
            <Link href="/analytics/products"
              className="text-[12.5px] font-medium text-[var(--color-accent)] hover:underline">
              All products
            </Link>
          }
        />
        <div className="p-3">
          <Deferred data="top_products" fallback={<Skeleton rows={6} />}>
            <TopProducts />
          </Deferred>
        </div>
      </Panel>
    </>
  )
}

function Chart() {
  const { series = [] } = usePage().props as unknown as Props
  return (
    <AreaChart
      points={series.map((point) => ({
        label: point.date, value: point.revenue_minor, display: money(point.revenue),
      }))}
      valueLabel="Revenue"
      emptyTitle="No revenue in this period"
      emptyBody="Sales appear here as orders are paid."
    />
  )
}

function TopProducts() {
  const { top_products = [] } = usePage().props as unknown as Props
  return (
    <BarList
      rows={top_products.map((product) => ({
        label: product.title,
        value: product.revenue_minor,
        display: money(product.revenue),
        hint: `${product.units} sold${product.conversion_rate !== null ? ` · ${percent(product.conversion_rate)}` : ''}`,
      }))}
      emptyTitle="Nothing sold yet"
      emptyBody="Your best-performing products will be ranked here."
    />
  )
}
