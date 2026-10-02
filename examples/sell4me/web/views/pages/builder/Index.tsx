import { Head, Link, router, useForm } from '@inertiajs/react'
import { useState } from 'react'
import {
  Badge,
  Button,
  Empty,
  Field,
  Input,
  Modal,
  PageHeader,
  Panel,
  Select,
} from '@/views/ui/kit'
import {
  IconExternal,
  IconEye,
  IconLayout,
  IconPlus,
  IconTrash,
} from '@/views/ui/icons'

/**
 * Every page this store has built.
 *
 * Grouped by whether it is live, because that is the only question a merchant
 * opens this screen asking. A flat alphabetical list buries the one page that
 * has unpublished changes among nine that do not.
 */

type BuiltPage = {
  id: number
  title: string
  slug: string
  kind: string
  path: string
  is_published: boolean
  has_changes: boolean
  blocks: number
  updated_at: string | null
  published_at: string | null
}

type Props = {
  pages: BuiltPage[]
  kinds: { key: string; label: string; singleton: boolean }[]
  storefront_url: string
}

const KIND_LABELS: Record<string, string> = {
  home: 'Homepage',
  page: 'Page',
  collection_template: 'Collection template',
  product_template: 'Product template',
  header: 'Header',
}

export default function BuilderIndex({ pages, kinds, storefront_url }: Props) {
  const [adding, setAdding] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [busy, setBusy] = useState(false)

  // What one click would change: pages with something on them that are not
  // live yet, or differ from what is live.
  const pending = pages.filter((entry) => entry.blocks > 0 && (!entry.is_published || entry.has_changes))

  // A singleton the store already has cannot be created again — the server
  // refuses it, so the form should not offer it.
  const taken = new Set(pages.map((entry) => entry.kind))
  const available = kinds.filter((kind) => !kind.singleton || !taken.has(kind.key))

  return (
    <>
      <Head title="Pages" />

      <PageHeader
        title="Pages"
        subtitle="Build your storefront out of blocks. Nothing goes live until you publish it."
        actions={
          <>
            <Button variant="secondary" onClick={() => window.open(storefront_url, '_blank')}>
              <IconExternal className="h-3.5 w-3.5" />
              View shop
            </Button>
            <Button
              variant="primary"
              disabled={pending.length === 0}
              onClick={() => setPublishing(true)}
              title={pending.length === 0 ? 'Everything is already live' : undefined}
            >
              Publish all{pending.length > 0 ? ` (${pending.length})` : ''}
            </Button>
            <Button onClick={() => setAdding(true)} disabled={available.length === 0}>
              <IconPlus className="h-3.5 w-3.5" />
              New page
            </Button>
          </>
        }
      />

      {pages.length === 0 ? (
        <Empty
          icon={<IconLayout className="h-5 w-5" />}
          title="No pages yet"
          body="Build a homepage from blocks — a hero, a product grid, whatever the shop needs. Until you do, your shop serves a starter homepage built from the same blocks."
          action={<Button onClick={() => setAdding(true)}>Build a homepage</Button>}
        />
      ) : (
        <div className="space-y-3">
          {pages.map((entry) => (
            <PageRow key={entry.id} page={entry} storefrontUrl={storefront_url} />
          ))}
        </div>
      )}

      <Modal
        open={publishing}
        onClose={() => setPublishing(false)}
        title={`Publish ${pending.length} page${pending.length === 1 ? '' : 's'}?`}
        description="Every draft below goes live on your shop. Each keeps a version you can restore."
        footer={
          <>
            <Button variant="ghost" onClick={() => setPublishing(false)}>Cancel</Button>
            <Button
              variant="primary"
              loading={busy}
              onClick={() =>
                router.post('/storefront/pages/publish-all', {}, {
                  onStart: () => setBusy(true),
                  onFinish: () => { setBusy(false); setPublishing(false) },
                })
              }
            >
              Publish all
            </Button>
          </>
        }
      >
        <ul className="space-y-1.5 text-[13px] text-slate-700 dark:text-slate-200">
          {pending.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-3">
              <span className="truncate">{entry.title}</span>
              <Badge tone={entry.is_published ? 'caution' : 'neutral'}>
                {entry.is_published ? 'Unpublished changes' : 'Draft'}
              </Badge>
            </li>
          ))}
        </ul>
      </Modal>

      <NewPageModal
        open={adding}
        onClose={() => setAdding(false)}
        kinds={available}
      />
    </>
  )
}

