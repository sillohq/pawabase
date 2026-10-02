/**
 * One order, in full.
 *
 * The layout answers the questions in the order a merchant asks them: what is
 * the state of this, what did they buy, where does it go, what did we actually
 * receive, and what happened along the way.
 *
 * The refund dialog computes its own total from the lines chosen — but that
 * figure is only a preview. The server recomputes it from the same lines, so a
 * tampered amount cannot refund more than the lines are worth.
 */

import { Head, router, useForm } from '@inertiajs/react'
import { useMemo, useState } from 'react'
import { dateTime, money, useCan } from '@/js/hooks'
import {
  Banner,
  Button,
  Field,
  Input,
  KeyValue,
  Modal,
  Mono,
  Panel,
  PanelHeader,
  PageHeader,
  StatusBadge,
  Textarea,
  Timeline,
} from '@/views/ui/kit'
import { IconRefund, IconTruck } from '@/views/ui/icons'
import type { Money } from '@/js/types'

type Item = {
  id: number
  title: string
  variant_title: string | null
  sku: string | null
  quantity: number
  quantity_refunded: number
  refundable: number
  unit_price: Money
  discount: Money
  total: Money
}

type Address = {
  name: string
  company: string | null
  line1: string
  line2: string | null
  city: string
  province: string | null
  postal_code: string | null
  country: string
  phone: string | null
}

type Payment = {
  id: number
  reference: string
  provider: string
  provider_reference: string
  status: string
  amount: Money
  provider_fee: Money | null
  platform_fee: Money
  refunded: Money
  net: Money
  card: string | null
  method: string | null
  failure_message: string | null
  created_at: string | null
}

type Props = {
  order: {
    id: number
    number: number
    email: string
    customer: string | null
    status: string
    payment_status: string
    fulfilment_status: string
    note: string | null
    tags: string[]
    shipping_method: string | null
    tracking_number: string | null
    tracking_url: string | null
    discount_code: string | null
    risk_score: number
    risk_flags: { code: string; points: number; reason: string }[]
    client_ip: string | null
    created_at: string | null
    paid_at: string | null
    summary: Record<string, Money>
  }
  items: Item[]
  addresses: Record<string, Address>
  payments: Payment[]
  refunds: { id: number; amount: Money; reason: string | null; status: string; created_at: string | null }[]
  timeline: {
    id: number
    kind: string
    message: string
    data: Record<string, unknown>
    actor: string | null
    created_at: string | null
  }[]
}

const EVENT_TONE: Record<string, 'positive' | 'critical' | 'caution' | 'info' | 'neutral'> = {
  'order.created': 'info',
  'payment.succeeded': 'positive',
  'payment.failed': 'critical',
  'order.fulfilled': 'positive',
  'order.delivered': 'positive',
  'order.cancelled': 'neutral',
  'refund.created': 'critical',
  'note.added': 'neutral',
}

