/**
 * POS settings — `GET /pos/config`.
 *
 * Registers (devices), their launch links and receipt customisation. All
 * create/edit/delete forms post to `/pos/config/device*`; the server
 * redirects back here on success, so the modals simply close on the fresh
 * render and the flashes confirm what changed.
 *
 * A device URL is its verified locked domain or the token URL
 * (`/pos/terminal?device=…`) used while a domain is pending.
 */

import { Head, router, useForm } from '@inertiajs/react'
import { useState } from 'react'
import { dateTime } from '@/js/hooks'
import { cx } from '@/js/hooks'
import { IconCard, IconCopy, IconPlus, IconTrash } from '@/views/ui/icons'
import {
  Badge,
  Button,
  ButtonLink,
  Checkbox,
  Empty,
  Field,
  Input,
  Modal,
  Mono,
  PageHeader,
  Panel,
  PanelHeader,
  StatusBadge,
  Textarea,
} from '@/views/ui/kit'

type Device = {
  id: number
  label: string
  token: string
  pos_domain: string | null
  pos_domain_status: string | null
  pos_domain_verification_token: string | null
  pos_domain_verified_at: string | null
  pos_domain_last_checked_at: string | null
  pos_domain_check_message: string | null
  receipt_header: string | null
  receipt_footer: string | null
  print_receipt_auto: boolean
  is_active: boolean
}

type Props = {
  devices: Device[]
  store_slug: string
}

function deviceUrl(d: Device): string {
  if (d.pos_domain && d.pos_domain_status === 'verified') {
    return `https://${d.pos_domain}`
  }
  return `/pos/terminal?device=${encodeURIComponent(d.token)}`
}

// ---------------------------------------------------------------------------
// New device modal
// ---------------------------------------------------------------------------

