/**
 * Design templates.
 *
 * A template is plain data: a canvas size, a background and a list of object
 * specs. Specs marked with a `role` are the parts the studio fills from a
 * product or a coupon (`product-image`, `product-title`, `product-price`,
 * `product-compare`, `coupon-code`, `coupon-label`, `store-name`), so picking a
 * different product rewrites the design without touching its layout.
 */

export type Role =
  | 'product-image'
  | 'product-title'
  | 'product-price'
  | 'product-compare'
  | 'coupon-code'
  | 'coupon-label'
  | 'store-name'

export type Spec = {
  type: 'rect' | 'circle' | 'text' | 'slot' | 'poly' | 'icon'
  role?: Role
  name?: string
  [key: string]: unknown
}

export type Template = {
  id: string
  name: string
  group: 'Product' | 'Sale' | 'Coupon' | 'Story' | 'Banner' | 'Social' | 'Event' | 'Other'
  width: number
  height: number
  background: string | { from: string; to: string }
  objects: Spec[]
}

export type ShadowSpec = { color: string; blur: number; x: number; y: number }
export type GradientSpec = { from: string; to: string; dir?: 'v' | 'h' | 'd' }

const rect = (props: Record<string, unknown>): Spec => ({ type: 'rect', ...props })
const circle = (props: Record<string, unknown>): Spec => ({ type: 'circle', ...props })
const slot = (props: Record<string, unknown>): Spec => ({ type: 'slot', role: 'product-image', ...props })
const text = (t: string, props: Record<string, unknown>): Spec => ({
  type: 'text',
  text: t,
  fontFamily: 'Inter',
  fontWeight: 700,
  fill: '#111111',
  ...props,
})

const SLOT_FILL = '#d9d4cc'

