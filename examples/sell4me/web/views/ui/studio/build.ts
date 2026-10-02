import {
  Canvas,
  Circle,
  FabricImage,
  FabricObject,
  Gradient,
  Polygon,
  Rect,
  Shadow,
  StaticCanvas,
  Textbox,
  Triangle,
} from 'fabric'
import { buildIcon, loadIcons } from './icons'
import type { GradientSpec, ShadowSpec, Spec, Template } from './templates'

export type Obj = FabricObject & { role?: string; name?: string }

/** Properties Fabric does not know about, kept through save and load. */
export const KEEP = ['role', 'name', 'locked']

export type ProductInfo = { title: string; image_url: string | null; price: string; compare_at: string | null }
export type CouponInfo = { code: string; label: string }

export function gradientFill(spec: GradientSpec): Gradient<'linear'> {
  const dir = spec.dir ?? 'v'
  return new Gradient({
    type: 'linear',
    gradientUnits: 'percentage',
    coords: { x1: 0, y1: 0, x2: dir === 'v' ? 0 : 1, y2: dir === 'h' ? 0 : 1 },
    colorStops: [
      { offset: 0, color: spec.from },
      { offset: 1, color: spec.to },
    ],
  })
}

export function regularPolygon(sides: number, radius: number, inner?: number) {
  const points: { x: number; y: number }[] = []
  const count = inner ? sides * 2 : sides
  for (let i = 0; i < count; i++) {
    const rad = inner && i % 2 ? radius * inner : radius
    const angle = (Math.PI * 2 * i) / count - Math.PI / 2
    points.push({ x: radius + rad * Math.cos(angle), y: radius + rad * Math.sin(angle) })
  }
  return points
}

export function buildObject(spec: Spec): Obj {
  const { type, text, gradient, shadow, round, sides, radius, inner, name, size, color, stroke, filled, ...props } = spec as Spec & {
    text?: string
    size?: number
    color?: string
    stroke?: number
    filled?: boolean
    gradient?: GradientSpec
    shadow?: ShadowSpec
    round?: boolean
    sides?: number
    radius?: number
    inner?: number
  }
  const common = { originX: 'left', originY: 'top', ...props } as Record<string, unknown>
  let obj: Obj
  switch (type) {
    case 'rect':
      obj = new Rect(common) as Obj
      break
    case 'circle':
      obj = new Circle({ ...common, radius }) as Obj
      break
    case 'poly':
      obj = new Polygon(regularPolygon(sides ?? 6, radius ?? 100, inner), common) as Obj
      break
    case 'slot':
      obj = (round
        ? new Circle({ ...common, radius: (Number(props.width) || 200) / 2, width: undefined, height: undefined, name: 'Product image' })
        : new Rect({ ...common, name: 'Product image' })) as Obj
      break
    case 'icon': {
      obj = buildIcon(String(name ?? 'star'), size ?? 120, color ?? '#111111', stroke ?? 2, Boolean(filled))
      obj.set({ originX: 'left', originY: 'top', left: Number(props.left) || 0, top: Number(props.top) || 0, angle: Number(props.angle) || 0, opacity: props.opacity === undefined ? 1 : Number(props.opacity) } as never)
      return obj
    }
    default:
      obj = new Textbox(text ?? '', common) as Obj
  }
  if (name && type !== 'slot') obj.set('name', name as never)
  if (gradient) obj.set('fill', gradientFill(gradient))
  if (shadow) obj.set('shadow', new Shadow(shadow))
  return obj
}

export function setBackground(canvas: Canvas | StaticCanvas, bg: Template['background'], height: number) {
  if (typeof bg === 'string') {
    canvas.backgroundColor = bg
    return
  }
  canvas.backgroundColor = new Gradient({
    type: 'linear',
    gradientUnits: 'pixels',
    coords: { x1: 0, y1: 0, x2: 0, y2: height },
    colorStops: [
      { offset: 0, color: bg.from },
      { offset: 1, color: bg.to },
    ],
  })
}

/** Fit an image into a box the way `object-fit: cover` does, by cropping. */
export function cover(image: FabricImage, left: number, top: number, w: number, h: number) {
  const iw = image.width
  const ih = image.height
  const scale = Math.max(w / iw, h / ih)
  const sw = w / scale
  const sh = h / scale
  image.set({ originX: 'left', originY: 'top', left, top, cropX: (iw - sw) / 2, cropY: (ih - sh) / 2, width: sw, height: sh, scaleX: scale, scaleY: scale })
}

export async function loadImage(url: string): Promise<FabricImage> {
  const timeout = new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('timeout')), 12000))
  return Promise.race([FabricImage.fromURL(url, { crossOrigin: 'anonymous' }), timeout])
}

