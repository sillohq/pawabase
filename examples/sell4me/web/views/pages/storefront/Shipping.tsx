import { Head, router } from '@inertiajs/react'
import { useState } from 'react'
import { money, useCan } from '@/js/hooks'
import {
  Badge, Banner, Button, Empty, Field, Input, Modal, Panel, PanelHeader,
  PageHeader, Select, TBody, TD, TH, THead, TR,
} from '@/views/ui/kit'
import { IconPlus, IconTrash, IconTruck } from '@/views/ui/icons'
import type { Money } from '@/js/types'

type Rate = {
  id: number
  name: string
  description: string | null
  kind: 'flat' | 'weight' | 'price'
  price: Money
  price_minor: number
  min_weight_grams: number | null
  max_weight_grams: number | null
  min_subtotal: Money | null
  max_subtotal: Money | null
  delivery_estimate: string | null
  is_active: boolean
}

type Zone = { id: number; name: string; countries: string[]; rates: Rate[] }

export default function Shipping({ zones }: { zones: Zone[] }) {
  const can = useCan()
  const [editing, setEditing] = useState<Zone | null>(null)
  const [creating, setCreating] = useState(false)

  return (
    <>
      <Head title="Shipping" />
      <PageHeader
        title="Shipping"
        description="Where you ship and what you charge. A zone matching a specific country always beats a rest-of-world one."
        actions={can('settings.update') && (
          <Button tone="primary" size="sm" onClick={() => setCreating(true)}>
            <IconPlus className="h-3.5 w-3.5" />
            New zone
          </Button>
        )}
      />

      {zones.length === 0 ? (
        <div className="panel">
          <Empty icon={<IconTruck className="h-6 w-6" />} title="No shipping zones"
            body="Checkout cannot complete without at least one rate covering the customer's country." />
        </div>
      ) : (
        <div className="space-y-4">
          {zones.map((zone) => (
            <Panel key={zone.id} padded={false}>
              <PanelHeader
                title={zone.name}
                description={
                  <span className="flex flex-wrap gap-1">
                    {zone.countries.map((country) => (
                      <Badge key={country}>{country === '*' ? 'Everywhere else' : country}</Badge>
                    ))}
                  </span>
                }
                action={can('settings.update') && (
                  <Button size="sm" onClick={() => setEditing(zone)}>Edit zone</Button>
                )}
              />
              {zone.rates.length === 0 ? (
                <Empty title="No rates" body="This zone matches, but has nothing to charge — checkout will refuse." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[13px]">
                    <THead>
                      <tr>
                        <TH>Rate</TH>
                        <TH>Applies when</TH>
                        <TH>Estimate</TH>
                        <TH align="right">Price</TH>
                      </tr>
                    </THead>
                    <TBody>
                      {zone.rates.map((rate) => (
                        <TR key={rate.id}>
                          <TD>
                            <span className="font-medium text-[var(--color-ink)]">{rate.name}</span>
                            {!rate.is_active && (
                              <span className="ml-1.5 align-middle"><Badge tone="neutral">off</Badge></span>
                            )}
                            {rate.description && (
                              <span className="block text-[12px] text-[var(--color-ink-faint)]">
                                {rate.description}
                              </span>
                            )}
                          </TD>
                          <TD className="text-[12px] text-[var(--color-ink-soft)]">
                            {rate.kind === 'flat' && 'Always'}
                            {rate.kind === 'weight' && (
                              `Parcel ${rate.min_weight_grams ?? 0}g – ${rate.max_weight_grams ?? '∞'}g`
                            )}
                            {rate.kind === 'price' && (
                              `Order ${rate.min_subtotal ? money(rate.min_subtotal) : 'any'} – ${rate.max_subtotal ? money(rate.max_subtotal) : '∞'}`
                            )}
                          </TD>
                          <TD className="text-[var(--color-ink-soft)]">{rate.delivery_estimate ?? '—'}</TD>
                          <TD align="right" className="font-medium">
                            {rate.price_minor === 0
                              ? <span className="text-[var(--color-positive)]">Free</span>
                              : money(rate.price)}
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </table>
                </div>
              )}
            </Panel>
          ))}
        </div>
      )}

      <div className="mt-4">
        <Banner tone="neutral" title="Carrier-calculated rates">
          A live carrier quote would be a fourth rate kind. Checkout asks the shipping service
          for its options rather than reading these tables directly, so adding one does not
          touch checkout.
        </Banner>
      </div>

      {(creating || editing) && (
        <ZoneModal zone={editing} onClose={() => { setCreating(false); setEditing(null) }} />
      )}
    </>
  )
}

function ZoneModal({ zone, onClose }: { zone: Zone | null; onClose: () => void }) {
  const [name, setName] = useState(zone?.name ?? '')
  const [countries, setCountries] = useState((zone?.countries ?? ['*']).join(', '))
  const [rates, setRates] = useState(
    (zone?.rates ?? []).map((rate) => ({
      name: rate.name,
      description: rate.description ?? '',
      kind: rate.kind,
      price: (rate.price_minor / 100).toFixed(2),
      min_weight_grams: rate.min_weight_grams ?? '',
      max_weight_grams: rate.max_weight_grams ?? '',
      min_subtotal: rate.min_subtotal ? (rate.min_subtotal.minor / 100).toFixed(2) : '',
      max_subtotal: rate.max_subtotal ? (rate.max_subtotal.minor / 100).toFixed(2) : '',
      delivery_estimate: rate.delivery_estimate ?? '',
      is_active: rate.is_active,
    })),
  )
  const [saving, setSaving] = useState(false)

  type Draft = (typeof rates)[number]

  function update(index: number, patch: Partial<Draft>) {
    const next = [...rates]
    next[index] = { ...next[index]!, ...patch }
    setRates(next)
  }

  return (
    <Modal
      open onClose={onClose} title={zone ? `Edit ${zone.name}` : 'New shipping zone'} width="xl"
      footer={
        <>
          <Button size="sm" onClick={onClose}>Cancel</Button>
          <Button tone="primary" size="sm" loading={saving} disabled={!name.trim()}
            onClick={() => {
              setSaving(true)
              router.post('/settings/shipping', {
                id: zone?.id, name,
                countries: countries.split(',').map((code) => code.trim()).filter(Boolean),
                rates,
              }, { preserveScroll: true, onSuccess: onClose, onFinish: () => setSaving(false) })
            }}>
            Save zone
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Zone name" required>
            <Input autoFocus value={name} onChange={(event) => setName(event.target.value)}
              placeholder="United Kingdom" />
          </Field>
          <Field label="Countries" hint="Two-letter codes, comma separated. Use * for everywhere else.">
            <Input value={countries} onChange={(event) => setCountries(event.target.value)}
              placeholder="GB, IE" />
          </Field>
        </div>

        <div>
          <p className="mb-2 text-[12.5px] font-medium text-[var(--color-ink)]">Rates</p>
          <div className="space-y-3">
            {rates.map((rate, index) => (
              <div key={index} className="rounded-[var(--radius-sm)] border border-[var(--color-line)] p-3">
                <div className="flex items-end gap-2">
                  <Field label="Name" className="flex-1">
                    <Input value={rate.name} onChange={(event) => update(index, { name: event.target.value })}
                      placeholder="Standard shipping" />
                  </Field>
                  <Field label="Price" className="w-24">
                    <Input value={rate.price} onChange={(event) => update(index, { price: event.target.value })} />
                  </Field>
                  <Button tone="danger" size="sm" aria-label="Remove rate"
                    onClick={() => setRates(rates.filter((_, i) => i !== index))}>
                    <IconTrash className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                  <Field label="Applies">
                    <Select value={rate.kind}
                      onChange={(event) => update(index, { kind: event.target.value as Rate['kind'] })}>
                      <option value="flat">Always</option>
                      <option value="price">Within an order-value band</option>
                      <option value="weight">Within a weight band</option>
                    </Select>
                  </Field>
                  <Field label="Delivery estimate">
                    <Input value={rate.delivery_estimate}
                      onChange={(event) => update(index, { delivery_estimate: event.target.value })}
                      placeholder="3–5 business days" />
                  </Field>
                </div>

                {rate.kind === 'price' && (
                  <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                    <Field label="Order at least" hint="Free shipping over 50 is a 0.00 rate starting at 50.">
                      <Input value={rate.min_subtotal}
                        onChange={(event) => update(index, { min_subtotal: event.target.value })} />
                    </Field>
                    <Field label="Order under" hint="Blank for no upper limit.">
                      <Input value={rate.max_subtotal}
                        onChange={(event) => update(index, { max_subtotal: event.target.value })} />
                    </Field>
                  </div>
                )}

                {rate.kind === 'weight' && (
                  <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                    <Field label="From (grams)">
                      <Input type="number" value={rate.min_weight_grams}
                        onChange={(event) => update(index, { min_weight_grams: event.target.value })} />
                    </Field>
                    <Field label="Under (grams)">
                      <Input type="number" value={rate.max_weight_grams}
                        onChange={(event) => update(index, { max_weight_grams: event.target.value })} />
                    </Field>
                  </div>
                )}
              </div>
            ))}
          </div>

          <Button size="sm" className="mt-2"
            onClick={() => setRates([...rates, {
              name: '', description: '', kind: 'flat', price: '0.00',
              min_weight_grams: '', max_weight_grams: '', min_subtotal: '', max_subtotal: '',
              delivery_estimate: '', is_active: true,
            }])}>
            <IconPlus className="h-3.5 w-3.5" />
            Add rate
          </Button>

          <p className="mt-2 text-[11.5px] text-[var(--color-ink-faint)]">
            Saving replaces this zone&rsquo;s rates. Your other zones are untouched.
          </p>
        </div>
      </div>
    </Modal>
  )
}
