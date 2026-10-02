import { Head, router } from '@inertiajs/react'
import { useState } from 'react'
import { Badge, Banner, PageHeader, Panel, Tabs } from '@/views/ui/kit'

/**
 * What the emails actually look like.
 *
 * Rendered on the server and shown in a sandboxed iframe rather than injected
 * into the page: email HTML is table layouts and inline styles written for
 * Outlook, and dropping it into the dashboard's DOM would inherit every one of
 * the dashboard's own styles and show something no recipient will ever see.
 *
 * `sandbox` with no `allow-scripts` — the markup comes from our own templates,
 * but a preview screen that could execute what it previews is a strange thing
 * to build on purpose.
 */

type Props = {
  templates: { key: string; label: string }[]
  active: string
  subject: string
  html: string
  text: string
  transport: string
  from_address: string
}

export default function MailPreview({
  templates,
  active,
  subject,
  html,
  text,
  transport,
  from_address,
}: Props) {
  const [view, setView] = useState<'html' | 'text'>('html')

  return (
    <>
      <Head title="Email templates" />

      <PageHeader
        title="Email templates"
        subtitle="Every message the platform sends, rendered against sample data."
        breadcrumbs={[{ label: 'Developers', href: '/developers' }, { label: 'Email' }]}
        actions={<Badge tone={transport === 'console' ? 'caution' : 'ok'}>{transport}</Badge>}
      />

      {transport === 'console' && (
        <div className="mb-4">
          <Banner tone="caution">
            Mail is going to the log, not to anyone. Set <code>MAIL_TRANSPORT=smtp</code> to
            deliver — <code>docker compose up</code> runs Mailpit on port 8025 for exactly this.
          </Banner>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[13rem_1fr]">
        <Panel className="p-2">
          <nav className="space-y-px">
            {templates.map((template) => (
              <button
                key={template.key}
                type="button"
                onClick={() =>
                  router.get(
                    '/developers/mail',
                    { template: template.key },
                    { preserveState: true, preserveScroll: true },
                  )
                }
                className={
                  template.key === active
                    ? 'nav-link w-full text-left text-[13px]'
                    : 'nav-link w-full text-left text-[13px] opacity-70'
                }
                data-active={template.key === active}
              >
                <span className="truncate">{template.label}</span>
              </button>
            ))}
          </nav>
        </Panel>

        <div className="min-w-0 space-y-3">
          <Panel className="space-y-1 px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.06em] text-[var(--color-ink-faint)]">
              From
            </div>
            <div className="text-[13px] text-[var(--color-ink)]">{from_address}</div>
            <div className="pt-1.5 text-[11px] uppercase tracking-[0.06em] text-[var(--color-ink-faint)]">
              Subject
            </div>
            <div className="text-[13px] font-medium text-[var(--color-ink)]">{subject}</div>
          </Panel>

          <Tabs
            tabs={[
              { key: 'html', label: 'HTML' },
              { key: 'text', label: 'Plain text' },
            ]}
            active={view}
            onSelect={(key) => setView(key as 'html' | 'text')}
          />

          {view === 'html' ? (
            <Panel className="overflow-hidden p-0">
              <iframe
                title={`${active} preview`}
                srcDoc={html}
                sandbox=""
                className="h-[42rem] w-full border-0 bg-white"
              />
            </Panel>
          ) : (
            <Panel>
              {/* The part a screen reader and every spam filter reads. Shown
                  as-is, because how it wraps is part of what is being checked. */}
              <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed text-[var(--color-ink)]">
                {text}
              </pre>
            </Panel>
          )}
        </div>
      </div>
    </>
  )
}
