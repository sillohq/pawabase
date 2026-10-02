import type { GradientSpec, Role, ShadowSpec, Spec, Template } from './templates'

type P = Record<string, unknown>

const t = (text: string, left: number, top: number, width: number, fontSize: number, p: P = {}): Spec => ({
  type: 'text', text, left, top, width, fontSize, fontFamily: 'Inter', fontWeight: 700, fill: '#111111', ...p,
})
const role = (r: Role, text: string, left: number, top: number, width: number, fontSize: number, p: P = {}): Spec =>
  t(text, left, top, width, fontSize, { role: r, ...p })
const paint = (fill: string | GradientSpec | null): P =>
  fill && typeof fill === 'object' ? { fill: 'rgba(0,0,0,0)', gradient: fill } : { fill: fill ?? 'rgba(0,0,0,0)' }
const r = (left: number, top: number, width: number, height: number, fill: string | GradientSpec | null, p: P = {}): Spec => ({
  type: 'rect', left, top, width, height, ...paint(fill), ...p,
})
const c = (left: number, top: number, radius: number, fill: string | GradientSpec | null, p: P = {}): Spec => ({
  type: 'circle', left, top, radius, ...paint(fill), ...p,
})
const slot = (left: number, top: number, width: number, height: number, fill = '#dcd6cc', p: P = {}): Spec => ({
  type: 'slot', role: 'product-image', left, top, width, height, fill, ...p,
})
const round = (left: number, top: number, size: number, fill = '#dcd6cc', p: P = {}): Spec => ({
  type: 'slot', role: 'product-image', round: true, left, top, width: size, height: size, fill, ...p,
})
const poly = (left: number, top: number, sides: number, radius: number, fill: string, p: P = {}): Spec => ({
  type: 'poly', left, top, sides, radius, fill, ...p,
})
const ic = (name: string, left: number, top: number, size: number, color: string, p: P = {}): Spec => ({
  type: 'icon', name, left, top, size, color, ...p,
})
const grad = (from: string, to: string, dir: GradientSpec['dir'] = 'v'): GradientSpec => ({ from, to, dir })
const shadow = (color = 'rgba(0,0,0,0.25)', blur = 40, x = 0, y = 20): ShadowSpec => ({ color, blur, x, y })

const STORE = (left: number, top: number, width: number, size: number, fill: string, p: P = {}) =>
  role('store-name', 'STORE', left, top, width, size, { fontWeight: 600, charSpacing: 300, fill, ...p })
const TITLE = (left: number, top: number, width: number, size: number, p: P = {}) =>
  role('product-title', 'Product name', left, top, width, size, p)
const PRICE = (left: number, top: number, width: number, size: number, p: P = {}) =>
  role('product-price', '$0.00', left, top, width, size, p)
const CODE = (left: number, top: number, width: number, size: number, p: P = {}) =>
  role('coupon-code', 'CODE', left, top, width, size, { fontFamily: 'Space Grotesk', textAlign: 'center', charSpacing: 180, ...p })
const OFFER = (left: number, top: number, width: number, size: number, p: P = {}) =>
  role('coupon-label', '20% OFF', left, top, width, size, p)

const make = (
  id: string, name: string, group: Template['group'], width: number, height: number,
  background: Template['background'], objects: Spec[],
): Template => ({ id, name, group, width, height, background, objects })

