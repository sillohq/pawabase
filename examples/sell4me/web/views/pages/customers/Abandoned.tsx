import { Head, router } from '@inertiajs/react'
import { useState } from 'react'
import { dateTime, money, useCan } from '@/js/hooks'
import {
  Banner, Button, Empty, Modal, PageHeader, Stat, StatRow,
  StatusBadge, TBody, TD, TH, THead, TR, Table, Tabs,
} from '@/views/ui/kit'
import { IconCart, IconLink } from '@/views/ui/icons'
import type { Money } from '@/js/types'

type Cart = {
  id: number
  email: string | null
  customer_id: number | null
  customer: string | null
  value: Money
  item_count: number
  recovery_status: string
  recovery_url: string
  items: { title: string; variant: string; quantity: number }[]
  notified_at: string | null
  created_at: string | null
}

type Props = {
  carts: Cart[]
  status: string
  counts: Record<string, number>
  recovered_value: Money
}

export default function Abandoned({ carts, status, counts, recovered_value }: Props) {
  const can = useCan()
  const [showing, setShowing] = useState<Cart | null>(null)

  const totalValue = carts.reduce((sum, cart) => sum + cart.value.minor, 0)
  const currency = carts[0]?.value.currency ?? 'NGN'

  return (
    <>
      <Head title="Abandoned carts" />
      <PageHeader
        title="Abandoned carts"
        description="Baskets that reached checkout and were never paid for. The stock they held has been released."
      />

      <StatRow>
        <Stat label="Abandoned" value={counts.all ?? 0} />
        <Stat
          label="Value left behind"
          value={new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(totalValue / 100)}
          hint="on this page"
        />
        <Stat label="Recovered" value={counts.recovered ?? 0} tone="positive" />
        <Stat label="Recovered value" value={money(recovered_value)} tone="positive" />
      </StatRow>

      <div className="my-3">
        <Tabs
          tabs={[
            { key: 'all', label: 'All', count: counts.all },
            { key: 'pending', label: 'Not followed up', count: counts.pending },
            { key: 'notified', label: 'Followed up', count: counts.notified },
            { key: 'recovered', label: 'Recovered', count: counts.recovered },
          ]}
          active={status}
          onSelect={(key) => router.get('/customers/abandoned', { status: key }, { preserveState: true })}
        />
      </div>

      {carts.length === 0 ? (
        <div className="panel">
          <Empty icon={<IconCart className="h-6 w-6" />} title="Nothing abandoned"
            body="Every basket that reached checkout was paid for. That is the ideal state." />
        </div>
      ) : (
        <>
          <Banner tone="info">
            The platform has no mail transport wired in, so recovery links are yours to send.
            Each link restores the exact basket the shopper left.
          </Banner>

          <div className="mt-3">
            <Table>
              <THead>
                <tr>
                  <TH>Customer</TH>
                  <TH align="right">Items</TH>
                  <TH align="right">Value</TH>
                  <TH>Status</TH>
                  <TH align="right">Abandoned</TH>
                  <TH />
                </tr>
              </THead>
              <TBody>
                {carts.map((cart) => (
                  <TR key={cart.id}>
                    <TD>
                      <span className="font-medium text-[var(--color-ink)]">
                        {cart.customer ?? cart.email ?? 'Anonymous shopper'}
                      </span>
                      {cart.email && cart.customer && (
                        <span className="block text-[12px] text-[var(--color-ink-faint)]">{cart.email}</span>
                      )}
                    </TD>
                    <TD align="right">{cart.item_count}</TD>
                    <TD align="right" className="font-medium">{money(cart.value)}</TD>
                    <TD><StatusBadge status={cart.recovery_status} /></TD>
                    <TD align="right" className="whitespace-nowrap text-[var(--color-ink-faint)]">
                      {dateTime(cart.created_at)}
                    </TD>
                    <TD align="right">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" onClick={() => setShowing(cart)}>Basket</Button>
                        {can('customers.update') && cart.recovery_status === 'pending' && (
                          <Button size="sm"
                            onClick={() => router.post(`/customers/abandoned/${cart.id}/notify`, {}, { preserveScroll: true })}>
                            Mark followed up
                          </Button>
                        )}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </>
      )}

      {showing && (
        <Modal open onClose={() => setShowing(null)} title="What they left behind"
          description={showing.email ?? 'Anonymous shopper'} width="sm">
          <div className="space-y-2">
            {showing.items.map((item, index) => (
              <div key={index} className="flex items-center justify-between gap-3 text-[13px]">
                <span className="min-w-0 truncate text-[var(--color-ink)]">
                  {item.title}
                  <span className="text-[var(--color-ink-faint)]"> · {item.variant}</span>
                </span>
                <span className="shrink-0 text-[var(--color-ink-soft)] tabular">× {item.quantity}</span>
              </div>
            ))}
            {showing.item_count > showing.items.length && (
              <p className="text-[12px] text-[var(--color-ink-faint)]">
                and {showing.item_count - showing.items.length} more
              </p>
            )}
          </div>

          <div className="mt-4 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-sunken)] p-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-ink)]">
              <IconLink className="h-3.5 w-3.5" />
              Recovery link
            </p>
            <code className="block overflow-x-auto text-[11.5px] text-[var(--color-ink-soft)]">
              {showing.recovery_url}
            </code>
            <p className="mt-1.5 text-[11.5px] text-[var(--color-ink-faint)]">
              Opening it puts these items back in their basket.
            </p>
          </div>
        </Modal>
      )}
    </>
  )
}
