import { Head, router } from '@inertiajs/react'
import { useState } from 'react'
import { date, useShared } from '@/js/hooks'
import {
  Badge, Banner, Button, Empty, Field, Input, Modal, Mono,
  Panel, PanelHeader, PageHeader, Select, TBody, TD, TH, THead, TR, Table,
} from '@/views/ui/kit'
import { IconCustomers, IconLink, IconPlus } from '@/views/ui/icons'

type Member = {
  id: number
  user_id: number
  name: string
  email: string
  role: string
  status: string
  extra_permissions: string[]
  denied_permissions: string[]
  is_you: boolean
  last_seen_at: string | null
  created_at: string | null
}

type Props = {
  members: Member[]
  invitations: { id: number; email: string; role: string; expires_at: string | null; accept_url: string }[]
  roles: { key: string; label: string; permissions: string[] }[]
  can_manage: boolean
}

export default function Team({ members, invitations, roles, can_manage }: Props) {
  const [inviting, setInviting] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)

  return (
    <>
      <Head title="Team" />
      <PageHeader
        title="Team"
        description="Who can get into this store, and what they may do."
        actions={
          can_manage && (
            <Button tone="primary" size="sm" onClick={() => setInviting(true)}>
              <IconPlus className="h-3.5 w-3.5" />
              Invite someone
            </Button>
          )
        }
      />

      <Table>
        <THead>
          <tr>
            <TH>Member</TH>
            <TH>Role</TH>
            <TH>Overrides</TH>
            <TH align="right">Joined</TH>
            {can_manage && <TH />}
          </tr>
        </THead>
        <TBody>
          {members.map((member) => (
            <TR key={member.id}>
              <TD>
                <span className="font-medium text-[var(--color-ink)]">
                  {member.name}
                  {member.is_you && <span className="ml-1.5 align-middle"><Badge>you</Badge></span>}
                </span>
                <span className="block text-[12px] text-[var(--color-ink-faint)]">{member.email}</span>
              </TD>
              <TD>
                <Badge tone={member.role === 'owner' ? 'accent' : 'neutral'}>{member.role}</Badge>
                {member.status !== 'active' && (
                  <span className="ml-1.5 align-middle"><Badge tone="caution">{member.status}</Badge></span>
                )}
              </TD>
              <TD className="text-[12px] text-[var(--color-ink-soft)]">
                {member.extra_permissions.length > 0 && (
                  <span className="text-[var(--color-positive)]">+{member.extra_permissions.length}</span>
                )}
                {member.denied_permissions.length > 0 && (
                  <span className="ml-1.5 text-[var(--color-critical)]">−{member.denied_permissions.length}</span>
                )}
                {member.extra_permissions.length === 0 && member.denied_permissions.length === 0 && '—'}
              </TD>
              <TD align="right" className="text-[var(--color-ink-faint)]">{date(member.created_at)}</TD>
              {can_manage && (
                <TD align="right">
                  {member.role !== 'owner' && !member.is_you && (
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" onClick={() => setEditing(member)}>Access</Button>
                      <Button tone="danger" size="sm"
                        onClick={() => router.post(`/settings/team/${member.id}/remove`, {}, { preserveScroll: true })}>
                        Remove
                      </Button>
                    </div>
                  )}
                </TD>
              )}
            </TR>
          ))}
        </TBody>
      </Table>

      {invitations.length > 0 && (
        <Panel className="mt-4" padded={false}>
          <PanelHeader title="Pending invitations"
            description="No mail transport is wired in, so copy the link and send it yourself." />
          <div className="divide-y divide-[var(--color-line-soft)]">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[13px] text-[var(--color-ink)]">{invitation.email}</p>
                  <p className="text-[12px] text-[var(--color-ink-faint)]">
                    as {invitation.role} · expires {date(invitation.expires_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="max-w-[280px] overflow-x-auto rounded-[var(--radius-xs)] bg-[var(--color-sunken)] px-2 py-1 text-[11.5px] text-[var(--color-ink-soft)]">
                    {invitation.accept_url}
                  </code>
                  <Button size="sm" onClick={() => navigator.clipboard?.writeText(
                    `${window.location.origin}${invitation.accept_url}`)}>
                    <IconLink className="h-3.5 w-3.5" />
                    Copy
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {members.length === 1 && invitations.length === 0 && (
        <Panel className="mt-4">
          <Empty icon={<IconCustomers className="h-6 w-6" />} title="It is just you"
            body="Invite a colleague and give them only the access they need — support, inventory, finance, or a role of your own shape."
            action={can_manage && (
              <Button tone="primary" size="sm" onClick={() => setInviting(true)}>
                <IconPlus className="h-3.5 w-3.5" />
                Invite someone
              </Button>
            )} />
        </Panel>
      )}

      {inviting && <InviteModal roles={roles} onClose={() => setInviting(false)} />}
      {editing && <AccessModal member={editing} roles={roles} onClose={() => setEditing(null)} />}
    </>
  )
}

function InviteModal({
  roles, onClose,
}: {
  roles: Props['roles']
  onClose: () => void
}) {
  const { errors } = useShared()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('support')
  const [saving, setSaving] = useState(false)

  const chosen = roles.find((entry) => entry.key === role)

  return (
    <Modal
      open onClose={onClose} title="Invite someone"
      description="They get a link to accept. Nothing is emailed — copy it from the list afterwards."
      footer={
        <>
          <Button size="sm" onClick={onClose}>Cancel</Button>
          <Button tone="primary" size="sm" loading={saving} disabled={!email.includes('@')}
            onClick={() => {
              setSaving(true)
              router.post('/settings/team/invite', { email, role },
                { preserveScroll: true, onSuccess: onClose, onFinish: () => setSaving(false) })
            }}>
            Create invitation
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <Field label="Email" required error={errors.email}>
          <Input type="email" autoFocus value={email} invalid={Boolean(errors.email)}
            onChange={(event) => setEmail(event.target.value)} />
        </Field>

        <Field label="Role" error={errors.role}
          hint="You cannot invite at a role with more access than your own.">
          <Select value={role} onChange={(event) => setRole(event.target.value)}>
            {roles.filter((entry) => entry.key !== 'owner').map((entry) => (
              <option key={entry.key} value={entry.key}>{entry.label}</option>
            ))}
          </Select>
        </Field>

        {chosen && (
          <div className="rounded-[var(--radius-sm)] bg-[var(--color-sunken)] px-3 py-2">
            <p className="mb-1 text-[12px] font-medium text-[var(--color-ink)]">
              A {chosen.label} can:
            </p>
            <div className="flex flex-wrap gap-1">
              {chosen.permissions.slice(0, 12).map((permission) => (
                <Mono key={permission}>{permission}</Mono>
              ))}
              {chosen.permissions.length > 12 && (
                <span className="text-[11.5px] text-[var(--color-ink-faint)]">
                  and {chosen.permissions.length - 12} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

function AccessModal({
  member, roles, onClose,
}: {
  member: Member
  roles: Props['roles']
  onClose: () => void
}) {
  const [role, setRole] = useState(member.role)
  const [status, setStatus] = useState(member.status)
  const [saving, setSaving] = useState(false)

  return (
    <Modal
      open onClose={onClose} title={`Access for ${member.name}`}
      description={member.email}
      footer={
        <>
          <Button size="sm" onClick={onClose}>Cancel</Button>
          <Button tone="primary" size="sm" loading={saving}
            onClick={() => {
              setSaving(true)
              router.post(`/settings/team/${member.id}`, { role, status },
                { preserveScroll: true, onSuccess: onClose, onFinish: () => setSaving(false) })
            }}>
            Save access
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <Field label="Role">
          <Select value={role} onChange={(event) => setRole(event.target.value)}>
            {roles.filter((entry) => entry.key !== 'owner').map((entry) => (
              <option key={entry.key} value={entry.key}>{entry.label}</option>
            ))}
          </Select>
        </Field>

        <Field label="Status" hint="A suspended member keeps their account but cannot act.">
          <Select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </Select>
        </Field>

        <Banner tone="neutral">
          You cannot grant a permission you do not hold yourself, and a role change is refused
          if it would give this member more access than you have.
        </Banner>
      </div>
    </Modal>
  )
}
