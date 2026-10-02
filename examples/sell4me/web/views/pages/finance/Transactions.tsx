import { Head, Link, router } from '@inertiajs/react'
import { useEffect, useState } from 'react'
import { dateTime, money, useDebounced } from '@/js/hooks'
import {
  Empty, Mono, Pager, PageHeader, SearchInput, StatusBadge,
  TBody, TD, TH, THead, TR, Table, Tabs,
} from '@/views/ui/kit'
import { IconCard } from '@/views/ui/icons'
import type { Money, Pagination } from '@/js/types'

type Transaction = {
  id: number
  reference: string
  provider: string
  provider_reference: string
  order_id: number | null
  order_number: number | null
  email: string | null
  status: string
  amount: Money
  provider_fee: Money | null
  platform_fee: Money
  refunded: Money
  net: Money
  method: string | null
  card: string | null
  failure_message: string | null
  created_at: string | null
}

type Props = {
  transactions: Transaction[]
  status: string
  search: string
  counts: Record<string, number>
  pagination: Pagination
}

export default function Transactions({ transactions, status, search, counts, pagination }: Props) {
  const [query, setQuery] = useState(search)
  const settled = useDebounced(query, 350)

  useEffect(() => {
    if (settled === search) return
    router.get('/payments/transactions', { status, q: settled || undefined },
      { preserveState: true, preserveScroll: true, replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled])

  return (
    <>
      <Head title="Transactions" />
      <PageHeader
        title="Transactions"
        description="Every charge, what it cost you, and what you were left with."
      />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          tabs={[
            { key: 'all', label: 'All', count: counts.all },
            { key: 'succeeded', label: 'Succeeded', count: counts.succeeded },
            { key: 'failed', label: 'Failed', count: counts.failed },
            { key: 'pending', label: 'Pending', count: counts.pending },
            { key: 'refunded', label: 'Refunded', count: counts.refunded },
          ]}
          active={status}
          onSelect={(key) => router.get('/payments/transactions', { status: key }, { preserveState: true })}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Reference or email…" className="w-full sm:w-64" />
      </div>

      {transactions.length === 0 ? (
        <div className="panel">
          <Empty icon={<IconCard className="h-6 w-6" />}
            title={search ? `Nothing matching “${search}”` : 'No transactions yet'}
            body="Charges appear here the moment a customer pays." />
        </div>
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Reference</TH>
              <TH>Order</TH>
              <TH>Status</TH>
              <TH align="right">Amount</TH>
              <TH align="right">Fees</TH>
              <TH align="right">Net to you</TH>
              <TH align="right">When</TH>
            </tr>
          </THead>
          <TBody>
            {transactions.map((transaction) => (
              <TR key={transaction.id}>
                <TD>
                  <Mono>{transaction.reference.slice(0, 18)}</Mono>
                  <span className="block text-[11.5px] capitalize text-[var(--color-ink-faint)]">
                    {transaction.provider}
                    {transaction.card && ` · ${transaction.card}`}
                  </span>
                </TD>
                <TD>
                  {transaction.order_id ? (
                    <Link href={`/orders/${transaction.order_id}`} className="text-[var(--color-accent)] hover:underline">
                      #{transaction.order_number}
                    </Link>
                  ) : <span className="text-[var(--color-ink-faint)]">—</span>}
                  {transaction.email && (
                    <span className="block max-w-[180px] truncate text-[11.5px] text-[var(--color-ink-faint)]">
                      {transaction.email}
                    </span>
                  )}
                </TD>
                <TD>
                  <StatusBadge status={transaction.status} />
                  {transaction.failure_message && (
                    <span className="block max-w-[200px] truncate text-[11.5px] text-[var(--color-critical)]">
                      {transaction.failure_message}
                    </span>
                  )}
                </TD>
                <TD align="right" className="font-medium">{money(transaction.amount)}</TD>
                <TD align="right" className="text-[var(--color-ink-soft)]">
                  {transaction.provider_fee ? money(transaction.provider_fee) : '—'}
                  <span className="block text-[11px] text-[var(--color-ink-faint)]">
                    + {money(transaction.platform_fee)} platform
                  </span>
                </TD>
                <TD align="right" className="font-medium">
                  {transaction.status === 'succeeded' ? money(transaction.net) : '—'}
                </TD>
                <TD align="right" className="whitespace-nowrap text-[var(--color-ink-faint)]">
                  {dateTime(transaction.created_at)}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {transactions.length > 0 && (
        <div className="panel mt-3">
          <Pager page={pagination.page} pages={pagination.pages} total={pagination.total}
            onPage={(page) => router.get('/payments/transactions',
              { status, q: search || undefined, page }, { preserveState: true })} />
        </div>
      )}
    </>
  )
}