function NewDeviceModal({ onClose }: { onClose: () => void }) {
  const form = useForm({ label: '' })

  return (
    <Modal
      open
      onClose={onClose}
      title="New device"
      description="A register is one till, tablet or kiosk with its own terminal link."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            loading={form.processing}
            onClick={() => form.post('/pos/config/device')}
          >
            Create device
          </Button>
        </>
      }
    >
      <Field
        label="Label"
        hint="Shown on the terminal header and in session reports."
        error={form.errors.label}
        required
      >
        <Input
          autoFocus
          placeholder="Front counter"
          value={form.data.label}
          onChange={(e) => form.setData('label', e.target.value)}
        />
      </Field>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Edit device modal
// ---------------------------------------------------------------------------

type EditForm = {
  device_id: number
  label: string
  pos_domain: string
  receipt_header: string
  receipt_footer: string
  print_receipt_auto: boolean
}

function EditDeviceModal({ device, onClose }: { device: Device; onClose: () => void }) {
  const form = useForm<EditForm>({
    device_id: device.id,
    label: device.label,
    pos_domain: device.pos_domain ?? '',
    receipt_header: device.receipt_header ?? '',
    receipt_footer: device.receipt_footer ?? '',
    print_receipt_auto: device.print_receipt_auto,
  })

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit ${device.label || 'device'}`}
      description="Adjust the label, lock a domain, or customise receipts for this register."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            loading={form.processing}
            onClick={() => form.post('/pos/config/device')}
          >
            Save changes
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Label" error={form.errors.label} required>
          <Input
            placeholder="Front counter"
            value={form.data.label}
            onChange={(e) => form.setData('label', e.target.value)}
          />
        </Field>

        <Field
          label="POS domain"
          hint="When set, this hostname serves only this register — no dashboard shell."
          error={form.errors.pos_domain}
        >
          <Input
            placeholder="pos.example.com"
            value={form.data.pos_domain}
            onChange={(e) => form.setData('pos_domain', e.target.value)}
          />
        </Field>

        <Field label="Receipt header" hint="Printed at the top of every receipt.">
          <Textarea
            rows={2}
            placeholder="Thank you for shopping with us!"
            value={form.data.receipt_header}
            onChange={(e) => form.setData('receipt_header', e.target.value)}
          />
        </Field>

        <Field label="Receipt footer" hint="Printed at the bottom — returns, contact details.">
          <Textarea
            rows={2}
            placeholder="No refunds without a receipt."
            value={form.data.receipt_footer}
            onChange={(e) => form.setData('receipt_footer', e.target.value)}
          />
        </Field>

        <Checkbox
          label="Print receipts automatically"
          hint="Skip the receipt preview and send straight to the printer after each sale."
          checked={form.data.print_receipt_auto}
          onChange={(e) => form.setData('print_receipt_auto', e.target.checked)}
        />
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Delete confirm modal
// ---------------------------------------------------------------------------

function DeleteDeviceModal({ device, onClose }: { device: Device; onClose: () => void }) {
  const [deleting, setDeleting] = useState(false)

  return (
    <Modal
      open
      onClose={onClose}
      title={`Remove ${device.label}?`}
      description="The register is deactivated. Its sessions and orders are kept."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="danger"
            loading={deleting}
            onClick={() => {
              setDeleting(true)
              router.post(`/pos/config/device/${device.id}/delete`)
            }}
          >
            <IconTrash className="h-3.5 w-3.5" />
            Remove device
          </Button>
        </>
      }
    >
      <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
        The terminal link for <strong>{device.label}</strong> will stop working.
        Existing sessions and the orders taken on them are unaffected.
      </p>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// One device row
// ---------------------------------------------------------------------------


function DeviceDomainVerification({ device }: { device: Device }) {
  const verified = device.pos_domain_status === 'verified'
  const status = device.pos_domain_status ?? (device.pos_domain ? 'pending' : null)

  return (
    <div className="w-full border-t border-[var(--color-line)] bg-[var(--color-sunken)] px-5 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-medium text-[var(--color-ink)]">POS domain</span>
            <Mono>{device.pos_domain}</Mono>
            <StatusBadge status={status} />
          </div>
          {device.pos_domain_verified_at && (
            <p className="mt-1 text-[11.5px] text-[var(--color-ink-faint)]">
              Verified {dateTime(device.pos_domain_verified_at)}
            </p>
          )}
          {device.pos_domain_last_checked_at && !device.pos_domain_verified_at && (
            <p className="mt-1 text-[11.5px] text-[var(--color-ink-faint)]">
              Last checked {dateTime(device.pos_domain_last_checked_at)}
            </p>
          )}
          {device.pos_domain_check_message && (
            <p className="mt-1 text-[11.5px] text-[var(--color-caution)]">
              {device.pos_domain_check_message}
            </p>
          )}
        </div>
        {!verified && (
          <Button
            size="sm"
            onClick={() => router.post(
              `/pos/config/device/${device.id}/verify`,
              {},
              { preserveScroll: true },
            )}
          >
            Check DNS
          </Button>
        )}
      </div>

      {!verified && device.pos_domain_verification_token && (
        <div className="mt-3 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] p-2.5">
          <p className="mb-2 text-[12px] font-medium text-[var(--color-ink)]">
            Add this record at your DNS provider
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
            <span><span className="text-[var(--color-ink-faint)]">Type</span> <Mono>TXT</Mono></span>
            <span>
              <span className="text-[var(--color-ink-faint)]">Name</span>{' '}
              <Mono>_commerce-verify.{device.pos_domain}</Mono>
            </span>
          </div>
          <div className="mt-1 text-[12px]">
            <span className="text-[var(--color-ink-faint)]">Value</span>{' '}
            <Mono>{device.pos_domain_verification_token}</Mono>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-[var(--color-ink-faint)]">
            The domain stays pending until this TXT record is found. Until then it will not
            open the terminal.
          </p>
        </div>
      )}
    </div>
  )
}

function DeviceRow({ device }: { device: Device }) {
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [copied, setCopied] = useState(false)

  const url = deviceUrl(device)

  function copy() {
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
      {/* Identity */}
      <div className="flex min-w-0 flex-1 basis-40 items-center gap-2.5">
        <span
          className={cx(
            'inline-flex h-2 w-2 shrink-0 rounded-full',
            device.is_active ? 'bg-emerald-500' : 'bg-[var(--color-line)]',
          )}
        />
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate text-[13px] font-medium text-[var(--color-ink)]">
            {device.label}
          </p>
          {!device.is_active && <Badge tone="neutral">Inactive</Badge>}
        </div>
      </div>

      {/* Launch link */}
      <div className="flex min-w-0 flex-1 basis-64 items-center gap-2">
        <a
          href={url}
          {...(device.pos_domain ? { target: '_blank', rel: 'noreferrer' } : {})}
          className="min-w-0 flex-1 truncate rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-canvas)] px-2.5 py-1.5 font-[family-name:var(--font-mono)] text-[11.5px] text-[var(--color-ink-soft)] transition hover:border-brand hover:text-brand"
        >
          {url}
        </a>
        <Button size="sm" onClick={copy} aria-label="Copy terminal link">
          {copied ? (
            <span className="text-ok">Copied</span>
          ) : (
            <IconCopy className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {device.pos_domain && <DeviceDomainVerification device={device} />}

      {/* Receipt setting summary */}
      <div className="hidden w-40 lg:block">
        {device.print_receipt_auto ? (
          <Badge tone="ok">Auto-print</Badge>
        ) : (
          <Badge tone="neutral">Manual print</Badge>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <ButtonLink href={url} size="sm" variant="secondary">
          Launch
        </ButtonLink>
        <Button size="sm" onClick={() => setEditing(true)}>
          Edit
        </Button>
        <Button size="sm" variant="danger" onClick={() => setConfirmingDelete(true)}>
          <IconTrash className="h-3.5 w-3.5" />
        </Button>
      </div>

      {editing && <EditDeviceModal device={device} onClose={() => setEditing(false)} />}
      {confirmingDelete && (
        <DeleteDeviceModal device={device} onClose={() => setConfirmingDelete(false)} />
      )}
    </li>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PosConfig({ devices }: Props) {
  const [creating, setCreating] = useState(false)

  return (
    <>
      <Head title="POS Settings" />

      <PageHeader
        title="POS Settings"
        description="Registers, terminal links and receipt customisation."
        breadcrumbs={[{ label: 'POS', href: '/pos' }, { label: 'Settings' }]}
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            <IconPlus className="h-3.5 w-3.5" />
            New device
          </Button>
        }
      />

      <Panel padded={false}>
        <PanelHeader
          title="Registers"
          description="Create one per till, tablet or kiosk, then open its terminal link."
        />
        {devices.length === 0 ? (
          <Empty
            title="No devices yet"
            body="Create a register to give a tablet or till its own terminal link."
            action={
              <Button variant="primary" onClick={() => setCreating(true)}>
                <IconPlus className="h-3.5 w-3.5" />
                New device
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-[var(--color-line)]">
            {devices.map((d) => (
              <DeviceRow key={d.id} device={d} />
            ))}
          </ul>
        )}
      </Panel>

      <div className="mt-4 flex items-start gap-2.5 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-sunken)] px-4 py-3 text-[12.5px] leading-relaxed text-[var(--color-ink-soft)]">
        <IconCard className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Give a device a <strong className="font-medium text-[var(--color-ink)]">POS domain</strong> to
          serve only the register on that hostname — right for a dedicated
          tablet that should never show the dashboard.
        </p>
      </div>

      {creating && <NewDeviceModal onClose={() => setCreating(false)} />}
    </>
  )
}