export const MORE_TEMPLATES: Template[] = [
  make('editorial-cover', 'Editorial cover', 'Product', 1080, 1350, '#1a1a1a', [
    slot(0, 0, 1080, 1350, '#2b2b2b'),
    r(0, 700, 1080, 650, grad('rgba(0,0,0,0)', 'rgba(0,0,0,0.85)'), { gradient: grad('rgba(0,0,0,0)', 'rgba(0,0,0,0.88)') }),
    STORE(70, 70, 700, 26, '#ffffff'),
    TITLE(70, 900, 940, 110, { fontFamily: 'Playfair Display', fill: '#ffffff', lineHeight: 1.02 }),
    PRICE(70, 1190, 400, 56, { fontFamily: 'Space Grotesk', fill: '#f5d48a' }),
    r(720, 1180, 290, 84, '#ffffff', { rx: 42, ry: 42 }),
    t('SHOP NOW', 720, 1204, 290, 28, { textAlign: 'center', charSpacing: 120 }),
  ]),
  make('offer-split', 'Bold offer split', 'Sale', 1080, 1080, '#111111', [
    r(0, 0, 540, 1080, '#ff5a36'),
    slot(540, 0, 540, 1080, '#262626'),
    STORE(50, 60, 460, 22, '#111111'),
    OFFER(50, 200, 470, 170, { fontFamily: 'Bebas Neue', fontWeight: 400, fill: '#111111', lineHeight: 0.92 }),
    t('on your next order', 50, 570, 440, 40, { fontFamily: 'Playfair Display', fontWeight: 400, fill: '#fff4ea' }),
    r(50, 880, 440, 100, '#111111'),
    CODE(50, 906, 440, 46, { fill: '#ffffff' }),
  ]),
  make('polaroid', 'Polaroid', 'Product', 1080, 1080, '#e8e2d6', [
    r(190, 90, 700, 880, '#ffffff', { angle: -4, shadow: shadow('rgba(0,0,0,0.22)', 50, 0, 24) }),
    slot(230, 130, 620, 620, '#d9d3c7', { angle: -4 }),
    TITLE(260, 770, 560, 56, { fontFamily: 'Caveat', angle: -4, fill: '#2b2b2b' }),
    PRICE(260, 860, 400, 60, { fontFamily: 'Caveat', angle: -4, fill: '#c2410c' }),
    r(420, 55, 240, 62, 'rgba(250,224,140,0.85)', { angle: -8 }),
  ]),
  make('circle-spot', 'Circle spotlight', 'Product', 1080, 1080, '#f2b8a2', [
    c(140, 140, 400, '#fbe1d6'),
    round(200, 200, 680, '#e8a38a'),
    poly(760, 90, 16, 130, '#111111', { inner: 0.82 }),
    t('NEW', 764, 162, 232, 60, { fontFamily: 'Bebas Neue', fontWeight: 400, fill: '#ffffff', textAlign: 'center' }),
    TITLE(70, 900, 700, 70, { fontFamily: 'DM Serif Display', fontWeight: 400, fill: '#3a1a10' }),
    PRICE(770, 915, 240, 56, { fontFamily: 'Space Grotesk', textAlign: 'right', fill: '#3a1a10' }),
  ]),
  make('price-burst', 'Price burst', 'Sale', 1080, 1080, '#fff3c4', [
    slot(90, 110, 900, 640, '#f0dc8b'),
    poly(640, 540, 24, 200, '#e11d48', { inner: 0.8 }),
    PRICE(710, 705, 260, 76, { fontFamily: 'Bebas Neue', fontWeight: 400, fill: '#ffffff', textAlign: 'center' }),
    t('ONLY', 765, 655, 150, 34, { fontFamily: 'Bebas Neue', fontWeight: 400, fill: '#ffe3e8', textAlign: 'center', charSpacing: 200 }),
    TITLE(90, 800, 640, 78, { fontFamily: 'Anton', fontWeight: 400, fill: '#1a1a1a', lineHeight: 1 }),
    STORE(90, 990, 700, 24, '#7a6414'),
  ]),
  make('minimal-luxe', 'Minimal luxe', 'Product', 1080, 1350, '#f8f5ef', [
    r(40, 40, 1000, 1270, null, { stroke: '#1a1a1a', strokeWidth: 2 }),
    STORE(90, 110, 900, 26, '#1a1a1a', { textAlign: 'center', charSpacing: 700 }),
    slot(290, 220, 500, 640, '#e6dfd2'),
    TITLE(90, 920, 900, 72, { fontFamily: 'Cormorant Garamond', fontWeight: 500, textAlign: 'center', fill: '#1a1a1a' }),
    r(490, 1040, 100, 2, '#1a1a1a'),
    PRICE(90, 1080, 900, 44, { fontFamily: 'Cormorant Garamond', fontWeight: 400, textAlign: 'center', charSpacing: 200 }),
    t('DISCOVER', 90, 1190, 900, 22, { textAlign: 'center', charSpacing: 600, fill: '#6b6459', fontWeight: 500 }),
  ]),
  make('collage-four', 'Photo collage', 'Product', 1080, 1080, '#ffffff', [
    slot(40, 40, 490, 490, '#e9e4da'),
    slot(550, 40, 490, 490, '#dcd6c9'),
    slot(40, 550, 490, 380, '#dcd6c9'),
    slot(550, 550, 490, 380, '#e9e4da'),
    r(0, 940, 1080, 140, '#111111'),
    TITLE(40, 972, 720, 54, { fontFamily: 'Poppins', fill: '#ffffff' }),
    PRICE(760, 972, 280, 54, { fontFamily: 'Space Grotesk', fill: '#7ee0b0', textAlign: 'right' }),
  ]),
  make('countdown-drop', 'Countdown drop', 'Story', 1080, 1920, '#0b0b12', [
    r(0, 0, 1080, 1920, grad('#1b1140', '#0b0b12'), { gradient: grad('#241660', '#0b0b12') }),
    t('DROPS IN', 90, 170, 900, 40, { fontWeight: 600, charSpacing: 600, fill: '#a99cff', textAlign: 'center' }),
    r(120, 260, 200, 200, '#ffffff', { opacity: 0.08, stroke: '#a99cff', strokeWidth: 2 }),
    r(440, 260, 200, 200, '#ffffff', { opacity: 0.08, stroke: '#a99cff', strokeWidth: 2 }),
    r(760, 260, 200, 200, '#ffffff', { opacity: 0.08, stroke: '#a99cff', strokeWidth: 2 }),
    t('02', 120, 305, 200, 110, { fontFamily: 'Space Grotesk', fill: '#ffffff', textAlign: 'center' }),
    t('14', 440, 305, 200, 110, { fontFamily: 'Space Grotesk', fill: '#ffffff', textAlign: 'center' }),
    t('36', 760, 305, 200, 110, { fontFamily: 'Space Grotesk', fill: '#ffffff', textAlign: 'center' }),
    t('HRS      MIN      SEC', 100, 480, 880, 26, { textAlign: 'center', fill: '#8d84c9', charSpacing: 200, fontWeight: 500 }),
    round(190, 640, 700, '#241a55', { shadow: shadow('rgba(120,90,255,0.5)', 120, 0, 0) }),
    TITLE(90, 1420, 900, 92, { fontFamily: 'Unbounded', fill: '#ffffff', textAlign: 'center', lineHeight: 1.05 }),
    PRICE(90, 1660, 900, 70, { fontFamily: 'Space Grotesk', fill: '#a99cff', textAlign: 'center' }),
  ]),
  make('bogo', 'Buy one get one', 'Sale', 1080, 1080, '#ffd60a', [
    t('BUY 1', 60, 60, 960, 250, { fontFamily: 'Anton', fontWeight: 400, lineHeight: 0.95 }),
    t('GET 1', 60, 300, 960, 250, { fontFamily: 'Anton', fontWeight: 400, lineHeight: 0.95, fill: '#ffffff', stroke: '#111111', strokeWidth: 6 }),
    t('FREE', 640, 350, 400, 150, { fontFamily: 'Bangers', fontWeight: 400, fill: '#e11d48', angle: -8 }),
    slot(60, 640, 400, 340, '#e8c400', { round: false }),
    TITLE(500, 660, 520, 64, { fontFamily: 'Oswald', lineHeight: 1.05 }),
    PRICE(500, 850, 520, 80, { fontFamily: 'Anton', fontWeight: 400 }),
  ]),
  make('flash-strip', 'Flash sale strip', 'Banner', 1500, 500, '#111111', [
    r(0, 0, 60, 500, '#f6ff6b'),
    r(1440, 0, 60, 500, '#f6ff6b'),
    t('FLASH SALE', 120, 60, 900, 170, { fontFamily: 'Anton', fontWeight: 400, fill: '#f6ff6b', lineHeight: 1 }),
    OFFER(120, 260, 900, 120, { fontFamily: 'Bebas Neue', fontWeight: 400, fill: '#ffffff' }),
    r(1010, 150, 380, 200, '#f6ff6b'),
    CODE(1010, 200, 380, 58, { fill: '#111111' }),
    t('USE CODE AT CHECKOUT', 1010, 285, 380, 22, { textAlign: 'center', fill: '#111111', fontWeight: 600, charSpacing: 100 }),
  ]),
  make('black-friday', 'Black Friday', 'Sale', 1080, 1350, '#050505', [
    t('BLACK', 60, 90, 960, 300, { fontFamily: 'Anton', fontWeight: 400, fill: '#ffffff', lineHeight: 0.95 }),
    t('FRIDAY', 60, 360, 960, 300, { fontFamily: 'Anton', fontWeight: 400, fill: '#f5c26b', lineHeight: 0.95 }),
    r(60, 720, 960, 3, '#f5c26b'),
    OFFER(60, 760, 960, 190, { fontFamily: 'Bebas Neue', fontWeight: 400, fill: '#ffffff' }),
    t('Everything. One weekend only.', 60, 990, 700, 44, { fontFamily: 'Playfair Display', fontWeight: 400, fill: '#bdb6a8' }),
    r(60, 1130, 520, 110, '#f5c26b'),
    CODE(60, 1156, 520, 54, { fill: '#050505' }),
    STORE(640, 1170, 380, 24, '#f5c26b', { textAlign: 'right' }),
  ]),
  make('summer-sale', 'Summer sale', 'Sale', 1080, 1350, '#ff7a45', [
    r(0, 0, 1080, 1350, grad('#ff9e5e', '#ff4f7b'), { gradient: grad('#ffb24d', '#ff3f7a') }),
    c(590, -140, 380, '#fff1a8', { opacity: 0.9 }),
    t('SUMMER', 70, 260, 940, 210, { fontFamily: 'Bebas Neue', fontWeight: 400, fill: '#ffffff', lineHeight: 0.95 }),
    t('SALE', 70, 440, 940, 330, { fontFamily: 'Abril Fatface', fontWeight: 400, fill: '#3a1030', lineHeight: 0.95 }),
    OFFER(70, 820, 940, 120, { fontFamily: 'Poppins', fontWeight: 800, fill: '#ffffff' }),
    r(70, 1080, 480, 110, '#ffffff', { rx: 55, ry: 55 }),
    CODE(70, 1106, 480, 50, { fill: '#ff3f7a' }),
    STORE(600, 1116, 400, 24, '#ffffff', { textAlign: 'right' }),
  ]),
  make('gift-card', 'Gift card', 'Coupon', 1200, 600, '#0f172a', [
    r(0, 0, 1200, 600, grad('#1e293b', '#0f172a'), { gradient: grad('#312e81', '#0f172a', 'd') }),
    c(760, -200, 360, '#ffffff', { opacity: 0.06 }),
    c(900, 200, 300, '#ffffff', { opacity: 0.05 }),
    STORE(80, 80, 700, 28, '#c7d2fe'),
    t('Gift Card', 80, 150, 800, 130, { fontFamily: 'Playfair Display', fontWeight: 500, fill: '#ffffff' }),
    OFFER(80, 330, 700, 100, { fontFamily: 'Space Grotesk', fill: '#a5b4fc' }),
    r(80, 460, 460, 80, 'rgba(255,255,255,0.1)', { rx: 40, ry: 40, stroke: '#a5b4fc', strokeWidth: 2 }),
    CODE(80, 480, 460, 38, { fill: '#ffffff' }),
    ic('gift', 900, 190, 210, '#c7d2fe', { stroke: 1.5 }),
  ]),
  make('loyalty-card', 'Loyalty stamp card', 'Coupon', 1200, 600, '#fdf6e3', [
    r(30, 30, 1140, 540, null, { stroke: '#7a5a1a', strokeWidth: 4, rx: 30, ry: 30 }),
    STORE(80, 70, 700, 26, '#7a5a1a'),
    t('Buy 9, get the 10th free', 80, 115, 1000, 70, { fontFamily: 'Playfair Display', fill: '#3a2a0a', fontWeight: 600 }),
    ...[0, 1, 2, 3, 4].map((i) => c(90 + i * 210, 250, 70, null, { stroke: '#7a5a1a', strokeWidth: 3, strokeDashArray: [10, 8] })),
    ...[0, 1, 2, 3, 4].map((i) => c(90 + i * 210, 420, 70, i === 4 ? '#7a5a1a' : null, { stroke: '#7a5a1a', strokeWidth: 3, strokeDashArray: i === 4 ? undefined : [10, 8] })),
    t('FREE', 930, 520, 140, 34, { fontFamily: 'Bebas Neue', fontWeight: 400, fill: '#fdf6e3', textAlign: 'center' }),
  ]),
  make('testimonial', 'Testimonial', 'Social', 1080, 1080, '#f4efe7', [
    t('“', 80, 20, 300, 420, { fontFamily: 'Playfair Display', fill: '#d9c9a8', fontWeight: 700 }),
    t('Honestly the best thing I have bought all year. It arrived fast and looks even better in person.', 100, 260, 880, 72, { fontFamily: 'Playfair Display', fontWeight: 500, lineHeight: 1.2, fill: '#1a1a1a' }),
    ...[0, 1, 2, 3, 4].map((i) => ic('star', 100 + i * 70, 690, 60, '#e0a800', { filled: true, stroke: 1 })),
    t('Happy customer', 100, 780, 500, 34, { fontWeight: 600, fill: '#1a1a1a' }),
    r(0, 880, 1080, 200, '#1a1a1a'),
    slot(60, 905, 150, 150, '#3a3a3a'),
    TITLE(240, 925, 560, 46, { fontFamily: 'Poppins', fill: '#ffffff' }),
    PRICE(240, 990, 400, 40, { fontFamily: 'Space Grotesk', fill: '#e0a800' }),
    STORE(700, 995, 320, 20, '#c9c2b4', { textAlign: 'right' }),
  ]),
  make('feature-list', 'Feature list', 'Product', 1080, 1350, '#eef2f7', [
    slot(60, 60, 960, 620, '#d7dde6'),
    TITLE(60, 730, 960, 76, { fontFamily: 'Manrope', fontWeight: 800, fill: '#0f172a' }),
    ...['Made to last for years', 'Ships worldwide in 3 days', '30-day easy returns'].flatMap((line, i) => [
      c(60, 870 + i * 100, 26, '#0f172a'),
      ic('check', 72, 890 + i * 100, 28, '#ffffff', { stroke: 3 }),
      t(line, 140, 878 + i * 100, 800, 40, { fontWeight: 500, fill: '#1e293b' }),
    ]),
    PRICE(60, 1200, 400, 70, { fontFamily: 'Manrope', fontWeight: 800, fill: '#0f172a' }),
    r(680, 1195, 340, 90, '#0f172a', { rx: 45, ry: 45 }),
    t('ORDER NOW', 680, 1220, 340, 28, { textAlign: 'center', fill: '#ffffff', charSpacing: 120 }),
  ]),
  make('new-collection', 'New collection banner', 'Banner', 1500, 500, '#e9e2d3', [
    r(0, 0, 1500, 500, grad('#efe7d6', '#d8cdb5'), { gradient: grad('#f3ecdd', '#d5c9ae', 'h') }),
    slot(950, 0, 550, 500, '#c9bca0'),
    t('NEW COLLECTION', 80, 80, 800, 26, { fontWeight: 600, charSpacing: 500, fill: '#6b5a36' }),
    TITLE(80, 130, 820, 100, { fontFamily: 'Cormorant Garamond', fontWeight: 600, fill: '#2b2313', lineHeight: 1 }),
    PRICE(80, 340, 300, 56, { fontFamily: 'Cormorant Garamond', fill: '#2b2313' }),
    t('Explore', 400, 352, 200, 36, { fontWeight: 500, fill: '#2b2313' }),
    ic('arrow-right', 530, 350, 44, '#2b2313', { stroke: 2 }),
  ]),
  make('quote-dark', 'Quote', 'Social', 1080, 1080, '#111111', [
    r(90, 130, 8, 260, '#f5c26b'),
    t('Good things come to those who shop early.', 140, 130, 820, 100, { fontFamily: 'DM Serif Display', fontWeight: 400, fill: '#ffffff', lineHeight: 1.08 }),
    STORE(140, 900, 800, 28, '#f5c26b'),
    t('— the team', 140, 950, 800, 32, { fontFamily: 'Caveat', fill: '#bdb6a8' }),
  ]),
  make('story-coupon', 'Story coupon', 'Story', 1080, 1920, '#6d28d9', [
    r(0, 0, 1080, 1920, grad('#7c3aed', '#db2777'), { gradient: grad('#6d28d9', '#ec4899', 'd') }),
    STORE(90, 180, 900, 30, '#ede9fe', { textAlign: 'center' }),
    t('A little gift', 90, 260, 900, 150, { fontFamily: 'Pacifico', fontWeight: 400, fill: '#ffffff', textAlign: 'center' }),
    r(90, 600, 900, 780, '#ffffff', { rx: 40, ry: 40, shadow: shadow('rgba(0,0,0,0.3)', 80, 0, 30) }),
    r(120, 990, 840, 4, null, { stroke: '#c4b5fd', strokeWidth: 4, strokeDashArray: [16, 12] }),
    OFFER(120, 680, 840, 200, { fontFamily: 'Bebas Neue', fontWeight: 400, fill: '#6d28d9', textAlign: 'center' }),
    t('on your next order', 120, 900, 840, 44, { fontFamily: 'Playfair Display', fontWeight: 400, fill: '#4c1d95', textAlign: 'center' }),
    t('USE CODE', 120, 1070, 840, 34, { fontWeight: 600, charSpacing: 500, fill: '#7c3aed', textAlign: 'center' }),
    CODE(120, 1140, 840, 100, { fill: '#111111' }),
    t('Tap the link to shop', 90, 1560, 900, 40, { fill: '#ffffff', textAlign: 'center', fontWeight: 500 }),
  ]),
  make('story-minimal', 'Story product', 'Story', 1080, 1920, '#f3ede4', [
    slot(90, 160, 900, 1120, '#ddd3c3', { rx: 450, ry: 450 }),
    STORE(90, 1350, 900, 26, '#7a6a52', { textAlign: 'center', charSpacing: 500 }),
    TITLE(90, 1410, 900, 90, { fontFamily: 'Cormorant Garamond', fontWeight: 600, textAlign: 'center', fill: '#2b2313' }),
    PRICE(90, 1560, 900, 60, { fontFamily: 'Cormorant Garamond', textAlign: 'center' }),
    r(340, 1700, 400, 96, '#2b2313', { rx: 48, ry: 48 }),
    t('SWIPE UP', 340, 1727, 400, 30, { textAlign: 'center', fill: '#f3ede4', charSpacing: 250 }),
  ]),
  make('story-freeship', 'Free shipping story', 'Story', 1080, 1920, '#0f766e', [
    c(-200, 1300, 500, '#14b8a6', { opacity: 0.35 }),
    c(700, -200, 400, '#5eead4', { opacity: 0.25 }),
    ic('truck', 400, 250, 280, '#99f6e4', { stroke: 1.4 }),
    t('FREE', 90, 560, 900, 330, { fontFamily: 'Anton', fontWeight: 400, fill: '#ffffff', textAlign: 'center', lineHeight: 0.95 }),
    t('SHIPPING', 90, 850, 900, 210, { fontFamily: 'Bebas Neue', fontWeight: 400, fill: '#99f6e4', textAlign: 'center', charSpacing: 100 }),
    t('on all orders this week', 90, 1120, 900, 50, { fontFamily: 'Playfair Display', fontWeight: 400, fill: '#ccfbf1', textAlign: 'center' }),
    r(240, 1330, 600, 120, '#ffffff', { rx: 60, ry: 60 }),
    CODE(240, 1360, 600, 56, { fill: '#0f766e' }),
  ]),
  make('thumbnail-promo', 'Promo thumbnail', 'Social', 1600, 900, '#101828', [
    r(0, 0, 1600, 900, grad('#1d2b53', '#101828'), { gradient: grad('#1d4ed8', '#0b1020', 'd') }),
    round(860, 110, 680, '#2a3a6d', { shadow: shadow('rgba(0,0,0,0.5)', 60, 0, 20) }),
    t('NEW', 90, 120, 600, 60, { fontFamily: 'Anton', fontWeight: 400, fill: '#fde047', charSpacing: 200 }),
    TITLE(90, 200, 760, 150, { fontFamily: 'League Spartan', fontWeight: 800, fill: '#ffffff', lineHeight: 1 }),
    r(90, 640, 340, 110, '#fde047', { rx: 14, ry: 14 }),
    PRICE(90, 664, 340, 62, { fontFamily: 'League Spartan', fontWeight: 800, textAlign: 'center' }),
    ic('arrow-right', 460, 650, 100, '#fde047', { stroke: 2.5 }),
  ]),
  make('link-card', 'Link preview card', 'Social', 1200, 630, '#ffffff', [
    slot(680, 0, 520, 630, '#e5e7eb'),
    STORE(60, 60, 560, 24, '#6b7280'),
    TITLE(60, 130, 580, 78, { fontFamily: 'Manrope', fontWeight: 800, fill: '#111827', lineHeight: 1.05 }),
    PRICE(60, 470, 300, 60, { fontFamily: 'Manrope', fontWeight: 800, fill: '#059669' }),
    r(60, 550, 100, 6, '#059669'),
  ]),
  make('coupon-luxe', 'Coupon luxe', 'Coupon', 1200, 600, '#0b0b0b', [
    r(30, 30, 1140, 540, null, { stroke: '#d4af37', strokeWidth: 3 }),
    r(46, 46, 1108, 508, null, { stroke: '#d4af37', strokeWidth: 1 }),
    STORE(90, 90, 1020, 24, '#d4af37', { textAlign: 'center', charSpacing: 700 }),
    OFFER(90, 150, 1020, 190, { fontFamily: 'Playfair Display', fontWeight: 500, fill: '#f4e3ac', textAlign: 'center' }),
    t('— YOUR PRIVATE INVITATION —', 90, 380, 1020, 26, { textAlign: 'center', fill: '#a6892b', charSpacing: 400, fontWeight: 500 }),
    CODE(90, 445, 1020, 56, { fill: '#d4af37', fontFamily: 'Cormorant Garamond', charSpacing: 500 }),
  ]),
  make('coupon-pastel', 'Coupon pastel', 'Coupon', 1200, 600, '#ffe4ec', [
    c(-70, 230, 70, '#ffffff'),
    c(1130, 230, 70, '#ffffff'),
    r(60, 60, 1080, 480, '#ffffff', { rx: 30, ry: 30 }),
    r(830, 100, 4, 400, null, { stroke: '#f9a8c9', strokeWidth: 4, strokeDashArray: [12, 12] }),
    STORE(110, 110, 680, 24, '#db2777'),
    OFFER(110, 190, 690, 150, { fontFamily: 'Fredoka', fontWeight: 700, fill: '#be185d' }),
    t('just for you', 110, 400, 690, 56, { fontFamily: 'Pacifico', fontWeight: 400, fill: '#f472b6' }),
    t('CODE', 860, 190, 280, 26, { textAlign: 'center', fill: '#db2777', charSpacing: 300, fontWeight: 600 }),
    CODE(860, 250, 280, 44, { fill: '#be185d' }),
  ]),
  make('percent-poster', 'Percent poster', 'Sale', 1080, 1350, '#dbeafe', [
    t('%', 300, -120, 900, 1000, { fontFamily: 'Archivo Black', fontWeight: 400, fill: '#93c5fd', opacity: 0.6 }),
    STORE(70, 80, 700, 26, '#1e3a8a'),
    OFFER(70, 300, 940, 160, { fontFamily: 'Archivo Black', fontWeight: 400, fill: '#1e3a8a', lineHeight: 0.95 }),
    t('everything in store', 70, 620, 900, 70, { fontFamily: 'DM Serif Display', fontWeight: 400, fill: '#1e3a8a' }),
    r(70, 1080, 520, 120, '#1e3a8a'),
    CODE(70, 1110, 520, 56, { fill: '#ffffff' }),
    t('Ends soon', 640, 1116, 360, 44, { fontFamily: 'Caveat', fill: '#1e3a8a', textAlign: 'right' }),
  ]),
  make('back-in-stock', 'Back in stock', 'Product', 1080, 1080, '#ecfdf5', [
    slot(540, 0, 540, 1080, '#bbf7d0'),
    r(60, 120, 320, 64, '#065f46', { rx: 32, ry: 32 }),
    t('RESTOCKED', 60, 138, 320, 26, { fill: '#ecfdf5', textAlign: 'center', charSpacing: 250, fontWeight: 600 }),
    t('Back in', 60, 250, 480, 140, { fontFamily: 'DM Serif Display', fontWeight: 400, fill: '#064e3b', lineHeight: 1 }),
    t('stock', 60, 390, 480, 140, { fontFamily: 'DM Serif Display', fontWeight: 400, fill: '#059669', lineHeight: 1 }),
    TITLE(60, 640, 440, 52, { fontFamily: 'Outfit', fill: '#064e3b' }),
    PRICE(60, 860, 440, 66, { fontFamily: 'Outfit', fill: '#064e3b' }),
  ]),
  make('gift-guide', 'Gift guide', 'Product', 1080, 1350, '#fef2f2', [
    t('THE', 70, 80, 400, 40, { fontWeight: 600, charSpacing: 600, fill: '#b91c1c' }),
    t('Gift Guide', 70, 130, 940, 190, { fontFamily: 'Abril Fatface', fontWeight: 400, fill: '#7f1d1d', lineHeight: 1 }),
    slot(70, 400, 560, 720, '#fecaca'),
    t('01', 680, 400, 300, 90, { fontFamily: 'Bebas Neue', fontWeight: 400, fill: '#f87171' }),
    TITLE(680, 500, 330, 56, { fontFamily: 'Lora', fill: '#7f1d1d', lineHeight: 1.1 }),
    PRICE(680, 760, 330, 52, { fontFamily: 'Lora', fill: '#b91c1c' }),
    STORE(70, 1200, 940, 24, '#b91c1c', { textAlign: 'center' }),
  ]),
  make('thank-you-insert', 'Thank-you insert', 'Other', 1200, 600, '#fff7ed', [
    t('Thank you!', 80, 80, 700, 150, { fontFamily: 'Dancing Script', fill: '#c2410c' }),
    t('Your order means the world to a small shop. Here is 10% off your next one.', 80, 260, 620, 40, { fontFamily: 'Lora', fontWeight: 400, fill: '#7c2d12', lineHeight: 1.3 }),
    STORE(80, 500, 620, 24, '#c2410c'),
    r(760, 110, 340, 380, '#ffffff', { rx: 20, ry: 20, stroke: '#fdba74', strokeWidth: 3, strokeDashArray: [14, 10] }),
    t('USE CODE', 760, 170, 340, 26, { textAlign: 'center', fill: '#c2410c', charSpacing: 300, fontWeight: 600 }),
    CODE(760, 260, 340, 50, { fill: '#7c2d12' }),
    OFFER(760, 380, 340, 60, { fontFamily: 'Bebas Neue', fontWeight: 400, fill: '#c2410c', textAlign: 'center' }),
  ]),
  make('popup-event', 'Pop-up event', 'Event', 1080, 1350, '#f5f3ff', [
    r(60, 60, 960, 1230, null, { stroke: '#4c1d95', strokeWidth: 6 }),
    t('POP-UP', 100, 110, 880, 250, { fontFamily: 'Anton', fontWeight: 400, fill: '#4c1d95', textAlign: 'center', lineHeight: 1 }),
    t('SHOP', 100, 330, 880, 250, { fontFamily: 'Anton', fontWeight: 400, fill: '#a78bfa', textAlign: 'center', lineHeight: 1 }),
    STORE(100, 620, 880, 32, '#4c1d95', { textAlign: 'center' }),
    r(100, 720, 880, 4, '#4c1d95'),
    t('SAT · 12 OCT · 10AM – 6PM', 100, 770, 880, 44, { fontFamily: 'Space Grotesk', textAlign: 'center', fill: '#1e1b4b' }),
    t('12 Market Street, Lagos', 100, 850, 880, 38, { fontWeight: 400, textAlign: 'center', fill: '#4c1d95' }),
    r(280, 1000, 520, 110, '#4c1d95', { rx: 55, ry: 55 }),
    t('FREE ENTRY', 280, 1034, 520, 40, { textAlign: 'center', fill: '#ffffff', charSpacing: 250 }),
  ]),
  make('price-list', 'Product menu', 'Product', 1080, 1350, '#1c1917', [
    STORE(80, 90, 920, 26, '#fbbf24', { textAlign: 'center', charSpacing: 600 }),
    t('The Menu', 80, 140, 920, 150, { fontFamily: 'Playfair Display', fontWeight: 600, fill: '#fafaf9', textAlign: 'center' }),
    r(440, 330, 200, 3, '#fbbf24'),
    slot(80, 400, 380, 500, '#292524'),
    TITLE(510, 410, 490, 60, { fontFamily: 'Lora', fill: '#fafaf9' }),
    PRICE(510, 560, 490, 56, { fontFamily: 'Space Grotesk', fill: '#fbbf24' }),
    r(510, 660, 490, 2, null, { stroke: '#57534e', strokeWidth: 2, strokeDashArray: [8, 8] }),
    t('Small batch. Made fresh.', 510, 700, 490, 36, { fontFamily: 'Caveat', fontWeight: 400, fill: '#d6d3d1', lineHeight: 1.2 }),
    OFFER(80, 1000, 920, 120, { fontFamily: 'Bebas Neue', fontWeight: 400, fill: '#fbbf24', textAlign: 'center' }),
    CODE(80, 1150, 920, 46, { fill: '#fafaf9' }),
  ]),
]