function PageRow({ page, storefrontUrl }: { page: BuiltPage; storefrontUrl: string }) {
  return (
    <Panel className="p-0">
      <div className="flex flex-wrap items-center gap-4 px-5 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
          <IconLayout className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/storefront/pages/${page.id}`}
              className="truncate text-[14px] font-medium text-slate-900 hover:text-brand dark:text-slate-50"
            >
              {page.title}
            </Link>
            {page.is_published ? (
              <Badge tone="ok" dot>Live</Badge>
            ) : (
              <Badge tone="neutral">Draft</Badge>
            )}
            {/* Only worth saying when it is true — a badge that reads
                "up to date" on every row is nine rows of noise. */}
            {page.has_changes && page.is_published && (
              <Badge tone="caution">Unpublished changes</Badge>
            )}
          </div>
          <div className="mt-0.5 truncate text-[12px] text-slate-500">
            {KIND_LABELS[page.kind] ?? page.kind} · {page.path} ·{' '}
            {page.blocks === 1 ? '1 block' : `${page.blocks} blocks`}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <a
            href={`${storefrontUrl}${page.path}${page.is_published ? '' : '?preview=1'}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[12.5px] text-slate-600 transition hover:border-brand hover:text-brand dark:border-slate-700 dark:text-slate-300"
          >
            <IconEye className="h-3.5 w-3.5" />
            {page.is_published ? 'View' : 'Preview'}
          </a>
          <Link
            href={`/storefront/pages/${page.id}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-1.5 text-[12.5px] font-medium text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900"
          >
            Edit
          </Link>
          {page.kind === 'page' && <DeleteButton page={page} />}
        </div>
      </div>
    </Panel>
  )
}

function DeleteButton({ page }: { page: BuiltPage }) {
  const [confirming, setConfirming] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Delete ${page.title}`}
        className="rounded-full p-2 text-slate-400 transition hover:bg-critical/10 hover:text-critical"
      >
        <IconTrash className="h-3.5 w-3.5" />
      </button>

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Delete ${page.title}?`}
        description="The page and its version history go with it. This cannot be undone."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              onClick={() => router.post(`/storefront/pages/${page.id}/delete`)}
            >
              Delete page
            </Button>
          </>
        }
      >
        <p className="text-[13px] text-slate-600 dark:text-slate-300">
          {page.is_published
            ? `This page is live at ${page.path}. Anyone with the link will get a 404 once it is gone.`
            : 'This page has never been published, so no customer has seen it.'}
        </p>
      </Modal>
    </>
  )
}

function NewPageModal({
  open,
  onClose,
  kinds,
}: {
  open: boolean
  onClose: () => void
  kinds: { key: string; label: string; singleton: boolean }[]
}) {
  const form = useForm({ title: '', kind: kinds[0]?.key ?? 'page' })

  function submit(event: React.FormEvent) {
    event.preventDefault()
    form.post('/storefront/pages', { onSuccess: onClose })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New page"
      description="It starts as a draft. Build it, then publish when you are happy."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={form.processing}>
            Create and open
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Title" required error={form.errors.title}>
          <Input
            value={form.data.title}
            onChange={(event) => form.setData('title', event.target.value)}
            placeholder="About us"
            autoFocus
          />
        </Field>

        <Field
          label="Type"
          error={form.errors.kind}
          hint="A homepage is served at /. Everything else lives under /pages/."
        >
          <Select
            value={form.data.kind}
            onChange={(event) => form.setData('kind', event.target.value)}
          >
            {kinds.map((kind) => (
              <option key={kind.key} value={kind.key}>
                {KIND_LABELS[kind.key] ?? kind.label}
              </option>
            ))}
          </Select>
        </Field>
      </form>
    </Modal>
  )
}
