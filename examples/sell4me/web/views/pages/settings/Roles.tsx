import { Head } from '@inertiajs/react'
import { Badge, Panel, PanelHeader, PageHeader, TBody, TD, TH, THead, TR, Table } from '@/views/ui/kit'
import { IconCheck } from '@/views/ui/icons'

type Props = {
  roles: { key: string; label: string; permissions: string[] }[]
  groups: { name: string; permissions: { key: string; label: string }[] }[]
}

export default function Roles({ roles, groups }: Props) {
  function has(role: Props['roles'][number], permission: string): boolean {
    if (role.permissions.includes('*')) return true
    if (role.permissions.includes(permission)) return true
    return role.permissions.includes(`${permission.split('.')[0]}.*`)
  }

  return (
    <>
      <Head title="Roles and permissions" />
      <PageHeader
        title="Roles and permissions"
        description="What each role can do. Built from the same table the server checks, so this grid cannot describe a role differently from how it behaves."
      />

      <Panel className="mb-4">
        <p className="text-[12.5px] leading-relaxed text-[var(--color-ink-soft)]">
          Roles are the starting point. A member can be granted extra permissions or have
          specific ones taken away on the <a href="/settings/team" className="text-[var(--color-accent)] hover:underline">Team</a> screen —
          a denial always wins over a grant. Nobody can hand out a permission they do not hold
          themselves.
        </p>
      </Panel>

      <div className="space-y-4">
        {groups.map((group) => (
          <Table key={group.name}>
            <THead>
              <tr>
                <TH className="w-[280px]">{group.name}</TH>
                {roles.map((role) => (
                  <TH key={role.key} align="center">{role.label}</TH>
                ))}
              </tr>
            </THead>
            <TBody>
              {group.permissions.map((permission) => (
                <TR key={permission.key}>
                  <TD>
                    <span className="text-[var(--color-ink)]">{permission.label}</span>
                    <span className="ml-1.5 text-[11px] text-[var(--color-ink-faint)]">
                      {permission.key}
                    </span>
                  </TD>
                  {roles.map((role) => (
                    <TD key={role.key} align="center">
                      {has(role, permission.key) ? (
                        <IconCheck className="mx-auto h-3.5 w-3.5 text-[var(--color-positive)]" />
                      ) : (
                        <span className="text-[var(--color-ink-faint)]">·</span>
                      )}
                    </TD>
                  ))}
                </TR>
              ))}
            </TBody>
          </Table>
        ))}
      </div>

      <Panel className="mt-4">
        <PanelHeader title="The roles" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map((role) => (
            <div key={role.key}>
              <Badge tone={role.key === 'owner' ? 'accent' : 'neutral'}>{role.label}</Badge>
              <p className="mt-1 text-[12px] text-[var(--color-ink-soft)]">
                {role.permissions.includes('*')
                  ? 'Everything, including billing and ownership.'
                  : `${role.permissions.length} permissions.`}
              </p>
            </div>
          ))}
        </div>
      </Panel>
    </>
  )
}
