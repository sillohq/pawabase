import { Deferred, Head, usePage } from '@inertiajs/react'
import { money, percent } from '@/js/hooks'
import { AreaChart, BarList } from '@/views/ui/charts'
import { Panel, PanelHeader, PageHeader, Skeleton, Stat, StatRow } from '@/views/ui/kit'
import { RangePicker } from './Overview'
import type { AnalyticsSummary, Money, SeriesPoint } from '@/js/types'

type Breakdown = {
  by_source: { key: string; orders: number; revenue: Money }[]
  by_status: { key: string; orders: number }[]
  by_provider: { key: string; payments: number; revenue: Money }[]
}

type Props = {
  range: { key: string; label: string }
  summary: AnalyticsSummary
  series?: SeriesPoint[]
  breakdown?: Breakdown
}

export default function AnalyticsSales({ range, summary }: Props) {
  return (
    <>
      <Head title="Sales analytics" />
      <PageHeader
        title="Sales analytics"
        description="Where the orders came from and how they were paid for."
        actions={<RangePicker path="/analytics/sales" active={range.key} />}
      />

      <StatRow>
        <Stat label="Gross revenue" value={money(summary.gross)} />
        <Stat label="Orders" value={summary.orders} />
        <Stat label="Average order" value={money(summary.average_order)} />
        <Stat
          label="Payment failures"
          value={percent(summary.payment_failure_rate)}
          hint={`${summary.payments_failed} of ${summary.payments_succeeded + summary.payments_failed}`}
          tone={(summary.payment_failure_rate ?? 0) > 0.1 ? 'critical' : undefined}
        />
      </StatRow>

      <Deferred data={['series', 'breakdown']} fallback={<div className="panel mt-4 p-4"><Skeleton rows={6} /></div>}>
        <Body />
      </Deferred>
    </>
  )
}

function Body() {
  const { series = [], breakdown } = usePage().props as unknown as Props

  return (
    <>
      <Panel className="mt-4" padded={false}>
        <PanelHeader title="Orders" description="Paid orders per day" />
        <div className="p-3">
          <AreaChart
            points={series.map((point) => ({
              label: point.date, value: point.orders, display: `${point.orders} orders`,
            }))}
            valueLabel="Orders"
            emptyTitle="No orders in this period"
          />
        </div>
      </Panel>

      {breakdown && (
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Panel padded={false}>
            <PanelHeader title="By source" />
            <div className="p-3">
              <BarList
                rows={breakdown.by_source.map((row) => ({
                  label: row.key.replace(/_/g, ' '),
                  value: row.revenue.minor,
                  display: money(row.revenue),
                  hint: `${row.orders} orders`,
                }))}
                emptyTitle="No paid orders yet"
              />
            </div>
          </Panel>

          <Panel padded={false}>
            <PanelHeader title="By status" />
            <div className="p-3">
              <BarList
                rows={breakdown.by_status.map((row) => ({
                  label: row.key.replace(/_/g, ' '),
                  value: row.orders,
                  display: String(row.orders),
                }))}
                emptyTitle="No orders yet"
              />
            </div>
          </Panel>

          <Panel padded={false}>
            <PanelHeader title="By provider" />
            <div className="p-3">
              <BarList
                rows={breakdown.by_provider.map((row) => ({
                  label: row.key,
                  value: row.revenue.minor,
                  display: money(row.revenue),
                  hint: `${row.payments} payments`,
                }))}
                emptyTitle="No payments yet"
              />
            </div>
          </Panel>
        </div>
      )}
    </>
  )
}
