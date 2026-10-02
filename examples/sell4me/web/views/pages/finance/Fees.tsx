import { Head, Link, router } from '@inertiajs/react'
import { dateTime, money, useShared } from '@/js/hooks'
import {
  Badge, Empty, Panel, PageHeader, Stat, StatRow,
  TBody, TD, TH, THead, TR, Table,
} from '@/views/ui/kit'
import type { Money } from '@/js/types'

type Entry = {
  id: number
  kind: string
  description: string
  amount: Money
  signed_minor: number
  order_id: number | null
  order_number: number | null
  occurred_at: string | null
}

type Props = {
  range: { key: string; label: string }
  summary: Record<string, Money>
  entries: Entry[]
}

const RANGES = [['7d', '7 days'], ['30d', '30 days'], ['90d', '90 days'], ['ytd', 'Year']]

export default function Fees({ range, summary, entries }: Props) {
  const { app } = useShared()

  return (
    <>
      <Head title="Fees" />
      <PageHeader
        title="Fees"
        description="What each sale cost you, itemised per order — not a single total you have no way to check."
        actions={
          <div className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] p-0.5">
            {RANGES.map(([key, label]) => (
              <button key={key} type="button"
                onClick={() => router.get('/payments/fees', { range: key }, { preserveState: true })}
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

      <StatRow>
        <Stat label="Platform fees" value={money(summary.platform_fees)} hint={`flat per successful order`} />
        <Stat label="Provider fees" value={money(summary.provider_fees)} hint="charged by your payment provider" />
        <Stat label="Gross revenue" value={money(summary.gross)} />
        <Stat label="Your net" value={money(summary.net)} />
      </StatRow>

      <Panel className="mt-4">
        <h2 className="text-[13px] font-semibold text-[var(--color-ink)]">How the platform fee works</h2>
        <p className="mt-1.5 max-w-3xl text-[12.5px] leading-relaxed text-[var(--color-ink-soft)]">
          A flat{' '}
          <strong className="text-[var(--color-ink)]">
            {new Intl.NumberFormat(undefined, {
              style: 'currency', currency: app.platform_fee.currency,
            }).format(app.platform_fee.minor / 100)}
          </strong>{' '}
          per successful order — not per payment, and not a percentage. An order paid in two
          instalments is charged once. A fully refunded order has its fee reversed; a partially
          refunded one keeps it, because the sale did happen.
        </p>
        <p className="mt-2 max-w-3xl text-[12.5px] leading-relaxed text-[var(--color-ink-soft)]">
          Your payment provider&rsquo;s fee is separate and set by them. We record what they
          report rather than estimating it — which is why a fee can read as unknown until the
          charge settles.
        </p>
      </Panel>

      <div className="mt-4">
        {entries.length === 0 ? (
          <div className="panel">
            <Empty title="No fees in this period" body="Fees are booked when an order is paid." />
          </div>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Fee</TH>
                <TH>Order</TH>
                <TH align="right">Amount</TH>
                <TH align="right">When</TH>
              </tr>
            </THead>
            <TBody>
              {entries.map((entry) => (
                <TR key={entry.id}>
                  <TD>
                    <Badge tone={entry.kind === 'platform_fee' ? 'accent' : 'neutral'}>
                      {entry.kind.replace(/_/g, ' ')}
                    </Badge>
                    <span className="ml-2 text-[12.5px] text-[var(--color-ink-soft)]">
                      {entry.description}
                    </span>
                  </TD>
                  <TD>
                    {entry.order_id ? (
                      <Link href={`/orders/${entry.order_id}`} className="text-[var(--color-accent)] hover:underline">
                        #{entry.order_number}
                      </Link>
                    ) : '—'}
                  </TD>
                  <TD align="right" className={'font-medium ' +
                    (entry.signed_minor > 0 ? 'text-[var(--color-positive)]' : 'text-[var(--color-ink)]')}>
                    {entry.signed_minor > 0 ? '+' : '−'}{money(entry.amount)}
                  </TD>
                  <TD align="right" className="whitespace-nowrap text-[var(--color-ink-faint)]">
                    {dateTime(entry.occurred_at)}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>
    </>
  )
}