export default function OrderShow({ order, items, addresses, payments, refunds, timeline }: Props) {
  const can = useCan()
  const [fulfilling, setFulfilling] = useState(false)
  const [refunding, setRefunding] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const successful = payments.find((payment) => payment.status === 'succeeded')

  return (
    <>
      <Head title={`Order #${order.number}`} />

      <PageHeader
        breadcrumb={[{ label: 'Orders', href: '/orders' }, { label: `#${order.number}` }]}
        title={`Order #${order.number}`}
        description={
          <span className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={order.payment_status} />
            <StatusBadge status={order.fulfilment_status} />
            <span className="text-[var(--color-ink-faint)]">
              placed {dateTime(order.created_at)}
            </span>
          </span>
        }
        actions={
          <>
            {can('orders.fulfil') &&
              order.payment_status !== 'unpaid' &&
              order.fulfilment_status === 'unfulfilled' && (
                <Button tone="primary" size="sm" onClick={() => setFulfilling(true)}>
                  <IconTruck className="h-3.5 w-3.5" />
                  Fulfil
                </Button>
              )}
            {can('orders.fulfil') && order.status === 'shipped' && (
              <Button size="sm" onClick={() => router.post(`/orders/${order.id}/deliver`)}>
                Mark delivered
              </Button>
            )}
            {can('refunds.create') && successful && order.status !== 'refunded' && (
              <Button size="sm" onClick={() => setRefunding(true)}>
                <IconRefund className="h-3.5 w-3.5" />
                Refund
              </Button>
            )}
            {can('orders.cancel') && !['cancelled', 'refunded'].includes(order.status) && (
              <Button tone="danger" size="sm" onClick={() => setCancelling(true)}>
                Cancel
              </Button>
            )}
          </>
        }
      />

      {order.risk_flags.length > 0 && (
        <div className="mb-4">
          <Banner
            tone={order.risk_score >= 70 ? 'critical' : 'caution'}
            title={`Risk score ${order.risk_score} of 100`}
          >
            <ul className="mt-1 list-inside list-disc">
              {order.risk_flags.map((flag) => (
                <li key={flag.code}>{flag.reason}</li>
              ))}
            </ul>
            <p className="mt-1.5 text-[12px] text-[var(--color-ink-faint)]">
              Signals only — nothing was blocked. You decide.
            </p>
          </Banner>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Items */}
          <Panel padded={false}>
            <PanelHeader title={`${items.length} ${items.length === 1 ? 'item' : 'items'}`} />
            <div className="divide-y divide-[var(--color-line-soft)]">
              {items.map((item) => (
                <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-[var(--color-ink)]">{item.title}</p>
                    <p className="text-[12px] text-[var(--color-ink-soft)]">
                      {item.variant_title && `${item.variant_title} · `}
                      {item.sku && <Mono>{item.sku}</Mono>}
                    </p>
                    {item.quantity_refunded > 0 && (
                      <p className="mt-1 text-[11.5px] text-[var(--color-critical)]">
                        {item.quantity_refunded} refunded
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[13px] text-[var(--color-ink)] tabular">
                      {money(item.unit_price)} × {item.quantity}
                    </p>
                    <p className="text-[13px] font-medium text-[var(--color-ink)] tabular">
                      {money(item.total)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[var(--color-line)] px-4 py-3">
              <KeyValue
                rows={[
                  { label: 'Subtotal', value: money(order.summary.subtotal) },
                  ...(order.summary.discount!.minor > 0
                    ? [
                        {
                          label: order.discount_code
                            ? `Discount (${order.discount_code})`
                            : 'Discount',
                          value: `−${money(order.summary.discount)}`,
                        },
                      ]
                    : []),
                  { label: order.shipping_method ?? 'Shipping', value: money(order.summary.shipping) },
                  ...(order.summary.tax!.minor > 0
                    ? [{ label: 'Tax', value: money(order.summary.tax) }]
                    : []),
                  { label: 'Total', value: money(order.summary.total) },
                  ...(order.summary.refunded!.minor > 0
                    ? [
                        { label: 'Refunded', value: `−${money(order.summary.refunded)}` },
                        { label: 'Net', value: money(order.summary.net) },
                      ]
                    : []),
                ]}
              />
            </div>
          </Panel>

          {/* Payments */}
          <Panel padded={false}>
            <PanelHeader
              title="Payment"
              description="What the customer paid, and where it went"
            />
            {payments.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-[var(--color-ink-soft)]">
                No payment has been attempted yet.
              </p>
            ) : (
              <div className="divide-y divide-[var(--color-line-soft)]">
                {payments.map((payment) => (
                  <div key={payment.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={payment.status} />
                        <span className="text-[12.5px] capitalize text-[var(--color-ink-soft)]">
                          {payment.provider}
                        </span>
                        {payment.card && (
                          <span className="text-[12.5px] text-[var(--color-ink-faint)]">
                            {payment.card}
                          </span>
                        )}
                      </div>
                      <span className="text-[13px] font-medium tabular">
                        {money(payment.amount)}
                      </span>
                    </div>

                    {payment.failure_message && (
                      <p className="mt-1.5 text-[12px] text-[var(--color-critical)]">
                        {payment.failure_message}
                      </p>
                    )}

                    {payment.status === 'succeeded' && (
                      <div className="mt-2.5 rounded-[var(--radius-sm)] bg-[var(--color-sunken)] px-3 py-2">
                        <KeyValue
                          rows={[
                            {
                              label: 'Provider fee',
                              value: payment.provider_fee
                                ? `−${money(payment.provider_fee)}`
                                : 'not reported yet',
                            },
                            { label: 'Platform fee', value: `−${money(payment.platform_fee)}` },
                            ...(payment.refunded.minor > 0
                              ? [{ label: 'Refunded', value: `−${money(payment.refunded)}` }]
                              : []),
                            { label: 'Net to you', value: money(payment.net) },
                          ]}
                        />
                      </div>
                    )}

                    <p className="mt-1.5 text-[11.5px] text-[var(--color-ink-faint)]">
                      <Mono>{payment.provider_reference}</Mono> · {dateTime(payment.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          {refunds.length > 0 && (
            <Panel padded={false}>
              <PanelHeader title="Refunds" />
              <div className="divide-y divide-[var(--color-line-soft)]">
                {refunds.map((refund) => (
                  <div key={refund.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div>
                      <p className="text-[13px] text-[var(--color-ink)]">
                        {money(refund.amount)}
                      </p>
                      <p className="text-[12px] text-[var(--color-ink-soft)]">
                        {refund.reason ?? 'No reason given'} · {dateTime(refund.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={refund.status} />
                  </div>
                ))}
              </div>
            </Panel>
          )}

          <Panel>
            <PanelHeader title="Timeline" />
            <div className="pt-3">
              <Timeline
                entries={timeline.map((event) => ({
                  id: event.id,
                  title: event.message,
                  meta: dateTime(event.created_at),
                  body: event.actor ? `by ${event.actor}` : undefined,
                  tone: EVENT_TONE[event.kind] ?? 'neutral',
                }))}
              />
            </div>
          </Panel>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Panel>
            <h2 className="mb-2.5 text-[13px] font-semibold text-[var(--color-ink)]">Customer</h2>
            <p className="text-[13px] text-[var(--color-ink)]">{order.customer ?? 'Guest'}</p>
            <a
              href={`mailto:${order.email}`}
              className="text-[12.5px] text-[var(--color-accent)] hover:underline"
            >
              {order.email}
            </a>
            {order.client_ip && (
              <p className="mt-1.5 text-[11.5px] text-[var(--color-ink-faint)]">
                IP <Mono>{order.client_ip}</Mono>
              </p>
            )}
          </Panel>

          {(['shipping', 'billing'] as const).map((kind) =>
            addresses[kind] ? (
              <Panel key={kind}>
                <h2 className="mb-2 text-[13px] font-semibold capitalize text-[var(--color-ink)]">
                  {kind} address
                </h2>
                <address className="space-y-0.5 text-[12.5px] not-italic leading-relaxed text-[var(--color-ink-soft)]">
                  {addresses[kind]!.name && <div>{addresses[kind]!.name}</div>}
                  {addresses[kind]!.company && <div>{addresses[kind]!.company}</div>}
                  <div>{addresses[kind]!.line1}</div>
                  {addresses[kind]!.line2 && <div>{addresses[kind]!.line2}</div>}
                  <div>
                    {addresses[kind]!.city}
                    {addresses[kind]!.province && `, ${addresses[kind]!.province}`}{' '}
                    {addresses[kind]!.postal_code}
                  </div>
                  <div>{addresses[kind]!.country}</div>
                  {addresses[kind]!.phone && <div>{addresses[kind]!.phone}</div>}
                </address>
              </Panel>
            ) : null,
          )}

          {order.tracking_number && (
            <Panel>
              <h2 className="mb-2 text-[13px] font-semibold text-[var(--color-ink)]">Tracking</h2>
              <p className="text-[12.5px] text-[var(--color-ink-soft)]">
                <Mono>{order.tracking_number}</Mono>
              </p>
              {order.tracking_url && (
                <a
                  href={order.tracking_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-[12.5px] text-[var(--color-accent)] hover:underline"
                >
                  Track shipment
                </a>
              )}
            </Panel>
          )}

          {can('orders.update') && <NotePanel orderId={order.id} note={order.note} />}
        </div>
      </div>

      <FulfilModal open={fulfilling} onClose={() => setFulfilling(false)} orderId={order.id} />
      <CancelModal open={cancelling} onClose={() => setCancelling(false)} orderId={order.id} />
      {successful && (
        <RefundModal
          open={refunding}
          onClose={() => setRefunding(false)}
          orderId={order.id}
          items={items}
          shipping={order.summary.shipping!}
          refundable={successful.amount.minor - successful.refunded.minor}
          provider={successful.provider}
        />
      )}
    </>
  )
}

/* ----------------------------------------------------------------- dialogs */

function NotePanel({ orderId, note }: { orderId: number; note: string | null }) {
  const form = useForm({ note: note ?? '' })
  return (
    <Panel>
      <h2 className="mb-2 text-[13px] font-semibold text-[var(--color-ink)]">Internal note</h2>
      <Textarea
        value={form.data.note}
        onChange={(event) => form.setData('note', event.target.value)}
        placeholder="Only your team sees this."
      />
      <Button
        size="sm"
        className="mt-2"
        loading={form.processing}
        disabled={form.data.note === (note ?? '')}
        onClick={() => form.post(`/orders/${orderId}/note`, { preserveScroll: true })}
      >
        Save note
      </Button>
    </Panel>
  )
}

function FulfilModal({
  open,
  onClose,
  orderId,
}: {
  open: boolean
  onClose: () => void
  orderId: number
}) {
  const form = useForm({ carrier: '', tracking_number: '', tracking_url: '' })
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Mark as fulfilled"
      description="The customer sees the tracking details on their order page."
      footer={
        <>
          <Button size="sm" onClick={onClose}>Cancel</Button>
          <Button
            tone="primary"
            size="sm"
            loading={form.processing}
            onClick={() =>
              form.post(`/orders/${orderId}/fulfil`, { onSuccess: onClose, preserveScroll: true })
            }
          >
            Fulfil order
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <Field label="Carrier" hint="Optional.">
          <Input
            value={form.data.carrier}
            onChange={(event) => form.setData('carrier', event.target.value)}
            placeholder="Royal Mail, DHL, …"
          />
        </Field>
        <Field label="Tracking number">
          <Input
            value={form.data.tracking_number}
            onChange={(event) => form.setData('tracking_number', event.target.value)}
          />
        </Field>
        <Field label="Tracking URL" hint="Where the customer can follow the parcel.">
          <Input
            type="url"
            value={form.data.tracking_url}
            onChange={(event) => form.setData('tracking_url', event.target.value)}
            placeholder="https://…"
          />
        </Field>
      </div>
    </Modal>
  )
}

function CancelModal({
  open,
  onClose,
  orderId,
}: {
  open: boolean
  onClose: () => void
  orderId: number
}) {
  const form = useForm({ reason: '' })
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cancel this order"
      description="Stock goes back. Money does not — issue a refund separately."
      width="sm"
      footer={
        <>
          <Button size="sm" onClick={onClose}>Keep order</Button>
          <Button
            tone="danger"
            size="sm"
            loading={form.processing}
            onClick={() =>
              form.post(`/orders/${orderId}/cancel`, { onSuccess: onClose, preserveScroll: true })
            }
          >
            Cancel order
          </Button>
        </>
      }
    >
      <Field label="Reason" hint="Recorded on the order's timeline.">
        <Input
          autoFocus
          value={form.data.reason}
          onChange={(event) => form.setData('reason', event.target.value)}
          placeholder="Customer changed their mind"
        />
      </Field>
    </Modal>
  )
}

const REFUND_REASONS = ['Damaged in transit', 'Wrong item sent', 'Customer changed their mind', 'Order arrived late', 'Duplicate order']

function RefundModal({
  open,
  onClose,
  orderId,
  items,
  shipping,
  refundable,
  provider,
}: {
  open: boolean
  onClose: () => void
  orderId: number
  items: Item[]
  shipping: Money
  refundable: number
  provider: string
}) {
  const [quantities, setQuantities] = useState<Record<number, number>>({})
  const [includeShipping, setIncludeShipping] = useState(false)
  const [restock, setRestock] = useState(true)
  const [reason, setReason] = useState('')
  const [sending, setSending] = useState(false)

  const lines = items.filter((item) => item.refundable > 0)
  const currency = items[0]?.total.currency ?? shipping.currency
  const format = (minor: number) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(minor / 100)
  // Per unit, from the line total, so a discount on the line is refunded as it was charged.
  const unit = (item: Item) => (item.quantity > 0 ? Math.round(item.total.minor / item.quantity) : 0)

  // A preview. The server recomputes this from the same lines, so a tampered
  // figure cannot refund more than the lines are worth.
  const itemsTotal = useMemo(
    () => lines.reduce((sum, item) => sum + unit(item) * (quantities[item.id] ?? 0), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quantities, items],
  )
  const shippingTotal = includeShipping ? shipping.minor : 0
  const total = Math.min(itemsTotal + shippingTotal, refundable)
  const chosen = Object.values(quantities).reduce((sum, quantity) => sum + quantity, 0)
  const everything = lines.every((item) => (quantities[item.id] ?? 0) === item.refundable)

  function setQuantity(item: Item, quantity: number) {
    setQuantities((current) => ({ ...current, [item.id]: Math.max(0, Math.min(item.refundable, quantity)) }))
  }

  function selectAll() {
    if (everything) {
      setQuantities({})
      setIncludeShipping(false)
    } else {
      setQuantities(Object.fromEntries(lines.map((item) => [item.id, item.refundable])))
      if (shipping.minor > 0) setIncludeShipping(true)
    }
  }

  function submit() {
    setSending(true)
    router.post(
      `/orders/${orderId}/refund`,
      {
        lines: Object.entries(quantities)
          .filter(([, quantity]) => quantity > 0)
          .map(([id, quantity]) => ({ order_item_id: Number(id), quantity })),
        include_shipping: includeShipping,
        restock,
        reason,
      },
      {
        preserveScroll: true,
        onSuccess: onClose,
        onFinish: () => setSending(false),
      },
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="lg"
      title="Refund this order"
      description={
        <>
          Up to <span className="font-medium text-ink">{format(refundable)}</span> can still be refunded
          to the original payment ({provider.charAt(0).toUpperCase() + provider.slice(1)}).
        </>
      }
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <p className="text-[12px] text-ink-muted">
            {total > 0 ? (
              <>
                Refunding <span className="font-medium text-ink">{format(total)}</span>
                {chosen > 0 && ` for ${chosen} item${chosen === 1 ? '' : 's'}`}
              </>
            ) : (
              'Choose what to refund'
            )}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              loading={sending}
              disabled={total <= 0}
              onClick={submit}
              className="!border-transparent !bg-critical !text-white hover:!bg-critical/90"
            >
              <IconRefund className="h-3.5 w-3.5" />
              Refund {format(total)}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-muted">Items</h3>
            {lines.length > 0 && (
              <button type="button" onClick={selectAll} className="text-[12px] font-medium text-brand hover:underline">
                {everything ? 'Clear' : 'Select all'}
              </button>
            )}
          </div>

          {lines.length === 0 ? (
            <p className="rounded-[var(--radius-md)] bg-sunken px-4 py-3 text-[13px] text-ink-muted">
              Every item on this order has already been refunded.
            </p>
          ) : (
            <div className="divide-y divide-line overflow-hidden rounded-[var(--radius-md)] border border-line">
              {lines.map((item) => {
                const quantity = quantities[item.id] ?? 0
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-4 px-4 py-3 transition ${quantity > 0 ? 'bg-brand-soft/40' : ''}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-ink">{item.title}</p>
                      <p className="mt-0.5 truncate text-[12px] text-ink-muted">
                        {[item.variant_title, `${format(unit(item))} each`, `${item.refundable} of ${item.quantity} refundable`]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center rounded-full border border-line bg-surface">
                      <button
                        type="button"
                        onClick={() => setQuantity(item, quantity - 1)}
                        disabled={quantity === 0}
                        aria-label={`One fewer ${item.title}`}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[16px] text-ink-muted transition hover:bg-sunken hover:text-ink disabled:opacity-30"
                      >
                        −
                      </button>
                      <span className="w-7 text-center text-[13px] font-medium tabular-nums text-ink" aria-live="polite">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity(item, quantity + 1)}
                        disabled={quantity >= item.refundable}
                        aria-label={`One more ${item.title}`}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-[16px] text-ink-muted transition hover:bg-sunken hover:text-ink disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>

                    <span className={`w-20 shrink-0 text-right text-[13px] tabular-nums ${quantity > 0 ? 'font-medium text-ink' : 'text-ink-faint'}`}>
                      {format(unit(item) * quantity)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="divide-y divide-line rounded-[var(--radius-md)] border border-line">
          {shipping.minor > 0 && (
            <ToggleRow
              label="Refund shipping"
              hint={`${format(shipping.minor)} charged for delivery`}
              checked={includeShipping}
              onChange={setIncludeShipping}
            />
          )}
          <ToggleRow
            label="Return items to stock"
            hint="Adds the refunded quantities back to inventory"
            checked={restock}
            onChange={setRestock}
          />
        </section>

        <section>
          <h3 className="mb-2 text-[12px] font-medium uppercase tracking-[0.06em] text-ink-muted">Reason</h3>
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {REFUND_REASONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setReason(reason === option ? '' : option)}
                className={
                  reason === option
                    ? 'rounded-full bg-ink px-3 py-1 text-[12px] font-medium text-surface'
                    : 'rounded-full border border-line px-3 py-1 text-[12px] text-ink-muted transition hover:border-ink-faint hover:text-ink'
                }
              >
                {option}
              </button>
            ))}
          </div>
          <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Or write your own" />
          <p className="mt-1.5 text-[12px] text-ink-faint">Shown on the order timeline and sent to the payment provider.</p>
        </section>

        <section className="rounded-[var(--radius-md)] bg-sunken px-4 py-3">
          <dl className="space-y-1.5 text-[13px]">
            <div className="flex justify-between text-ink-muted">
              <dt>Items</dt>
              <dd className="tabular-nums">{format(itemsTotal)}</dd>
            </div>
            {shipping.minor > 0 && (
              <div className="flex justify-between text-ink-muted">
                <dt>Shipping</dt>
                <dd className="tabular-nums">{format(shippingTotal)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-line pt-2 text-[14px] font-semibold text-ink">
              <dt>Refund total</dt>
              <dd className="tabular-nums">{format(total)}</dd>
            </div>
            <div className="flex justify-between text-[12px] text-ink-faint">
              <dt>Still refundable afterwards</dt>
              <dd className="tabular-nums">{format(Math.max(0, refundable - total))}</dd>
            </div>
          </dl>
        </section>
      </div>
    </Modal>
  )
}

/** A setting as a row: its label and explanation on the left, a switch on the right. */
function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3">
      <span className="min-w-0">
        <span className="block text-[13.5px] font-medium text-ink">{label}</span>
        <span className="block text-[12px] text-ink-muted">{hint}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? 'bg-brand' : 'bg-line'}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`}
        />
      </button>
    </label>
  )
}
