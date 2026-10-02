import { Head, router } from '@inertiajs/react'
import { useState } from 'react'
import { dateTime } from '@/js/hooks'
import {
  Badge, Empty, Modal, Mono, Pager, PageHeader, Panel, Select,
  TBody, TD, TH, THead, TR, Table,
} from '@/views/ui/kit'
import type { Pagination } from '@/js/types'

type Entry = {
  id: number
  actor: string
  action: string
  resource_type: string
  resource_id: string | null
  summary: string
  changes: Record<string, { from: unknown; to: unknown }>
  ip_address: string | null
  created_at: string | null
}

type Props = {
  entries: Entry[]
  actions: string[]
  filters: { action: string | null; resource: string | null }
  pagination: Pagination
}

export default function AuditLog({ entries, actions, filters, pagination }: Props) {
  const [showing, setShowing] = useState<Entry | null>(null)

  return (
    <>
      <Head title="Audit log" />
      <PageHeader
        title="Audit log"
        description="Who did what, and when. Written by the services and never edited — there is no route in this application that changes a row here."
        actions={
          <Select
            value={filters.action ?? ''}
            className="w-auto"
            onChange={(event) => router.get('/settings/audit',
              { action: event.target.value || undefined }, { preserveState: true })}
          >
            <option value="">Every action</option>
            {actions.map((action) => <option key={action} value={action}>{action}</option>)}
          </Select>
        }
      />

      {entries.length === 0 ? (
        <div className="panel">
          <Empty title="Nothing logged yet"
            body="Changes to money, access and published state are recorded here as they happen." />
        </div>
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>When</TH>
              <TH>Who</TH>
              <TH>What</TH>
              <TH>Action</TH>
              <TH align="right">IP</TH>
            </tr>
          </THead>
          <TBody>
            {entries.map((entry) => (
              <TR key={entry.id}>
                <TD className="whitespace-nowrap text-[var(--color-ink-faint)]">
                  {dateTime(entry.created_at)}
                </TD>
                <TD className="text-[var(--color-ink)]">{entry.actor}</TD>
                <TD>
                  <button type="button" onClick={() => setShowing(entry)}
                    className="text-left text-[var(--color-ink)] hover:text-[var(--color-accent)]">
                    {entry.summary}
                  </button>
                  {Object.keys(entry.changes).length > 0 && (
                    <span className="ml-1.5 text-[11px] text-[var(--color-ink-faint)]">
                      {Object.keys(entry.changes).length} field
                      {Object.keys(entry.changes).length === 1 ? '' : 's'} changed
                    </span>
                  )}
                </TD>
                <TD><Badge>{entry.action}</Badge></TD>
                <TD align="right" className="text-[var(--color-ink-faint)]">
                  {entry.ip_address ? <Mono>{entry.ip_address}</Mono> : '—'}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {entries.length > 0 && (
        <div className="panel mt-3">
          <Pager page={pagination.page} pages={pagination.pages} total={pagination.total}
            onPage={(page) => router.get('/settings/audit',
              { ...filters, page }, { preserveState: true })} />
        </div>
      )}

      {showing && (
        <Modal open onClose={() => setShowing(null)} title={showing.summary}
          description={`${showing.actor} · ${dateTime(showing.created_at)}`}>
          <div className="space-y-3">
            <Panel>
              <dl className="grid gap-1.5 text-[12.5px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--color-ink-faint)]">Action</dt>
                  <dd><Mono>{showing.action}</Mono></dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--color-ink-faint)]">Resource</dt>
                  <dd><Mono>{showing.resource_type}{showing.resource_id && ` #${showing.resource_id}`}</Mono></dd>
                </div>
                {showing.ip_address && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--color-ink-faint)]">IP address</dt>
                    <dd><Mono>{showing.ip_address}</Mono></dd>
                  </div>
                )}
              </dl>
            </Panel>

            {Object.keys(showing.changes).length > 0 && (
              <div>
                <p className="mb-1.5 text-[12.5px] font-medium text-[var(--color-ink)]">
                  What changed
                </p>
                <div className="divide-y divide-[var(--color-line-soft)] rounded-[var(--radius-sm)] border border-[var(--color-line)]">
                  {Object.entries(showing.changes).map(([field, change]) => (
                    <div key={field} className="px-3 py-2">
                      <p className="text-[12px] font-medium text-[var(--color-ink)]">{field}</p>
                      <p className="mt-0.5 text-[12px] text-[var(--color-ink-soft)]">
                        <span className="text-[var(--color-critical)] line-through">
                          {JSON.stringify(change.from)}
                        </span>
                        {' → '}
                        <span className="text-[var(--color-positive)]">
                          {JSON.stringify(change.to)}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}
