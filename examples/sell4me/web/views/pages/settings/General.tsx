import { Head, router, useForm } from '@inertiajs/react'
import { date, useCan, useShared } from '@/js/hooks'
import {
  Badge, Banner, Button, Field, Input, Panel, PanelHeader, PageHeader, Select, Textarea,
} from '@/views/ui/kit'
import { IconCheck } from '@/views/ui/icons'

type Props = {
  store: {
    id: number
    name: string
    legal_name: string | null
    slug: string
    currency: string
    country: string
    timezone_name: string
    weight_unit: string
    email: string | null
    phone: string | null
    support_email: string | null
    address_line1: string | null
    address_line2: string | null
    city: string | null
    province: string | null
    postal_code: string | null
    status: string
    launched_at: string | null
    maintenance_enabled: boolean
    maintenance_title: string
    maintenance_message: string
    maintenance_ends_at: string
    help_desk_enabled: boolean
    help_desk_greeting: string
  }
  preview_url: string
  currencies: string[]
  currency_locked: boolean
  currency_unsupported: boolean
  onboarding: {
    steps: { key: string; title: string; body: string; url: string; complete: boolean; required: boolean }[]
    completed: number
    total: number
    can_launch: boolean
    is_live: boolean
  }
}

export default function General({ store, preview_url, currencies, currency_locked, currency_unsupported, onboarding }: Props) {
  const { errors } = useShared()
  const can = useCan()
  // A store in a currency Paystack can't settle starts with no selection. If the
  // form kept the old value, the dropdown would *display* the first supported
  // currency while still holding USD — and picking that same visible option
  // fires no change, so the save would quietly send USD back.
  const form = useForm({ ...store, currency: currency_unsupported ? '' : store.currency })

  return (
    <>
      <Head title="Settings" />
      <PageHeader
        title="Store settings"
        description="Who you are, where you trade, and what you trade in."
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={onboarding.is_live ? 'positive' : 'caution'} dot>
              {onboarding.is_live ? 'Live' : 'Not launched'}
            </Badge>
            {can('settings.update') && onboarding.can_launch && (
              <Button tone="primary" size="sm" onClick={() => router.post('/settings/launch')}>
                Launch store
              </Button>
            )}
          </div>
        }
      />

      {!onboarding.is_live && !onboarding.can_launch && (
        <div className="mb-4">
          <Banner tone="caution" title="Not ready to launch yet">
            <ul className="mt-1 space-y-0.5">
              {onboarding.steps.filter((step) => step.required && !step.complete).map((step) => (
                <li key={step.key}>
                  <a href={step.url} className="hover:underline">{step.title}</a> — {step.body}
                </li>
              ))}
            </ul>
          </Banner>
        </div>
      )}

      {currency_unsupported && (
        <div className="mb-4">
          <Banner tone="critical" title={`${store.currency} can't be charged through Paystack`}>
            Shoppers can't pay until this store uses a currency Paystack settles: NGN, GHS, ZAR or KES.
            Choose one under Trading → Currency and save. Existing prices and orders keep their stored
            numbers, so check your prices afterwards.
          </Banner>
        </div>
      )}

      {store.maintenance_enabled && (
        <div className="mb-4">
          <Banner tone="caution" title="Maintenance mode is on">
            Shoppers see a holding page instead of your shop.{' '}
            <a href="#maintenance" className="font-medium underline">Manage it below</a>.
          </Banner>
        </div>
      )}

      {onboarding.is_live && (
        <div className="mb-4">
          <Banner tone="positive" title={`Live since ${date(store.launched_at)}`}>
            Your storefront is open and taking orders.
          </Banner>
        </div>
      )}

      <form onSubmit={(event) => { event.preventDefault(); form.post('/settings') }}>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Panel>
              <PanelHeader title="Store details" />
              <div className="grid gap-3.5 pt-3.5 sm:grid-cols-2">
                <Field label="Store name" required error={errors.name}>
                  <Input value={form.data.name} invalid={Boolean(errors.name)}
                    onChange={(event) => form.setData('name', event.target.value)} />
                </Field>
                <Field label="Legal name" hint="On invoices, if it differs.">
                  <Input value={form.data.legal_name ?? ''}
                    onChange={(event) => form.setData('legal_name', event.target.value)} />
                </Field>
                <Field label="Store email" hint="Where order notifications go.">
                  <Input type="email" value={form.data.email ?? ''}
                    onChange={(event) => form.setData('email', event.target.value)} />
                </Field>
                <Field label="Support email" hint="Shown to customers on your storefront.">
                  <Input type="email" value={form.data.support_email ?? ''}
                    onChange={(event) => form.setData('support_email', event.target.value)} />
                </Field>
                <Field label="Phone">
                  <Input value={form.data.phone ?? ''}
                    onChange={(event) => form.setData('phone', event.target.value)} />
                </Field>
              </div>
            </Panel>

            <Panel>
              <PanelHeader title="Business address" />
              <div className="grid gap-3.5 pt-3.5 sm:grid-cols-2">
                <Field label="Address" className="sm:col-span-2">
                  <Input value={form.data.address_line1 ?? ''}
                    onChange={(event) => form.setData('address_line1', event.target.value)} />
                </Field>
                <Field label="Apartment, suite, etc." className="sm:col-span-2">
                  <Input value={form.data.address_line2 ?? ''}
                    onChange={(event) => form.setData('address_line2', event.target.value)} />
                </Field>
                <Field label="City">
                  <Input value={form.data.city ?? ''}
                    onChange={(event) => form.setData('city', event.target.value)} />
                </Field>
                <Field label="State or province">
                  <Input value={form.data.province ?? ''}
                    onChange={(event) => form.setData('province', event.target.value)} />
                </Field>
                <Field label="Postal code">
                  <Input value={form.data.postal_code ?? ''}
                    onChange={(event) => form.setData('postal_code', event.target.value)} />
                </Field>
                <Field label="Country">
                  <Input value={form.data.country} maxLength={2}
                    onChange={(event) => form.setData('country', event.target.value.toUpperCase())} />
                </Field>
              </div>
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel>
              <PanelHeader title="Trading" />
              <div className="space-y-3.5 pt-3.5">
                <Field
                  label="Currency"
                  error={errors.currency}
                  hint={currency_locked
                    ? 'Locked — every stored amount is denominated in this, and you have orders.'
                    : 'Can be changed until your first order.'}
                >
                  <Select value={form.data.currency} disabled={currency_locked}
                    onChange={(event) => form.setData('currency', event.target.value)}>
                    {!form.data.currency && <option value="" disabled>Choose a currency…</option>}
                    {currencies.map((code) => <option key={code} value={code}>{code}</option>)}
                  </Select>
                </Field>

                <Field label="Timezone" hint="Your day boundary for reports.">
                  <Input value={form.data.timezone_name}
                    onChange={(event) => form.setData('timezone_name', event.target.value)} />
                </Field>

                <Field label="Weight unit" hint="For weight-based shipping rates.">
                  <Select value={form.data.weight_unit}
                    onChange={(event) => form.setData('weight_unit', event.target.value)}>
                    <option value="kg">Kilograms</option>
                    <option value="g">Grams</option>
                    <option value="lb">Pounds</option>
                    <option value="oz">Ounces</option>
                  </Select>
                </Field>
              </div>
            </Panel>

            <Panel>
              <PanelHeader title="Setup" description={`${onboarding.completed} of ${onboarding.total} done`} />
              <ul className="space-y-1.5 pt-3">
                {onboarding.steps.map((step) => (
                  <li key={step.key} className="flex items-start gap-2 text-[12.5px]">
                    <span className={'mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ' +
                      (step.complete
                        ? 'border-transparent bg-[var(--color-positive)] text-white'
                        : 'border-[var(--color-line)]')}>
                      {step.complete && <IconCheck className="h-2 w-2" />}
                    </span>
                    <a href={step.url}
                      className={step.complete
                        ? 'text-[var(--color-ink-faint)] line-through'
                        : 'text-[var(--color-ink)] hover:underline'}>
                      {step.title}
                    </a>
                  </li>
                ))}
              </ul>
            </Panel>

            {can('settings.update') && (
              <Button type="submit" tone="primary" className="w-full" loading={form.processing}>
                Save settings
              </Button>
            )}
          </div>
        </div>
      </form>

      {onboarding.is_live && can('settings.update') && (
        <MaintenancePanel store={store} previewUrl={preview_url} />
      )}

      {can('settings.update') && <HelpDeskPanel store={store} />}
    </>
  )
}

