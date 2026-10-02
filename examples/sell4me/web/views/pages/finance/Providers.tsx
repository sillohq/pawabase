/**
 * Connecting a payment provider.
 *
 * The most security-sensitive screen in the dashboard, and it behaves
 * accordingly: a secret is never sent back to the browser, the form shows a
 * mask, and submitting the mask unchanged leaves the stored key alone.
 *
 * Connecting is not "save the keys" — the server makes a live call and the
 * provider stays `pending` until it succeeds. A merchant should not be able to
 * go live on a typo.
 */

import { Head, router } from '@inertiajs/react'
import { useState } from 'react'
import { dateTime, useCan } from '@/js/hooks'
import {
  Badge, Banner, Button, Checkbox, Empty, Field, Input, Modal, Mono,
  Panel, PageHeader, StatusBadge,
} from '@/views/ui/kit'
import { IconCard, IconCheck, IconWarning } from '@/views/ui/icons'

type ProviderSpec = {
  key: string
  label: string
  description: string
  currencies: string[]
  requires_credentials: boolean
  fields: { name: string; label: string; secret: boolean }[]
}

type Account = {
  provider: string
  label: string | null
  status: string
  status_message: string | null
  is_default: boolean
  is_test_mode: boolean
  public_key: string | null
  has_secret: boolean
  has_webhook_secret: boolean
  account_id: string | null
  capabilities: {
    display_name?: string
    currencies?: string[]
    payouts_enabled?: boolean
    charges_enabled?: boolean
    country?: string
  }
  last_verified_at: string | null
  webhook_url: string
}

type Props = { catalogue: ProviderSpec[]; accounts: Account[] }

