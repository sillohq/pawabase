import { Head, Link, router } from '@inertiajs/react'
import { useEffect, useState } from 'react'
import { date, money, useCan, useDebounced } from '@/js/hooks'
import {
  Badge,
  Button,
  Empty,
  Pager,
  PageHeader,
  SearchInput,
  StatusBadge,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  Tabs,
} from '@/views/ui/kit'
import { IconDownload, IconOrders } from '@/views/ui/icons'
import type { OrderRow, Pagination } from '@/js/types'

type Props = {
  orders: OrderRow[]
  tab: string
  tabs: { key: string; label: string; count: number }[]
  search: string
  pagination: Pagination
}

export default function OrdersIndex({ orders, tab, tabs, search, pagination }: Props) {
  const can = useCan()
  const [query, setQuery] = useState(search)
  const settled = useDebounced(query, 350)

  useEffect(() => {
    if (settled === search) return
    router.get(
      '/orders',
      { tab, q: settled || undefined },
      { preserveState: true, preserveScroll: true, replace: true },
    )
    // `search` is intentionally not a dependency: including it re-fires the
    // moment the server echoes the term back, which is an infinite loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled])

  function go(next: Record<string, unknown>) {
    router.get('/orders', { tab, q: search || undefined, ...next }, { preserveState: true })
  }

  return (
    <>
      <Head title="Orders" />
      <PageHeader
        title="Orders"
        description="Everything customers have bought, and what still needs doing."
        actions={
          can('reports.export') && (
            <Button size="sm" onClick={() => router.visit('/exports')}>
              <IconDownload className="h-3.5 w-3.5" />
              Export
            </Button>
          )
        }
      />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          tabs={tabs}
          active={tab}
          onSelect={(key) => router.get('/orders', { tab: key }, { preserveState: true })}
        />
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Order number, email or tracking…"
          className="w-full sm:w-72"
        />
      </div>

      {orders.length === 0 ? (
        <div className="panel">
          <Empty
            icon={<IconOrders className="h-6 w-6" />}
            title={search ? `No orders matching “${search}”` : 'No orders here yet'}
            body={
              search
                ? 'Try an order number, a customer email, or a tracking number.'
                : 'Orders appear the moment a customer completes checkout.'
            }
          />
        </div>
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Order</TH>
              <TH>Customer</TH>
              <TH>Payment</TH>
              <TH>Fulfilment</TH>
              <TH align="right">Items</TH>
              <TH align="right">Total</TH>
              <TH align="right">Placed</TH>
            </tr>
          </THead>
          <TBody>
            {orders.map((order) => (
              <TR key={order.id} href={`/orders/${order.id}`}>
                <TD>
                  <Link
                    href={`/orders/${order.id}`}
                    className="font-medium text-[var(--color-ink)] hover:text-[var(--color-accent)]"
                  >
                    #{order.number}
                  </Link>
                  {order.risk_score >= 40 && (
                    <span className="ml-1.5 align-middle">
                      <Badge tone="caution">Review</Badge>
                    </span>
                  )}
                </TD>
                <TD className="max-w-[240px] truncate text-[var(--color-ink-soft)]">
                  {order.customer ?? order.email}
                </TD>
                <TD><StatusBadge status={order.payment_status} /></TD>
                <TD><StatusBadge status={order.fulfilment_status} /></TD>
                <TD align="right" className="text-[var(--color-ink-soft)]">{order.items}</TD>
                <TD align="right" className="font-medium">
                  {money(order.total)}
                  {order.refunded.minor > 0 && (
                    <span className="ml-1 text-[11.5px] text-[var(--color-critical)]">
                      −{money(order.refunded)}
                    </span>
                  )}
                </TD>
                <TD align="right" className="whitespace-nowrap text-[var(--color-ink-faint)]">
                  {date(order.created_at)}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {orders.length > 0 && (
        <div className="panel mt-3">
          <Pager
            page={pagination.page}
            pages={pagination.pages}
            total={pagination.total}
            onPage={(page) => go({ page })}
          />
        </div>
      )}
    </>
  )
}
