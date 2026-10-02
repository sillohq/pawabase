/**
 * POS Sessions — list, open, close, and end-of-day report.
 *
 * Three views in one file, driven by which props come down:
 *   /pos/sessions         → session list
 *   /pos/sessions/{id}    → SessionDetail (end-of-day report)
 *
 * The "open session" form lives inline on the list page — a modal triggered
 * by the primary CTA. The "close session" flow is on the detail page.
 */

import { Head, router, useForm } from '@inertiajs/react'
import { useState } from 'react'
import { cx, date, dateTime, money } from '@/js/hooks'
import type { Money, Pagination } from '@/js/types'
import {
  IconClock,
} from '@/views/ui/icons'
import {
  Badge,
  Button,
  Empty,
  Field,
  Input,
  Modal,
  PageHeader,
  Panel,
  PanelHeader,
  Pager,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from '@/views/ui/kit'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SessionRow = {
  id: number
  status: 'open' | 'closed'
  device_label: string | null
  opened_by: string | null
  opening_float: Money
  opened_at: string | null
  closed_at: string | null
  total_sales: Money
  order_count: number
  variance_minor: number | null
}

type Device = { id: number; label: string }

type SessionDetailData = {
  id: number
  status: string
  opened_at: string | null
  closed_at: string | null
  opening_float: Money
  closing_count: Money
  expected_cash: Money
  variance: Money
  variance_minor: number | null
  total_sales: Money
  total_refunds: Money
  order_count: number
  cash_tendered: Money
  card_tendered: Money
  note: string | null
}

type SessionItemRow = {
  product_title: string
  variant_title: string | null
  sku: string | null
  quantity_sold: number
  quantity_refunded: number
  gross: Money
  refunded: Money
}

type OrderRow = {
  id: number
  number: number
  status: string
  payment_status: string
  total: Money
  customer_name: string
  placed_at: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function VarianceBadge({ minor }: { minor: number | null }) {
  if (minor === null) return null
  if (minor === 0) return <Badge tone="ok">Balanced</Badge>
  if (minor > 0) return <Badge tone="brand">+{(minor / 100).toFixed(2)} over</Badge>
  return <Badge tone="caution">{(minor / 100).toFixed(2)} short</Badge>
}

// ---------------------------------------------------------------------------
// Open Session Modal
// ---------------------------------------------------------------------------

function OpenSessionModal({
  devices,
  onClose,
}: {
  devices: Device[]
  onClose: () => void
}) {
  const form = useForm({ device_id: '', opening_float: '' })

  return (
    <Modal
      open
      onClose={onClose}
      title="Open a session"
      description="Record the cash float in your drawer to start the shift."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            tone="primary"
            loading={form.processing}
            onClick={() => form.post('/pos/sessions/open')}
          >
            Open session
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {devices.length > 0 && (
          <Field label="Device" hint="Which register is this session for?">
            <Select
              value={form.data.device_id}
              onChange={(e) => form.setData('device_id', e.target.value)}
            >
              <option value="">No device</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field
          label="Opening float"
          hint="How much cash is in the drawer right now?"
          error={form.errors.opening_float}
        >
          <Input
            type="number"
            min={0}
            step="0.01"
            placeholder="0.00"
            value={form.data.opening_float}
            onChange={(e) => form.setData('opening_float', e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Close Session Modal
// ---------------------------------------------------------------------------

function CloseSessionModal({
  sessionId,
  onClose,
}: {
  sessionId: number
  onClose: () => void
}) {
  const form = useForm({ closing_count: '', note: '' })

  return (
    <Modal
      open
      onClose={onClose}
      title="Close session"
      description="Count the cash in the drawer and enter it below. We'll calculate the variance."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            tone="primary"
            loading={form.processing}
            onClick={() => form.post(`/pos/sessions/${sessionId}/close`)}
          >
            Close session
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field
          label="Cash counted"
          hint="Total cash in the drawer at close."
          error={form.errors.closing_count}
        >
          <Input
            type="number"
            min={0}
            step="0.01"
            autoFocus
            placeholder="0.00"
            value={form.data.closing_count}
            onChange={(e) => form.setData('closing_count', e.target.value)}
          />
        </Field>
        <Field label="Note" hint="Any comments on this session.">
          <Input
            value={form.data.note}
            onChange={(e) => form.setData('note', e.target.value)}
            placeholder="All good"
          />
        </Field>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Sessions list page
// ---------------------------------------------------------------------------

type ListProps = {
  sessions: SessionRow[]
  pagination: Pagination
  devices?: Device[]
}

export function Sessions({ sessions, pagination, devices = [] }: ListProps) {
  const [openModal, setOpenModal] = useState(false)
  const openSession = sessions.find((s) => s.status === 'open')

  return (
    <>
      <Head title="POS Sessions" />
      <PageHeader
        title="POS Sessions"
        description="Each session tracks one shift's sales, cash and reconciliation."
        actions={
          openSession ? (
            <Button onClick={() => router.visit(`/pos/sessions/${openSession.id}`)}>
              <IconClock className="h-3.5 w-3.5" />
              View open session
            </Button>
          ) : (
            <Button tone="primary" onClick={() => setOpenModal(true)}>
              Open session
            </Button>
          )
        }
      />

      <Panel padded={false}>
        {sessions.length === 0 ? (
          <Empty
            title="No sessions yet"
            body="Open a session before you start selling to track cash and reconcile at end of day."
            action={<Button tone="primary" onClick={() => setOpenModal(true)}>Open first session</Button>}
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Session</TH>
                <TH>Device</TH>
                <TH>Opened by</TH>
                <TH>Opened</TH>
                <TH>Closed</TH>
                <TH align="right">Sales</TH>
                <TH align="right">Orders</TH>
                <TH>Variance</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {sessions.map((s) => (
                <TR key={s.id} href={`/pos/sessions/${s.id}`}>
                  <TD>
                    <div className="flex items-center gap-2">
                      <span className={cx(
                        'inline-flex h-2 w-2 shrink-0 rounded-full',
                        s.status === 'open' ? 'bg-emerald-500' : 'bg-[var(--color-line)]',
                      )} />
                      <span className="text-[13px] font-medium text-[var(--color-ink)]">
                        #{s.id}
                      </span>
                      {s.status === 'open' && <Badge tone="ok">Open</Badge>}
                    </div>
                  </TD>
                  <TD>{s.device_label ?? <span className="text-[var(--color-ink-faint)]">—</span>}</TD>
                  <TD>{s.opened_by ?? <span className="text-[var(--color-ink-faint)]">—</span>}</TD>
                  <TD>{date(s.opened_at)}</TD>
                  <TD>{s.closed_at ? date(s.closed_at) : <span className="text-[var(--color-ink-faint)]">—</span>}</TD>
                  <TD align="right">{money(s.total_sales)}</TD>
                  <TD align="right">{s.order_count}</TD>
                  <TD><VarianceBadge minor={s.variance_minor} /></TD>
                  <TD>
                    <Button size="sm" onClick={() => router.visit(`/pos/sessions/${s.id}`)}>
                      {s.status === 'open' ? 'Close' : 'Report'}
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Panel>

      <Pager
        page={pagination.page}
        pages={pagination.pages}
        total={pagination.total}
        onPage={(p) =>
          router.get('/pos/sessions', { page: p }, { preserveState: true })
        }
      />

      {openModal && (
        <OpenSessionModal devices={devices} onClose={() => setOpenModal(false)} />
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Session detail / end-of-day report
// ---------------------------------------------------------------------------

type DetailProps = {
  session: SessionDetailData
  items: SessionItemRow[]
  orders: OrderRow[]
}

export function SessionDetail({ session, items, orders }: DetailProps) {
  const [closing, setClosing] = useState(false)

  return (
    <>
      <Head title={`Session #${session.id}`} />
      <PageHeader
        title={`Session #${session.id}`}
        breadcrumbs={[
          { label: 'POS', href: '/pos' },
          { label: 'Sessions', href: '/pos/sessions' },
        ]}
        actions={
          session.status === 'open' ? (
            <Button tone="primary" onClick={() => setClosing(true)}>
              Close session
            </Button>
          ) : (
            <Badge tone="neutral">Closed {date(session.closed_at)}</Badge>
          )
        }
      />

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total sales', value: money(session.total_sales) },
          { label: 'Orders', value: String(session.order_count) },
          { label: 'Cash tendered', value: money(session.cash_tendered) },
          { label: 'Card tendered', value: money(session.card_tendered) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-[var(--radius)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-faint)]">
              {label}
            </p>
            <p className="mt-1.5 text-[22px] font-bold text-[var(--color-ink)]">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cash reconciliation */}
        <Panel>
          <PanelHeader title="Cash reconciliation" />
          <div className="divide-y divide-[var(--color-line-soft)] px-4">
            {[
              { label: 'Opening float', value: money(session.opening_float) },
              { label: 'Cash tendered', value: money(session.cash_tendered) },
              { label: 'Expected in drawer', value: money(session.expected_cash) },
              { label: 'Counted at close', value: money(session.closing_count) },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-3">
                <span className="text-[13px] text-[var(--color-ink-soft)]">{label}</span>
                <span className="text-[13px] font-medium text-[var(--color-ink)]">{value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between py-3">
              <span className="text-[13px] font-semibold text-[var(--color-ink)]">Variance</span>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-[var(--color-ink)]">
                  {money(session.variance)}
                </span>
                <VarianceBadge minor={session.variance_minor} />
              </div>
            </div>
          </div>
          {session.note && (
            <div className="border-t border-[var(--color-line)] px-4 py-3">
              <p className="text-[12.5px] text-[var(--color-ink-soft)]">{session.note}</p>
            </div>
          )}
        </Panel>

        {/* Items sold */}
        <Panel padded={false}>
          <PanelHeader title="Items sold" description={`${items.length} products`} />
          {items.length === 0 ? (
            <Empty title="No items" body="No products were sold in this session." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Product</TH>
                  <TH align="right">Sold</TH>
                  <TH align="right">Gross</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((item, i) => (
                  <TR key={i}>
                    <TD>
                      <p className="text-[13px] font-medium text-[var(--color-ink)]">
                        {item.product_title}
                      </p>
                      {item.variant_title && (
                        <p className="text-[11.5px] text-[var(--color-ink-faint)]">
                          {item.variant_title}
                        </p>
                      )}
                    </TD>
                    <TD align="right">{item.quantity_sold}</TD>
                    <TD align="right">{money(item.gross)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Panel>
      </div>

      {/* Orders in session */}
      <div className="mt-6">
        <Panel padded={false}>
          <PanelHeader title="Orders" description={`${orders.length} orders in this session`} />
          {orders.length === 0 ? (
            <Empty title="No orders" body="No orders were placed in this session." />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Order</TH>
                  <TH>Customer</TH>
                  <TH>Status</TH>
                  <TH align="right">Total</TH>
                  <TH>Time</TH>
                </TR>
              </THead>
              <TBody>
                {orders.map((o) => (
                  <TR key={o.id} href={`/orders/${o.id}`}>
                    <TD>
                      <span className="font-medium text-[var(--color-ink)]">#{o.number}</span>
                    </TD>
                    <TD>{o.customer_name}</TD>
                    <TD>
                      <Badge
                        tone={
                          o.payment_status === 'paid' ? 'ok'
                          : o.payment_status === 'failed' ? 'critical'
                          : 'neutral'
                        }
                      >
                        {o.payment_status}
                      </Badge>
                    </TD>
                    <TD align="right">{money(o.total)}</TD>
                    <TD>{o.placed_at ? dateTime(o.placed_at) : '—'}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Panel>
      </div>

      {closing && (
        <CloseSessionModal
          sessionId={session.id}
          onClose={() => setClosing(false)}
        />
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Default export (list) — detail is accessed via separate route key
// ---------------------------------------------------------------------------

export default Sessions