/** Put a picture into an existing frame or placeholder, keeping its box, role and stacking. */
export async function fillSlot(canvas: Canvas, target: Obj, url: string) {
  const image = await loadImage(url)
  cover(image, target.left, target.top, target.getScaledWidth(), target.getScaledHeight())
  Object.assign(image, { role: target.role, name: target.name || 'Image' })
  const scale = image.scaleX || 1
  if (target.type === 'circle') {
    image.clipPath = new Circle({ radius: image.width / 2, originX: 'center', originY: 'center', left: 0, top: 0 })
  } else if (target.type === 'rect' && (target as unknown as { rx: number }).rx) {
    const rx = (target as unknown as { rx: number }).rx / scale
    image.clipPath = new Rect({ width: image.width, height: image.height, rx, ry: rx, originX: 'center', originY: 'center', left: 0, top: 0 })
  }
  image.set({ angle: target.angle || 0 })
  const index = canvas.getObjects().indexOf(target)
  canvas.remove(target)
  canvas.insertAt(index < 0 ? canvas.getObjects().length : index, image)
  canvas.requestRenderAll()
  return image as unknown as Obj
}

export async function applyProduct(canvas: Canvas, product: ProductInfo) {
  for (const obj of canvas.getObjects() as Obj[]) {
    if (obj.role === 'product-title') (obj as Textbox).set('text', product.title)
    else if (obj.role === 'product-price') (obj as Textbox).set('text', product.price)
    else if (obj.role === 'product-compare') {
      ;(obj as Textbox).set('text', product.compare_at ?? '')
      obj.set('visible', Boolean(product.compare_at))
    }
  }
  canvas.requestRenderAll()
  if (product.image_url) {
    for (const obj of canvas.getObjects() as Obj[]) {
      if (obj.role !== 'product-image') continue
      try {
        await fillSlot(canvas, obj, product.image_url)
      } catch {
        // An unreachable picture leaves the frame as it was; the text is already filled.
      }
    }
  }
}

export function applyCoupon(canvas: Canvas, coupon: CouponInfo) {
  for (const obj of canvas.getObjects() as Obj[]) {
    if (obj.role === 'coupon-code') (obj as Textbox).set('text', coupon.code)
    else if (obj.role === 'coupon-label') (obj as Textbox).set('text', coupon.label)
  }
  canvas.requestRenderAll()
}

export function applyStoreName(canvas: Canvas, name: string) {
  for (const obj of canvas.getObjects() as Obj[]) {
    if (obj.role === 'store-name') (obj as Textbox).set('text', name.toUpperCase())
  }
}

export async function renderTemplate(target: Canvas | StaticCanvas, template: Template) {
  if (template.objects.some((o) => o.type === 'icon')) await loadIcons()
  target.clear()
  setBackground(target, template.background, template.height)
  for (const spec of template.objects) target.add(buildObject(spec))
  target.requestRenderAll()
}

export function shape(kind: 'rect' | 'rounded' | 'circle' | 'triangle' | 'star' | 'line', accent = '#111111'): Obj {
  const base = { originX: 'left' as const, originY: 'top' as const, left: 200, top: 200, fill: accent }
  switch (kind) {
    case 'rounded':
      return new Rect({ ...base, width: 360, height: 240, rx: 32, ry: 32 }) as Obj
    case 'circle':
      return new Circle({ ...base, radius: 140 }) as Obj
    case 'triangle':
      return new Triangle({ ...base, width: 280, height: 260 }) as Obj
    case 'line':
      return new Rect({ ...base, width: 400, height: 8 }) as Obj
    case 'star': {
      const points = Array.from({ length: 10 }, (_, i) => {
        const r = i % 2 ? 60 : 140
        const a = (Math.PI / 5) * i - Math.PI / 2
        return { x: 140 + r * Math.cos(a), y: 140 + r * Math.sin(a) }
      })
      return new Polygon(points, base) as Obj
    }
    default:
      return new Rect({ ...base, width: 360, height: 240 }) as Obj
  }
}

export function textBlock(value: string, props: Record<string, unknown> = {}): Obj {
  return new Textbox(value, {
    originX: 'left',
    originY: 'top',
    left: 120,
    top: 160,
    width: 600,
    fontFamily: 'Inter',
    fontWeight: 700,
    fontSize: 72,
    fill: '#111111',
    ...props,
  }) as Obj
}

/** Shrink an uploaded photo before it is embedded, so a design stays small enough to save. */
export function downscale(file: File, max = 1400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('decode'))
      img.onload = () => {
        const ratio = Math.min(1, max / Math.max(img.width, img.height))
        const c = document.createElement('canvas')
        c.width = Math.round(img.width * ratio)
        c.height = Math.round(img.height * ratio)
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
        resolve(c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.86))
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

export function toHex(value: unknown, fallback = '#000000'): string {
  if (typeof value !== 'string') return fallback
  if (/^#[0-9a-f]{6}$/i.test(value)) return value
  if (/^#[0-9a-f]{3}$/i.test(value)) return '#' + value.slice(1).split('').map((c) => c + c).join('')
  const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (m) return '#' + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('')
  return fallback
}

