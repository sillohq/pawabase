/**
 * The page builder, on ChaiBuilder.
 *
 * ChaiBuilder supplies the editing surface — the canvas and its iframe, drag
 * and drop, the outline tree, undo/redo, the responsive breakpoints, the
 * generated inspector. Those are the parts of a visual builder that take
 * months and are the same in every one of them.
 *
 * Everything specific to a commerce platform stays ours:
 *
 * * **The blocks.** `views/ui/chai/register.tsx` registers our renderers —
 *   the same components the live shop mounts — so the canvas is the shop.
 * * **The schema.** Generated from the server's registry, so what the
 *   inspector offers and what the server will accept come from one place.
 * * **Persistence.** Saving posts our nested tree to our own endpoint, which
 *   sanitises it. ChaiBuilder never talks to the database.
 * * **Publishing.** Draft and live are our columns and our decision.
 *
 * The conversion between ChaiBuilder's flat block list and our nested tree is
 * in `views/ui/chai/tree.ts`, deliberately as a pure function.
 *
 * The storefront imports none of this. ChaiBuilder is a dashboard-only chunk,
 * and a shopper looking at a product page downloads the renderers alone.
 */

import { ChaiBuilderEditor } from '@chaibuilder/sdk'
import type { ChaiBlock } from '@chaibuilder/runtime'
import { Head, router } from '@inertiajs/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import '@chaibuilder/sdk/styles'
// After the SDK's stylesheet, on purpose — see the file.
import '@/views/ui/chai/overrides.css'
import { ago } from '@/js/hooks'
import type { BlockContext, BlockNode } from '@/views/ui/blocks'
import {
  registerCatalogue,
  setCanvasContext,
  withCatalogueOptions,
  type CatalogueEntry,
} from '@/views/ui/chai/register'
import { paintCanvas } from '@/views/ui/chai/canvas'
import { registerSettingControls } from '@/views/ui/chai/fields'
import { SmallScreen, setChrome, type SectionPreset } from '@/views/ui/chai/chrome'
import type { Palette, SiteChrome } from '@/views/ui/chai/site'
import { fromChai, toChai } from '@/views/ui/chai/tree'
import { Badge, Button, Checkbox, Field, Input, Modal, Textarea } from '@/views/ui/kit'
import { IconChevronLeft, IconClock, IconEye, IconSettings } from '@/views/ui/icons'
import { LogoMark } from '@/views/ui/Logo'

type PageProp = {
  id: number
  title: string
  slug: string
  kind: string
  path: string
  tree: BlockNode[]
  is_published: boolean
  has_changes: boolean
  seo_title: string | null
  seo_description: string | null
  og_image_url: string | null
  noindex: boolean
  settings: Record<string, unknown>
}

type Props = {
  page: PageProp
  catalogue: CatalogueEntry[]
  sections: SectionPreset[]
  palettes: Palette[]
  site: SiteChrome
  theme: {
    name: string
    logo_url: string | null
    header_links: { label: string; url: string }[]
    colors: Record<string, string>
    fonts: { heading: string; body: string }
    corner_style: string
    style: Record<string, string>
    store: { name: string }
  }
  collections: { id: string; title: string }[]
  products: { id: string; title: string }[]
  canvas: BlockContext
  revisions: {
    id: number
    reason: string
    label: string | null
    actor: string
    created_at: string | null
  }[]
  preview_url: string
}

/**
 * The CSRF token, from the cookie the session middleware sets.
 *
 * Saving goes through `fetch` rather than Inertia — an Inertia post re-renders
 * the page, and re-rendering the editor on every autosave would throw away the
 * merchant's selection, their scroll position and their undo history.
 */
function xsrf(): string {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : ''
}

