import { StaticCanvas } from 'fabric'
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { renderTemplate } from './build'
import { TEMPLATES } from './catalogue'
import { BADGES, FRAMES, LINES, PAIRINGS, SHAPES, TEXT_STYLES } from './elements'
import { iconLibrary, kebab, loadIcons, POPULAR, type IconNode } from './icons'
import { ShapeThumb } from './ui-icons'
import { ensureFonts, FONT_GROUPS, FONT_LIST } from './fonts'
import { pill, pillOn } from './Inspector'
import { SizePreview } from './size-preview'
import { GRADIENTS, SIZES, SWATCHES, type Template } from './templates'
import type { Obj } from './build'

export type Product = { id: number; title: string; image_url: string | null; price: string; compare_at: string | null }
export type Coupon = { id: number; code: string; label: string; title: string | null; state: string }

const field = 'h-9 w-full rounded-full border border-line bg-surface px-3.5 text-[12.5px] text-ink outline-none focus:border-ink'
const tile = 'border border-line bg-surface text-left transition hover:border-ink'

export function PanelTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
      {hint && <p className="mt-0.5 text-[12px] leading-snug text-ink-muted">{hint}</p>}
    </div>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{title}</div>
      {children}
    </div>
  )
}

// -- templates ---------------------------------------------------------------------

const previews = new Map<string, string>()

function fontsOf(template: Template): string[] {
  return template.objects.flatMap((o) => (typeof o.fontFamily === 'string' ? [o.fontFamily] : []))
}

