import { Head, Link, router } from '@inertiajs/react'
import { useState } from 'react'
import { date, money, useCan } from '@/js/hooks'
import {
  Button, Empty, Field, Input, Modal, PageHeader, Select,
  StatusBadge, TBody, TD, TH, THead, TR, Table, Tabs, Textarea,
} from '@/views/ui/kit'
import { IconMegaphone, IconPlus } from '@/views/ui/icons'
import type { Money } from '@/js/types'

type Campaign = {
  id: number
  name: string
  kind: string
  description: string | null
  status: string
  segment_id: number | null
  segment: string | null
  discount_id: number | null
  discount_code: string | null
  product_ids: number[]
  starts_at: string | null
  ends_at: string | null
  budget: Money | null
  spend: Money
  revenue: Money
  roi: Money
  orders_count: number
  recipients_count: number
  recovered_count: number
  last_run_at: string | null
}

type Props = {
  campaigns: Campaign[]
  status: string
  counts: Record<string, number>
  types: { key: string; label: string }[]
  segments: { id: number; name: string }[]
  discounts: { id: number; code: string }[]
  products: { id: number; title: string }[]
}

export default function Campaigns({ campaigns, status, counts, types, segments, discounts }: Props) {
  const can = useCan()
  const [creating, setCreating] = useState(false)

  return (
    <>
      <Head title="Campaigns" />
      <PageHeader
        title="Campaigns"
        description="What you ran, who it was aimed at, and what it earned. Attribution is deliberately narrow — an order counts if it used the campaign's code."
        actions={
          can('campaigns.manage') && (
            <Button tone="primary" size="sm" onClick={() => setCreating(true)}>
              <IconPlus className="h-3.5 w-3.5" />
              New campaign
            </Button>
          )
        }
      />

      <div className="mb-3">
        <Tabs
          tabs={[
            { key: 'all', label: 'All', count: counts.all },
            { key: 'active', label: 'Active', count: counts.active },
            { key: 'scheduled', label: 'Scheduled', count: counts.scheduled },
            { key: 'draft', label: 'Draft', count: counts.draft },
            { key: 'completed', label: 'Completed', count: counts.completed },
          ]}
          active={status}
          onSelect={(key) => router.get('/marketing/campaigns', { status: key }, { preserveState: true })}
        />
      </div>

      {campaigns.length === 0 ? (
        <div className="panel">
          <Empty
            icon={<IconMegaphone className="h-6 w-6" />}
            title="No campaigns yet"
            body="A campaign pairs an audience with an offer, and reports what came back."
            action={can('campaigns.manage') && (
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
              <TH>Campaign</TH>
              <TH>Audience</TH>
              <TH>Status</TH>
              <TH align="right">Orders</TH>
              <TH align="right">Revenue</TH>
              <TH align="right">Return</TH>
              <TH align="right">Runs</TH>
            </tr>
          </THead>
          <TBody>
            {campaigns.map((campaign) => (
              <TR key={campaign.id} href={`/marketing/campaigns/${campaign.id}`}>
                <TD>
                  <Link href={`/marketing/campaigns/${campaign.id}`}
                    className="font-medium text-[var(--color-ink)] hover:text-[var(--color-accent)]">
                    {campaign.name}
                  </Link>
                  <span className="block text-[11.5px] capitalize text-[var(--color-ink-faint)]">
                    {campaign.kind.replace(/_/g, ' ')}
                    {campaign.discount_code && ` · ${campaign.discount_code}`}
                  </span>
                </TD>
                <TD className="text-[var(--color-ink-soft)]">
                  {campaign.segment ?? <span className="text-[var(--color-ink-faint)]">Everyone</span>}
                  {campaign.recipients_count > 0 && (
                    <span className="block text-[11.5px] text-[var(--color-ink-faint)]">
                      {campaign.recipients_count} people
                    </span>
                  )}
                </TD>
                <TD><StatusBadge status={campaign.status} /></TD>
                <TD align="right">{campaign.orders_count}</TD>
                <TD align="right" className="font-medium">{money(campaign.revenue)}</TD>
                <TD align="right" className={
                  campaign.roi.minor >= 0 ? 'text-[var(--color-positive)]' : 'text-[var(--color-critical)]'
                }>
                  {campaign.spend.minor > 0 ? money(campaign.roi) : '—'}
                </TD>
                <TD align="right" className="whitespace-nowrap text-[var(--color-ink-faint)]">
                  {campaign.starts_at ? date(campaign.starts_at) : 'not scheduled'}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      {creating && (
        <CampaignModal types={types} segments={segments} discounts={discounts}
          onClose={() => setCreating(false)} />
      )}
    </>
  )
}

function CampaignModal({
  types, segments, discounts, onClose,
}: {
  types: { key: string; label: string }[]
  segments: { id: number; name: string }[]
  discounts: { id: number; code: string }[]
  onClose: () => void
}) {
  const [form, setForm] = useState({
    name: '', kind: 'discount', description: '',
    segment_id: '', discount_id: '',
    starts_at: '', ends_at: '', budget: '', spend: '',
  })
  const [saving, setSaving] = useState(false)

  function set(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  return (
    <Modal
      open onClose={onClose} title="New campaign" width="lg"
      footer={
        <>
          <Button size="sm" onClick={onClose}>Cancel</Button>
          <Button tone="primary" size="sm" loading={saving} disabled={!form.name.trim()}
            onClick={() => {
              setSaving(true)
              router.post('/marketing/campaigns', form,
                { onSuccess: onClose, onFinish: () => setSaving(false) })
            }}>
            Create campaign
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <Field label="Name" required>
          <Input autoFocus value={form.name} onChange={(event) => set('name', event.target.value)}
            placeholder="Spring clearance" />
        </Field>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Type">
            <Select value={form.kind} onChange={(event) => set('kind', event.target.value)}>
              {types.map((type) => <option key={type.key} value={type.key}>{type.label}</option>)}
            </Select>
          </Field>
          <Field label="Audience" hint="A saved segment, resolved when the campaign runs.">
            <Select value={form.segment_id} onChange={(event) => set('segment_id', event.target.value)}>
              <option value="">Everyone</option>
              {segments.map((segment) => (
                <option key={segment.id} value={segment.id}>{segment.name}</option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Discount" hint="Orders using this code are attributed to the campaign.">
          <Select value={form.discount_id} onChange={(event) => set('discount_id', event.target.value)}>
            <option value="">No discount</option>
            {discounts.map((discount) => (
              <option key={discount.id} value={discount.id}>{discount.code}</option>
            ))}
          </Select>
        </Field>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Starts" hint="A future start schedules the campaign automatically.">
            <Input type="datetime-local" value={form.starts_at}
              onChange={(event) => set('starts_at', event.target.value)} />
          </Field>
          <Field label="Ends">
            <Input type="datetime-local" value={form.ends_at}
              onChange={(event) => set('ends_at', event.target.value)} />
          </Field>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Budget" hint="For your own reference.">
            <Input value={form.budget} onChange={(event) => set('budget', event.target.value)} />
          </Field>
          <Field label="Spend so far" hint="Entered by you — the platform does not buy ads.">
            <Input value={form.spend} onChange={(event) => set('spend', event.target.value)} />
          </Field>
        </div>

        <Field label="Description">
          <Textarea rows={2} value={form.description}
            onChange={(event) => set('description', event.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}
