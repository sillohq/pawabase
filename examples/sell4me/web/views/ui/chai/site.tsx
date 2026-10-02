/**
 * The Site panel: everything that wraps the page being built.
 *
 * A page builder that only edits pages leaves the two things a merchant
 * notices first — the logo and the navigation — on a settings screen
 * somewhere else, judged against nothing. They belong here, beside the canvas,
 * because that is where you can see whether the logo is too big and whether
 * the nav has too many links in it.
 *
 * The palette is here for the same reason, and only here. A colour cannot be
 * judged on a swatch; it is judged on a page. The template gallery decides
 * which *shop* you want, and this decides what colour it is.
 *
 * Everything on this panel belongs to the store's theme rather than to a page,
 * so it saves to `/storefront/palette` and the change shows on every page at
 * once — which is what a header is.
 */

import { router } from '@inertiajs/react'
import { useState } from 'react'

export type Palette = {
  key: string
  name: string
  description: string
  colors: Record<string, string>
  fonts: { heading: string; body: string }
  corner_style: string
  swatch: string[]
}

export type SiteChrome = {
  logo_url: string | null
  announcement: string | null
  header_links: { label: string; url: string }[]
  footer_links: { label: string; url: string }[]
  footer_text: string | null
  palette: string
}

/** The CSRF token, from the cookie the session middleware sets. */
function xsrf(): string {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : ''
}

/** The seven colour slots a merchant can tune, in the order they read best. */
const COLOUR_SLOTS: { key: string; label: string; hint: string }[] = [
  { key: 'primary', label: 'Primary', hint: 'Buttons, links, anything that acts.' },
  { key: 'accent', label: 'Accent', hint: 'A second colour, used sparingly.' },
  { key: 'text', label: 'Text', hint: 'Body copy on the background.' },
  { key: 'background', label: 'Background', hint: 'The page behind everything.' },
  { key: 'surface', label: 'Surface', hint: 'Cards and raised panels.' },
  { key: 'muted', label: 'Muted', hint: 'Secondary text, captions.' },
  { key: 'border', label: 'Border', hint: 'Hairlines and dividers.' },
]

const CORNERS: { key: string; label: string }[] = [
  { key: 'sharp', label: 'Sharp' },
  { key: 'soft', label: 'Soft' },
  { key: 'round', label: 'Round' },
]