export function TemplatesPanel({ onPick, ready }: { onPick: (t: Template) => void; ready: boolean }) {
  const [, tick] = useState(0)
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const groups = useMemo(() => ['All', ...new Set(TEMPLATES.map((t) => t.group))], [])

  useEffect(() => {
    if (!ready) return
    let cancelled = false
    void (async () => {
      for (const template of TEMPLATES) {
        if (cancelled) return
        if (previews.has(template.id)) continue
        await ensureFonts(fontsOf(template))
        const c = new StaticCanvas(document.createElement('canvas'), { width: template.width, height: template.height, renderOnAddRemove: false })
        await renderTemplate(c, template)
        c.renderAll()
        previews.set(template.id, c.toDataURL({ format: 'jpeg', quality: 0.72, multiplier: 260 / Math.max(template.width, template.height) }))
        c.dispose()
        tick((n) => n + 1)
        await new Promise((r) => setTimeout(r, 0))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [ready])

  const shown = TEMPLATES.filter(
    (t) => (filter === 'All' || t.group === filter) && t.name.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <div>
      <PanelTitle title="Templates" hint={`${TEMPLATES.length} designs. Your product and coupon fill in automatically.`} />
      <input className={field} placeholder="Search templates" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="my-3 flex flex-wrap gap-1.5">
        {groups.map((g) => (
          <button key={g} className={`${pill} !h-7 border border-line !px-2.5 !text-[11.5px] ${filter === g ? pillOn : ''}`} onClick={() => setFilter(g)}>
            {g}
          </button>
        ))}
      </div>
      {shown.length === 0 && <p className="text-[12px] text-ink-muted">No templates match.</p>}
      <div className="columns-2 gap-2.5">
        {shown.map((template) => (
          <button key={template.id} onClick={() => onPick(template)} className={`${tile} group mb-2.5 block w-full break-inside-avoid p-1.5`} title={template.name}>
            <span className="flex items-center justify-center bg-sunken" style={{ aspectRatio: `${template.width} / ${template.height}`, maxHeight: 220 }}>
              {previews.get(template.id) ? (
                <img src={previews.get(template.id)} alt={template.name} className="h-full w-full object-contain" />
              ) : (
                <span className="h-full w-full animate-pulse bg-line" />
              )}
            </span>
            <span className="mt-1.5 block truncate text-[11.5px] text-ink">{template.name}</span>
            <span className="block text-[10.5px] text-ink-muted">{template.width}×{template.height}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// -- product / coupon -----------------------------------------------------------------

export function ProductPanel({
  products, productId, onChoose, onAddPhoto,
}: { products: Product[]; productId: number | null; onChoose: (p: Product) => void; onAddPhoto: (p: Product) => void }) {
  const [query, setQuery] = useState('')
  const shown = products.filter((p) => p.title.toLowerCase().includes(query.toLowerCase()))
  return (
    <div className="space-y-3">
      <PanelTitle title="Product" hint="Fills every product photo, name and price in the design." />
      <input className={field} placeholder="Search products" value={query} onChange={(e) => setQuery(e.target.value)} />
      {shown.length === 0 && <p className="text-[12px] text-ink-muted">No products found.</p>}
      <div className="space-y-1.5">
        {shown.map((product) => (
          <div key={product.id} className={`flex items-center gap-2.5 border p-2 ${productId === product.id ? 'border-ink bg-sunken' : 'border-line bg-surface'}`}>
            <button className="flex min-w-0 flex-1 items-center gap-2.5 text-left" onClick={() => onChoose(product)}>
              <span className="h-11 w-11 shrink-0 bg-sunken">
                {product.image_url && <img src={product.image_url} alt="" className="h-full w-full object-cover" />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12.5px] font-medium text-ink">{product.title}</span>
                <span className="block text-[11.5px] text-ink-muted">{product.price}</span>
              </span>
            </button>
            {product.image_url && (
              <button title="Add photo to canvas" className={pill + ' !h-7 border border-line !px-2.5'} onClick={() => onAddPhoto(product)}>
                + Photo
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function CouponPanel({
  coupons, couponId, onChoose, onAddCode, onAddOffer,
}: { coupons: Coupon[]; couponId: number | null; onChoose: (c: Coupon) => void; onAddCode: () => void; onAddOffer: () => void }) {
  return (
    <div className="space-y-3">
      <PanelTitle title="Discount code" hint="Fills the code and offer text. Add them to any design too." />
      {coupons.length === 0 && (
        <p className="text-[12px] text-ink-muted">
          No active codes yet. <a className="text-ink underline" href="/marketing/discounts">Create a discount</a> and it shows up here.
        </p>
      )}
      <div className="space-y-1.5">
        {coupons.map((coupon) => (
          <button key={coupon.id} onClick={() => onChoose(coupon)} className={`${tile} block w-full p-2.5 ${couponId === coupon.id ? '!border-ink bg-sunken' : ''}`}>
            <span className="block font-mono text-[13px] font-semibold tracking-wide text-ink">{coupon.code}</span>
            <span className="block text-[11.5px] text-ink-muted">{coupon.label}{coupon.state !== 'active' ? ` · ${coupon.state}` : ''}</span>
          </button>
        ))}
      </div>
      <Group title="Add to canvas">
        <div className="grid grid-cols-2 gap-1.5">
          <button className={pill + ' border border-line'} onClick={onAddCode}>Code chip</button>
          <button className={pill + ' border border-line'} onClick={onAddOffer}>Offer text</button>
        </div>
      </Group>
    </div>
  )
}

// -- text ---------------------------------------------------------------------------

export function TextPanel({
  onAdd, onFont, onPairing, activeFont,
}: { onAdd: (o: Obj) => void; onFont: (name: string) => void; onPairing: (i: number) => void; activeFont?: string }) {
  return (
    <div>
      <PanelTitle title="Text" hint="Click a font to use it on the selected text, or to add new text." />
      <Group title="Styles">
        <div className="grid gap-1.5">
          {TEXT_STYLES.map((style) => (
            <button key={style.key} onClick={() => onAdd(style.make())} className={`${tile} px-3 py-2.5`} style={style.css as CSSProperties}>
              {style.sample}
            </button>
          ))}
        </div>
      </Group>
      <Group title="Font pairings">
        <div className="grid grid-cols-2 gap-1.5">
          {PAIRINGS.map((pairing, i) => (
            <button key={pairing.name} onClick={() => onPairing(i)} className={`${tile} px-2.5 py-2`}>
              <span className="block truncate text-[17px] leading-tight text-ink" style={{ fontFamily: pairing.head }}>{pairing.name}</span>
              <span className="block truncate text-[11px] text-ink-muted" style={{ fontFamily: pairing.sub }}>{pairing.sub}</span>
            </button>
          ))}
        </div>
      </Group>
      {FONT_GROUPS.map((group) => (
        <Group key={group} title={`${group} fonts`}>
          <div className="space-y-1">
            {FONT_LIST.filter((f) => f.group === group).map((font) => (
              <button
                key={font.name}
                onClick={() => onFont(font.name)}
                className={`${tile} flex w-full items-center justify-between px-3 py-2 ${activeFont === font.name ? '!border-ink bg-sunken' : ''}`}
              >
                <span className="truncate text-[17px] text-ink" style={{ fontFamily: font.name }}>{font.name}</span>
                <span className="ml-2 shrink-0 text-[10.5px] text-ink-faint">Aa</span>
              </button>
            ))}
          </div>
        </Group>
      ))}
    </div>
  )
}

// -- elements -----------------------------------------------------------------------

function Thumb({ children, label, onClick }: { children: ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`${tile} flex h-16 flex-col items-center justify-center gap-1 px-1 text-[10.5px] text-ink-muted`} title={label}>
      {children}
      <span className="max-w-full truncate">{label}</span>
    </button>
  )
}

export function ElementsPanel({ onAdd }: { onAdd: (o: Obj) => void }) {
  useEffect(() => { void loadIcons() }, [])
  const addBadge = (make: () => Obj) => void loadIcons().then(() => onAdd(make()))
  return (
    <div>
      <PanelTitle title="Elements" />
      <Group title="Shapes">
        <div className="grid grid-cols-3 gap-1.5">
          {SHAPES.map((s) => (
            <Thumb key={s.key} label={s.label} onClick={() => onAdd(s.make())}>
              <span className="text-ink"><ShapeThumb kind={s.key} /></span>
            </Thumb>
          ))}
        </div>
      </Group>
      <Group title="Badges & stickers">
        <div className="grid grid-cols-2 gap-1.5">
          {BADGES.map((b) => (
            <button key={b.key} className={`${tile} px-3 py-3 text-[12px] font-semibold text-ink`} onClick={() => addBadge(b.make)}>{b.label}</button>
          ))}
        </div>
      </Group>
      <Group title="Lines">
        <div className="grid grid-cols-2 gap-1.5">
          {LINES.map((l) => (
            <button key={l.key} className={`${tile} px-3 py-2.5 text-[12px] text-ink`} onClick={() => onAdd(l.make())}>{l.label}</button>
          ))}
        </div>
      </Group>
      <Group title="Photo frames">
        <div className="grid grid-cols-2 gap-1.5">
          {FRAMES.map((f) => (
            <button key={f.key} className={`${tile} px-3 py-2.5 text-[12px] text-ink`} onClick={() => onAdd(f.make())}>{f.label}</button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-ink-muted">Frames take the chosen product's photo, or your own upload.</p>
      </Group>
    </div>
  )
}

// -- photos ---------------------------------------------------------------------------

export function PhotosPanel({ products, onUpload, onAddPhoto }: { products: Product[]; onUpload: () => void; onAddPhoto: (p: Product) => void }) {
  const withPhotos = products.filter((p) => p.image_url)
  return (
    <div>
      <PanelTitle title="Photos" hint="Upload your own, or use a product photo." />
      <button className={`${pill} !h-20 w-full flex-col border border-dashed border-ink-faint`} onClick={onUpload}>
        <span className="text-[13px] font-medium">Upload an image</span>
        <span className="text-[11px] text-ink-muted">or drop one on the canvas</span>
      </button>
      <div className="mt-5">
        <Group title="Product photos">
          <div className="grid grid-cols-2 gap-1.5">
            {withPhotos.map((p) => (
              <button key={p.id} className={`${tile} p-1`} onClick={() => onAddPhoto(p)} title={p.title}>
                <img src={p.image_url!} alt={p.title} className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
          {withPhotos.length === 0 && <p className="text-[12px] text-ink-muted">No product photos yet.</p>}
        </Group>
      </div>
    </div>
  )
}

// -- layers ---------------------------------------------------------------------------

export type Layer = { index: number; label: string; kind: string; visible: boolean; locked: boolean; selected: boolean }

export function LayersPanel({
  layers, onSelect, onToggle, onLock, onMove,
}: {
  layers: Layer[]
  onSelect: (i: number) => void
  onToggle: (i: number) => void
  onLock: (i: number) => void
  onMove: (i: number, dir: 1 | -1) => void
}) {
  return (
    <div>
      <PanelTitle title="Layers" hint="Top of the list is the front of the design." />
      {layers.length === 0 && <p className="text-[12px] text-ink-muted">Nothing on the canvas yet.</p>}
      <div className="space-y-1">
        {[...layers].reverse().map((layer) => (
          <div key={layer.index} className={`flex items-center gap-1 border px-2 py-1.5 ${layer.selected ? 'border-ink bg-sunken' : 'border-line bg-surface'}`}>
            <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => onSelect(layer.index)}>
              <span className="w-4 shrink-0 text-center text-[11px] text-ink-muted">{layer.kind}</span>
              <span className={`truncate text-[12.5px] ${layer.visible ? 'text-ink' : 'text-ink-faint line-through'}`}>{layer.label}</span>
            </button>
            <button className="px-1 text-[11px] text-ink-muted hover:text-ink" title="Move up" onClick={() => onMove(layer.index, 1)}>Up</button>
            <button className="px-1 text-[11px] text-ink-muted hover:text-ink" title="Move down" onClick={() => onMove(layer.index, -1)}>Down</button>
            <button className={`px-1 text-[11px] ${layer.visible ? 'text-ink-muted' : 'text-ink'} hover:text-ink`} title="Show / hide" onClick={() => onToggle(layer.index)}>{layer.visible ? 'Hide' : 'Show'}</button>
            <button className={`px-1 text-[11px] ${layer.locked ? 'text-ink' : 'text-ink-muted'} hover:text-ink`} title="Lock" onClick={() => onLock(layer.index)}>{layer.locked ? 'Locked' : 'Lock'}</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// -- canvas ---------------------------------------------------------------------------

export function CanvasPanel({
  size, onResize, onColor, onGradient,
}: {
  size: { w: number; h: number }
  onResize: (w: number, h: number) => void
  onColor: (c: string) => void
  onGradient: (from: string, to: string) => void
}) {
  const [custom, setCustom] = useState({ w: size.w, h: size.h })
  useEffect(() => setCustom({ w: size.w, h: size.h }), [size.w, size.h])
  return (
    <div>
      <PanelTitle title="Canvas" />
      <Group title="Size">
        <div className="grid grid-cols-2 gap-1.5">
          {SIZES.map((s) => {
            const on = s.width === size.w && s.height === size.h
            return (
              <button key={s.label} className={`${tile} flex flex-col items-center gap-1 px-2 py-2.5 ${on ? '!border-ink bg-sunken' : ''}`} onClick={() => onResize(s.width, s.height)}>
                <SizePreview width={s.width} height={s.height} box={44} active={on} />
                <span className="text-[11.5px] font-medium text-ink">{s.label}</span>
                <span className="text-[10.5px] text-ink-muted">{s.width}×{s.height}</span>
              </button>
            )
          })}
        </div>
        <div className="mt-2.5 flex items-end gap-2">
          <label className="flex-1 text-[11px] text-ink-muted">Width
            <input type="number" className={field + ' mt-1 !rounded-md'} value={custom.w} onChange={(e) => setCustom({ ...custom, w: Number(e.target.value) })} />
          </label>
          <label className="flex-1 text-[11px] text-ink-muted">Height
            <input type="number" className={field + ' mt-1 !rounded-md'} value={custom.h} onChange={(e) => setCustom({ ...custom, h: Number(e.target.value) })} />
          </label>
          <button className={pill + ' border border-line'} onClick={() => onResize(Math.max(100, Math.min(4000, custom.w || 1080)), Math.max(100, Math.min(4000, custom.h || 1080)))}>Apply</button>
        </div>
      </Group>
      <Group title="Background">
        <div className="grid grid-cols-6 gap-1.5">
          {SWATCHES.map((c) => (
            <button key={c} aria-label={c} className="h-8 border border-line" style={{ background: c }} onClick={() => onColor(c)} />
          ))}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {GRADIENTS.map(([from, to]) => (
            <button key={from + to} aria-label="gradient" className="h-8 border border-line" style={{ background: `linear-gradient(${from}, ${to})` }} onClick={() => onGradient(from, to)} />
          ))}
        </div>
        <label className="mt-2 flex items-center gap-2 text-[12px] text-ink-muted">
          Custom colour
          <input type="color" className="h-8 w-12 border border-line bg-surface" onChange={(e) => onColor(e.target.value)} />
        </label>
      </Group>
    </div>
  )
}

// -- icons ----------------------------------------------------------------------------

const PAGE = 90

function IconSvg({ node, size = 26 }: { node: IconNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {node.map(([tag, attrs], i) => {
        const Tag = tag as 'path'
        return <Tag key={i} {...(attrs as Record<string, string>)} />
      })}
    </svg>
  )
}

export function IconsPanel({ onPick }: { onPick: (name: string, filled: boolean) => void }) {
  const [ready, setReady] = useState(Boolean(iconLibrary()))
  const [query, setQuery] = useState('')
  const [all, setAll] = useState(false)
  const [limit, setLimit] = useState(PAGE)
  const [filled, setFilled] = useState(false)

  useEffect(() => {
    void loadIcons().then(() => setReady(true))
  }, [])

  const library = iconLibrary()
  const entries = useMemo(() => {
    if (!library) return []
    const byKebab = new Map(Object.keys(library).map((k) => [kebab(k), k]))
    const q = query.trim().toLowerCase().replace(/\s+/g, '-')
    const pool = q || all ? [...byKebab.keys()] : [...new Set(POPULAR)].filter((n) => byKebab.has(n))
    return pool.filter((n) => !q || n.includes(q)).map((n) => ({ name: n, node: library[byKebab.get(n)!] }))
  }, [library, query, all, ready])

  return (
    <div>
      <PanelTitle title="Icons" hint="Clean line icons. Recolour, resize and outline them like any shape." />
      <input className={field} placeholder="Search 2,000+ icons" value={query} onChange={(e) => { setQuery(e.target.value); setLimit(PAGE) }} />
      <div className="my-3 flex gap-1.5">
        <button className={`${pill} !h-7 border border-line !px-2.5 !text-[11.5px] ${!all && !query ? pillOn : ''}`} onClick={() => { setAll(false); setLimit(PAGE) }}>Popular</button>
        <button className={`${pill} !h-7 border border-line !px-2.5 !text-[11.5px] ${all ? pillOn : ''}`} onClick={() => { setAll(true); setLimit(PAGE) }}>All</button>
        <button className={`${pill} !h-7 border border-line !px-2.5 !text-[11.5px] ${filled ? pillOn : ''}`} onClick={() => setFilled(!filled)}>Filled</button>
      </div>
      {!ready && <p className="text-[12px] text-ink-muted">Loading icons…</p>}
      {ready && entries.length === 0 && <p className="text-[12px] text-ink-muted">No icons match.</p>}
      <div className="grid grid-cols-5 gap-1.5">
        {entries.slice(0, limit).map(({ name, node }) => (
          <button key={name} title={name.replace(/-/g, ' ')} onClick={() => onPick(name, filled)} className={`${tile} flex h-12 items-center justify-center text-ink`}>
            <IconSvg node={node} />
          </button>
        ))}
      </div>
      {entries.length > limit && (
        <button className={`${pill} mt-3 w-full border border-line`} onClick={() => setLimit(limit + PAGE)}>
          Show more ({entries.length - limit})
        </button>
      )}
    </div>
  )
}
