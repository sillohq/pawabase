import { Circle, Group, Line, Path, Polygon, Rect, Textbox } from 'fabric'
import { regularPolygon, textBlock, type Obj } from './build'
import { buildIcon } from './icons'

type Item = { key: string; label: string; make: () => Obj }

const origin = { originX: 'left' as const, originY: 'top' as const }
const path = (d: string, fill: string, extra: Record<string, unknown> = {}) =>
  new Path(d, { ...origin, left: 200, top: 200, fill, ...extra }) as unknown as Obj
const poly = (sides: number, radius: number, fill: string, inner?: number) =>
  new Polygon(regularPolygon(sides, radius, inner), { ...origin, left: 200, top: 200, fill }) as unknown as Obj
const label = (text: string, width: number, top: number, size: number, fill: string, extra: Record<string, unknown> = {}) =>
  new Textbox(text, {
    ...origin, left: 0, top, width, fontSize: size, fill, fontFamily: 'Inter', fontWeight: 800, textAlign: 'center', ...extra,
  })
const withOrigin = (obj: Obj, left: number, top: number): Obj => {
  obj.set({ originX: 'left', originY: 'top', left, top } as never)
  return obj
}
const badge = (parts: Obj[]) => new Group(parts, { ...origin, left: 200, top: 200 }) as unknown as Obj

export const SHAPES: Item[] = [
  { key: 'box', label: 'Box', make: () => new Rect({ ...origin, left: 200, top: 200, width: 360, height: 240, fill: '#111111' }) as unknown as Obj },
  { key: 'rounded', label: 'Rounded', make: () => new Rect({ ...origin, left: 200, top: 200, width: 360, height: 240, rx: 36, ry: 36, fill: '#111111' }) as unknown as Obj },
  { key: 'pill', label: 'Pill', make: () => new Rect({ ...origin, left: 200, top: 200, width: 360, height: 100, rx: 50, ry: 50, fill: '#111111' }) as unknown as Obj },
  { key: 'circle', label: 'Circle', make: () => new Circle({ ...origin, left: 200, top: 200, radius: 140, fill: '#111111' }) as unknown as Obj },
  { key: 'ring', label: 'Ring', make: () => new Circle({ ...origin, left: 200, top: 200, radius: 140, fill: 'rgba(0,0,0,0)', stroke: '#111111', strokeWidth: 16 }) as unknown as Obj },
  { key: 'triangle', label: 'Triangle', make: () => poly(3, 150, '#111111') },
  { key: 'diamond', label: 'Diamond', make: () => poly(4, 150, '#111111') },
  { key: 'pentagon', label: 'Pentagon', make: () => poly(5, 150, '#111111') },
  { key: 'hexagon', label: 'Hexagon', make: () => poly(6, 150, '#111111') },
  { key: 'star', label: 'Star', make: () => poly(5, 150, '#111111', 0.45) },
  { key: 'burst', label: 'Burst', make: () => poly(16, 160, '#111111', 0.82) },
  { key: 'heart', label: 'Heart', make: () => path('M 140 250 C -60 100 50 -30 140 65 C 230 -30 340 100 140 250 z', '#e11d48') },
  { key: 'arrow', label: 'Arrow', make: () => path('M 0 60 L 200 60 L 200 10 L 320 100 L 200 190 L 200 140 L 0 140 z', '#111111') },
  { key: 'bolt', label: 'Bolt', make: () => path('M 120 0 L 10 150 H 95 L 60 280 L 190 110 H 105 z', '#facc15') },
  { key: 'bubble', label: 'Bubble', make: () => path('M 30 0 H 270 Q 300 0 300 30 V 150 Q 300 180 270 180 H 130 L 60 240 L 75 180 H 30 Q 0 180 0 150 V 30 Q 0 0 30 0 z', '#111111') },
  { key: 'cross', label: 'Plus', make: () => path('M 80 0 H 160 V 80 H 240 V 160 H 160 V 240 H 80 V 160 H 0 V 80 H 80 z', '#111111') },
  { key: 'ribbon', label: 'Ribbon', make: () => new Polygon([{ x: 0, y: 0 }, { x: 380, y: 0 }, { x: 340, y: 55 }, { x: 380, y: 110 }, { x: 0, y: 110 }, { x: 40, y: 55 }], { ...origin, left: 200, top: 200, fill: '#111111' }) as unknown as Obj },
  { key: 'wave', label: 'Wave', make: () => path('M 0 60 Q 60 0 120 60 T 240 60 T 360 60 T 480 60 V 140 H 0 z', '#111111') },
]