export function SitePanel({
  site,
  palettes,
  themeColors,
  cornerStyle,
  onSaved,
}: {
  site: SiteChrome
  palettes: Palette[]
  themeColors: Record<string, string>
  cornerStyle: string
  onSaved: () => void
}) {
  const [draft, setDraft] = useState(site)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'colours' | 'header' | 'footer'>('colours')

  async function save(next: Partial<SiteChrome>) {
    const merged = { ...draft, ...next }
    setDraft(merged)
    setSaving(true)
    try {
      await fetch('/storefront/palette', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': xsrf() },
        credentials: 'same-origin',
        body: JSON.stringify({
          logo_url: merged.logo_url ?? '',
          announcement: merged.announcement ?? '',
          footer_text: merged.footer_text ?? '',
          header_links: merged.header_links,
          footer_links: merged.footer_links,
        }),
      })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="m-3 mb-0 flex gap-0.5 rounded-full bg-sunken p-0.5">
        {(['colours', 'header', 'footer'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={
              key === tab
                ? 'flex-1 rounded-full bg-surface px-2 py-1 text-[12px] font-medium capitalize text-ink ring-1 ring-line'
                : 'flex-1 rounded-full px-2 py-1 text-[12px] capitalize text-ink-muted transition hover:text-ink'
            }
          >
            {key}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {tab === 'colours' && (
          <div className="space-y-5">
            <Palettes palettes={palettes} active={draft.palette} />
            <CustomColours colors={themeColors} corner={cornerStyle} />
          </div>
        )}
        {tab === 'header' && (
          <Header draft={draft} onSave={save} saving={saving} />
        )}
        {tab === 'footer' && <Footer draft={draft} onSave={save} saving={saving} />}
      </div>
    </div>
  )
}

/**
 * The palettes, as colours only.
 *
 * Applying one is a normal Inertia post, and the reload that follows is the
 * point: the canvas has to redraw in the new colours or the merchant is
 * choosing blind. It posts to `/storefront/palette/apply`, which changes the
 * colours, the type and the corners and nothing else — someone adjusting a
 * shade mid-build must not have their pages rewritten underneath them.
 */
function Palettes({ palettes, active }: { palettes: Palette[]; active: string }) {
  return (
    <div>
      <p className="mb-2.5 text-[11.5px] leading-snug text-ink-muted">
        Changes the colours, the type and the corners on every page. Your pages and their
        content are untouched.
      </p>
      {/* Two to a row: a palette is judged by its swatches, and a full-width
          card per palette made the list several screens long. */}
      <div className="grid grid-cols-2 gap-2">
        {palettes.map((palette) => {
          const inUse = palette.name === active
          return (
            <button
              key={palette.key}
              type="button"
              onClick={() => router.post('/storefront/palette/apply', { palette: palette.key })}
              aria-pressed={inUse}
              className={`group overflow-hidden rounded-[var(--radius-lg)] border text-left transition ${
                inUse ? 'border-brand ring-3 ring-brand-ring' : 'border-line hover:border-ink-faint'
              }`}
            >
              <span className="flex h-9">
                {Object.values(palette.colors)
                  .slice(0, 5)
                  .map((color, index) => (
                    <span key={index} className="flex-1" style={{ background: color }} />
                  ))}
              </span>
              <span className="flex items-center gap-1 border-t border-line px-2 py-1.5">
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-[12px] font-medium ${inUse ? 'text-brand-strong' : 'text-ink'}`}
                    style={{ fontFamily: `"${palette.fonts.heading}", inherit` }}
                  >
                    {palette.name}
                  </span>
                  <span className="block truncate text-[10.5px] text-ink-faint">
                    {inUse ? 'In use' : palette.fonts.heading}
                  </span>
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Tune the current theme's colours by hand.
 *
 * The palettes above are the starting points; this is for the shop whose
 * primary is *nearly* right. Saving is a full Inertia post on purpose — the
 * same as applying a palette — so the canvas reloads and redraws in the new
 * colours rather than leaving the merchant to guess from seven swatches.
 */
function CustomColours({
  colors,
  corner,
}: {
  colors: Record<string, string>
  corner: string
}) {
  const [draft, setDraft] = useState<Record<string, string>>(colors)
  const [cornerDraft, setCornerDraft] = useState(corner)
  const [saving, setSaving] = useState(false)

  const dirty =
    cornerDraft !== corner ||
    COLOUR_SLOTS.some(({ key }) => (draft[key] ?? '') !== (colors[key] ?? ''))

  function set(key: string, value: string) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function save() {
    setSaving(true)
    router.post(
      '/storefront/palette',
      { colors: draft, corner_style: cornerDraft },
      { onFinish: () => setSaving(false), preserveScroll: true },
    )
  }

  return (
    <div>
      <div className="mb-1 text-[12px] font-medium text-ink">Adjust the colours</div>
      <p className="mb-2 text-[11px] leading-snug text-ink-muted">
        Fine-tune the theme you picked. Applies to every page.
      </p>

      <div className="space-y-2">
        {COLOUR_SLOTS.map(({ key, label, hint }) => (
          <div key={key} className="flex items-center gap-2">
            <input
              type="color"
              aria-label={label}
              value={normaliseHex(draft[key] ?? '#000000')}
              onChange={(event) => set(key, event.target.value)}
              className="h-7 w-7 shrink-0 cursor-pointer rounded-[var(--radius-sm)] border border-line bg-surface p-0.5"
            />
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-medium text-ink">{label}</div>
              <div className="truncate text-[10.5px] text-ink-muted">{hint}</div>
            </div>
            <input
              value={draft[key] ?? ''}
              onChange={(event) => set(key, event.target.value)}
              spellCheck={false}
              className={`${INPUT} max-w-[5.5rem] font-mono text-[11px] uppercase`}
            />
          </div>
        ))}
      </div>

      <div className="mt-3 mb-1 text-[12px] font-medium text-ink">Corners</div>
      <div className="flex gap-1">
        {CORNERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setCornerDraft(key)}
            className={
              key === cornerDraft
                ? 'flex-1 rounded-[var(--radius-md)] bg-ink px-2 py-1.5 text-[11.5px] font-medium text-surface'
                : 'flex-1 rounded-[var(--radius-md)] border border-line px-2 py-1.5 text-[11.5px] text-ink-muted transition hover:border-ink-faint'
            }
          >
            {label}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={!dirty || saving}
        onClick={save}
        className="mt-3 w-full rounded-[var(--radius-md)] bg-ink py-1.5 text-[12px] font-medium text-surface transition disabled:opacity-40"
      >
        {saving ? 'Saving…' : dirty ? 'Save colours' : 'Saved'}
      </button>
    </div>
  )
}

/** `#rgb` / `RRGGBB` / stray input, coerced to the `#rrggbb` a colour input needs. */
function normaliseHex(value: string): string {
  let hex = value.trim().replace(/^#?/, '')
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    hex = hex
      .split('')
      .map((char) => char + char)
      .join('')
  }
  return /^[0-9a-fA-F]{6}$/.test(hex) ? `#${hex.toLowerCase()}` : '#000000'
}

function Header({
  draft,
  onSave,
  saving,
}: {
  draft: SiteChrome
  onSave: (next: Partial<SiteChrome>) => void
  saving: boolean
}) {
  return (
    <div className="space-y-4">
      <LogoField value={draft.logo_url ?? ''} onChange={(logo_url) => onSave({ logo_url })} />

      <Field label="Announcement bar" hint="One line above the header. Blank hides it.">
        <input
          className={INPUT}
          defaultValue={draft.announcement ?? ''}
          placeholder="Free delivery over 50"
          onBlur={(event) => onSave({ announcement: event.target.value })}
        />
      </Field>

      <Links
        label="Navigation"
        hint="Shown in the header, in this order."
        links={draft.header_links}
        onChange={(header_links) => onSave({ header_links })}
      />

      {saving && <p className="text-[11px] text-ink-faint">Saving…</p>}
    </div>
  )
}

function Footer({
  draft,
  onSave,
  saving,
}: {
  draft: SiteChrome
  onSave: (next: Partial<SiteChrome>) => void
  saving: boolean
}) {
  return (
    <div className="space-y-4">
      <Links
        label="Footer links"
        hint="Returns, delivery, terms — the pages people look for at the bottom."
        links={draft.footer_links}
        onChange={(footer_links) => onSave({ footer_links })}
      />
      <Field label="Footer text">
        <textarea
          className={`${INPUT} h-auto min-h-16 resize-y py-1.5`}
          defaultValue={draft.footer_text ?? ''}
          onBlur={(event) => onSave({ footer_text: event.target.value })}
        />
      </Field>
      {saving && <p className="text-[11px] text-ink-faint">Saving…</p>}
    </div>
  )
}

/**
 * The shop's logo, uploaded or pasted.
 *
 * Upload goes to the same media endpoint product photographs use, so a logo
 * gets the same sniffing, the same size cap and the same storage as everything
 * else — rather than a second upload path with its own rules.
 */
function LogoField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function upload(file: File) {
    setBusy(true)
    setError(null)
    try {
      const body = new FormData()
      body.append('file', file)
      const response = await fetch('/storefront/logo', {
        method: 'POST',
        body,
        headers: { 'X-XSRF-TOKEN': xsrf() },
        credentials: 'same-origin',
      })
      const payload = await response.json()
      if (!response.ok) {
        setError(payload.error ?? 'That upload failed.')
        return
      }
      onChange(payload.url)
    } catch {
      setError('That upload failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Field label="Logo" hint="A wide image works best. Blank shows your store's name.">
      <div className="space-y-2">
        {value && (
          <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-line bg-sunken p-2">
            <img src={value} alt="" className="h-8 max-w-[9rem] object-contain" />
            <button
              type="button"
              onClick={() => onChange('')}
              className="ml-auto text-[11.5px] text-ink-muted hover:text-ink"
            >
              Remove
            </button>
          </div>
        )}

        <label className="block cursor-pointer rounded-[var(--radius-md)] border border-dashed border-line px-3 py-3 text-center text-[12px] text-ink-muted transition hover:border-ink-faint">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void upload(file)
              event.target.value = ''
            }}
          />
          {busy ? 'Uploading…' : value ? 'Replace logo' : 'Upload a logo'}
        </label>

        <input
          className={INPUT}
          defaultValue={value}
          placeholder="…or paste a URL"
          onBlur={(event) => onChange(event.target.value)}
        />
        {error && <p className="text-[11.5px] text-critical">{error}</p>}
      </div>
    </Field>
  )
}

function Links({
  label,
  hint,
  links,
  onChange,
}: {
  label: string
  hint: string
  links: { label: string; url: string }[]
  onChange: (links: { label: string; url: string }[]) => void
}) {
  function move(from: number, to: number) {
    if (to < 0 || to >= links.length) return
    const next = [...links]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange(next)
  }

  return (
    <Field label={label} hint={hint}>
      <div className="space-y-1.5">
        {links.map((link, index) => (
          <div key={index} className="flex items-center gap-1">
            <input
              className={`${INPUT} max-w-[7rem]`}
              defaultValue={link.label}
              placeholder="Shop"
              onBlur={(event) => {
                const next = [...links]
                next[index] = { ...link, label: event.target.value }
                onChange(next)
              }}
            />
            <input
              className={INPUT}
              defaultValue={link.url}
              placeholder="/products"
              onBlur={(event) => {
                const next = [...links]
                next[index] = { ...link, url: event.target.value }
                onChange(next)
              }}
            />
            <div className="flex shrink-0 flex-col">
              <button
                type="button"
                aria-label="Move up"
                onClick={() => move(index, index - 1)}
                className="px-1 text-[9px] leading-none text-ink-faint hover:text-ink"
              >
                ▲
              </button>
              <button
                type="button"
                aria-label="Move down"
                onClick={() => move(index, index + 1)}
                className="px-1 text-[9px] leading-none text-ink-faint hover:text-ink"
              >
                ▼
              </button>
            </div>
            <button
              type="button"
              aria-label={`Remove ${link.label || 'link'}`}
              onClick={() => onChange(links.filter((_, i) => i !== index))}
              className="shrink-0 px-1 text-ink-faint transition hover:text-critical"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...links, { label: '', url: '' }])}
          className="w-full rounded-[var(--radius-md)] border border-dashed border-line py-1.5 text-[12px] text-ink-muted transition hover:border-ink-faint"
        >
          Add link
        </button>
      </div>
    </Field>
  )
}

const INPUT =
  'h-8 w-full rounded-[var(--radius-md)] border border-line bg-surface px-2.5 text-[12.5px] text-ink ' +
  'outline-none transition focus:border-brand focus:ring-3 focus:ring-brand-ring'

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-1 text-[12px] font-medium text-ink">{label}</div>
      {hint && <p className="mb-1.5 text-[11px] leading-snug text-ink-muted">{hint}</p>}
      {children}
    </div>
  )
}
