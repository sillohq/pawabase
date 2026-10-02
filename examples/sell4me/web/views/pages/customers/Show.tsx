import { Head, Link, useForm, usePage, WhenVisible } from '@inertiajs/react'
import { date, dateTime, money, useCan } from '@/js/hooks'
import {
  Badge, Button, Checkbox, Empty, Field, Input, KeyValue, Panel, PanelHeader,
  PageHeader, Skeleton, Stat, StatRow, StatusBadge, TBody, TD, TH, THead, TR, Table, Textarea,
} from '@/views/ui/kit'
import type { CustomerRow, Money } from '@/js/types'

type Address = {
  id: number
  label: string | null
  line1: string
  line2: string | null
  city: string
  province: string | null
  postal_code: string | null
  country: string
  phone: string | null
  is_default: boolean
}

type Props = {
  customer: CustomerRow & { note: string | null; addresses: Address[] }
  segments: { id: number; name: string }[]
  orders?: {
    id: number
    number: number
    status: string
    payment_status: string
    fulfilment_status: string
    total: Money
    created_at: string | null
  }[]
  abandoned?: {
    id: number
    value: Money
    item_count: number
    recovery_status: string
    created_at: string | null
  }[]
}

export default function CustomerShow({ customer, segments }: Props) {
  const can = useCan()

  return (
    <>
      <Head title={customer.name} />
      <PageHeader
        breadcrumb={[{ label: 'Customers', href: '/customers' }, { label: customer.name }]}
        title={customer.name}
        description={
          <a href={`mailto:${customer.email}`} className="text-[var(--color-accent)] hover:underline">
            {customer.email}
          </a>
        }
      />

      <StatRow>
        <Stat label="Lifetime spend" value={money(customer.total_spent)} />
        <Stat label="Orders" value={customer.orders_count} />
        <Stat label="Average order" value={money(customer.average_order)} />
        <Stat
          label="Customer since"
          value={date(customer.created_at)}
          hint={customer.last_order_at ? `last ordered ${date(customer.last_order_at)}` : 'has not ordered'}
        />
      </StatRow>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel padded={false}>
            <PanelHeader title="Order history" />
            <div className="p-3">
              <WhenVisible data="orders" fallback={<Skeleton rows={4} />}>
                <Orders />
              </WhenVisible>
            </div>
          </Panel>

          <Panel padded={false}>
            <PanelHeader title="Abandoned baskets" description="Reached checkout and did not convert" />
            <div className="p-3">
              <WhenVisible data="abandoned" fallback={<Skeleton rows={2} />}>
                <Abandoned />
              </WhenVisible>
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          {segments.length > 0 && (
            <Panel>
              <PanelHeader title="Segments" description="Resolved live, right now" />
              <div className="mt-2.5 flex flex-wrap gap-1">
                {segments.map((segment) => (
                  <Link key={segment.id} href={`/customers?segment=${segment.id}`}>
                    <Badge tone="accent">{segment.name}</Badge>
                  </Link>
                ))}
              </div>
            </Panel>
          )}

          {customer.addresses.length > 0 && (
            <Panel>
              <PanelHeader title="Addresses" />
              <div className="space-y-3 pt-3">
                {customer.addresses.map((address) => (
                  <address key={address.id} className="text-[12.5px] not-italic leading-relaxed text-[var(--color-ink-soft)]">
                    {address.is_default && <Badge tone="accent">Default</Badge>}
                    <div className="mt-1">{address.line1}</div>
                    {address.line2 && <div>{address.line2}</div>}
                    <div>{address.city}{address.province && `, ${address.province}`} {address.postal_code}</div>
                    <div>{address.country}</div>
                  </address>
                ))}
              </div>
            </Panel>
          )}

          <Panel>
            <PanelHeader title="Details" />
            <div className="pt-2">
              <KeyValue rows={[
                { label: 'Phone', value: customer.phone ?? '—' },
                { label: 'Marketing', value: customer.accepts_marketing ? 'Subscribed' : 'Not subscribed' },
                { label: 'First order', value: date(customer.first_order_at) },
                { label: 'Risk score', value: customer.risk_score || '—' },
              ]} />
            </div>
          </Panel>

          {can('customers.update') && <EditPanel customer={customer} />}
        </div>
      </div>
    </>
  )
}

