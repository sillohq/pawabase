import { Head, Link, router } from '@inertiajs/react'
import { useState } from 'react'
import { count, useCan } from '@/js/hooks'
import {
  Badge, Button, Empty, Field, Input, Modal, Panel, PageHeader,
  Select, TBody, TD, TH, THead, TR, Table, Textarea,
} from '@/views/ui/kit'
import { IconCustomers, IconPlus, IconTrash } from '@/views/ui/icons'

type Rule = { field: string; operator: string; value: string | number | boolean }

type Segment = {
  id: number
  name: string
  description: string | null
  rules: Rule[]
  is_system: boolean
  count: number
  counted_at: string | null
}

type Props = {
  segments: Segment[]
  fields: { key: string; label: string; kind: string }[]
  operators: { key: string; label: string }[]
}

export default function Segments({ segments, fields, operators }: Props) {
  const can = useCan()
  const [editing, setEditing] = useState<Segment | null>(null)
  const [creating, setCreating] = useState(false)

  return (
    <>
      <Head title="Segments" />
      <PageHeader
        title="Segments"
        description="Saved questions about your customers, answered when you ask them — not stored lists."
        actions={
          can('customers.update') && (
            <Button tone="primary" size="sm" onClick={() => setCreating(true)}>
              <IconPlus className="h-3.5 w-3.5" />
              New segment
            </Button>
          )
        }
      />

      {segments.length === 0 ? (
        <div className="panel">
          <Empty icon={<IconCustomers className="h-6 w-6" />} title="No segments yet"
            body="A segment is a rule — customers who spent over 500, or who have not ordered in 90 days." />
        </div>
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Segment</TH>
              <TH>Rules</TH>
              <TH align="right">Customers</TH>
              <TH />
            </tr>
          </THead>
          <TBody>
            {segments.map((segment) => (
              <TR key={segment.id}>
                <TD>
                  <span className="font-medium text-[var(--color-ink)]">{segment.name}</span>
                  {segment.is_system && <span className="ml-1.5 align-middle"><Badge>built in</Badge></span>}
                  {segment.description && (
                    <span className="block max-w-md truncate text-[12px] text-[var(--color-ink-faint)]">
                      {segment.description}
                    </span>
                  )}
                </TD>
                <TD className="text-[12px] text-[var(--color-ink-soft)]">
                  {segment.rules.length === 0 ? 'Everyone' : `${segment.rules.length} rule${segment.rules.length === 1 ? '' : 's'}`}
                </TD>
                <TD align="right" className="font-medium">{count(segment.count)}</TD>
                <TD align="right">
                  <div className="flex justify-end gap-1.5">
                    <Link href={`/customers?segment=${segment.id}`}>
                      <Button size="sm">View</Button>
                    </Link>
                    {can('customers.update') && !segment.is_system && (
                      <>
                        <Button size="sm" onClick={() => setEditing(segment)}>Edit</Button>
                        <Button tone="danger" size="sm"
                          onClick={() => router.post(`/customers/segments/${segment.id}/delete`)}
                          aria-label={`Delete ${segment.name}`}>
                          <IconTrash className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <Panel className="mt-4">
        <p className="text-[12.5px] text-[var(--color-ink-soft)]">
          Counts are resolved against your customer list each time this page loads, so a
          customer who crossed a threshold an hour ago is already included. Built-in segments
          can be used by campaigns but not edited — so “New customers” always means the same
          thing.
        </p>
      </Panel>

      {(creating || editing) && (
        <SegmentModal
          segment={editing} fields={fields} operators={operators}
          onClose={() => { setCreating(false); setEditing(null) }}
        />
      )}
    </>
  )
}

function SegmentModal({
  segment, fields, operators, onClose,
}: {
  segment: Segment | null
  fields: Props['fields']
  operators: Props['operators']
  onClose: () => void
}) {
  const [name, setName] = useState(segment?.name ?? '')
  const [description, setDescription] = useState(segment?.description ?? '')
  const [rules, setRules] = useState<Rule[]>(
    segment?.rules ?? [{ field: 'total_spent_minor', operator: 'gt', value: '' }],
  )
  const [saving, setSaving] = useState(false)

  return (
    <Modal
      open onClose={onClose}
      title={segment ? 'Edit segment' : 'New segment'}
      description="Every rule must match."
      width="lg"
      footer={
        <>
          <Button size="sm" onClick={onClose}>Cancel</Button>
          <Button tone="primary" size="sm" loading={saving} disabled={!name.trim()}
            onClick={() => {
              setSaving(true)
              router.post('/customers/segments',
                { id: segment?.id, name, description, rules: rules.filter((rule) => rule.value !== '') },
                { preserveScroll: true, onSuccess: onClose, onFinish: () => setSaving(false) })
            }}>
            Save segment
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <Field label="Name" required>
          <Input autoFocus value={name} onChange={(event) => setName(event.target.value)}
            placeholder="Spent over 500" />
        </Field>
        <Field label="Description">
          <Textarea rows={2} value={description} onChange={(event) => setDescription(event.target.value)} />
        </Field>

        <div>
          <p className="mb-2 text-[12.5px] font-medium text-[var(--color-ink)]">Rules</p>
          <div className="space-y-2">
            {rules.map((rule, index) => (
              <div key={index} className="flex items-center gap-2">
                <Select value={rule.field} className="flex-1"
                  onChange={(event) => {
                    const next = [...rules]; next[index] = { ...rule, field: event.target.value }; setRules(next)
                  }}>
                  {fields.map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}
                </Select>
                <Select value={rule.operator} className="w-44"
                  onChange={(event) => {
                    const next = [...rules]; next[index] = { ...rule, operator: event.target.value }; setRules(next)
                  }}>
                  {operators.map((operator) => <option key={operator.key} value={operator.key}>{operator.label}</option>)}
                </Select>
                <Input value={String(rule.value)} className="w-28"
                  onChange={(event) => {
                    const next = [...rules]; next[index] = { ...rule, value: event.target.value }; setRules(next)
                  }} />
                <Button tone="danger" size="sm" aria-label="Remove rule"
                  onClick={() => setRules(rules.filter((_, i) => i !== index))}>
                  <IconTrash className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <Button size="sm" className="mt-2"
            onClick={() => setRules([...rules, { field: 'orders_count', operator: 'gte', value: '' }])}>
            <IconPlus className="h-3.5 w-3.5" />
            Add rule
          </Button>
          <p className="mt-2 text-[11.5px] text-[var(--color-ink-faint)]">
            Money values are in minor units — 50000 is 500.00. Date rules taking “N days ago”
            expect a number of days.
          </p>
        </div>
      </div>
    </Modal>
  )
}
