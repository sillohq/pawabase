import { Head, router } from '@inertiajs/react'
import { useState } from 'react'
import { dateTime, useCan, useShared } from '@/js/hooks'
import {
  Badge, Banner, Button, Field, Input, Mono, Panel, PanelHeader,
  PageHeader, StatusBadge,
} from '@/views/ui/kit'
import { IconExternal, IconPlus } from '@/views/ui/icons'

type Domain = {
  id: number
  hostname: string
  is_platform: boolean
  is_primary: boolean
  status: string
  verification_token: string | null
  verified_at: string | null
  check_message: string | null
  url: string
}

type Props = {
  domains: Domain[]
  instructions: { record_type: string; host: string; cname_target: string }
}

export default function Domains({ domains, instructions }: Props) {
  const { errors } = useShared()
  const can = useCan()
  const [hostname, setHostname] = useState('')
  const [adding, setAdding] = useState(false)

  return (
    <>
      <Head title="Domains" />
      <PageHeader
        title="Domains"
        description="Where your shop can be reached. Every store gets a platform address; a custom domain has to prove you own it."
      />

      <div className="space-y-3">
        {domains.map((domain) => (
          <Panel key={domain.id} padded={false}>
            <div className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <a href={domain.url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-[14px] font-medium text-[var(--color-ink)] hover:text-[var(--color-accent)]">
                    {domain.hostname}
                    <IconExternal className="h-3 w-3" />
                  </a>
                  {domain.is_primary && <Badge tone="accent">Primary</Badge>}
                  {domain.is_platform && <Badge>Platform</Badge>}
                  <StatusBadge status={domain.status} />
                </div>
                {domain.verified_at && (
                  <p className="mt-1 text-[12px] text-[var(--color-ink-faint)]">
                    Verified {dateTime(domain.verified_at)}
                  </p>
                )}
                {domain.check_message && (
                  <p className="mt-1 text-[12px] text-[var(--color-caution)]">{domain.check_message}</p>
                )}
              </div>

              {can('settings.update') && !domain.is_platform && domain.status !== 'verified' && (
                <Button size="sm"
                  onClick={() => router.post(`/storefront/domains/${domain.id}/verify`, {}, { preserveScroll: true })}>
                  Check DNS
                </Button>
              )}
            </div>

            {!domain.is_platform && domain.status !== 'verified' && domain.verification_token && (
              <div className="border-t border-[var(--color-line)] bg-[var(--color-sunken)] px-4 py-3">
                <p className="mb-2 text-[12.5px] font-medium text-[var(--color-ink)]">
                  Add these two records at your DNS provider
                </p>
                <div className="space-y-2 text-[12px]">
                  <Record type={instructions.record_type} host={`${instructions.host}.${domain.hostname}`}
                    value={domain.verification_token} note="Proves you own the domain." />
                  <Record type="CNAME" host={domain.hostname} value={instructions.cname_target}
                    note="Points visitors at your shop." />
                </div>
                <p className="mt-2 text-[11.5px] text-[var(--color-ink-faint)]">
                  DNS can take an hour or more to propagate. Until the TXT record is found the
                  domain stays unverified and will not serve your shop — otherwise anyone could
                  point their domain at another merchant&rsquo;s store.
                </p>
              </div>
            )}
          </Panel>
        ))}
      </div>

      {can('settings.update') && (
        <Panel className="mt-4">
          <PanelHeader title="Add a custom domain" />
          <form
            className="mt-3 flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              setAdding(true)
              router.post('/storefront/domains', { hostname },
                { preserveScroll: true, onSuccess: () => setHostname(''), onFinish: () => setAdding(false) })
            }}
          >
            <Field label="Hostname" error={errors.hostname} className="min-w-64 flex-1">
              <Input value={hostname} invalid={Boolean(errors.hostname)}
                onChange={(event) => setHostname(event.target.value)}
                placeholder="shop.example.com" />
            </Field>
            <Button type="submit" tone="primary" loading={adding} disabled={!hostname.includes('.')}>
              <IconPlus className="h-3.5 w-3.5" />
              Add domain
            </Button>
          </form>
        </Panel>
      )}

      <div className="mt-4">
        <Banner tone="neutral" title="Your platform address never goes away">
          It keeps working even after a custom domain is verified, so a link you have already
          shared does not break.
        </Banner>
      </div>
    </>
  )
}

function Record({ type, host, value, note }: { type: string; host: string; value: string; note: string }) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] p-2.5">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span><span className="text-[var(--color-ink-faint)]">Type</span> <Mono>{type}</Mono></span>
        <span><span className="text-[var(--color-ink-faint)]">Name</span> <Mono>{host}</Mono></span>
      </div>
      <div className="mt-1">
        <span className="text-[var(--color-ink-faint)]">Value</span>{' '}
        <Mono>{value}</Mono>
      </div>
      <p className="mt-1 text-[11.5px] text-[var(--color-ink-faint)]">{note}</p>
    </div>
  )
}