export const LINES: Item[] = [
  { key: 'solid', label: 'Line', make: () => new Line([0, 0, 420, 0], { ...origin, left: 200, top: 200, stroke: '#111111', strokeWidth: 6 }) as unknown as Obj },
  { key: 'thick', label: 'Thick', make: () => new Line([0, 0, 420, 0], { ...origin, left: 200, top: 200, stroke: '#111111', strokeWidth: 20 }) as unknown as Obj },
  { key: 'dashed', label: 'Dashed', make: () => new Line([0, 0, 420, 0], { ...origin, left: 200, top: 200, stroke: '#111111', strokeWidth: 6, strokeDashArray: [24, 16] }) as unknown as Obj },
  { key: 'dotted', label: 'Dotted', make: () => new Line([0, 0, 420, 0], { ...origin, left: 200, top: 200, stroke: '#111111', strokeWidth: 10, strokeDashArray: [1, 18], strokeLineCap: 'round' }) as unknown as Obj },
]

export const BADGES: Item[] = [
  {
    key: 'sale',
    label: 'Sale',
    make: () =>
      badge([
        new Circle({ ...origin, left: 0, top: 0, radius: 110, fill: '#e11d48' }) as unknown as Obj,
        label('SALE', 220, 70, 76, '#ffffff', { fontFamily: 'Bebas Neue', fontWeight: 400 }) as unknown as Obj,
      ]),
  },
  {
    key: 'pct',
    label: '% Off burst',
    make: () =>
      badge([
        new Polygon(regularPolygon(18, 130, 0.82), { ...origin, left: 0, top: 0, fill: '#facc15' }) as unknown as Obj,
        label('50%\nOFF', 260, 70, 70, '#111111', { fontFamily: 'Anton', fontWeight: 400, lineHeight: 0.95 }) as unknown as Obj,
      ]),
  },
  {
    key: 'new',
    label: 'New tag',
    make: () =>
      badge([
        new Rect({ ...origin, left: 0, top: 0, width: 200, height: 76, rx: 38, ry: 38, fill: '#111111' }) as unknown as Obj,
        label('NEW', 200, 18, 40, '#ffffff', { charSpacing: 200 }) as unknown as Obj,
      ]),
  },
  {
    key: 'ship',
    label: 'Free shipping',
    make: () =>
      badge([
        new Polygon([{ x: 0, y: 0 }, { x: 420, y: 0 }, { x: 380, y: 50 }, { x: 420, y: 100 }, { x: 0, y: 100 }, { x: 40, y: 50 }], { ...origin, left: 0, top: 0, fill: '#0f766e' }) as unknown as Obj,
        label('FREE SHIPPING', 420, 30, 38, '#ffffff', { charSpacing: 120 }) as unknown as Obj,
      ]),
  },
  {
    key: 'best',
    label: 'Best seller',
    make: () =>
      badge([
        new Rect({ ...origin, left: 0, top: 0, width: 400, height: 84, fill: '#d4af37' }) as unknown as Obj,
        withOrigin(buildIcon('star', 38, '#1a1408', 1.5, true), 30, 23),
        label('BEST SELLER', 400, 24, 34, '#1a1408', { charSpacing: 120, left: 40 }) as unknown as Obj,
      ]),
  },
  {
    key: 'limited',
    label: 'Limited',
    make: () =>
      badge([
        new Rect({ ...origin, left: 0, top: 0, width: 340, height: 90, fill: 'rgba(0,0,0,0)', stroke: '#111111', strokeWidth: 5, strokeDashArray: [16, 10] }) as unknown as Obj,
        label('LIMITED', 340, 24, 40, '#111111', { charSpacing: 250 }) as unknown as Obj,
      ]),
  },
  {
    key: 'hot',
    label: 'Hot',
    make: () =>
      badge([
        new Circle({ ...origin, left: 0, top: 0, radius: 80, fill: '#f97316' }) as unknown as Obj,
        withOrigin(buildIcon('flame', 96, '#ffffff', 1.6, true), 32, 30),
      ]),
  },
  {
    key: 'rating',
    label: '5 stars',
    make: () =>
      new Group(
        [0, 1, 2, 3, 4].map((i) => withOrigin(buildIcon('star', 84, '#f59e0b', 1, true), i * 96, 0)),
        { ...origin, left: 200, top: 200, name: 'rating' } as never,
      ) as unknown as Obj,
  },
]

