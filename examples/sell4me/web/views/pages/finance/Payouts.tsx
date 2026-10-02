import { Head } from '@inertiajs/react'
import { dateTime, money } from '@/js/hooks'
import {
  Banner, Empty, LinkButton, Mono, PageHeader, Stat, StatRow, StatusBadge,
  TBody, TD, TH, THead, TR, Table,
} from '@/views/ui/kit'
import { IconCard } from '@/views/ui/icons'
import type { Money } from '@/js/types'

type Payout = {
  id: number
  provider: string
  reference: string
  amount: Money
  status: string
  destination: string | null
  period_start: string | null
  period_end: string | null
  expected_at: string | null
  paid_at: string | null
  failure_message: string | null
}

type Props = {
  payouts: Payout[]
  awaiting: Money
  paid_out: Money
  providers: { provider: string; label: string; is_default: boolean }[]
}

export default function Payouts({ payouts, awaiting, paid_out }: Props) {
  return (
    <>
      <Head title="Payouts" />
      <PageHeader
        title="Payouts"
        description="Your share of every confirmed order, sent to your bank."
        actions={<LinkButton href="/payments/payouts/connect" size="sm">Connect payouts</LinkButton>}
      />

      <div className="mb-4">
        <Banner tone="info" title="Paid out after each order is confirmed">
          Customer payments settle to the platform first. Once an order is confirmed, your
          share is transferred to the bank account connected under Payouts — this page is
          that history.
        </Banner>
      </div>

      <StatRow>
        <Stat label="Awaiting payout" value={money(awaiting)} hint="earned, not yet settled" />
        <Stat label="Paid out" value={money(paid_out)} hint="all time" />
        <Stat label="Payouts" value={payouts.length} />
      </StatRow>

      <div className="mt-4">
        {payouts.length === 0 ? (
          <div className="panel">
            <Empty
              icon={<IconCard className="h-6 w-6" />}
              title="No payouts recorded yet"
              body="Your first settlement will appear here once your provider sends it — and tells us about it."
            />
          </div>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Reference</TH>
                <TH>Destination</TH>
                <TH>Status</TH>
                <TH align="right">Amount</TH>
                <TH align="right">Paid</TH>
              </tr>
            </THead>
            <TBody>
              {payouts.map((payout) => (
                <TR key={payout.id}>
                  <TD>
                    <Mono>{payout.reference.slice(0, 22)}</Mono>
                    <span className="block text-[11.5px] capitalize text-[var(--color-ink-faint)]">
                      {payout.provider}
                    </span>
                  </TD>
                  <TD className="text-[var(--color-ink-soft)]">{payout.destination ?? '—'}</TD>
                  <TD>
                    <StatusBadge status={payout.status} />
                    {payout.failure_message && (
                      <span className="block max-w-[220px] truncate text-[11.5px] text-[var(--color-critical)]">
                        {payout.failure_message}
                      </span>
                    )}
                  </TD>
                  <TD align="right" className="font-medium">{money(payout.amount)}</TD>
                  <TD align="right" className="whitespace-nowrap text-[var(--color-ink-faint)]">
                    {payout.paid_at ? dateTime(payout.paid_at) : dateTime(payout.expected_at)}
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
