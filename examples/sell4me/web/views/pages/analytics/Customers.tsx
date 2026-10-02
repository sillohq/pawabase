import { Deferred, Head, Link, usePage } from '@inertiajs/react'
import { money } from '@/js/hooks'
import { AreaChart, Meter } from '@/views/ui/charts'
import {
  Empty, Panel, PanelHeader, PageHeader, Skeleton, Stat, StatRow,
  TBody, TD, TH, THead, TR,
} from '@/views/ui/kit'
import { RangePicker } from './Overview'
import type { AnalyticsSummary, Money, SeriesPoint } from '@/js/types'

type Cohort = {
  buyers: number
  repeat_buyers: number
  repeat_rate: number | null
  new_customers: number
  guest_orders: number
  top: { id: number; email: string; name: string; orders_count: number; total_spent: Money }[]
}

type Props = {
  range: { key: string; label: string }
  summary: AnalyticsSummary
  cohort?: Cohort
  series?: SeriesPoint[]
}

export default function AnalyticsCustomers({ range, summary }: Props) {
  return (
    <>
      <Head title="Customer analytics" />
      <PageHeader
        title="Customer analytics"
        description="Who is buying, and whether they come back. Repeat rate is computed over the period shown, not over all time."
        actions={<RangePicker path="/analytics/customers" active={range.key} />}
      />

      <StatRow>
        <Stat label="New customers" value={summary.new_customers} />
        <Stat label="Orders" value={summary.orders} />
        <Stat label="Average order" value={money(summary.average_order)} />
        <Stat label="Revenue" value={money(summary.gross)} />
      </StatRow>

      <Deferred data={['cohort', 'series']} fallback={<div className="panel mt-4 p-4"><Skeleton rows={6} /></div>}>
        <Body />
      </Deferred>
    </>
  )
}

function Body() {
  const { cohort, series = [] } = usePage().props as unknown as Props
  if (!cohort) return <div className="panel mt-4 p-4"><Skeleton rows={6} /></div>

  return (
    <>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel padded={false}>
            <PanelHeader title="New customers" description="Sign-ups by day" />
            <div className="p-3">
              <AreaChart
                points={series.map((point) => ({
                  label: point.date, value: point.customers, display: `${point.customers} customers`,
                }))}
                valueLabel="New customers"
                emptyTitle="No new customers in this period"
              />
            </div>
          </Panel>
        </div>

        <Panel>
          <PanelHeader title="Loyalty" />
          <div className="space-y-4 pt-4">
            <Meter
              value={cohort.repeat_rate}
              label="Buyers who ordered twice"
              caption={`${cohort.repeat_buyers} of ${cohort.buyers} in this period`}
              tone="positive"
            />
            <div className="border-t border-[var(--color-line-soft)] pt-3 text-[12.5px] text-[var(--color-ink-soft)]">
              <p>{cohort.guest_orders} orders were guest checkouts.</p>
              <p className="mt-1 text-[11.5px] text-[var(--color-ink-faint)]">
                A guest order has no customer account, so it cannot count toward repeat purchase.
              </p>
            </div>
          </div>
        </Panel>
      </div>

      <Panel className="mt-4" padded={false}>
        <PanelHeader title="Highest-value customers" description="By lifetime spend" />
        {cohort.top.length === 0 ? (
          <Empty title="No customers yet" body="They will be ranked here by what they have spent." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <THead>
                <tr>
                  <TH>Customer</TH>
                  <TH align="right">Orders</TH>
                  <TH align="right">Lifetime spend</TH>
                </tr>
              </THead>
              <TBody>
                {cohort.top.map((customer) => (
                  <TR key={customer.id} href={`/customers/${customer.id}`}>
                    <TD>
                      <Link href={`/customers/${customer.id}`}
                        className="font-medium text-[var(--color-ink)] hover:text-[var(--color-accent)]">
                        {customer.name}
                      </Link>
                      <span className="block text-[12px] text-[var(--color-ink-faint)]">{customer.email}</span>
                    </TD>
                    <TD align="right">{customer.orders_count}</TD>
                    <TD align="right" className="font-medium">{money(customer.total_spent)}</TD>
                  </TR>
                ))}
              </TBody>
            </table>
          </div>
        )}
      </Panel>
    </>
  )
}
