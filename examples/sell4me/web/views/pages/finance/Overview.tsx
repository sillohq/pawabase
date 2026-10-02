import { Deferred, Head, Link, router, usePage } from '@inertiajs/react'
import { dateTime, money } from '@/js/hooks'
import { AreaChart } from '@/views/ui/charts'
import {
  Badge, Banner, Empty, KeyValue, Panel, PanelHeader, PageHeader,
  Skeleton, Stat, StatRow, StatusBadge,
} from '@/views/ui/kit'
import type { Money, SeriesPoint } from '@/js/types'

type Summary = Record<'gross' | 'refunds' | 'provider_fees' | 'platform_fees' | 'adjustments' | 'net' | 'paid_out' | 'awaiting_payout', Money>

type Props = {
  range: { key: string; label: string }
  summary: Summary
  counts: { succeeded: number; failed: number; pending: number; refunded: number }
  providers: { provider: string; label: string; is_default: boolean; is_test_mode: boolean }[]
  series?: SeriesPoint[]
  recent?: {
    id: number
    kind: string
    description: string
    amount: Money
    order_number: number | null
    order_id: number | null
    occurred_at: string | null
  }[]
  payouts?: {
    id: number
    provider: string
    amount: Money
    status: string
    destination: string | null
    paid_at: string | null
  }[]
}

const RANGES = [['today', 'Today'], ['7d', '7 days'], ['30d', '30 days'], ['90d', '90 days'], ['ytd', 'Year']]

const KIND_TONE: Record<string, 'positive' | 'critical' | 'neutral' | 'caution'> = {
  charge: 'positive',
  provider_fee: 'neutral',
  platform_fee: 'neutral',
  refund: 'critical',
  payout: 'caution',
  adjustment: 'neutral',
}

export default function FinanceOverview({ range, summary, counts, providers }: Props) {
  return (
    <>
      <Head title="Finance" />
      <PageHeader
        title="Finance"
        description="Everything from the ledger — the platform's book of record, not a recount of the orders table."
        actions={
          <div className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] p-0.5">
            {RANGES.map(([key, label]) => (
              <button key={key} type="button"
                onClick={() => router.get('/payments', { range: key }, { preserveState: true, preserveScroll: true })}
                className={'rounded-[var(--radius-xs)] px-2 py-1 text-[12px] transition-colors ' +
                  (range.key === key
                    ? 'bg-[var(--color-sunken)] font-medium text-[var(--color-ink)]'
                    : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]')}>
                {label}
              </button>
            ))}
          </div>
        }
      />

      {providers.length === 0 && (
        <div className="mb-4">
          <Banner tone="caution" title="No payout account connected"
            action={<Link href="/payments/payouts/connect" className="text-[12.5px] font-medium text-[var(--color-accent)] hover:underline">Connect payout</Link>}>
            Your storefront cannot take money until a payout bank account is connected.
          </Banner>
        </div>
      )}

      <StatRow>
        <Stat label="Gross revenue" value={money(summary.gross)} hint={`${counts.succeeded} successful payments`} />
        <Stat label="Net revenue" value={money(summary.net)} hint="after refunds and fees" />
        <Stat label="Refunded" value={money(summary.refunds)} tone={summary.refunds.minor > 0 ? 'critical' : undefined} />
        <Stat label="Awaiting payout" value={money(summary.awaiting_payout)} hint="settled by your provider" />
      </StatRow>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel padded={false}>
            <PanelHeader title="Revenue" description="Net of refunds, by day" />
            <div className="p-3">
              <Deferred data="series" fallback={<div className="skeleton h-[200px] w-full" />}>
                <RevenueChart />
              </Deferred>
            </div>
          </Panel>
        </div>

        <Panel>
          <PanelHeader title="Where the money went" description={range.label} />
          <div className="pt-2">
            <KeyValue rows={[
              { label: 'Customers paid', value: money(summary.gross) },
              { label: 'Provider fees', value: `−${money(summary.provider_fees)}` },
              { label: 'Platform fees', value: `−${money(summary.platform_fees)}` },
              { label: 'Refunds', value: `−${money(summary.refunds)}` },
              ...(summary.adjustments.minor !== 0
                ? [{ label: 'Adjustments', value: money(summary.adjustments) }] : []),
              { label: 'Your net', value: money(summary.net) },
            ]} />
            <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--color-ink-faint)]">
              The platform charges a flat fee per successful order and never holds your money —
              your provider settles directly to you.
            </p>
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel padded={false}>
            <PanelHeader title="Ledger" description="Append-only. A correction is a new entry, never an edit." />
            <div className="p-3">
              <Deferred data="recent" fallback={<Skeleton rows={5} />}>
                <LedgerEntries />
              </Deferred>
            </div>
          </Panel>
        </div>

        <Panel padded={false}>
          <PanelHeader title="Recent payouts" />
          <div className="p-3">
            <Deferred data="payouts" fallback={<Skeleton rows={3} />}>
              <Payouts />
            </Deferred>
          </div>
        </Panel>
      </div>
    </>
  )
}

function RevenueChart() {
  const { series = [] } = usePage().props as unknown as Props
  return (
    <AreaChart
      points={series.map((point) => ({
        label: point.date, value: point.revenue_minor, display: money(point.revenue),
      }))}
      valueLabel="Revenue"
      emptyTitle="No revenue in this period"
    />
  )
}

function LedgerEntries() {
  const { recent = [] } = usePage().props as unknown as Props
  if (recent.length === 0) {
    return <Empty title="Nothing booked yet" body="Charges, fees, refunds and payouts land here as they happen." />
  }
  return (
    <div className="divide-y divide-[var(--color-line-soft)]">
      {recent.map((entry) => (
        <div key={entry.id} className="flex items-center justify-between gap-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-[12.5px] text-[var(--color-ink)]">
              {entry.description}
              {entry.order_id && (
                <Link href={`/orders/${entry.order_id}`} className="ml-1.5 text-[var(--color-accent)] hover:underline">
                  #{entry.order_number}
                </Link>
              )}
            </p>
            <p className="text-[11.5px] text-[var(--color-ink-faint)]">{dateTime(entry.occurred_at)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge tone={KIND_TONE[entry.kind] ?? 'neutral'}>{entry.kind.replace(/_/g, ' ')}</Badge>
            <span className={'text-[13px] font-medium tabular ' +
              (entry.amount.minor >= 0 ? 'text-[var(--color-ink)]' : 'text-[var(--color-critical)]')}>
              {money(entry.amount)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function Payouts() {
  const { payouts = [] } = usePage().props as unknown as Props
  if (payouts.length === 0) {
    return <Empty title="No payouts yet" body="Your provider settles on its own schedule, straight to your bank." />
  }
  return (
    <div className="divide-y divide-[var(--color-line-soft)]">
      {payouts.map((payout) => (
        <div key={payout.id} className="flex items-center justify-between gap-3 py-2">
          <div className="min-w-0">
            <p className="text-[12.5px] font-medium text-[var(--color-ink)] tabular">{money(payout.amount)}</p>
            <p className="truncate text-[11.5px] text-[var(--color-ink-faint)]">
              {payout.destination ?? payout.provider} · {dateTime(payout.paid_at)}
            </p>
          </div>
          <StatusBadge status={payout.status} />
        </div>
      ))}
    </div>
  )
}
