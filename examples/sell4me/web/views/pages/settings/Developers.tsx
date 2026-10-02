import { Head, router } from '@inertiajs/react'
import { useState } from 'react'
import { dateTime, useCan } from '@/js/hooks'
import {
  Badge, Banner, Button, ButtonLink, Checkbox, Empty, Field, Input, Modal, Mono,
  Panel, PanelHeader, PageHeader, TBody, TD, TH, THead, TR,
} from '@/views/ui/kit'
import { IconCode, IconMail, IconPlus } from '@/views/ui/icons'

type ApiKey = {
  id: number
  name: string
  prefix: string
  scopes: string[]
  last_used_at: string | null
  last_used_ip: string | null
  request_count: number
  is_active: boolean
  created_by: string | null
  created_at: string | null
  revoked_at: string | null
}

type Webhook = {
  id: number
  url: string
  events: string[]
  description: string | null
  is_active: boolean
  consecutive_failures: number
  last_status_code: number | null
  last_delivery_at: string | null
  disabled_at: string | null
}

type Props = {
  api_keys: ApiKey[]
  webhooks: Webhook[]
  available_events: string[]
  permission_groups: { name: string; permissions: { key: string; label: string }[] }[]
  webhook_signature_header: string
}

export default function Developers({
  api_keys, webhooks, available_events, permission_groups, webhook_signature_header,
}: Props) {
  const can = useCan()
  const [creatingKey, setCreatingKey] = useState(false)
  const [editingHook, setEditingHook] = useState<Webhook | null>(null)
  const [creatingHook, setCreatingHook] = useState(false)

  return (
    <>
      <Head title="API and webhooks" />
      <PageHeader
        title="Developers"
        description="Programmatic access to this store, and outbound notifications to your systems."
        actions={
          <ButtonLink href="/developers/mail" variant="secondary">
            <IconMail className="h-3.5 w-3.5" />
            Email templates
          </ButtonLink>
        }
      />

      <Panel padded={false} className="mb-4">
        <PanelHeader
          title="API keys"
          description="A key can never do more than the person who created it."
          action={can('developers.manage') && (
            <Button size="sm" onClick={() => setCreatingKey(true)}>
              <IconPlus className="h-3.5 w-3.5" />
              New key
            </Button>
          )}
        />
        {api_keys.length === 0 ? (
          <Empty icon={<IconCode className="h-6 w-6" />} title="No API keys"
            body="Create one to read your orders and products from your own systems." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <THead>
                <tr>
                  <TH>Key</TH>
                  <TH>Scopes</TH>
                  <TH align="right">Requests</TH>
                  <TH align="right">Last used</TH>
                  <TH>Status</TH>
                  {can('developers.manage') && <TH />}
                </tr>
              </THead>
              <TBody>
                {api_keys.map((key) => (
                  <TR key={key.id}>
                    <TD>
                      <span className="font-medium text-[var(--color-ink)]">{key.name}</span>
                      <span className="block"><Mono>{key.prefix}…</Mono></span>
                    </TD>
                    <TD className="max-w-[280px]">
                      <div className="flex flex-wrap gap-1">
                        {key.scopes.slice(0, 4).map((scope) => <Badge key={scope}>{scope}</Badge>)}
                        {key.scopes.length > 4 && (
                          <span className="text-[11.5px] text-[var(--color-ink-faint)]">
                            +{key.scopes.length - 4}
                          </span>
                        )}
                      </div>
                    </TD>
                    <TD align="right">{key.request_count}</TD>
                    <TD align="right" className="whitespace-nowrap text-[var(--color-ink-faint)]">
                      {key.last_used_at ? dateTime(key.last_used_at) : 'never'}
                    </TD>
                    <TD>
                      <Badge tone={key.is_active ? 'positive' : 'neutral'} dot>
                        {key.is_active ? 'active' : 'revoked'}
                      </Badge>
                    </TD>
                    {can('developers.manage') && (
                      <TD align="right">
                        {key.is_active && (
                          <Button tone="danger" size="sm"
                            onClick={() => router.post(`/developers/keys/${key.id}/revoke`, {}, { preserveScroll: true })}>
                            Revoke
                          </Button>
                        )}
                      </TD>
                    )}
                  </TR>
                ))}
              </TBody>
            </table>
          </div>
        )}
      </Panel>

      <Panel padded={false}>
        <PanelHeader
          title="Webhooks"
          description={`Signed with HMAC-SHA256 and sent as ${webhook_signature_header}.`}
          action={can('developers.manage') && (
            <Button size="sm" onClick={() => setCreatingHook(true)}>
              <IconPlus className="h-3.5 w-3.5" />
              Add endpoint
            </Button>
          )}
        />
        {webhooks.length === 0 ? (
          <Empty icon={<IconCode className="h-6 w-6" />} title="No webhooks"
            body="Get told about orders, payments and stock changes as they happen — no polling." />
        ) : (
          <div className="divide-y divide-[var(--color-line-soft)]">
            {webhooks.map((hook) => (
              <div key={hook.id} className="px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-[var(--color-ink)]">{hook.url}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {hook.events.map((event) => <Badge key={event}>{event}</Badge>)}
                    </div>
                    <p className="mt-1.5 text-[11.5px] text-[var(--color-ink-faint)]">
                      {hook.last_delivery_at
                        ? `Last delivery ${dateTime(hook.last_delivery_at)} · HTTP ${hook.last_status_code ?? '—'}`
                        : 'No deliveries yet'}
                      {hook.consecutive_failures > 0 && ` · ${hook.consecutive_failures} consecutive failures`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Badge tone={hook.is_active ? 'positive' : 'critical'} dot>
                      {hook.is_active ? 'active' : 'disabled'}
                    </Badge>
                    {can('developers.manage') && (
                      <>
                        <Button size="sm"
                          onClick={() => router.post(`/developers/webhooks/${hook.id}/test`, {}, { preserveScroll: true })}>
                          Test
                        </Button>
                        <Button size="sm" onClick={() => setEditingHook(hook)}>Edit</Button>
                        <Button tone="danger" size="sm"
                          onClick={() => router.post(`/developers/webhooks/${hook.id}/delete`, {}, { preserveScroll: true })}>
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {!hook.is_active && hook.disabled_at && (
                  <div className="mt-2">
                    <Banner tone="critical" title="Disabled after repeated failures">
                      Re-enabling resets the failure count. Deliveries retry six times over about
                      two hours before an event is given up on.
                    </Banner>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel className="mt-4">
        <PanelHeader title="Verifying a delivery" />
        <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--color-ink-soft)]">
          Each request carries <Mono>{webhook_signature_header}: t=&lt;timestamp&gt;,v1=&lt;hmac&gt;</Mono>,
          where the HMAC is SHA-256 over <Mono>{'{timestamp}.{raw body}'}</Mono> keyed by your
          signing secret — the same scheme Stripe uses, so code you already have will work.
          Compare in constant time, and reject a timestamp outside your tolerance window to
          stop a captured delivery being replayed.
        </p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--color-ink-soft)]">
          <Mono>X-Commerce-Event-Id</Mono> is stable across retries. Deduplicate on it — we
          retry, and your endpoint should be able to see the same event twice without acting
          twice.
        </p>
      </Panel>

      {creatingKey && (
        <KeyModal groups={permission_groups} onClose={() => setCreatingKey(false)} />
      )}
      {(creatingHook || editingHook) && (
        <WebhookModal hook={editingHook} events={available_events}
          onClose={() => { setCreatingHook(false); setEditingHook(null) }} />
      )}
    </>
  )
}

function KeyModal({
  groups, onClose,
}: {
  groups: Props['permission_groups']
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  return (
    <Modal
      open onClose={onClose} title="New API key" width="lg"
      description="The key is shown once, right after it is created. Only a hash is stored."
      footer={
        <>
          <Button size="sm" onClick={onClose}>Cancel</Button>
          <Button tone="primary" size="sm" loading={saving}
            disabled={!name.trim() || scopes.length === 0}
            onClick={() => {
              setSaving(true)
              router.post('/developers/keys', { name, scopes },
                { preserveScroll: true, onSuccess: onClose, onFinish: () => setSaving(false) })
            }}>
            Create key
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <Field label="Name" required hint="What this key is for — you will thank yourself later.">
          <Input autoFocus value={name} onChange={(event) => setName(event.target.value)}
            placeholder="Warehouse sync" />
        </Field>

        <div>
          <p className="mb-2 text-[12.5px] font-medium text-[var(--color-ink)]">
            Scopes
            <span className="ml-1.5 font-normal text-[var(--color-ink-faint)]">
              only ones you hold yourself can be granted
            </span>
          </p>
          <div className="max-h-64 space-y-3 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--color-line)] p-3">
            {groups.map((group) => (
              <div key={group.name}>
                <p className="nav-heading mb-1 px-0">{group.name}</p>
                <div className="space-y-1">
                  {group.permissions.map((permission) => (
                    <Checkbox
                      key={permission.key}
                      label={<span>{permission.label} <Mono>{permission.key}</Mono></span>}
                      checked={scopes.includes(permission.key)}
                      onChange={(event) => setScopes(event.target.checked
                        ? [...scopes, permission.key]
                        : scopes.filter((scope) => scope !== permission.key))}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}

function WebhookModal({
  hook, events, onClose,
}: {
  hook: Webhook | null
  events: string[]
  onClose: () => void
}) {
  const [url, setUrl] = useState(hook?.url ?? '')
  const [selected, setSelected] = useState<string[]>(hook?.events ?? [])
  const [description, setDescription] = useState(hook?.description ?? '')
  const [active, setActive] = useState(hook?.is_active ?? true)
  const [saving, setSaving] = useState(false)

  return (
    <Modal
      open onClose={onClose} title={hook ? 'Edit endpoint' : 'New webhook endpoint'}
      footer={
        <>
          <Button size="sm" onClick={onClose}>Cancel</Button>
          <Button tone="primary" size="sm" loading={saving}
            disabled={!url.trim() || selected.length === 0}
            onClick={() => {
              setSaving(true)
              router.post('/developers/webhooks',
                { id: hook?.id, url, events: selected, description, is_active: active },
                { preserveScroll: true, onSuccess: onClose, onFinish: () => setSaving(false) })
            }}>
            Save endpoint
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <Field label="Endpoint URL" required hint="Must be https:// once your store is live.">
          <Input type="url" autoFocus value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com/hooks/commerce" />
        </Field>

        <Field label="Description">
          <Input value={description} onChange={(event) => setDescription(event.target.value)} />
        </Field>

        <div>
          <p className="mb-2 text-[12.5px] font-medium text-[var(--color-ink)]">Events</p>
          <div className="max-h-52 space-y-1 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--color-line)] p-3">
            {events.map((event) => (
              <Checkbox
                key={event}
                label={<Mono>{event}</Mono>}
                checked={selected.includes(event)}
                onChange={(changed) => setSelected(changed.target.checked
                  ? [...selected, event]
                  : selected.filter((entry) => entry !== event))}
              />
            ))}
          </div>
        </div>

        {hook && (
          <Checkbox label="Active" hint="Re-enabling resets the failure count."
            checked={active} onChange={(event) => setActive(event.target.checked)} />
        )}

        {!hook && (
          <Banner tone="info">
            The signing secret is shown once, immediately after the endpoint is created.
          </Banner>
        )}
      </div>
    </Modal>
  )
}
