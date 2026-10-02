import { Canvas, FabricImage, Gradient, filters as F, Shadow } from 'fabric'
import { useState, type ReactNode } from 'react'
import { gradientFill, toHex, type Obj } from './build'
import { FONT_GROUPS, FONT_LIST } from './fonts'
import { isIcon } from './icons'

export type Sel = {
  kind: 'text' | 'image' | 'shape' | 'group' | 'multi'
  type: string
  role?: string
  locked: boolean
  x: number
  y: number
  w: number
  h: number
  angle: number
  opacity: number
  fill: string
  gradient: { from: string; to: string } | null
  stroke: string
  strokeWidth: number
  rx: number
  shadow: { color: string; blur: number; x: number; y: number } | null
  fontFamily: string
  fontSize: number
  fontWeight: number
  fontStyle: string
  textAlign: string
  charSpacing: number
  lineHeight: number
  underline: boolean
  linethrough: boolean
  bg: string | null
  fx: { brightness: number; contrast: number; saturation: number; blur: number; grayscale: boolean }
  flipX: boolean
  flipY: boolean
  icon: boolean
  iconColor: string
  iconStroke: number
}

type Any = Obj & Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

export function readSel(canvas: Canvas | null): Sel | null {
  const obj = canvas?.getActiveObject() as Any | undefined
  if (!obj) return null
  const isText = ['textbox', 'i-text', 'text'].includes(obj.type)
  const isImage = obj.type === 'image'
  const fillIsGradient = obj.fill instanceof Gradient
  const stops = fillIsGradient ? (obj.fill as Gradient<'linear'>).colorStops : []
  const shadow = obj.shadow as Shadow | null
  const fx = { brightness: 0, contrast: 0, saturation: 0, blur: 0, grayscale: false }
  if (isImage) {
    for (const f of (obj.filters ?? []) as any[]) { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (f.type === 'Brightness') fx.brightness = f.brightness
      if (f.type === 'Contrast') fx.contrast = f.contrast
      if (f.type === 'Saturation') fx.saturation = f.saturation
      if (f.type === 'Blur') fx.blur = f.blur
      if (f.type === 'Grayscale') fx.grayscale = true
    }
  }
  return {
    kind: obj.type === 'activeselection' ? 'multi' : isText ? 'text' : isImage ? 'image' : obj.type === 'group' ? 'group' : 'shape',
    type: obj.type,
    role: obj.role,
    locked: Boolean(obj.locked),
    x: Math.round(obj.left ?? 0),
    y: Math.round(obj.top ?? 0),
    w: Math.round(obj.getScaledWidth()),
    h: Math.round(obj.getScaledHeight()),
    angle: Math.round(obj.angle ?? 0),
    opacity: obj.opacity ?? 1,
    fill: toHex(obj.fill, '#000000'),
    gradient: stops.length >= 2 ? { from: toHex(stops[0].color), to: toHex(stops[stops.length - 1].color) } : null,
    stroke: toHex(obj.stroke, '#000000'),
    strokeWidth: obj.strokeWidth ?? 0,
    rx: obj.rx ?? 0,
    shadow: shadow ? { color: shadow.color, blur: shadow.blur, x: shadow.offsetX, y: shadow.offsetY } : null,
    fontFamily: obj.fontFamily ?? 'Inter',
    fontSize: obj.fontSize ?? 0,
    fontWeight: Number(obj.fontWeight) || 400,
    fontStyle: obj.fontStyle ?? 'normal',
    textAlign: obj.textAlign ?? 'left',
    charSpacing: obj.charSpacing ?? 0,
    lineHeight: obj.lineHeight ?? 1,
    underline: Boolean(obj.underline),
    linethrough: Boolean(obj.linethrough),
    bg: obj.backgroundColor ? toHex(obj.backgroundColor, '#fde047') : null,
    fx,
    flipX: Boolean(obj.flipX),
    flipY: Boolean(obj.flipY),
    icon: isIcon(obj),
    iconColor: isIcon(obj) ? toHex((obj as unknown as { getObjects: () => Any[] }).getObjects()[0]?.stroke, '#111111') : '#111111',
    iconStroke: isIcon(obj) ? Number((obj as unknown as { getObjects: () => Any[] }).getObjects()[0]?.strokeWidth ?? 2) : 2,
  }
}

