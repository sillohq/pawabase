import { Head, router } from '@inertiajs/react'
import { useState } from 'react'
import { dateTime } from '@/js/hooks'
import {
  Badge, Empty, Modal, Mono, PageHeader, StatusBadge,
  TBody, TD, TH, THead, TR, Table, Tabs,
} from '@/views/ui/kit'
import { IconCode } from '@/views/ui/icons'

type Delivery = {
  id: number
  webhook_id: number
  url: string | null
  event: string
  event_id: string
  status: string
  attempt: number
  status_code: number | null
  duration_ms: number | null
  error: string | null
  response_body: string | null
  payload: Record<string, unknown>
  next_attempt_at: string | null
  created_at: string | null
}

type Props = {
  deliveries: Delivery[]
  status: string
  counts: Record<string, number>
}

export default function WebhookLogs({ deliveries, status, counts }: Props) {
  const [showing, setShowing] = useState<Delivery | null>(null)

  return (
    <>
      <Head title="Delivery logs" />
      <PageHeader
        title="Delivery logs"
        description="Every attempt, not a counter. “Delivered on the fourth try, 90 seconds late” is a different fact from “delivered”."
      />

      <div className="mb-3">
        <Tabs
          tabs={[
            { key: 'all', label: 'All', count: counts.all },
            { key: 'delivered', label: 'Delivered', count: counts.delivered },
            { key: 'pending', label: 'Pending', count: counts.pending },
            { key: 'failed', label: 'Failed', count: counts.failed },
          ]}
          active={status}
          onSelect={(key) => router.get('/developers/logs', { status: key }, { preserveState: true })}
        />
      </div>

      {deliveries.length === 0 ? (
        <div className="panel">
          <Empty icon={<IconCode className="h-6 w-6" />} title="No deliveries yet"
            body="Once an endpoint is subscribed to an event, every attempt to reach it is logged here." />
        </div>
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Event</TH>
              <TH>Endpoint</TH>
              <TH>Status</TH>
              <TH align="right">Attempt</TH>
              <TH align="right">Took</TH>
              <TH align="right">When</TH>
            </tr>
          </THead>
          <TBody>
            {deliveries.map((delivery) => (
              <TR key={delivery.id}>
                <TD>
                  <button type="button" onClick={() => setShowing(delivery)}
                    className="text-left hover:text-[var(--color-accent)]">
                    <Mono>{delivery.event}</Mono>
                  </button>
                  <span className="block text-[11px] text-[var(--color-ink-faint)]">
                    {delivery.event_id.slice(0, 22)}
                  </span>
                </TD>
                <TD className="max-w-[240px] truncate text-[var(--color-ink-soft)]">
                  {delivery.url ?? '—'}
                </TD>
                <TD>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={delivery.status} />
                    {delivery.status_code && <Badge>{delivery.status_code}</Badge>}
                  </div>
                  {delivery.error && (
                    <span className="block max-w-[220px] truncate text-[11.5px] text-[var(--color-critical)]">
                      {delivery.error}
                    </span>
                  )}
                </TD>
                <TD align="right">{delivery.attempt}</TD>
                <TD align="right" className="text-[var(--color-ink-faint)]">
                  {delivery.duration_ms !== null ? `${delivery.duration_ms}ms` : '—'}
                </TD>
                <TD align="right" className="whitespace-nowrap text-[var(--color-ink-faint)]">
                  {dateTime(delivery.created_at)}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {showing && (
        <Modal open onClose={() => setShowing(null)} title={showing.event}
          description={`Attempt ${showing.attempt} · ${dateTime(showing.created_at)}`} width="lg">
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-[12px] font-medium text-[var(--color-ink)]">Payload sent</p>
              <pre className="max-h-64 overflow-auto rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-sunken)] p-3 text-[11.5px] text-[var(--color-ink-soft)]">
                {JSON.stringify(showing.payload, null, 2)}
              </pre>
            </div>
            {showing.response_body && (
              <div>
                <p className="mb-1 text-[12px] font-medium text-[var(--color-ink)]">
                  Response ({showing.status_code})
                </p>
                <pre className="max-h-40 overflow-auto rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-sunken)] p-3 text-[11.5px] text-[var(--color-ink-soft)]">
                  {showing.response_body}
                </pre>
              </div>
            )}
            {showing.next_attempt_at && (
              <p className="text-[12px] text-[var(--color-ink-soft)]">
                Next retry {dateTime(showing.next_attempt_at)}.
              </p>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}
