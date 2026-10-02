import { Circle, Ellipse, Group, Line, Path, Polygon, Polyline, Rect } from 'fabric'
import type { Obj } from './build'

export type IconNode = [string, Record<string, string>][]

let library: Record<string, IconNode> | null = null
let loading: Promise<Record<string, IconNode>> | null = null

/** The full Lucide set (2,000+ line icons), fetched as its own chunk the first time it is needed. */
export function loadIcons(): Promise<Record<string, IconNode>> {
  loading ??= import('lucide').then((m) => {
    library = m.icons as unknown as Record<string, IconNode>
    return library
  })
  return loading
}

export const iconLibrary = () => library
export const kebab = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Za-z])([0-9])/g, '$1-$2').toLowerCase()

/** Lucide ships PascalCase names; templates and pickers speak kebab-case. */
export function findIcon(name: string): IconNode | null {
  if (!library) return null
  const wanted = name.toLowerCase()
  const key = Object.keys(library).find((k) => kebab(k) === wanted || k.toLowerCase() === wanted)
  return key ? library[key] : null
}

export const POPULAR = [
  'gift', 'tag', 'tags', 'badge-percent', 'percent', 'shopping-bag', 'shopping-cart', 'store', 'truck', 'package', 'box', 'star', 'heart',
  'flame', 'zap', 'sparkles', 'crown', 'gem', 'award', 'badge-check', 'check', 'circle-check', 'x', 'plus', 'arrow-right', 'arrow-up-right',
  'arrow-down', 'clock', 'timer', 'calendar', 'map-pin', 'phone', 'mail', 'globe', 'instagram', 'facebook', 'twitter', 'youtube', 'linkedin',
  'music', 'camera', 'image', 'coffee', 'cake', 'leaf', 'sun', 'moon', 'snowflake', 'umbrella', 'shield-check', 'lock', 'credit-card',
  'wallet', 'banknote', 'receipt', 'ticket', 'party-popper', 'smile', 'thumbs-up', 'megaphone', 'bell', 'bookmark', 'scissors', 'shirt',
  'watch', 'glasses', 'headphones', 'gamepad-2', 'rocket', 'trophy', 'medal', 'target', 'wand-sparkles', 'rotate-ccw', 'refresh-cw', 'quote',
  'hand-heart', 'gift-card', 'percent', 'sprout', 'flower-2', 'palette', 'brush', 'pen-tool', 'ruler', 'hammer', 'wrench', 'lightbulb',
  'eye', 'search', 'link', 'share-2', 'download', 'upload', 'mouse-pointer-click', 'hand', 'baby', 'dog', 'cat', 'fish', 'apple', 'pizza',
  'utensils', 'wine', 'beer', 'ice-cream-cone', 'cookie', 'candy', 'egg', 'carrot', 'cherry', 'banana', 'wheat', 'bike', 'car', 'plane',
  'ship', 'tent', 'mountain', 'tree-pine', 'cloud', 'cloud-rain', 'rainbow', 'wind', 'droplet', 'flag', 'megaphone', 'newspaper', 'book-open',
  'graduation-cap', 'briefcase', 'building-2', 'house', 'key', 'bed', 'sofa', 'lamp', 'bath', 'dumbbell', 'activity', 'stethoscope', 'pill',
]

/**
 * A Lucide icon as real Fabric objects, grouped.
 *
 * Built from the icon's path data rather than loaded as an SVG image, so it is
 * synchronous, recolourable, sharp at any size and stored in the design as plain
 * JSON. Every part is centre-origin so positions match the 24×24 source grid.
 */
export function buildIcon(name: string, size = 240, color = '#111111', stroke = 2, filled = false): Obj {
  const node = findIcon(name)
  const style = {
    fill: filled ? color : 'rgba(0,0,0,0)',
    stroke: color,
    strokeWidth: stroke,
    strokeLineCap: 'round' as const,
    strokeLineJoin: 'round' as const,
    originX: 'center' as const,
    originY: 'center' as const,
    objectCaching: false,
  }
  const num = (a: Record<string, string>, k: string) => parseFloat(a[k] ?? '0')
  const parts: Obj[] = []
  for (const [tag, a] of node ?? []) {
    let part: unknown = null
    if (tag === 'path') part = new Path(a.d, style)
    else if (tag === 'circle') part = new Circle({ ...style, left: num(a, 'cx'), top: num(a, 'cy'), radius: num(a, 'r') })
    else if (tag === 'ellipse') part = new Ellipse({ ...style, left: num(a, 'cx'), top: num(a, 'cy'), rx: num(a, 'rx'), ry: num(a, 'ry') })
    else if (tag === 'rect') {
      part = new Rect({ ...style, left: num(a, 'x') + num(a, 'width') / 2, top: num(a, 'y') + num(a, 'height') / 2, width: num(a, 'width'), height: num(a, 'height'), rx: num(a, 'rx'), ry: num(a, 'ry') || num(a, 'rx') })
    } else if (tag === 'line') part = new Line([num(a, 'x1'), num(a, 'y1'), num(a, 'x2'), num(a, 'y2')], style)
    else if (tag === 'polyline' || tag === 'polygon') {
      const points = (a.points ?? '').trim().split(/[\s,]+/).map(Number)
      const pts = []
      for (let i = 0; i + 1 < points.length; i += 2) pts.push({ x: points[i], y: points[i + 1] })
      part = tag === 'polygon' ? new Polygon(pts, style) : new Polyline(pts, style)
    }
    if (part) parts.push(part as Obj)
  }
  const group = new Group(parts, { name: `icon:${name}`, subTargetCheck: false } as never) as unknown as Obj & { scale: (n: number) => void }
  group.scale(size / 24)
  return group
}

export const isIcon = (obj: { name?: string; type?: string } | undefined) =>
  Boolean(obj && obj.type === 'group' && String(obj.name ?? '').startsWith('icon:'))
