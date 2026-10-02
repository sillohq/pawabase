import { Head, Link } from '@inertiajs/react'
import { dateTime, money } from '@/js/hooks'
import { Badge, Empty, Mono, PageHeader, StatusBadge, TBody, TD, TH, THead, TR, Table } from '@/views/ui/kit'
import { IconRefund } from '@/views/ui/icons'
import type { Money } from '@/js/types'

type Refund = {
  id: number
  reference: string
  order_id: number
  order_number: number | null
  amount: Money
  reason: string | null
  status: string
  provider: string
  platform_fee_reversed: boolean
  actor: string
  created_at: string | null
}

export default function Refunds({ refunds }: { refunds: Refund[] }) {
  return (
    <>
      <Head title="Refunds" />
      <PageHeader
        title="Refunds"
        description="Money returned to customers. A full refund reverses the platform fee; a partial one does not."
      />

      {refunds.length === 0 ? (
        <div className="panel">
          <Empty icon={<IconRefund className="h-6 w-6" />} title="No refunds"
            body="Nothing has been sent back to a customer." />
        </div>
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Reference</TH>
              <TH>Order</TH>
              <TH>Reason</TH>
              <TH>By</TH>
              <TH>Status</TH>
              <TH align="right">Amount</TH>
              <TH align="right">When</TH>
            </tr>
          </THead>
          <TBody>
            {refunds.map((refund) => (
              <TR key={refund.id}>
                <TD><Mono>{refund.reference.slice(0, 18)}</Mono></TD>
                <TD>
                  <Link href={`/orders/${refund.order_id}`} className="text-[var(--color-accent)] hover:underline">
                    #{refund.order_number}
                  </Link>
                </TD>
                <TD className="max-w-[240px] truncate text-[var(--color-ink-soft)]">
                  {refund.reason ?? '—'}
                </TD>
                <TD className="text-[var(--color-ink-soft)]">{refund.actor}</TD>
                <TD>
                  <div className="flex flex-wrap gap-1">
                    <StatusBadge status={refund.status} />
                    {refund.platform_fee_reversed && <Badge tone="positive">fee reversed</Badge>}
                  </div>
                </TD>
                <TD align="right" className="font-medium text-[var(--color-critical)]">
                  −{money(refund.amount)}
                </TD>
                <TD align="right" className="whitespace-nowrap text-[var(--color-ink-faint)]">
                  {dateTime(refund.created_at)}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  )
}