export type Api = {
  patch: (props: Record<string, unknown>) => void
  setShadow: (shadow: Sel['shadow']) => void
  setGradient: (g: { from: string; to: string; dir: 'v' | 'h' | 'd' } | null, fallback: string) => void
  setFx: (fx: Sel['fx']) => void
  setBox: (w: number, h: number) => void
  flip: (axis: 'x' | 'y') => void
  toggleLock: () => void
  group: () => void
  ungroup: () => void
  duplicate: () => void
  remove: () => void
  order: (how: 'forward' | 'back' | 'front' | 'bottom') => void
  align: (how: 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom') => void
  upload: () => void
}

export const applyShadow = (obj: Obj, shadow: Sel['shadow']) =>
  obj.set('shadow', shadow ? new Shadow({ color: shadow.color, blur: shadow.blur, offsetX: shadow.x, offsetY: shadow.y }) : null)

export const applyFilters = (obj: Obj, fx: Sel['fx']) => {
  const image = obj as unknown as FabricImage
  const list = []
  if (fx.brightness) list.push(new F.Brightness({ brightness: fx.brightness }))
  if (fx.contrast) list.push(new F.Contrast({ contrast: fx.contrast }))
  if (fx.saturation) list.push(new F.Saturation({ saturation: fx.saturation }))
  if (fx.blur) list.push(new F.Blur({ blur: fx.blur }))
  if (fx.grayscale) list.push(new F.Grayscale())
  image.filters = list
  image.applyFilters()
}

export { gradientFill }

// -- primitives ---------------------------------------------------------------

export const field = 'h-8 w-full rounded-md border border-line bg-surface px-2 text-[12.5px] text-ink outline-none focus:border-ink'
export const pill = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-3 text-[12px] text-ink transition hover:bg-sunken disabled:opacity-40'
export const pillOn = 'bg-ink !text-white hover:!bg-ink'

function Section({ title, children, open: initial = true }: { title: string; children: ReactNode; open?: boolean }) {
  const [open, setOpen] = useState(initial)
  return (
    <div className="border-b border-line py-3">
      <button className="flex w-full items-center justify-between text-left text-[12px] font-semibold text-ink" onClick={() => setOpen(!open)}>
        {title}
        <span className="text-ink-faint">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="mt-2.5 space-y-2.5">{children}</div>}
    </div>
  )
}

function Lbl({ text, children }: { text: string; children: ReactNode }) {
  return (
    <label className="block text-[11px] text-ink-muted">
      {text}
      <div className="mt-1">{children}</div>
    </label>
  )
}

function Num({ value, onChange, step = 1, min, max }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number }) {
  return (
    <input
      type="number"
      className={field}
      value={Number.isFinite(value) ? value : 0}
      step={step}
      min={min}
      max={max}
      onChange={(e) => {
        const v = Number(e.target.value)
        if (Number.isFinite(v)) onChange(v)
      }}
    />
  )
}

function Color({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex h-8 items-center gap-2 rounded-md border border-line bg-surface px-1.5">
      <input type="color" className="h-5 w-5 shrink-0 cursor-pointer border-0 bg-transparent p-0" value={value} onChange={(e) => onChange(e.target.value)} />
      <span className="font-mono text-[11.5px] uppercase text-ink-muted">{value}</span>
    </div>
  )
}

function Slider({ value, onChange, min, max, step }: { value: number; onChange: (v: number) => void; min: number; max: number; step: number }) {
  return <input type="range" className="block w-full accent-[var(--color-ink)]" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
}