function Orders() {
  const { orders = [] } = usePage().props as unknown as Props
  if (orders.length === 0) {
    return <Empty title="No orders yet" body="This customer has an account but has not bought anything." />
  }
  return (
    <Table>
      <THead>
        <tr>
          <TH>Order</TH>
          <TH>Payment</TH>
          <TH>Fulfilment</TH>
          <TH align="right">Total</TH>
          <TH align="right">Placed</TH>
        </tr>
      </THead>
      <TBody>
        {orders.map((order) => (
          <TR key={order.id} href={`/orders/${order.id}`}>
            <TD>
              <Link href={`/orders/${order.id}`} className="font-medium text-[var(--color-ink)] hover:text-[var(--color-accent)]">
                #{order.number}
              </Link>
            </TD>
            <TD><StatusBadge status={order.payment_status} /></TD>
            <TD><StatusBadge status={order.fulfilment_status} /></TD>
            <TD align="right" className="font-medium">{money(order.total)}</TD>
            <TD align="right" className="text-[var(--color-ink-faint)]">{date(order.created_at)}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  )
}

function Abandoned() {
  const { abandoned = [] } = usePage().props as unknown as Props
  if (abandoned.length === 0) {
    return <Empty title="Nothing abandoned" body="Every basket this customer started, they finished." />
  }
  return (
    <div className="divide-y divide-[var(--color-line-soft)]">
      {abandoned.map((cart) => (
        <div key={cart.id} className="flex items-center justify-between gap-3 py-2.5">
          <div>
            <p className="text-[13px] text-[var(--color-ink)]">{money(cart.value)}</p>
            <p className="text-[12px] text-[var(--color-ink-faint)]">
              {cart.item_count} items · {dateTime(cart.created_at)}
            </p>
          </div>
          <StatusBadge status={cart.recovery_status} />
        </div>
      ))}
    </div>
  )
}

function EditPanel({ customer }: { customer: Props['customer'] }) {
  const form = useForm({
    first_name: '',
    last_name: '',
    phone: customer.phone ?? '',
    note: customer.note ?? '',
    accepts_marketing: customer.accepts_marketing,
    tags: customer.tags.join(', '),
  })

  return (
    <Panel>
      <PanelHeader title="Edit" />
      <div className="space-y-3 pt-3">
        <div className="grid grid-cols-2 gap-2">
          <Field label="First name">
            <Input value={form.data.first_name} onChange={(event) => form.setData('first_name', event.target.value)} />
          </Field>
          <Field label="Last name">
            <Input value={form.data.last_name} onChange={(event) => form.setData('last_name', event.target.value)} />
          </Field>
        </div>
        <Field label="Phone">
          <Input value={form.data.phone} onChange={(event) => form.setData('phone', event.target.value)} />
        </Field>
        <Field label="Tags" hint="Comma separated. Segments can match on these.">
          <Input value={form.data.tags} onChange={(event) => form.setData('tags', event.target.value)} />
        </Field>
        <Field label="Internal note">
          <Textarea rows={3} value={form.data.note} onChange={(event) => form.setData('note', event.target.value)} />
        </Field>
        <Checkbox
          label="Accepts marketing"
          checked={form.data.accepts_marketing}
          onChange={(event) => form.setData('accepts_marketing', event.target.checked)}
        />
        <Button
          tone="primary" size="sm" loading={form.processing}
          onClick={() => form.post(`/customers/${customer.id}`, { preserveScroll: true })}
        >
          Save customer
        </Button>
      </div>
    </Panel>
  )
}
