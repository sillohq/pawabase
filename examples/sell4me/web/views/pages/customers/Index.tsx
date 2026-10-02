import { Head, Link, router } from '@inertiajs/react'
import { useEffect, useState } from 'react'
import { date, money, useDebounced } from '@/js/hooks'
import {
  Badge, Empty, Pager, PageHeader, SearchInput, Select,
  TBody, TD, TH, THead, TR, Table,
} from '@/views/ui/kit'
import { IconCustomers } from '@/views/ui/icons'
import type { CustomerRow, Pagination } from '@/js/types'

type Props = {
  customers: CustomerRow[]
  search: string
  sort: string
  segment_id: number | null
  segments: { id: number; name: string }[]
  pagination: Pagination
}

const SORTS = [
  ['-total_spent_minor', 'Highest spend'],
  ['-orders_count', 'Most orders'],
  ['-last_order_at', 'Most recent order'],
  ['-created_at', 'Newest'],
]

export default function CustomersIndex({ customers, search, sort, segment_id, segments, pagination }: Props) {
  const [query, setQuery] = useState(search)
  const settled = useDebounced(query, 350)

  useEffect(() => {
    if (settled === search) return
    router.get('/customers', { q: settled || undefined, sort, segment: segment_id ?? undefined },
      { preserveState: true, preserveScroll: true, replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled])

  function go(next: Record<string, unknown>) {
    router.get('/customers',
      { q: search || undefined, sort, segment: segment_id ?? undefined, ...next },
      { preserveState: true })
  }

  return (
    <>
      <Head title="Customers" />
      <PageHeader title="Customers" description="Everyone who has bought from you, and what they are worth." />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Name or email…" className="w-full sm:w-64" />
        <Select
          value={segment_id ?? ''}
          onChange={(event) => go({ segment: event.target.value || undefined, page: 1 })}
          className="w-auto"
        >
          <option value="">All customers</option>
          {segments.map((segment) => (
            <option key={segment.id} value={segment.id}>{segment.name}</option>
          ))}
        </Select>
        <Select value={sort} onChange={(event) => go({ sort: event.target.value, page: 1 })} className="w-auto">
          {SORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
      </div>

      {customers.length === 0 ? (
        <div className="panel">
          <Empty
            icon={<IconCustomers className="h-6 w-6" />}
            title={search ? `Nobody matching “${search}”` : 'No customers yet'}
            body={search ? 'Try an email address.' : 'A customer record is created the first time someone checks out.'}
          />
        </div>
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Customer</TH>
              <TH align="right">Orders</TH>
              <TH align="right">Total spent</TH>
              <TH align="right">Average</TH>
              <TH align="right">Last order</TH>
              <TH>Marketing</TH>
            </tr>
          </THead>
          <TBody>
            {customers.map((customer) => (
              <TR key={customer.id} href={`/customers/${customer.id}`}>
                <TD>
                  <Link href={`/customers/${customer.id}`} className="font-medium text-[var(--color-ink)] hover:text-[var(--color-accent)]">
                    {customer.name}
                  </Link>
                  <span className="block truncate text-[12px] text-[var(--color-ink-faint)]">{customer.email}</span>
                </TD>
                <TD align="right">{customer.orders_count}</TD>
                <TD align="right" className="font-medium">{money(customer.total_spent)}</TD>
                <TD align="right" className="text-[var(--color-ink-soft)]">{money(customer.average_order)}</TD>
                <TD align="right" className="whitespace-nowrap text-[var(--color-ink-faint)]">
                  {date(customer.last_order_at)}
                </TD>
                <TD>
                  {customer.accepts_marketing
                    ? <Badge tone="positive" dot>subscribed</Badge>
                    : <span className="text-[var(--color-ink-faint)]">—</span>}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {customers.length > 0 && (
        <div className="panel mt-3">
          <Pager page={pagination.page} pages={pagination.pages} total={pagination.total}
            onPage={(page) => go({ page })} />
        </div>
      )}
    </>
  )
}
