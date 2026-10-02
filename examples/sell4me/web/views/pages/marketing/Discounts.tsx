import { Head, router } from '@inertiajs/react'
import { useState } from 'react'
import { date, money, useCan, useShared } from '@/js/hooks'
import {
  Badge, Button, Checkbox, Empty, Field, Input, Modal, Mono, PageHeader,
  Select, StatusBadge, TBody, TD, TH, THead, TR, Table, Tabs, Textarea,
} from '@/views/ui/kit'
import { IconPlus, IconTag } from '@/views/ui/icons'
import type { Money } from '@/js/types'

type Discount = {
  id: number
  code: string
  title: string | null
  description: string | null
  kind: 'percentage' | 'fixed_amount' | 'free_shipping'
  value: number
  value_label: string
  scope: string
  scope_ids: number[]
  minimum_order: Money
  maximum_discount: Money | null
  usage_limit: number | null
  per_customer_limit: number | null
  usage_count: number
  starts_at: string | null
  ends_at: string | null
  is_active: boolean
  is_automatic: boolean
  segment_id: number | null
  state: string
}

type Props = {
  discounts: Discount[]
  state: string
  counts: Record<string, number>
  segments: { id: number; name: string }[]
  products: { id: number; title: string }[]
}

export default function Discounts({ discounts, state, counts, segments }: Props) {
  const can = useCan()
  const [editing, setEditing] = useState<Discount | null>(null)
  const [creating, setCreating] = useState(false)

  return (
    <>
      <Head title="Discounts" />
      <PageHeader
        title="Discounts"
        description="Codes and automatic offers. Every limit is checked in one place, so what a shopper is charged always matches the rule."
        actions={
          can('discounts.manage') && (
            <Button tone="primary" size="sm" onClick={() => setCreating(true)}>
              <IconPlus className="h-3.5 w-3.5" />
              New discount
            </Button>
          )
        }
      />

      <div className="mb-3">
        <Tabs
          tabs={[
            { key: 'all', label: 'All', count: counts.all },
            { key: 'active', label: 'Active', count: counts.active ?? 0 },
            { key: 'scheduled', label: 'Scheduled', count: counts.scheduled ?? 0 },
            { key: 'expired', label: 'Expired', count: counts.expired ?? 0 },
            { key: 'disabled', label: 'Disabled', count: counts.disabled ?? 0 },
          ]}
          active={state}
          onSelect={(key) => router.get('/marketing/discounts', { state: key }, { preserveState: true })}
        />
      </div>

      {discounts.length === 0 ? (
        <div className="panel">
          <Empty
            icon={<IconTag className="h-6 w-6" />}
            title="No discounts here"
            body="A discount can be a code a shopper types, or an automatic offer that applies whenever it matches."
            action={can('discounts.manage') && (
              <Button tone="primary" size="sm" onClick={() => setCreating(true)}>
                <IconPlus className="h-3.5 w-3.5" />
                Create one
              </Button>
            )}
          />
        </div>
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Code</TH>
              <TH>Discount</TH>
              <TH>Conditions</TH>
              <TH>Status</TH>
              <TH align="right">Used</TH>
              <TH align="right">Ends</TH>
              {can('discounts.manage') && <TH />}
            </tr>
          </THead>
          <TBody>
            {discounts.map((discount) => (
              <TR key={discount.id}>
                <TD>
                  <Mono>{discount.code}</Mono>
                  {discount.is_automatic && <span className="ml-1.5 align-middle"><Badge tone="accent">automatic</Badge></span>}
                  {discount.title && (
                    <span className="block text-[12px] text-[var(--color-ink-faint)]">{discount.title}</span>
                  )}
                </TD>
                <TD className="font-medium">{discount.value_label}</TD>
                <TD className="text-[12px] text-[var(--color-ink-soft)]">
                  {discount.minimum_order.minor > 0 && <div>Min {money(discount.minimum_order)}</div>}
                  {discount.maximum_discount && <div>Max {money(discount.maximum_discount)}</div>}
                  {discount.per_customer_limit && <div>{discount.per_customer_limit} per customer</div>}
                  {discount.scope !== 'order' && <div>Limited to {discount.scope}</div>}
                  {discount.minimum_order.minor === 0 && !discount.maximum_discount &&
                    !discount.per_customer_limit && discount.scope === 'order' && <span>—</span>}
                </TD>
                <TD><StatusBadge status={discount.state} /></TD>
                <TD align="right">
                  {discount.usage_count}
                  {discount.usage_limit && (
                    <span className="text-[var(--color-ink-faint)]"> / {discount.usage_limit}</span>
                  )}
                </TD>
                <TD align="right" className="whitespace-nowrap text-[var(--color-ink-faint)]">
                  {discount.ends_at ? date(discount.ends_at) : 'no end'}
                </TD>
                {can('discounts.manage') && (
                  <TD align="right">
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" onClick={() => setEditing(discount)}>Edit</Button>
                      <Button size="sm"
                        onClick={() => router.post(`/marketing/discounts/${discount.id}/toggle`, {}, { preserveScroll: true })}>
                        {discount.is_active ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </TD>
                )}
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {(creating || editing) && (
        <DiscountModal
          discount={editing} segments={segments}
          onClose={() => { setCreating(false); setEditing(null) }}
        />
      )}
    </>
  )
}

function DiscountModal({
  discount, segments, onClose,
}: {
  discount: Discount | null
  segments: { id: number; name: string }[]
  onClose: () => void
}) {
  const { errors, auth } = useShared()
  const [form, setForm] = useState({
    code: discount?.code ?? '',
    title: discount?.title ?? '',
    description: discount?.description ?? '',
    kind: discount?.kind ?? 'percentage',
    value: discount
      ? (discount.kind === 'fixed_amount' ? (discount.value / 100).toFixed(2) : String(discount.value))
      : '10',
    scope: discount?.scope ?? 'order',
    minimum_order: discount ? (discount.minimum_order.minor / 100).toFixed(2) : '',
    maximum_discount: discount?.maximum_discount ? (discount.maximum_discount.minor / 100).toFixed(2) : '',
    usage_limit: discount?.usage_limit ?? '',
    per_customer_limit: discount?.per_customer_limit ?? '',
    starts_at: discount?.starts_at?.slice(0, 16) ?? '',
    ends_at: discount?.ends_at?.slice(0, 16) ?? '',
    is_active: discount?.is_active ?? true,
    is_automatic: discount?.is_automatic ?? false,
    segment_id: discount?.segment_id ?? '',
  })
  const [saving, setSaving] = useState(false)

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  return (
    <Modal
      open onClose={onClose}
      title={discount ? `Edit ${discount.code}` : 'New discount'}
      width="lg"
      footer={
        <>
          <Button size="sm" onClick={onClose}>Cancel</Button>
          <Button tone="primary" size="sm" loading={saving} disabled={!form.code.trim()}
            onClick={() => {
              setSaving(true)
              router.post('/marketing/discounts', { id: discount?.id, ...form },
                { preserveScroll: true, onSuccess: onClose, onFinish: () => setSaving(false) })
            }}>
            Save discount
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Code" required error={errors.code} hint="Uppercased automatically.">
            <Input autoFocus value={form.code} invalid={Boolean(errors.code)}
              onChange={(event) => set('code', event.target.value.toUpperCase())}
              placeholder="WELCOME10" />
          </Field>
          <Field label="Internal title" hint="Only your team sees this.">
            <Input value={form.title} onChange={(event) => set('title', event.target.value)} />
          </Field>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Type">
            <Select value={form.kind} onChange={(event) => set('kind', event.target.value as Discount['kind'])}>
              <option value="percentage">Percentage off</option>
              <option value="fixed_amount">Fixed amount off</option>
              <option value="free_shipping">Free shipping</option>
            </Select>
          </Field>
          {form.kind !== 'free_shipping' && (
            <Field
              label={form.kind === 'percentage' ? 'Percent off' : `Amount off (${auth.store?.currency})`}
              error={errors.value}
            >
              <Input value={form.value} invalid={Boolean(errors.value)}
                onChange={(event) => set('value', event.target.value)}
                placeholder={form.kind === 'percentage' ? '10' : '5.00'} />
            </Field>
          )}
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Minimum order" hint="Leave blank for none.">
            <Input value={form.minimum_order} onChange={(event) => set('minimum_order', event.target.value)} />
          </Field>
          {form.kind === 'percentage' && (
            <Field label="Maximum discount" hint="Caps a percentage — 20% off, up to 50.">
              <Input value={form.maximum_discount}
                onChange={(event) => set('maximum_discount', event.target.value)} />
            </Field>
          )}
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Total uses" hint="Across all customers. Blank is unlimited.">
            <Input type="number" min={1} value={form.usage_limit}
              onChange={(event) => set('usage_limit', event.target.value)} />
          </Field>
          <Field label="Uses per customer" hint="Requires the shopper to be signed in.">
            <Input type="number" min={1} value={form.per_customer_limit}
              onChange={(event) => set('per_customer_limit', event.target.value)} />
          </Field>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Starts">
            <Input type="datetime-local" value={form.starts_at}
              onChange={(event) => set('starts_at', event.target.value)} />
          </Field>
          <Field label="Ends">
            <Input type="datetime-local" value={form.ends_at}
              onChange={(event) => set('ends_at', event.target.value)} />
          </Field>
        </div>

        {segments.length > 0 && (
          <Field label="Limit to a segment" hint="Only customers in this segment can use the code.">
            <Select value={form.segment_id} onChange={(event) => set('segment_id', event.target.value)}>
              <option value="">Anyone</option>
              {segments.map((segment) => (
                <option key={segment.id} value={segment.id}>{segment.name}</option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Description">
          <Textarea rows={2} value={form.description}
            onChange={(event) => set('description', event.target.value)} />
        </Field>

        <div className="space-y-2 border-t border-[var(--color-line-soft)] pt-3">
          <Checkbox label="Active" checked={form.is_active}
            onChange={(event) => set('is_active', event.target.checked)} />
          <Checkbox
            label="Apply automatically"
            hint="No code needed. If several automatic discounts match, the most valuable one wins — they never stack."
            checked={form.is_automatic}
            onChange={(event) => set('is_automatic', event.target.checked)} />
        </div>
      </div>
    </Modal>
  )
}
