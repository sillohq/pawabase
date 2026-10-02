import { Head, Link, router, usePage, WhenVisible } from '@inertiajs/react'
import { useEffect, useState } from 'react'
import { dateTime, useCan, useDebounced } from '@/js/hooks'
import {
  Badge, Button, Empty, Field, Input, Modal, Mono, Panel, PanelHeader, PageHeader,
  SearchInput, Select, Skeleton, StatusBadge, TBody, TD, TH, THead, TR, Table, Tabs,
} from '@/views/ui/kit'
import { IconInventory } from '@/views/ui/icons'
import type { VariantRow } from '@/js/types'

type Row = VariantRow & {
  product_id: number
  product_title: string
  product_status: string
}

type Movement = {
  id: number
  delta: number
  balance_after: number
  reason: string
  note: string | null
  sku: string | null
  variant_title: string
  actor: string
  created_at: string | null
}

type Props = {
  variants: Row[]
  view: string
  search: string
  counts: { all: number; low: number; out: number }
  movements?: Movement[]
}

export default function InventoryIndex({ variants, view, search, counts }: Props) {
  const can = useCan()
  const [query, setQuery] = useState(search)
  const [adjusting, setAdjusting] = useState<Row | null>(null)
  const settled = useDebounced(query, 350)

  useEffect(() => {
    if (settled === search) return
    router.get('/inventory', { view, q: settled || undefined },
      { preserveState: true, preserveScroll: true, replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled])

  return (
    <>
      <Head title="Inventory" />
      <PageHeader
        title="Inventory"
        description="Stock on hand, what is held for checkouts in progress, and what is left to sell."
      />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          tabs={[
            { key: 'all', label: 'All', count: counts.all },
            { key: 'low', label: 'Low stock', count: counts.low },
            { key: 'out', label: 'Out of stock', count: counts.out },
            { key: 'tracked', label: 'Tracked' },
          ]}
          active={view}
          onSelect={(key) => router.get('/inventory', { view: key }, { preserveState: true })}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="SKU or product…" className="w-full sm:w-64" />
      </div>

      {variants.length === 0 ? (
        <div className="panel">
          <Empty
            icon={<IconInventory className="h-6 w-6" />}
            title={search ? `Nothing matching “${search}”` : 'Nothing to show'}
            body={view === 'low' ? 'Nothing is running low — that is good news.' : 'Products you add appear here with their stock.'}
          />
        </div>
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>Product</TH>
              <TH>SKU</TH>
              <TH align="right">On hand</TH>
              <TH align="right">Held</TH>
              <TH align="right">Available</TH>
              <TH>State</TH>
              {can('inventory.update') && <TH />}
            </tr>
          </THead>
          <TBody>
            {variants.map((variant) => (
              <TR key={variant.id}>
                <TD>
                  <Link href={`/products/${variant.product_id}`} className="font-medium text-[var(--color-ink)] hover:text-[var(--color-accent)]">
                    {variant.product_title}
                  </Link>
                  {!variant.is_default && (
                    <span className="ml-1.5 text-[12px] text-[var(--color-ink-faint)]">{variant.title}</span>
                  )}
                </TD>
                <TD className="text-[var(--color-ink-soft)]">{variant.sku ? <Mono>{variant.sku}</Mono> : '—'}</TD>
                <TD align="right">{variant.track_inventory ? variant.stock : '—'}</TD>
                <TD align="right" className="text-[var(--color-ink-faint)]">
                  {variant.reserved || '—'}
                </TD>
                <TD align="right" className="font-medium">
                  {variant.available ?? <span className="text-[var(--color-ink-faint)]">∞</span>}
                </TD>
                <TD><StatusBadge status={variant.stock_state} /></TD>
                {can('inventory.update') && (
                  <TD align="right">
                    <Button size="sm" onClick={() => setAdjusting(variant)}>Adjust</Button>
                  </TD>
                )}
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <Panel className="mt-4" padded={false}>
        <PanelHeader title="Recent movements" description="Every stock change across the store" />
        <div className="p-3">
          <WhenVisible data="movements" fallback={<Skeleton rows={5} />}>
            <Movements />
          </WhenVisible>
        </div>
      </Panel>

      {adjusting && <AdjustModal variant={adjusting} onClose={() => setAdjusting(null)} />}
    </>
  )
}

function Movements() {
  const { movements = [] } = usePage().props as unknown as Props
  if (movements.length === 0) {
    return <Empty title="No movements yet" body="Sales, restocks and adjustments will be listed here." />
  }
  return (
    <div className="divide-y divide-[var(--color-line-soft)]">
      {movements.map((movement) => (
        <div key={movement.id} className="flex items-center justify-between gap-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-[12.5px] text-[var(--color-ink)]">
              {movement.sku ? <Mono>{movement.sku}</Mono> : movement.variant_title}{' '}
              <Badge>{movement.reason}</Badge>
            </p>
            <p className="text-[11.5px] text-[var(--color-ink-faint)]">
              {movement.actor} · {dateTime(movement.created_at)}
              {movement.note && ` · ${movement.note}`}
            </p>
          </div>
          <span className={
            'shrink-0 text-[13px] font-medium tabular ' +
            (movement.delta >= 0 ? 'text-[var(--color-positive)]' : 'text-[var(--color-critical)]')
          }>
            {movement.delta >= 0 ? '+' : ''}{movement.delta}
            <span className="ml-1.5 text-[11.5px] font-normal text-[var(--color-ink-faint)]">
              → {movement.balance_after}
            </span>
          </span>
        </div>
      ))}
    </div>
  )
}

function AdjustModal({ variant, onClose }: { variant: Row; onClose: () => void }) {
  const [mode, setMode] = useState<'delta' | 'set'>('delta')
  const [value, setValue] = useState('')
  const [reason, setReason] = useState('adjustment')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const parsed = Number(value) || 0
  const resulting = mode === 'set' ? parsed : variant.stock + parsed

  return (
    <Modal
      open
      onClose={onClose}
      title="Adjust stock"
      description={`${variant.product_title}${variant.is_default ? '' : ` · ${variant.title}`}`}
      width="sm"
      footer={
        <>
          <Button size="sm" onClick={onClose}>Cancel</Button>
          <Button
            tone="primary" size="sm" loading={saving} disabled={!value}
            onClick={() => {
              setSaving(true)
              router.post(`/inventory/${variant.id}`, { mode, value: parsed, reason, note },
                { preserveScroll: true, onSuccess: onClose, onFinish: () => setSaving(false) })
            }}
          >
            Save adjustment
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <div className="rounded-[var(--radius-sm)] bg-[var(--color-sunken)] px-3 py-2 text-[12.5px] text-[var(--color-ink-soft)]">
          On hand now: <strong className="text-[var(--color-ink)] tabular">{variant.stock}</strong>
          {variant.reserved > 0 && <> · {variant.reserved} held for checkouts</>}
        </div>

        <Field label="How">
          <Select value={mode} onChange={(event) => setMode(event.target.value as 'delta' | 'set')}>
            <option value="delta">Add or remove (a delivery, a breakage)</option>
            <option value="set">Set to a count (a stock take)</option>
          </Select>
        </Field>

        <Field
          label={mode === 'set' ? 'Counted quantity' : 'Change by'}
          hint={value ? `Stock becomes ${resulting}.` : mode === 'delta' ? 'Negative removes stock.' : undefined}
        >
          <Input
            type="number" autoFocus value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={mode === 'set' ? '12' : '+5'}
          />
        </Field>

        <Field label="Reason" hint="Groups the inventory history.">
          <Select value={reason} onChange={(event) => setReason(event.target.value)}>
            <option value="received">Stock received</option>
            <option value="recount">Stock take</option>
            <option value="damaged">Damaged</option>
            <option value="adjustment">Other adjustment</option>
          </Select>
        </Field>

        <Field label="Note">
          <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional" />
        </Field>
      </div>
    </Modal>
  )
}