function HelpDeskPanel({ store }: { store: Props['store'] }) {
  const form = useForm({
    help_desk_enabled: store.help_desk_enabled,
    help_desk_greeting: store.help_desk_greeting,
  })
  const on = form.data.help_desk_enabled

  return (
    <form
      className="mt-4"
      onSubmit={(event) => { event.preventDefault(); form.post('/settings/help-desk', { preserveScroll: true }) }}
    >
      <Panel>
        <PanelHeader
          title="Help desk"
          description="A floating button on your storefront where shoppers can ask a question. Answers come from your Help desk inbox in the dashboard."
        />
        <div className="space-y-4 pt-4">
          <button
            type="button"
            role="switch"
            aria-checked={on}
            onClick={() => form.setData('help_desk_enabled', !on)}
            className={'flex w-full items-center gap-3.5 rounded-[var(--radius-md)] border p-3.5 text-left transition ' +
              (on
                ? 'border-[var(--color-positive)]/50 bg-[var(--color-positive-soft)]'
                : 'border-[var(--color-line)] hover:bg-[var(--color-sunken)]')}
          >
            <span className={'relative h-6 w-11 shrink-0 rounded-full transition ' +
              (on ? 'bg-[var(--color-positive)]' : 'bg-[var(--color-line)]')}>
              <span className={'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ' +
                (on ? 'left-[22px]' : 'left-0.5')} />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-[var(--color-ink)]">
                {on ? 'Widget is live on your storefront' : 'Widget is hidden'}
              </span>
              <span className="block text-[12px] text-[var(--color-ink-muted)]">
                {on ? 'Shoppers can open it from the lower corner of every page.' : 'Turn on, then save, to show it to shoppers.'}
              </span>
            </span>
          </button>

          <Field label="Greeting" hint="Shown above the question box. Leave blank for none.">
            <Input value={form.data.help_desk_greeting} maxLength={200}
              placeholder="Questions about sizing, shipping, or your order? Ask us anything."
              onChange={(event) => form.setData('help_desk_greeting', event.target.value)} />
          </Field>

          <div className="flex justify-end">
            <Button type="submit" tone="primary" loading={form.processing}>Save help desk</Button>
          </div>
        </div>
      </Panel>
    </form>
  )
}