export function FontSelect({ value, onChange, className = field }: { value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <select className={className} value={value} onChange={(e) => onChange(e.target.value)}>
      {FONT_GROUPS.map((group) => (
        <optgroup key={group} label={group}>
          {FONT_LIST.filter((f) => f.group === group).map((f) => (
            <option key={f.name} value={f.name}>{f.name}</option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}

export function Inspector({ sel, api, size, onBackground }: { sel: Sel | null; api: Api; size: { w: number; h: number }; onBackground: () => void }) {
  if (!sel) {
    return (
      <div className="space-y-3 p-4 text-[12.5px] text-ink-muted">
        <p className="font-medium text-ink">Nothing selected</p>
        <p>Click an element to style it. Double-click text to edit it. Hold Shift to select several.</p>
        <button className={pill + ' border border-line'} onClick={onBackground}>Canvas & background</button>
        <p className="pt-2 text-[11.5px]">{size.w} × {size.h}px</p>
      </div>
    )
  }

  const solid = !sel.gradient
  const dir = 'v' as const
  const isText = sel.kind === 'text'
  const isImage = sel.kind === 'image'
  const isShape = sel.kind === 'shape'
  const fillable = !isImage && sel.kind !== 'group' && sel.kind !== 'multi'

  return (
    <div className="px-4">
      <div className="flex items-center justify-between border-b border-line py-3">
        <span className="text-[13px] font-semibold capitalize text-ink">
          {sel.role ? sel.role.replace(/-/g, ' ') : sel.kind === 'multi' ? 'Selection' : sel.kind}
        </span>
        {sel.locked && <span className="text-[11px] text-ink-muted">Locked</span>}
      </div>

      {sel.role === 'product-image' && (
        <div className="border-b border-line py-3">
          <button className={pill + ' w-full border border-line'} onClick={api.upload}>Upload into this frame</button>
        </div>
      )}

      {isText && (
        <Section title="Text">
          <Lbl text="Font"><FontSelect value={sel.fontFamily} onChange={(v) => api.patch({ fontFamily: v })} /></Lbl>
          <div className="grid grid-cols-2 gap-2">
            <Lbl text="Size"><Num value={Math.round(sel.fontSize)} min={4} onChange={(v) => api.patch({ fontSize: v })} /></Lbl>
            <Lbl text="Weight">
              <select className={field} value={sel.fontWeight} onChange={(e) => api.patch({ fontWeight: Number(e.target.value) })}>
                {[300, 400, 500, 600, 700, 800, 900].map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </Lbl>
          </div>
          <div className="flex flex-wrap gap-1">
            {(['left', 'center', 'right', 'justify'] as const).map((a) => (
              <button key={a} className={`${pill} !px-2.5 border border-line ${sel.textAlign === a ? pillOn : ''}`} onClick={() => api.patch({ textAlign: a })}>{a[0].toUpperCase()}</button>
            ))}
            <button className={`${pill} !px-3 border border-line italic ${sel.fontStyle === 'italic' ? pillOn : ''}`} onClick={() => api.patch({ fontStyle: sel.fontStyle === 'italic' ? 'normal' : 'italic' })}>I</button>
            <button className={`${pill} !px-3 border border-line underline ${sel.underline ? pillOn : ''}`} onClick={() => api.patch({ underline: !sel.underline })}>U</button>
            <button className={`${pill} !px-3 border border-line line-through ${sel.linethrough ? pillOn : ''}`} onClick={() => api.patch({ linethrough: !sel.linethrough })}>S</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Lbl text="Letter spacing"><Num value={Math.round(sel.charSpacing)} step={10} onChange={(v) => api.patch({ charSpacing: v })} /></Lbl>
            <Lbl text="Line height"><Num value={Number(sel.lineHeight.toFixed(2))} step={0.05} min={0.5} onChange={(v) => api.patch({ lineHeight: v })} /></Lbl>
          </div>
          <div className="flex gap-1">
            <button className={pill + ' border border-line'} onClick={() => api.patch({ __case: 'upper' })}>AA</button>
            <button className={pill + ' border border-line'} onClick={() => api.patch({ __case: 'lower' })}>aa</button>
            <button className={pill + ' border border-line'} onClick={() => api.patch({ __case: 'title' })}>Aa</button>
          </div>
          <Lbl text="Highlight">
            <div className="flex items-center gap-2">
              <Color value={sel.bg ?? '#fde047'} onChange={(v) => api.patch({ backgroundColor: v, padding: 12 })} />
              {sel.bg && <button className="text-[11px] text-ink-muted underline" onClick={() => api.patch({ backgroundColor: '', padding: 0 })}>Clear</button>}
            </div>
          </Lbl>
        </Section>
      )}

      {isImage && (
        <Section title="Photo">
          <Lbl text={`Brightness ${Math.round(sel.fx.brightness * 100)}`}><Slider min={-0.6} max={0.6} step={0.02} value={sel.fx.brightness} onChange={(v) => api.setFx({ ...sel.fx, brightness: v })} /></Lbl>
          <Lbl text={`Contrast ${Math.round(sel.fx.contrast * 100)}`}><Slider min={-0.6} max={0.6} step={0.02} value={sel.fx.contrast} onChange={(v) => api.setFx({ ...sel.fx, contrast: v })} /></Lbl>
          <Lbl text={`Saturation ${Math.round(sel.fx.saturation * 100)}`}><Slider min={-1} max={1} step={0.02} value={sel.fx.saturation} onChange={(v) => api.setFx({ ...sel.fx, saturation: v })} /></Lbl>
          <Lbl text={`Blur ${Math.round(sel.fx.blur * 100)}`}><Slider min={0} max={0.5} step={0.01} value={sel.fx.blur} onChange={(v) => api.setFx({ ...sel.fx, blur: v })} /></Lbl>
          <div className="flex gap-1.5">
            <button className={`${pill} border border-line ${sel.fx.grayscale ? pillOn : ''}`} onClick={() => api.setFx({ ...sel.fx, grayscale: !sel.fx.grayscale })}>Black & white</button>
            <button className={pill + ' border border-line'} onClick={() => api.setFx({ brightness: 0, contrast: 0, saturation: 0, blur: 0, grayscale: false })}>Reset</button>
          </div>
        </Section>
      )}

      {sel.icon && (
        <Section title="Icon">
          <Lbl text="Colour"><Color value={sel.iconColor} onChange={(v) => api.patch({ __iconColor: v })} /></Lbl>
          <Lbl text={`Line weight ${sel.iconStroke}`}><Slider min={0.5} max={4} step={0.25} value={sel.iconStroke} onChange={(v) => api.patch({ __iconStroke: v })} /></Lbl>
        </Section>
      )}

      {fillable && (
        <Section title="Fill">
          <div className="flex gap-1">
            <button className={`${pill} border border-line ${solid ? pillOn : ''}`} onClick={() => api.setGradient(null, sel.fill)}>Solid</button>
            <button className={`${pill} border border-line ${!solid ? pillOn : ''}`} onClick={() => api.setGradient({ from: sel.fill, to: '#8b5cf6', dir }, sel.fill)}>Gradient</button>
          </div>
          {solid ? (
            <Color value={sel.fill} onChange={(v) => api.patch({ fill: v })} />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Color value={sel.gradient!.from} onChange={(v) => api.setGradient({ from: v, to: sel.gradient!.to, dir }, v)} />
                <Color value={sel.gradient!.to} onChange={(v) => api.setGradient({ from: sel.gradient!.from, to: v, dir }, v)} />
              </div>
              <div className="flex gap-1">
                {([['v', 'Down'], ['h', 'Across'], ['d', 'Diagonal']] as const).map(([d, l]) => (
                  <button key={d} className={pill + ' border border-line'} onClick={() => api.setGradient({ ...sel.gradient!, dir: d }, sel.fill)}>{l}</button>
                ))}
              </div>
            </>
          )}
        </Section>
      )}

      {sel.kind !== 'multi' && (
        <Section title={isText ? 'Outline' : 'Border'} open={false}>
          <div className="grid grid-cols-2 gap-2">
            <Lbl text="Color"><Color value={sel.stroke} onChange={(v) => api.patch({ stroke: v, strokeWidth: sel.strokeWidth || 4, ...(isText ? { paintFirst: 'stroke' } : {}) })} /></Lbl>
            <Lbl text="Width"><Num value={sel.strokeWidth} min={0} onChange={(v) => api.patch({ strokeWidth: v, stroke: sel.stroke })} /></Lbl>
          </div>
          {isShape && sel.type === 'rect' && (
            <Lbl text={`Corner radius ${sel.rx}`}><Slider min={0} max={Math.max(50, Math.round(Math.min(sel.w, sel.h) / 2))} step={1} value={sel.rx} onChange={(v) => api.patch({ rx: v, ry: v })} /></Lbl>
          )}
        </Section>
      )}

      <Section title="Shadow" open={false}>
        <button className={`${pill} border border-line ${sel.shadow ? pillOn : ''}`} onClick={() => api.setShadow(sel.shadow ? null : { color: 'rgba(0,0,0,0.35)', blur: 30, x: 0, y: 14 })}>
          {sel.shadow ? 'On' : 'Off'}
        </button>
        {sel.shadow && (
          <>
            <Color value={toHex(sel.shadow.color, '#000000')} onChange={(v) => api.setShadow({ ...sel.shadow!, color: v })} />
            <div className="grid grid-cols-3 gap-2">
              <Lbl text="Blur"><Num value={sel.shadow.blur} min={0} onChange={(v) => api.setShadow({ ...sel.shadow!, blur: v })} /></Lbl>
              <Lbl text="X"><Num value={sel.shadow.x} onChange={(v) => api.setShadow({ ...sel.shadow!, x: v })} /></Lbl>
              <Lbl text="Y"><Num value={sel.shadow.y} onChange={(v) => api.setShadow({ ...sel.shadow!, y: v })} /></Lbl>
            </div>
          </>
        )}
      </Section>

      <Section title="Position & size" open={false}>
        <div className="grid grid-cols-2 gap-2">
          <Lbl text="X"><Num value={sel.x} onChange={(v) => api.patch({ left: v })} /></Lbl>
          <Lbl text="Y"><Num value={sel.y} onChange={(v) => api.patch({ top: v })} /></Lbl>
          <Lbl text="Width"><Num value={sel.w} min={1} onChange={(v) => api.setBox(v, sel.h)} /></Lbl>
          <Lbl text="Height"><Num value={sel.h} min={1} onChange={(v) => api.setBox(sel.w, v)} /></Lbl>
          <Lbl text="Rotate"><Num value={sel.angle} onChange={(v) => api.patch({ angle: v })} /></Lbl>
          <Lbl text={`Opacity ${Math.round(sel.opacity * 100)}%`}><Slider min={0} max={1} step={0.01} value={sel.opacity} onChange={(v) => api.patch({ opacity: v })} /></Lbl>
        </div>
      </Section>

      <Section title="Arrange">
        <div className="grid grid-cols-2 gap-1.5">
          <button className={pill + ' border border-line'} onClick={() => api.order('front')}>To front</button>
          <button className={pill + ' border border-line'} onClick={() => api.order('bottom')}>To back</button>
          <button className={pill + ' border border-line'} onClick={() => api.order('forward')}>Forward</button>
          <button className={pill + ' border border-line'} onClick={() => api.order('back')}>Backward</button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {([['left', 'Left'], ['centerH', 'Center'], ['right', 'Right'], ['top', 'Top'], ['centerV', 'Middle'], ['bottom', 'Bottom']] as const).map(([k, l]) => (
            <button key={k} className={pill + ' border border-line !px-1.5'} onClick={() => api.align(k)}>{l}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button className={pill + ' border border-line'} onClick={() => api.flip('x')}>Flip horizontal</button>
          <button className={pill + ' border border-line'} onClick={() => api.flip('y')}>Flip vertical</button>
          <button className={pill + ' border border-line'} onClick={api.toggleLock}>{sel.locked ? 'Unlock' : 'Lock'}</button>
          {sel.kind === 'multi' && <button className={pill + ' border border-line'} onClick={api.group}>Group</button>}
          {sel.kind === 'group' && <button className={pill + ' border border-line'} onClick={api.ungroup}>Ungroup</button>}
          <button className={pill + ' border border-line'} onClick={api.duplicate}>Duplicate</button>
          <button className={pill + ' border border-line !text-red-600'} onClick={api.remove}>Delete</button>
        </div>
      </Section>
    </div>
  )
}