export const BASE_TEMPLATES: Template[] = [
  {
    id: 'spotlight',
    name: 'Product spotlight',
    group: 'Product',
    width: 1080,
    height: 1350,
    background: '#f4efe7',
    objects: [
      slot({ left: 80, top: 80, width: 920, height: 800, fill: SLOT_FILL }),
      text('STORE', { role: 'store-name', left: 80, top: 930, width: 500, fontSize: 28, fontWeight: 600, charSpacing: 300, fill: '#6b6459' }),
      text('Product name', { role: 'product-title', left: 80, top: 980, width: 920, fontSize: 84, fontFamily: 'Playfair Display', lineHeight: 1.05 }),
      text('$0.00', { role: 'product-price', left: 80, top: 1170, width: 400, fontSize: 64, fontFamily: 'Space Grotesk' }),
      rect({ left: 700, top: 1160, width: 300, height: 92, fill: '#111111', rx: 46, ry: 46 }),
      text('SHOP NOW', { left: 700, top: 1187, width: 300, fontSize: 30, fill: '#ffffff', textAlign: 'center', charSpacing: 120 }),
    ],
  },
  {
    id: 'sale-poster',
    name: 'Big sale poster',
    group: 'Sale',
    width: 1080,
    height: 1350,
    background: '#ff4d2e',
    objects: [
      text('SALE', { left: 60, top: 60, width: 960, fontSize: 420, fontFamily: 'Bebas Neue', fontWeight: 400, fill: '#fff6ea', lineHeight: 0.9 }),
      text('UP TO 50% OFF', { role: 'coupon-label', left: 70, top: 470, width: 940, fontSize: 130, fontFamily: 'Bebas Neue', fontWeight: 400, fill: '#111111' }),
      slot({ left: 70, top: 660, width: 460, height: 560, fill: '#ffb8a8' }),
      text('Product name', { role: 'product-title', left: 570, top: 680, width: 440, fontSize: 64, fontFamily: 'Oswald', fill: '#fff6ea', lineHeight: 1.05 }),
      text('$0.00', { role: 'product-price', left: 570, top: 900, width: 440, fontSize: 90, fontFamily: 'Bebas Neue', fontWeight: 400, fill: '#111111' }),
      rect({ left: 570, top: 1060, width: 440, height: 110, fill: '#111111' }),
      text('CODE', { role: 'coupon-code', left: 570, top: 1085, width: 440, fontSize: 52, fontFamily: 'Space Grotesk', fill: '#fff6ea', textAlign: 'center', charSpacing: 200 }),
    ],
  },
  {
    id: 'new-arrival',
    name: 'New arrival',
    group: 'Product',
    width: 1080,
    height: 1080,
    background: '#e9efe9',
    objects: [
      circle({ left: 380, top: 60, radius: 420, fill: '#cfdccf' }),
      slot({ left: 240, top: 120, width: 600, height: 700, fill: '#b9c9b9' }),
      text('NEW ARRIVAL', { left: 60, top: 60, width: 500, fontSize: 30, fontWeight: 600, charSpacing: 300, fill: '#2f4a3a' }),
      text('Product name', { role: 'product-title', left: 60, top: 850, width: 700, fontSize: 76, fontFamily: 'DM Serif Display', fontWeight: 400, fill: '#1c2b22', lineHeight: 1.05 }),
      text('$0.00', { role: 'product-price', left: 760, top: 870, width: 260, fontSize: 64, fontFamily: 'Space Grotesk', textAlign: 'right', fill: '#1c2b22' }),
      text('STORE', { role: 'store-name', left: 60, top: 1000, width: 700, fontSize: 26, fontWeight: 500, charSpacing: 200, fill: '#4b6355' }),
    ],
  },
  {
    id: 'coupon-ticket',
    name: 'Coupon ticket',
    group: 'Coupon',
    width: 1200,
    height: 600,
    background: '#fff8e7',
    objects: [
      rect({ left: 30, top: 30, width: 1140, height: 540, fill: 'rgba(0,0,0,0)', stroke: '#c8862a', strokeWidth: 6, strokeDashArray: [22, 14] }),
      text('STORE', { role: 'store-name', left: 90, top: 80, width: 700, fontSize: 30, fontWeight: 600, charSpacing: 300, fill: '#8a5a12' }),
      text('20% OFF', { role: 'coupon-label', left: 90, top: 150, width: 720, fontSize: 200, fontFamily: 'Bebas Neue', fontWeight: 400, fill: '#1a1408', lineHeight: 0.95 }),
      text('your next order', { left: 90, top: 380, width: 720, fontSize: 44, fontFamily: 'Playfair Display', fontWeight: 400, fill: '#6b4a10' }),
      rect({ left: 850, top: 80, width: 6, height: 440, fill: '#c8862a' }),
      text('USE CODE', { left: 880, top: 150, width: 260, fontSize: 26, fontWeight: 600, charSpacing: 250, textAlign: 'center', fill: '#8a5a12' }),
      rect({ left: 880, top: 210, width: 260, height: 120, fill: '#1a1408' }),
      text('CODE', { role: 'coupon-code', left: 880, top: 246, width: 260, fontSize: 44, fontFamily: 'Space Grotesk', textAlign: 'center', fill: '#fff8e7', charSpacing: 150 }),
    ],
  },
  {
    id: 'coupon-bold',
    name: 'Coupon bold',
    group: 'Coupon',
    width: 1200,
    height: 600,
    background: { from: '#4b2bd9', to: '#8b5cf6' },
    objects: [
      circle({ left: -120, top: 200, radius: 200, fill: '#ffffff' , opacity: 0.12 }),
      circle({ left: 900, top: -140, radius: 260, fill: '#ffffff', opacity: 0.1 }),
      text('A GIFT FROM STORE', { role: 'store-name', left: 80, top: 70, width: 800, fontSize: 30, fontWeight: 600, charSpacing: 300, fill: '#e2d9ff' }),
      text('SAVE 20%', { role: 'coupon-label', left: 80, top: 130, width: 1040, fontSize: 150, fontFamily: 'Poppins', fontWeight: 800, fill: '#ffffff', lineHeight: 1 }),
      rect({ left: 80, top: 400, width: 520, height: 110, fill: '#ffffff', rx: 55, ry: 55 }),
      text('CODE', { role: 'coupon-code', left: 80, top: 428, width: 520, fontSize: 52, fontFamily: 'Space Grotesk', textAlign: 'center', fill: '#3b1fb0', charSpacing: 200 }),
      text('Enter at checkout', { left: 640, top: 435, width: 460, fontSize: 32, fontWeight: 500, fill: '#e2d9ff' }),
    ],
  },
  {
    id: 'story-flash',
    name: 'Flash sale story',
    group: 'Story',
    width: 1080,
    height: 1920,
    background: '#111111',
    objects: [
      text('FLASH SALE', { left: 60, top: 140, width: 960, fontSize: 210, fontFamily: 'Bebas Neue', fontWeight: 400, fill: '#f6ff6b', lineHeight: 0.95 }),
      text('TODAY ONLY', { left: 64, top: 520, width: 900, fontSize: 48, fontWeight: 600, charSpacing: 400, fill: '#ffffff' }),
      slot({ left: 90, top: 640, width: 900, height: 820, fill: '#2a2a2a' }),
      text('Product name', { role: 'product-title', left: 90, top: 1500, width: 900, fontSize: 70, fontFamily: 'Oswald', fill: '#ffffff' }),
      text('$0.00', { role: 'product-price', left: 90, top: 1610, width: 400, fontSize: 80, fontFamily: 'Bebas Neue', fontWeight: 400, fill: '#f6ff6b' }),
      rect({ left: 560, top: 1610, width: 430, height: 110, fill: '#f6ff6b' }),
      text('CODE', { role: 'coupon-code', left: 560, top: 1636, width: 430, fontSize: 52, fontFamily: 'Space Grotesk', textAlign: 'center', fill: '#111111', charSpacing: 150 }),
    ],
  },
  {
    id: 'story-drop',
    name: 'Product drop story',
    group: 'Story',
    width: 1080,
    height: 1920,
    background: '#efe3d8',
    objects: [
      slot({ left: 0, top: 0, width: 1080, height: 1300, fill: '#d8c8b8' }),
      rect({ left: 60, top: 1230, width: 960, height: 560, fill: '#ffffff' }),
      text('JUST DROPPED', { left: 110, top: 1290, width: 860, fontSize: 30, fontWeight: 600, charSpacing: 350, fill: '#a0522d' }),
      text('Product name', { role: 'product-title', left: 110, top: 1350, width: 860, fontSize: 88, fontFamily: 'Playfair Display', lineHeight: 1.05 }),
      text('$0.00', { role: 'product-price', left: 110, top: 1560, width: 500, fontSize: 70, fontFamily: 'Space Grotesk' }),
      text('Tap to shop', { left: 110, top: 1690, width: 860, fontSize: 34, fontWeight: 500, fill: '#6b6459' }),
    ],
  },
  {
    id: 'wide-banner',
    name: 'Product banner',
    group: 'Banner',
    width: 1500,
    height: 500,
    background: '#101827',
    objects: [
      slot({ left: 1000, top: 0, width: 500, height: 500, fill: '#1f2b45' }),
      text('STORE', { role: 'store-name', left: 70, top: 70, width: 800, fontSize: 26, fontWeight: 600, charSpacing: 300, fill: '#8aa3d6' }),
      text('Product name', { role: 'product-title', left: 70, top: 120, width: 880, fontSize: 84, fontFamily: 'Poppins', fill: '#ffffff', lineHeight: 1.05 }),
      text('$0.00', { role: 'product-price', left: 70, top: 340, width: 300, fontSize: 64, fontFamily: 'Space Grotesk', fill: '#7ee0b0' }),
      text('Shop now', { left: 400, top: 355, width: 400, fontSize: 38, fontWeight: 500, fill: '#ffffff' }),
    ],
  },
  {
    id: 'free-shipping',
    name: 'Free shipping bar',
    group: 'Banner',
    width: 1500,
    height: 500,
    background: '#0f766e',
    objects: [
      text('FREE SHIPPING', { role: 'coupon-label', left: 80, top: 90, width: 1340, fontSize: 210, fontFamily: 'Bebas Neue', fontWeight: 400, fill: '#ffffff', lineHeight: 1 }),
      text('on every order — use code', { left: 84, top: 340, width: 700, fontSize: 48, fontFamily: 'Playfair Display', fontWeight: 400, fill: '#c6f3ee' }),
      rect({ left: 840, top: 320, width: 420, height: 100, fill: '#ffffff', rx: 50, ry: 50 }),
      text('CODE', { role: 'coupon-code', left: 840, top: 344, width: 420, fontSize: 48, fontFamily: 'Space Grotesk', textAlign: 'center', fill: '#0f766e', charSpacing: 200 }),
    ],
  },
  {
    id: 'price-tag',
    name: 'Price tag',
    group: 'Product',
    width: 1080,
    height: 1080,
    background: '#ffffff',
    objects: [
      slot({ left: 90, top: 90, width: 900, height: 620, fill: '#eeeeee' }),
      text('Product name', { role: 'product-title', left: 90, top: 750, width: 900, fontSize: 64, fontFamily: 'Inter', lineHeight: 1.1 }),
      text('$0.00', { role: 'product-price', left: 90, top: 900, width: 400, fontSize: 96, fontFamily: 'Space Grotesk' }),
      text('$0.00', { role: 'product-compare', left: 470, top: 928, width: 300, fontSize: 48, fontWeight: 400, fill: '#9a9a9a', linethrough: true, fontFamily: 'Space Grotesk' }),
      circle({ left: 800, top: 860, radius: 100, fill: '#e11d48' }),
      text('SALE', { left: 800, top: 930, width: 200, fontSize: 56, fontFamily: 'Bebas Neue', fontWeight: 400, textAlign: 'center', fill: '#ffffff' }),
    ],
  },
  {
    id: 'thank-you',
    name: 'Thank-you card',
    group: 'Other',
    width: 1080,
    height: 1080,
    background: '#fde8ef',
    objects: [
      text('Thank you', { left: 90, top: 260, width: 900, fontSize: 200, fontFamily: 'Caveat', fontWeight: 700, fill: '#9d174d', textAlign: 'center' }),
      text('for shopping with us', { left: 90, top: 520, width: 900, fontSize: 56, fontFamily: 'Playfair Display', fontWeight: 400, textAlign: 'center', fill: '#5b1a38' }),
      text('Here is a little something for next time', { left: 140, top: 680, width: 800, fontSize: 34, fontWeight: 500, textAlign: 'center', fill: '#7a2f52' }),
      rect({ left: 340, top: 770, width: 400, height: 100, fill: '#9d174d', rx: 50, ry: 50 }),
      text('CODE', { role: 'coupon-code', left: 340, top: 795, width: 400, fontSize: 46, fontFamily: 'Space Grotesk', textAlign: 'center', fill: '#ffffff', charSpacing: 200 }),
      text('STORE', { role: 'store-name', left: 90, top: 100, width: 900, fontSize: 28, fontWeight: 600, charSpacing: 350, textAlign: 'center', fill: '#9d174d' }),
    ],
  },
  {
    id: 'announcement',
    name: 'Announcement',
    group: 'Other',
    width: 1080,
    height: 1080,
    background: { from: '#1e293b', to: '#0f172a' },
    objects: [
      text('WE ARE OPEN', { left: 90, top: 300, width: 900, fontSize: 30, fontWeight: 600, charSpacing: 500, fill: '#94a3b8' }),
      text('Something new is coming to the shop.', { left: 90, top: 370, width: 900, fontSize: 110, fontFamily: 'DM Serif Display', fontWeight: 400, fill: '#ffffff', lineHeight: 1.05 }),
      text('STORE', { role: 'store-name', left: 90, top: 940, width: 900, fontSize: 30, fontWeight: 600, charSpacing: 300, fill: '#94a3b8' }),
    ],
  },
  {
    id: 'blank',
    name: 'Blank',
    group: 'Other',
    width: 1080,
    height: 1080,
    background: '#ffffff',
    objects: [],
  },
]

export const SIZES = [
  { label: 'Link card', width: 1200, height: 630 },
  { label: 'Thumbnail', width: 1600, height: 900 },
  { label: 'Poster', width: 1080, height: 1350 },
  { label: 'A4 print', width: 1240, height: 1754 },
  { label: 'Square', width: 1080, height: 1080 },
  { label: 'Story', width: 1080, height: 1920 },
  { label: 'Banner', width: 1500, height: 500 },
  { label: 'Coupon', width: 1200, height: 600 },
]

export const SWATCHES = [
  '#ffffff', '#f4efe7', '#111111', '#ff4d2e', '#f59e0b', '#16a34a',
  '#0f766e', '#2563eb', '#4b2bd9', '#db2777', '#fde8ef', '#e9efe9',
]

export const GRADIENTS: [string, string][] = [
  ['#4b2bd9', '#8b5cf6'],
  ['#ff4d2e', '#f59e0b'],
  ['#0f766e', '#22c55e'],
  ['#1e293b', '#0f172a'],
  ['#db2777', '#f97316'],
  ['#2563eb', '#22d3ee'],
]