export default function Providers({ catalogue, accounts }: Props) {
  const can = useCan()
  const [connecting, setConnecting] = useState<ProviderSpec | null>(null)

  const byKey = Object.fromEntries(accounts.map((account) => [account.provider, account]))
  const connected = accounts.filter((account) => account.status === 'connected')

  return (
    <>
      <Head title="Payment providers" />
      <PageHeader
        title="Payment providers"
        description="Paystack is the only provider available. Charges settle to the platform first — connect a bank account under Payouts to be paid your share once an order is confirmed."
      />

      {catalogue.length === 0 ? (
        <div className="mb-4">
          <Banner tone="neutral" title="Nothing to connect here">
            Paystack doesn't use a key you enter — connect a bank account under{' '}
            <a href="/payments/payouts/connect" className="underline">Payouts</a> instead.
          </Banner>
        </div>
      ) : connected.length === 0 && (
        <div className="mb-4">
          <Banner tone="caution" title="You cannot take payments yet">
            Connect a provider below. The sandbox needs no credentials and runs the whole
            order lifecycle locally.
          </Banner>
        </div>
      )}

      <div className="space-y-3">
        {catalogue.map((spec) => {
          const account = byKey[spec.key]
          const isConnected = account?.status === 'connected'
          const payoutsOff = isConnected && account.capabilities.payouts_enabled === false

          return (
            <Panel key={spec.key} padded={false}>
              <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="flex min-w-0 gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-sunken)] text-[var(--color-ink-soft)]">
                    <IconCard />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h2 className="text-[14px] font-semibold text-[var(--color-ink)]">{spec.label}</h2>
                      {account && <StatusBadge status={account.status} />}
                      {account?.is_default && <Badge tone="accent">Default</Badge>}
                      {account?.is_test_mode && isConnected && <Badge tone="caution">Test mode</Badge>}
                    </div>
                    <p className="mt-1 max-w-2xl text-[12.5px] text-[var(--color-ink-soft)]">
                      {spec.description}
                    </p>
                    {spec.currencies.length > 0 && (
                      <p className="mt-1 text-[11.5px] text-[var(--color-ink-faint)]">
                        Settles {spec.currencies.join(', ')}
                      </p>
                    )}
                  </div>
                </div>

                {can('settings.update') && (
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    {isConnected ? (
                      <>
                        {!account.is_default && (
                          <Button size="sm"
                            onClick={() => router.post(`/payments/providers/${spec.key}/default`, {}, { preserveScroll: true })}>
                            Make default
                          </Button>
                        )}
                        <Button size="sm"
                          onClick={() => router.post(`/payments/providers/${spec.key}/verify`, {}, { preserveScroll: true })}>
                          Re-verify
                        </Button>
                        {spec.requires_credentials && (
                          <>
                            <Button size="sm" onClick={() => setConnecting(spec)}>Edit keys</Button>
                            <Button tone="danger" size="sm"
                              onClick={() => router.post(`/payments/providers/${spec.key}/disconnect`, {}, { preserveScroll: true })}>
                              Disconnect
                            </Button>
                          </>
                        )}
                      </>
                    ) : (
                      <Button tone="primary" size="sm"
                        onClick={() => spec.requires_credentials
                          ? setConnecting(spec)
                          : router.post(`/payments/providers/${spec.key}/connect`, { is_test_mode: true }, { preserveScroll: true })}>
                        Connect
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {account && account.status !== 'disconnected' && (
                <div className="border-t border-[var(--color-line)] bg-[var(--color-sunken)] px-4 py-3">
                  {account.status_message && (
                    <p className={'mb-2 flex items-start gap-1.5 text-[12.5px] ' +
                      (account.status === 'error' ? 'text-[var(--color-critical)]' : 'text-[var(--color-ink-soft)]')}>
                      {account.status === 'error' ? <IconWarning className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <IconCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                      {account.status_message}
                    </p>
                  )}

                  {payoutsOff && (
                    <div className="mb-2">
                      <Banner tone="caution" title="Payouts are not enabled">
                        You can take payments but your provider will not pay them out until you
                        finish verification in their dashboard.
                      </Banner>
                    </div>
                  )}

                  <dl className="grid gap-x-6 gap-y-1.5 text-[12px] sm:grid-cols-2">
                    {account.capabilities.display_name && (
                      <Row label="Account">{account.capabilities.display_name}</Row>
                    )}
                    {account.account_id && <Row label="Provider id"><Mono>{account.account_id}</Mono></Row>}
                    {account.public_key && <Row label="Public key"><Mono>{account.public_key.slice(0, 16)}…</Mono></Row>}
                    {account.has_secret && <Row label="Secret key">stored, encrypted</Row>}
                    <Row label="Last verified">{dateTime(account.last_verified_at)}</Row>
                    <Row label="Webhook URL"><Mono>{account.webhook_url}</Mono></Row>
                  </dl>

                  <p className="mt-2 text-[11.5px] text-[var(--color-ink-faint)]">
                    Point {spec.label}&rsquo;s webhook at that URL. Deliveries are verified by
                    signature and handled exactly once, however many times they arrive.
                  </p>
                </div>
              )}
            </Panel>
          )
        })}
      </div>

      {catalogue.length === 0 && (
        <div className="panel">
          <Empty title="No providers available" body="No payment provider is enabled in this environment." />
        </div>
      )}

      {connecting && (
        <ConnectModal
          spec={connecting}
          account={byKey[connecting.key]}
          onClose={() => setConnecting(null)}
        />
      )}
    </>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 sm:block">
      <dt className="text-[var(--color-ink-faint)]">{label}</dt>
      <dd className="truncate text-[var(--color-ink)]">{children}</dd>
    </div>
  )
}

function ConnectModal({
  spec, account, onClose,
}: {
  spec: ProviderSpec
  account?: Account
  onClose: () => void
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const field of spec.fields) {
      if (field.name === 'public_key') initial[field.name] = account?.public_key ?? ''
      // A stored secret comes back as a placeholder containing the mask
      // character. Submitting it unchanged is understood by the server as
      // "leave this alone" — see MASK_MARKER in routes/web/finance.py.
      else if (field.secret && account?.has_secret) initial[field.name] = '••••••••…'
      else initial[field.name] = ''
    }
    return initial
  })
  const [testMode, setTestMode] = useState(account?.is_test_mode ?? true)
  const [saving, setSaving] = useState(false)

  return (
    <Modal
      open onClose={onClose}
      title={`Connect ${spec.label}`}
      description="Your keys are encrypted before they are stored, and are never sent back to this page."
      footer={
        <>
          <Button size="sm" onClick={onClose}>Cancel</Button>
          <Button tone="primary" size="sm" loading={saving}
            onClick={() => {
              setSaving(true)
              router.post(`/payments/providers/${spec.key}/connect`,
                { ...values, is_test_mode: testMode },
                { preserveScroll: true, onSuccess: onClose, onFinish: () => setSaving(false) })
            }}>
            Save and verify
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        {spec.fields.map((field) => (
          <Field
            key={field.name}
            label={field.label}
            hint={field.secret && account?.has_secret ? 'Leave as-is to keep the stored key.' : undefined}
          >
            <Input
              type={field.secret ? 'password' : 'text'}
              autoComplete="off"
              value={values[field.name] ?? ''}
              onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}
              onFocus={(event) => {
                // Clear the mask on focus so typing replaces it rather than
                // appending to a placeholder.
                if (event.target.value.includes('•')) {
                  setValues({ ...values, [field.name]: '' })
                }
              }}
            />
          </Field>
        ))}

        <Checkbox
          label="Test mode"
          hint="Use your provider's test keys. No real money moves."
          checked={testMode}
          onChange={(event) => setTestMode(event.target.checked)}
        />

        <div className="rounded-[var(--radius-sm)] bg-[var(--color-sunken)] px-3 py-2 text-[12px] text-[var(--color-ink-soft)]">
          Saving makes a live call to {spec.label}. The provider stays unverified until it
          succeeds, so a wrong key is caught now rather than at your first sale.
        </div>
      </div>
    </Modal>
  )
}