export const FRAMES: Item[] = [
  { key: 'frame-square', label: 'Square frame', make: () => frame(500, 500) },
  { key: 'frame-portrait', label: 'Portrait frame', make: () => frame(440, 580) },
  { key: 'frame-wide', label: 'Wide frame', make: () => frame(720, 420) },
  { key: 'frame-round', label: 'Round frame', make: () => frame(460, 460, true) },
  { key: 'frame-arch', label: 'Arch frame', make: () => frame(440, 580, false, 220) },
]

function frame(w: number, h: number, round = false, rx = 0): Obj {
  const shared = { ...origin, left: 200, top: 200, fill: '#d9d4cc', role: 'product-image', name: 'Product image' }
  return (round
    ? new Circle({ ...shared, radius: w / 2 })
    : new Rect({ ...shared, width: w, height: h, rx, ry: rx })) as unknown as Obj
}

export const TEXT_STYLES: { key: string; label: string; sample: string; make: () => Obj; css: React.CSSProperties }[] = [
  { key: 'h1', label: 'Heading', sample: 'Add a heading', css: { fontWeight: 800, fontSize: 22 }, make: () => textBlock('Add a heading') },
  { key: 'h2', label: 'Subheading', sample: 'Add a subheading', css: { fontWeight: 600, fontSize: 16 }, make: () => textBlock('Add a subheading', { fontSize: 46, fontWeight: 600 }) },
  { key: 'body', label: 'Body', sample: 'A little body text', css: { fontSize: 13 }, make: () => textBlock('Add a little body text', { fontSize: 30, fontWeight: 400 }) },
  { key: 'caps', label: 'Spaced caps', sample: 'SPACED CAPS', css: { letterSpacing: 4, fontSize: 12, fontWeight: 600 }, make: () => textBlock('SPACED CAPS', { fontSize: 30, fontWeight: 600, charSpacing: 500 }) },
  { key: 'outline', label: 'Outline', sample: 'OUTLINE', css: { fontWeight: 800, fontSize: 22, WebkitTextFillColor: 'transparent', WebkitTextStroke: '1px #111' }, make: () => textBlock('OUTLINE', { fontFamily: 'Anton', fontWeight: 400, fontSize: 220, fill: 'rgba(0,0,0,0)', stroke: '#111111', strokeWidth: 4, paintFirst: 'stroke' }) },
  { key: 'highlight', label: 'Highlight', sample: 'Highlighted', css: { background: '#fde047', padding: '0 4px', fontWeight: 700 }, make: () => textBlock('Highlighted', { fontSize: 80, backgroundColor: '#fde047', width: 520 }) },
  { key: 'shadow', label: 'Shadow', sample: 'Shadowed', css: { textShadow: '2px 2px 0 #aaa', fontWeight: 800, fontSize: 20 }, make: () => textBlock('Shadowed', { fontSize: 120, shadow: { color: 'rgba(0,0,0,0.35)', blur: 0, offsetX: 8, offsetY: 8 } as never }) },
  { key: 'big', label: 'Big number', sample: '50%', css: { fontWeight: 800, fontSize: 30 }, make: () => textBlock('50%', { fontFamily: 'Archivo Black', fontWeight: 400, fontSize: 320, width: 700 }) },
  { key: 'price', label: 'Was / now', sample: '$40  $60', css: { fontWeight: 700, fontSize: 15 }, make: () => textBlock('$40  $60', { fontFamily: 'Space Grotesk', fontSize: 100, width: 600 }) },
  { key: 'script', label: 'Handwritten', sample: 'Handwritten', css: { fontFamily: 'Caveat', fontSize: 22 }, make: () => textBlock('Handwritten note', { fontFamily: 'Caveat', fontSize: 110 }) },
]

export const PAIRINGS: { name: string; head: string; sub: string; headWeight?: number }[] = [
  { name: 'Editorial', head: 'Playfair Display', sub: 'Inter' },
  { name: 'Poster', head: 'Bebas Neue', sub: 'Poppins', headWeight: 400 },
  { name: 'Classic', head: 'Abril Fatface', sub: 'Lato', headWeight: 400 },
  { name: 'Modern', head: 'Syne', sub: 'DM Sans' },
  { name: 'Playful', head: 'Pacifico', sub: 'Nunito', headWeight: 400 },
  { name: 'Punchy', head: 'Anton', sub: 'Roboto', headWeight: 400 },
  { name: 'Refined', head: 'Cormorant Garamond', sub: 'Montserrat' },
  { name: 'Tech', head: 'Unbounded', sub: 'JetBrains Mono' },
]