export default function BuilderEditor({
  page: initial,
  catalogue,
  sections,
  palettes,
  site,
  theme,
  collections,
  products,
  canvas,
  revisions,
  preview_url,
}: Props) {
  const [page, setPage] = useState(initial)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [status, setStatus] = useState<'SAVED' | 'SAVING' | 'UNSAVED'>('SAVED')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  // Registration is global to the ChaiBuilder runtime and must run before the
  // editor mounts — a block the runtime has not heard of renders as an error
  // boundary, not as a retry.
  const ready = useMemo(() => {
    // Open on the desktop width the first time, rather than the library's
    // 800px tablet default, which leaves the page a narrow strip in the middle
    // of a wide window. A merchant who picks another width keeps it: the
    // library stores that choice under the same keys.
    try {
      if (localStorage.getItem('canvasWidth') === null) {
        localStorage.setItem('canvasWidth', '1280')
        localStorage.setItem('canvasDisplayWidth', '1280')
      }
    } catch {
      /* private window — the library's default applies */
    }
    const withShop: BlockContext = {
      ...canvas,
      shop: {
        name: theme.store.name,
        logo_url: theme.logo_url,
        header_links: theme.header_links,
        cart_count: 2,
      },
    }
    setCanvasContext(withShop)
    setChrome({
      sections,
      storeName: theme.store.name,
      previewContext: withShop,
      site,
      palettes,
      themeColors: theme.colors,
      cornerStyle: theme.corner_style,
    })
    registerSettingControls()
    registerCatalogue(withCatalogueOptions(catalogue, collections, products))
    return true
  }, [
    catalogue,
    collections,
    products,
    canvas,
    sections,
    theme.store.name,
    theme.logo_url,
    theme.header_links,
    theme.colors,
    theme.corner_style,
    site,
    palettes,
  ])

  // The initial blocks, converted once. Recomputing them on every render would
  // hand ChaiBuilder a new array identity each time and reset the canvas.
  const initialBlocks = useMemo(() => toChai(initial.tree), [initial.tree])

  // Read inside `save`, which is a stable callback — so the latest page state
  // is used without the callback identity changing and remounting the editor.
  const pageRef = useRef(page)
  pageRef.current = page

  const save = useCallback(
    async ({ blocks }: { blocks: ChaiBlock[]; autoSave: boolean }) => {
      const response = await fetch(`/storefront/pages/${pageRef.current.id}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': xsrf() },
        credentials: 'same-origin',
        body: JSON.stringify({ tree: fromChai(blocks) }),
      })
      if (!response.ok) return new Error('That did not save. Check your connection.')

      const body = await response.json()
      setSavedAt(body.saved_at ?? new Date().toISOString())
      // Adopt what the server kept. Anything it dropped — an unknown block, a
      // refused URL — is gone from our idea of the page immediately rather
      // than at the next reload.
      setPage((current) => ({ ...current, has_changes: body.has_changes }))
      return true
    },
    [],
  )

  // The builder renders light, whatever the reader's theme is.
  //
  // The library's own panels — the outline, the settings form, the toolbar —
  // are light-only, and we turn its `darkMode` off deliberately. Leaving the
  // document marked dark meant our components *inside* that shell still took
  // their dark styling: a slate-800 badge on a white top bar, a light zoom
  // label on a light toolbar. Half a dark theme is worse than either.
  //
  // Marking the document light while the builder is mounted is the honest
  // version of what is already true, and it restores the reader's own choice
  // the moment they leave.
  useEffect(() => {
    const root = document.documentElement
    const previous = root.getAttribute('data-theme')
    root.setAttribute('data-theme', 'light')
    return () => {
      if (previous === null) root.removeAttribute('data-theme')
      else root.setAttribute('data-theme', previous)
    }
  }, [])

  // The canvas is an iframe with none of our styles and none of the shop's
  // theme in it. Without this a dark theme renders near-white text on the
  // iframe's white default and the canvas looks empty rather than broken —
  // which is a very hard thing to diagnose. See `chai/canvas.ts`.
  useEffect(() => paintCanvas(theme), [theme])

  // Publishing, the preview link and the page's SEO are ours, not the
  // library's. The slot itself is registered at module scope in
  // `views/ui/chai/chrome.tsx` — registering it from here would run after the
  // editor had already read its registry, which is why the first version of
  // this showed the library's own bar. This only hands it the element.
  useEffect(() => {
    setChrome({
      topBar: (
        <TopBar
          page={page}
          previewUrl={preview_url}
          status={status}
          savedAt={savedAt}
          onSettings={() => setSettingsOpen(true)}
          onHistory={() => setHistoryOpen(true)}
        />
      ),
    })
  }, [page, preview_url, status, savedAt])

  if (!ready) return null

  return (
    <>
      <Head title={`${page.title} · Builder`} />

      {/* The builder owns the window. `builder/Editor` is given no layout —
          see `js/main.tsx` — so this is the whole page rather than an overlay
          on top of the dashboard. */}
      <div className="chai-builder-shell fixed inset-0 z-40 bg-[var(--color-canvas)]">
        <ChaiBuilderEditor
          pageId={String(page.id)}
          blocks={initialBlocks}
          autoSave
          autoSaveActionsCount={3}
          onSave={save}
          onSaveStateChange={setStatus}
          onError={(error) => console.error('[builder]', error)}
          // Ours, without the library's logo on it. See `chrome.tsx`.
          smallScreenComponent={SmallScreen}
          // ChaiBuilder's own theme panel edits *its* tokens. Ours live on the
          // store's theme and are edited under Storefront, so the panel would
          // be a second place to set the same colours and disagree with the
          // first. The store's palette is handed over read-only, so the canvas
          // renders in the shop's colours.
          theme={chaiTheme(theme)}
          flags={{
            dragAndDrop: true,
            copyPaste: true,
            darkMode: false,
            validateStructure: true,
            // Off deliberately. Each of these is either a second, conflicting
            // place to do something the dashboard already does, or a door into
            // arbitrary markup on a merchant's public storefront.
            exportCode: false,
            importHtml: false,
            importTheme: false,
            librarySite: false,
            dataBinding: false,
            gotoSettings: false,
            designTokens: false,
          }}
        />
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        page={page}
        onSaved={(next) => setPage((current) => ({ ...current, ...next }))}
      />

      <HistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        pageId={page.id}
        revisions={revisions}
      />
    </>
  )
}

/**
 * The store's palette, in the shape ChaiBuilder's canvas expects.
 *
 * Only what it needs to draw: colours and fonts. The corner style and every
 * other theme value reaches the blocks through the shop's own CSS custom
 * properties, which the canvas inherits.
 */
function chaiTheme(theme: Props['theme']) {
  return {
    fontFamily: {
      heading: theme.fonts.heading,
      body: theme.fonts.body,
    },
    colors: {
      primary: [theme.colors.primary, theme.colors.primary],
      secondary: [theme.colors.accent, theme.colors.accent],
      background: [theme.colors.background, theme.colors.background],
      foreground: [theme.colors.text, theme.colors.text],
      border: [theme.colors.border, theme.colors.border],
    },
  } as any
}

function TopBar({
  page,
  previewUrl,
  status,
  savedAt,
  onSettings,
  onHistory,
}: {
  page: PageProp
  previewUrl: string
  status: 'SAVED' | 'SAVING' | 'UNSAVED'
  savedAt: string | null
  onSettings: () => void
  onHistory: () => void
}) {
  const saveNote =
    status === 'SAVING'
      ? 'Saving…'
      : status === 'UNSAVED'
        ? 'Unsaved changes'
        : savedAt
          ? `Saved ${ago(savedAt)}`
          : 'All changes saved'

  // The dashboard's header, in the builder: the same 48px bar, hairline below,
  // quiet ghost actions and one charcoal primary. The builder used to have a
  // bar of its own design, and moving between the two felt like changing app.
  return (
    <div className="flex h-full w-full items-center gap-2 border-b border-line bg-surface px-2.5">
      <a
        href="/storefront/pages"
        className="flex h-8 items-center gap-1.5 rounded-full pr-3 pl-2 text-[12.5px] text-ink-muted transition hover:bg-sunken hover:text-ink"
      >
        <IconChevronLeft className="h-4 w-4" />
        Pages
      </a>

      <span className="h-5 w-px bg-line" aria-hidden />

      <div className="flex min-w-0 items-center gap-2 pl-1.5">
        <LogoMark className="h-4 w-4 shrink-0 text-brand" />
        <span className="truncate text-[13px] font-medium text-ink">{page.title}</span>
        <span className="hidden truncate text-[12px] text-ink-faint xl:inline">{page.path}</span>
        {page.is_published ? (
          <Badge tone="ok" dot>
            Live
          </Badge>
        ) : (
          <Badge tone="neutral">Draft</Badge>
        )}
        <span
          className={`truncate text-[11.5px] ${status === 'UNSAVED' ? 'text-ink-muted' : 'text-ink-faint'}`}
          aria-live="polite"
        >
          {saveNote}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="xs" onClick={onHistory}>
          <IconClock className="h-3.5 w-3.5" />
          History
        </Button>
        <Button variant="ghost" size="xs" onClick={onSettings}>
          <IconSettings className="h-3.5 w-3.5" />
          Page settings
        </Button>
        <a
          href={previewUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[11px] font-medium text-ink-muted transition hover:bg-sunken hover:text-ink"
        >
          <IconEye className="h-3.5 w-3.5" />
          Preview
        </a>

        <span className="mx-1 h-5 w-px bg-line" aria-hidden />

        {page.is_published && !page.has_changes ? (
          <Button
            variant="secondary"
            size="xs"
            onClick={() => router.post(`/storefront/pages/${page.id}/unpublish`)}
          >
            Unpublish
          </Button>
        ) : (
          <Button
            variant="primary"
            size="xs"
            onClick={() => router.post(`/storefront/pages/${page.id}/publish`)}
          >
            {page.is_published ? 'Publish changes' : 'Publish'}
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * The page's own settings — its title and what search engines are told.
 *
 * Not block props, so not ChaiBuilder's inspector: they belong to the page
 * rather than to anything on it, and putting them in the block panel would
 * mean a merchant had to select something before they could edit them.
 */
function SettingsModal({
  open,
  onClose,
  page,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  page: PageProp
  onSaved: (next: Partial<PageProp>) => void
}) {
  const [draft, setDraft] = useState({
    title: page.title,
    seo_title: page.seo_title ?? '',
    seo_description: page.seo_description ?? '',
    og_image_url: page.og_image_url ?? '',
    noindex: page.noindex,
  })
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true)
    try {
      // The same save endpoint, without a `tree` key — which the server reads
      // as "sanitise nothing, update these fields". One endpoint rather than
      // two means the SEO fields cannot be written by a path that skips the
      // page's own permission check.
      await fetch(`/storefront/pages/${page.id}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': xsrf() },
        credentials: 'same-origin',
        body: JSON.stringify(draft),
      })
      onSaved(draft)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Page settings"
      description={`Served at ${page.path}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Save settings
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title" hint="What this page is called in your dashboard.">
          <Input
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          />
        </Field>

        <Field
          label="Search engine title"
          hint="Around 60 characters. Blank uses the page title."
        >
          <Input
            value={draft.seo_title}
            onChange={(event) => setDraft({ ...draft, seo_title: event.target.value })}
            placeholder={draft.title}
          />
        </Field>

        <Field
          label="Search engine description"
          hint="Around 155 characters. This is the grey text under your link."
        >
          <Textarea
            value={draft.seo_description}
            onChange={(event) => setDraft({ ...draft, seo_description: event.target.value })}
            rows={3}
          />
        </Field>

        <Field label="Share image" hint="Shown when someone posts a link to this page.">
          <Input
            value={draft.og_image_url}
            onChange={(event) => setDraft({ ...draft, og_image_url: event.target.value })}
            placeholder="https://…"
          />
        </Field>

        <Checkbox
          label="Hide from search engines"
          hint="Keeps the page public but out of results — a thank-you page wants this."
          checked={draft.noindex}
          onChange={(event) => setDraft({ ...draft, noindex: event.target.checked })}
        />
      </div>
    </Modal>
  )
}

function HistoryModal({
  open,
  onClose,
  pageId,
  revisions,
}: {
  open: boolean
  onClose: () => void
  pageId: number
  revisions: Props['revisions']
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Version history"
      description="Restoring puts a version back in your draft. Nothing goes live until you publish."
    >
      {revisions.length === 0 ? (
        <p className="text-[13px] text-slate-500">
          No versions yet. One is kept every time you publish, and as you edit.
        </p>
      ) : (
        <ul className="divide-y divide-line dark:divide-slate-800">
          {revisions.map((revision) => (
            <li key={revision.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] text-slate-800 dark:text-slate-100">
                  {revision.label ?? REASONS[revision.reason] ?? revision.reason}
                </div>
                <div className="text-[11.5px] text-slate-500">
                  {revision.actor}
                  {revision.created_at ? ` · ${ago(revision.created_at)}` : ''}
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  router.post(`/storefront/pages/${pageId}/revisions/${revision.id}/restore`)
                }
              >
                Restore
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}

const REASONS: Record<string, string> = {
  autosave: 'Autosaved',
  publish: 'Published',
  restore: 'Before restore',
}