function MaintenancePanel({ store, previewUrl }: { store: Props['store']; previewUrl: string }) {
  const { errors } = useShared()
  const form = useForm({
    maintenance_enabled: store.maintenance_enabled,
    maintenance_title: store.maintenance_title,
    maintenance_message: store.maintenance_message,
    maintenance_ends_at: store.maintenance_ends_at,
  })
  const on = form.data.maintenance_enabled

  return (
    <form
      id="maintenance"
      className="mt-4 scroll-mt-6"
      onSubmit={(event) => { event.preventDefault(); form.post('/settings/maintenance', { preserveScroll: true }) }}
    >
      <Panel>
        <PanelHeader
          title="Maintenance mode"
          description="Close the shop to shoppers while you make changes. Orders in progress, payments and your dashboard keep working."
        />
        <div className="space-y-4 pt-4">
          <button
            type="button"
            role="switch"
            aria-checked={on}
            onClick={() => form.setData('maintenance_enabled', !on)}
            className={'flex w-full items-center gap-3.5 rounded-[var(--radius-md)] border p-3.5 text-left transition ' +
              (on
                ? 'border-[var(--color-caution)]/50 bg-[var(--color-caution-soft)]'
                : 'border-[var(--color-line)] hover:bg-[var(--color-sunken)]')}
          >
            <span className={'relative h-6 w-11 shrink-0 rounded-full transition ' +
              (on ? 'bg-[var(--color-caution)]' : 'bg-[var(--color-line)]')}>
              <span className={'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ' +
                (on ? 'left-[22px]' : 'left-0.5')} />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-[var(--color-ink)]">
                {on ? 'Shop is closed for maintenance' : 'Shop is open'}
              </span>
              <span className="block text-[12px] text-[var(--color-ink-muted)]">
                {on
                  ? 'Save to show shoppers the holding page.'
                  : 'Turn on, then save, to show shoppers a holding page.'}
              </span>
            </span>
          </button>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="Headline" hint="Leave blank for “We’ll be right back”.">
              <Input value={form.data.maintenance_title} maxLength={120}
                placeholder="We’ll be right back"
                onChange={(event) => form.setData('maintenance_title', event.target.value)} />
            </Field>
            <Field label="Expected back" error={errors.maintenance_ends_at}
              hint={`Optional. Shows a countdown, in ${store.timezone_name} time. It never reopens the shop by itself.`}>
              <Input type="datetime-local" value={form.data.maintenance_ends_at}
                invalid={Boolean(errors.maintenance_ends_at)}
                onChange={(event) => form.setData('maintenance_ends_at', event.target.value)} />
            </Field>
            <Field label="Message" className="sm:col-span-2" hint="Say what’s happening and reassure people about their orders.">
              <Textarea value={form.data.maintenance_message} maxLength={2000}
                placeholder="We’re making a few improvements to the shop. Nothing is wrong with your order or your basket — we’ll be open again shortly."
                onChange={(event) => form.setData('maintenance_message', event.target.value)} />
            </Field>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <a href={previewUrl} target="_blank" rel="noreferrer"
              className="text-[12.5px] font-medium text-[var(--color-accent)] hover:underline">
              Preview the shop as you see it ↗
            </a>
            <a href={`${previewUrl}${previewUrl.includes('?') ? '&' : '?'}holding=1`} target="_blank" rel="noreferrer"
              className="text-[12.5px] font-medium text-[var(--color-accent)] hover:underline">
              Preview the holding page ↗
            </a>
            <Button type="submit" tone="primary" loading={form.processing}>Save maintenance</Button>
          </div>
        </div>
      </Panel>
    </form>
  )
}
