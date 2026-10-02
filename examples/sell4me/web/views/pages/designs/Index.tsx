import { Head, Link, router } from '@inertiajs/react'
import { useState } from 'react'
import { Button, Empty, Input, Modal, PageHeader, Field } from '@/views/ui/kit'
import { SizePreview } from '@/views/ui/studio/size-preview'
import { IconCopy, IconImage, IconPlus, IconTrash } from '@/views/ui/icons'

type Design = {
  id: number
  title: string
  kind: string
  width: number
  height: number
  thumbnail: string | null
  updated_at: string | null
}

type Props = { designs: Design[]; kinds: { key: string; width: number; height: number }[] }

const LABELS: Record<string, string> = {
  poster: 'Poster',
  square: 'Square post',
  story: 'Story',
  banner: 'Banner',
  coupon: 'Coupon card',
  link: 'Link card',
  thumbnail: 'Thumbnail',
  a4: 'A4 print',
  custom: 'Custom',
}

export default function DesignsIndex({ designs, kinds }: Props) {
  const [adding, setAdding] = useState(false)
  const [kind, setKind] = useState('poster')
  const [custom, setCustom] = useState({ width: 1080, height: 1080 })
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <>
      <Head title="Designs" />
      <PageHeader
        title="Designs"
        subtitle="Posters, coupon cards, banners and stories — made from your own products and discount codes."
        actions={
          <Button onClick={() => setAdding(true)}>
            <IconPlus className="h-3.5 w-3.5" />
            New design
          </Button>
        }
      />

      {designs.length === 0 ? (
        <Empty
          icon={<IconImage className="h-5 w-5" />}
          title="No designs yet"
          body="Start from a template, pick a product and a coupon, and export an image ready to post."
          action={<Button onClick={() => setAdding(true)}>Create a design</Button>}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {designs.map((design) => (
            <div key={design.id} className="group border border-line bg-surface">
              <Link href={`/designs/${design.id}`} className="flex h-52 items-center justify-center bg-sunken p-3">
                {design.thumbnail ? (
                  <img src={design.thumbnail} alt="" className="max-h-full max-w-full object-contain" />
                ) : (
                  <IconImage className="h-6 w-6 text-ink-faint" />
                )}
              </Link>
              <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium text-ink">{design.title}</div>
                  <div className="text-[11.5px] text-ink-muted">
                    {LABELS[design.kind] ?? design.kind} · {design.width}×{design.height}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    title="Duplicate"
                    className="p-1.5 text-ink-muted hover:text-brand"
                    onClick={() => router.post(`/designs/${design.id}/duplicate`)}
                  >
                    <IconCopy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    title="Delete"
                    className="p-1.5 text-ink-muted hover:text-red-600"
                    onClick={() => {
                      if (window.confirm(`Delete "${design.title}"?`)) router.post(`/designs/${design.id}/delete`)
                    }}
                  >
                    <IconTrash className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="New design"
        width="lg"
        description="Pick a canvas size. You choose the template inside the studio."
        footer={
          <>
            <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button
              loading={busy}
              onClick={() =>
                router.post('/designs', { kind, title, ...(kind === 'custom' ? custom : {}) }, { onStart: () => setBusy(true), onFinish: () => setBusy(false) })
              }
            >
              Open studio
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Summer sale poster" />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            {[...kinds, { key: 'custom', width: custom.width, height: custom.height }].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setKind(option.key)}
                className={`flex flex-col items-center gap-1.5 border px-2 py-3 text-center transition ${
                  kind === option.key ? 'border-ink bg-sunken' : 'border-line hover:border-ink'
                }`}
              >
                <SizePreview width={option.width} height={option.height} box={64} active={kind === option.key} />
                <span className="text-[12.5px] font-medium text-ink">{LABELS[option.key]}</span>
                <span className="text-[11px] text-ink-muted">{option.width}×{option.height}</span>
              </button>
            ))}
          </div>
          {kind === 'custom' && (
            <div className="flex items-end gap-3">
              <Field label="Width (px)" className="flex-1">
                <Input type="number" value={custom.width} onChange={(e) => setCustom({ ...custom, width: Number(e.target.value) })} />
              </Field>
              <Field label="Height (px)" className="flex-1">
                <Input type="number" value={custom.height} onChange={(e) => setCustom({ ...custom, height: Number(e.target.value) })} />
              </Field>
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}
