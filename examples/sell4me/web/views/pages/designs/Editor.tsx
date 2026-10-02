import { Head } from '@inertiajs/react'
import { ActiveSelection, Canvas, Group, Textbox, type FabricObject } from 'fabric'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  applyCoupon,
  applyProduct,
  applyStoreName,
  downscale,
  fillSlot,
  gradientFill,
  KEEP,
  loadImage,
  renderTemplate,
  setBackground,
  textBlock,
  type Obj,
} from '@/views/ui/studio/build'
import { ensureFonts } from '@/views/ui/studio/fonts'
import {
  applyFilters,
  applyShadow,
  FontSelect,
  Inspector,
  pill,
  pillOn,
  readSel,
  type Api,
  type Sel,
} from '@/views/ui/studio/Inspector'
import {
  CanvasPanel,
  CouponPanel,
  ElementsPanel,
  IconsPanel,
  LayersPanel,
  PhotosPanel,
  ProductPanel,
  TemplatesPanel,
  TextPanel,
  type Coupon,
  type Layer,
  type Product,
} from '@/views/ui/studio/panels'
import { PAIRINGS } from '@/views/ui/studio/elements'
import { buildIcon, isIcon, loadIcons } from '@/views/ui/studio/icons'
import { AlignIcon, FrameIcon, LayersIcon, RedoIcon, ShapesIcon, SmileIcon, TypeIcon, UndoIcon } from '@/views/ui/studio/ui-icons'
import type { Template } from '@/views/ui/studio/templates'
import {
  IconChevronLeft,
  IconDownload,
  IconImage,
  IconLayout,
  IconProduct,
  IconTag,
} from '@/views/ui/icons'

type Props = {
  design: { id: number; title: string; kind: string; width: number; height: number; data: Record<string, unknown>; product_id: number | null; discount_id: number | null }
  store: { name: string; currency: string }
  products: Product[]
  coupons: Coupon[]
}

type Tab = 'templates' | 'product' | 'coupon' | 'text' | 'elements' | 'icons' | 'photos' | 'layers' | 'canvas'

const TABS: { key: Tab; label: string; icon: ReactNode }[] = [
  { key: 'templates', label: 'Templates', icon: <IconLayout className="h-[18px] w-[18px]" /> },
  { key: 'product', label: 'Product', icon: <IconProduct className="h-[18px] w-[18px]" /> },
  { key: 'coupon', label: 'Coupon', icon: <IconTag className="h-[18px] w-[18px]" /> },
  { key: 'text', label: 'Text', icon: <TypeIcon /> },
  { key: 'elements', label: 'Shapes', icon: <ShapesIcon /> },
  { key: 'icons', label: 'Icons', icon: <SmileIcon /> },
  { key: 'photos', label: 'Photos', icon: <IconImage className="h-[18px] w-[18px]" /> },
  { key: 'layers', label: 'Layers', icon: <LayersIcon /> },
  { key: 'canvas', label: 'Canvas', icon: <FrameIcon /> },
]

function xsrf(): string {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : ''
}

const LOCKS = ['lockMovementX', 'lockMovementY', 'lockRotation', 'lockScalingX', 'lockScalingY'] as const
function applyLock(obj: FabricObject, locked: boolean) {
  for (const key of LOCKS) (obj as unknown as Record<string, boolean>)[key] = locked
  obj.set({ hasControls: !locked } as never)
  ;(obj as Obj & { locked?: boolean }).locked = locked
}

const titleCase = (s: string) => s.toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase())

function usedFonts(doc: unknown): string[] {
  const found = new Set<string>()
  const walk = (node: unknown) => {
    if (Array.isArray(node)) node.forEach(walk)
    else if (node && typeof node === 'object') {
      const record = node as Record<string, unknown>
      if (typeof record.fontFamily === 'string') found.add(record.fontFamily)
      Object.values(record).forEach(walk)
    }
  }
  walk(doc)
  return [...found]
}

export default function DesignEditor({ design, store, products, coupons }: Props) {
  const elRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<Canvas | null>(null)
  const sizeRef = useRef({ w: design.width, h: design.height })
  const zoomRef = useRef(1)
  const fitRef = useRef(true)
  const history = useRef<{ stack: string[]; index: number; lock: boolean; timer: number | null }>({ stack: [], index: -1, lock: false, timer: null })
  const saveTimer = useRef<number | null>(null)
  const titleRef = useRef(design.title)
  const productRef = useRef<number | null>(design.product_id)
  const couponRef = useRef<number | null>(design.discount_id)
  const fileRef = useRef<HTMLInputElement>(null)
  const frameTarget = useRef<Obj | null>(null)

  const [title, setTitle] = useState(design.title)
  const [tab, setTab] = useState<Tab>('templates')
  const [ready, setReady] = useState(false)
  const [status, setStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved')
  const [zoom, setZoom] = useState(1)
  const [size, setSize] = useState({ w: design.width, h: design.height })
  const [sel, setSel] = useState<Sel | null>(null)
  const [productId, setProductId] = useState<number | null>(design.product_id)
  const [couponId, setCouponId] = useState<number | null>(design.discount_id)
  const [undoState, setUndoState] = useState({ undo: false, redo: false })
  const [menu, setMenu] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [empty, setEmpty] = useState(false)
  const [tick, setTick] = useState(0)
  const [dragging, setDragging] = useState(false)

  // Light, like the page builder, whatever the reader's theme is.
  useEffect(() => {
    const root = document.documentElement
    const previous = root.getAttribute('data-theme')
    root.setAttribute('data-theme', 'light')
    return () => {
      if (previous === null) root.removeAttribute('data-theme')
      else root.setAttribute('data-theme', previous)
    }
  }, [])

  const flash = useCallback((message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(null), 3500)
  }, [])

  const cv = () => canvasRef.current!
  const active = () => canvasRef.current?.getActiveObject() as (Obj & Record<string, unknown>) | undefined

  // -- zoom -----------------------------------------------------------------
  const applyZoom = useCallback((value: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const z = Math.max(0.05, Math.min(3, value))
    zoomRef.current = z
    canvas.setZoom(z)
    canvas.setDimensions({ width: sizeRef.current.w * z, height: sizeRef.current.h * z })
    setZoom(z)
  }, [])

  const fitZoom = () => {
    const stage = stageRef.current
    if (!stage) return 1
    return Math.min((stage.clientWidth - 96) / sizeRef.current.w, (stage.clientHeight - 96) / sizeRef.current.h, 1.5)
  }
  const fit = useCallback(() => {
    fitRef.current = true
    applyZoom(fitZoom())
  }, [applyZoom])

  const refresh = useCallback(() => {
    setSel(readSel(canvasRef.current))
    setTick((n) => n + 1)
  }, [])

  // -- saving ---------------------------------------------------------------
  const snapshot = useCallback((format: 'png' | 'jpeg', multiplier: number, quality = 0.92) => {
    const canvas = canvasRef.current!
    const z = zoomRef.current
    canvas.discardActiveObject()
    canvas.setZoom(1)
    canvas.setDimensions({ width: sizeRef.current.w, height: sizeRef.current.h })
    try {
      return canvas.toDataURL({ format, multiplier, quality })
    } finally {
      canvas.setZoom(z)
      canvas.setDimensions({ width: sizeRef.current.w * z, height: sizeRef.current.h * z })
    }
  }, [])

  const save = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    setStatus('saving')
    let thumbnail: string | undefined
    try {
      thumbnail = snapshot('jpeg', 360 / Math.max(sizeRef.current.w, sizeRef.current.h), 0.7)
    } catch {
      thumbnail = undefined
    }
    try {
      const response = await fetch(`/designs/${design.id}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': xsrf(), Accept: 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          data: canvas.toObject(KEEP),
          title: titleRef.current,
          width: sizeRef.current.w,
          height: sizeRef.current.h,
          thumbnail,
          product_id: productRef.current,
          discount_id: couponRef.current,
        }),
      })
      if (!response.ok) throw new Error(String(response.status))
      setStatus('saved')
    } catch {
      setStatus('error')
    }
  }, [design.id, snapshot])

  const dirty = useCallback(() => {
    setStatus('unsaved')
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(save, 1500)
  }, [save])

  // -- history --------------------------------------------------------------
  const pushHistory = useCallback(() => {
    const h = history.current
    const canvas = canvasRef.current
    if (!canvas || h.lock) return
    const entry = JSON.stringify({ w: sizeRef.current.w, h: sizeRef.current.h, canvas: canvas.toObject(KEEP) })
    if (h.stack[h.index] === entry) return
    h.stack = h.stack.slice(0, h.index + 1)
    h.stack.push(entry)
    if (h.stack.length > 60) h.stack.shift()
    h.index = h.stack.length - 1
    setUndoState({ undo: h.index > 0, redo: false })
  }, [])

  const change = useCallback(() => {
    const h = history.current
    if (h.lock) return
    if (h.timer) window.clearTimeout(h.timer)
    h.timer = window.setTimeout(() => {
      pushHistory()
      dirty()
      setEmpty(canvasRef.current?.getObjects().length === 0)
      setTick((n) => n + 1)
    }, 250)
  }, [pushHistory, dirty])

  const relock = (canvas: Canvas) => {
    canvas.getObjects().forEach((o) => {
      if ((o as Obj & { locked?: boolean }).locked) applyLock(o, true)
    })
  }

  const travel = useCallback(
    async (step: -1 | 1) => {
      const h = history.current
      const canvas = canvasRef.current
      const next = h.index + step
      if (!canvas || next < 0 || next >= h.stack.length) return
      h.lock = true
      h.index = next
      const entry = JSON.parse(h.stack[next])
      sizeRef.current = { w: entry.w, h: entry.h }
      setSize({ w: entry.w, h: entry.h })
      await ensureFonts(usedFonts(entry.canvas))
      await canvas.loadFromJSON(entry.canvas)
      relock(canvas)
      applyZoom(fitRef.current ? fitZoom() : zoomRef.current)
      canvas.requestRenderAll()
      h.lock = false
      setUndoState({ undo: h.index > 0, redo: h.index < h.stack.length - 1 })
      setEmpty(canvas.getObjects().length === 0)
      refresh()
      dirty()
    },
    [applyZoom, dirty, refresh],
  )

  // -- mount ----------------------------------------------------------------
  useEffect(() => {
    const canvas = new Canvas(elRef.current!, {
      width: size.w,
      height: size.h,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      selection: true,
    })
    canvasRef.current = canvas
    ;(window as unknown as { __studio?: Canvas }).__studio = canvas

    void (async () => {
      const doc = design.data as { objects?: unknown[] }
      await ensureFonts(usedFonts(doc))
      history.current.lock = true
      if (doc && Array.isArray(doc.objects) && doc.objects.length) {
        await canvas.loadFromJSON(design.data)
        relock(canvas)
      }
      history.current.lock = false
      setEmpty(canvas.getObjects().length === 0)
      fit()
      pushHistory()
      canvas.requestRenderAll()
      setReady(true)
    })()

    canvas.on('selection:created', refresh)
    canvas.on('selection:updated', refresh)
    canvas.on('selection:cleared', refresh)
    canvas.on('object:modified', () => { refresh(); change() })
    canvas.on('object:added', change)
    canvas.on('object:removed', change)
    canvas.on('text:changed', change)

    const observer = new ResizeObserver(() => {
      if (fitRef.current) fit()
    })
    if (stageRef.current) observer.observe(stageRef.current)

    return () => {
      observer.disconnect()
      canvas.dispose()
      canvasRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // -- object actions -------------------------------------------------------
  const patch = (props: Record<string, unknown>) => {
    const obj = active()
    const canvas = canvasRef.current
    if (!obj || !canvas) return
    const { __case, __iconColor, __iconStroke, ...rest } = props as Record<string, unknown> & { __case?: string; __iconColor?: string; __iconStroke?: number }
    if (__case && 'text' in obj) {
      const text = String((obj as unknown as Textbox).text)
      ;(obj as unknown as Textbox).set('text', __case === 'upper' ? text.toUpperCase() : __case === 'lower' ? text.toLowerCase() : titleCase(text))
    }
    const targets = obj.type === 'activeselection' ? (obj as unknown as ActiveSelection).getObjects() : [obj]
    if (__iconColor !== undefined || __iconStroke !== undefined) {
      for (const target of targets) {
        if (!isIcon(target as Obj)) continue
        for (const part of (target as unknown as Group).getObjects()) {
          if (__iconColor !== undefined) part.set({ stroke: __iconColor, fill: part.fill && part.fill !== 'rgba(0,0,0,0)' ? __iconColor : part.fill } as never)
          if (__iconStroke !== undefined) part.set('strokeWidth', __iconStroke)
        }
        target.set('dirty', true)
      }
    }
    if ('fontFamily' in rest) void ensureFonts([String(rest.fontFamily)])
    for (const target of targets) target.set(rest as never)
    for (const target of targets) {
      if (target.type === 'textbox') (target as unknown as Textbox).initDimensions()
      target.setCoords()
    }
    if (obj.type === 'activeselection') obj.setCoords()
    canvas.requestRenderAll()
    canvas.fire('object:modified', { target: obj } as never)
  }

  const commit = () => {
    cv().requestRenderAll()
    cv().fire('object:modified', { target: active() } as never)
  }

  const addObject = (obj: Obj) => {
    const canvas = cv()
    obj.set({ originX: 'left', originY: 'top' } as never)
    const w = obj.getScaledWidth()
    const h = obj.getScaledHeight()
    const shrink = Math.min(1, (sizeRef.current.w * 0.9) / w, (sizeRef.current.h * 0.9) / h)
    if (shrink < 1) obj.scale((obj.scaleX || 1) * shrink)
    obj.set({ left: (sizeRef.current.w - obj.getScaledWidth()) / 2, top: (sizeRef.current.h - obj.getScaledHeight()) / 2 })
    canvas.add(obj)
    canvas.setActiveObject(obj)
    canvas.requestRenderAll()
    refresh()
  }

  const remove = () => {
    const canvas = cv()
    canvas.getActiveObjects().forEach((o) => canvas.remove(o))
    canvas.discardActiveObject()
    canvas.requestRenderAll()
    refresh()
  }

  const duplicate = async () => {
    const canvas = cv()
    const obj = active()
    if (!obj) return
    if (obj.type === 'activeselection') {
      const copies = await Promise.all((obj as unknown as ActiveSelection).getObjects().map((o) => o.clone(KEEP)))
      canvas.discardActiveObject()
      copies.forEach((c) => { c.set({ left: c.left + 30, top: c.top + 30 }); canvas.add(c) })
      canvas.setActiveObject(new ActiveSelection(copies, { canvas }))
    } else {
      const copy = (await obj.clone(KEEP)) as Obj
      copy.set({ left: obj.left + 30, top: obj.top + 30, role: undefined } as object)
      canvas.discardActiveObject()
      canvas.add(copy)
      canvas.setActiveObject(copy)
    }
    canvas.requestRenderAll()
    refresh()
  }

  const order = (how: 'forward' | 'back' | 'front' | 'bottom') => {
    const canvas = cv()
    const obj = active()
    if (!obj) return
    if (how === 'forward') canvas.bringObjectForward(obj)
    if (how === 'back') canvas.sendObjectBackwards(obj)
    if (how === 'front') canvas.bringObjectToFront(obj)
    if (how === 'bottom') canvas.sendObjectToBack(obj)
    canvas.requestRenderAll()
    change()
  }

  const align = (how: 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom') => {
    const obj = active()
    if (!obj) return
    const { w, h } = sizeRef.current
    const bw = obj.getScaledWidth()
    const bh = obj.getScaledHeight()
    if (how === 'left') patch({ left: 0 })
    if (how === 'centerH') patch({ left: (w - bw) / 2 })
    if (how === 'right') patch({ left: w - bw })
    if (how === 'top') patch({ top: 0 })
    if (how === 'centerV') patch({ top: (h - bh) / 2 })
    if (how === 'bottom') patch({ top: h - bh })
  }

  const api: Api = {
    patch,
    setShadow: (shadow) => {
      const obj = active()
      if (!obj) return
      applyShadow(obj, shadow)
      commit()
    },
    setGradient: (g, fallback) => {
      const obj = active()
      if (!obj) return
      obj.set('fill', g ? gradientFill(g) : fallback)
      commit()
    },
    setFx: (fx) => {
      const obj = active()
      if (!obj) return
      applyFilters(obj, fx)
      commit()
    },
    setBox: (w, h) => {
      const obj = active() as (Obj & Record<string, number>) | undefined
      if (!obj) return
      if (obj.type === 'textbox') patch({ width: w })
      else patch({ scaleX: w / (obj.width || 1), scaleY: h / (obj.height || 1) })
    },
    flip: (axis) => {
      const obj = active()
      if (!obj) return
      patch(axis === 'x' ? { flipX: !obj.flipX } : { flipY: !obj.flipY })
    },
    toggleLock: () => {
      const obj = active() as (Obj & { locked?: boolean }) | undefined
      if (!obj) return
      applyLock(obj, !obj.locked)
      commit()
    },
    group: () => {
      const canvas = cv()
      const items = canvas.getActiveObjects()
      if (items.length < 2) return
      canvas.discardActiveObject()
      const g = new Group(items.slice())
      items.forEach((o) => canvas.remove(o))
      canvas.add(g)
      canvas.setActiveObject(g)
      refresh()
    },
    ungroup: () => {
      const canvas = cv()
      const g = active() as unknown as Group | undefined
      if (!g || g.type !== 'group') return
      const items = g.getObjects().slice()
      canvas.discardActiveObject()
      g.remove(...items)
      canvas.remove(g)
      canvas.add(...items)
      canvas.setActiveObject(new ActiveSelection(items, { canvas }))
      refresh()
    },
    duplicate: () => void duplicate(),
    remove,
    order,
    align,
    upload: () => {
      frameTarget.current = (active() as Obj) ?? null
      fileRef.current?.click()
    },
  }

  const resize = (w: number, h: number) => {
    sizeRef.current = { w, h }
    setSize({ w, h })
    fit()
    change()
  }

  const useTemplate = async (template: Template) => {
    const canvas = cv()
    if (canvas.getObjects().length > 0 && !window.confirm('Replace the current design with this template?')) return
    history.current.lock = true
    let product: Product | undefined
    try {
      sizeRef.current = { w: template.width, h: template.height }
      setSize({ w: template.width, h: template.height })
      await ensureFonts(template.objects.flatMap((o) => (typeof o.fontFamily === 'string' ? [o.fontFamily] : [])))
      await renderTemplate(canvas, template)
      applyStoreName(canvas, store.name)
      product = products.find((p) => p.id === productRef.current)
      const coupon = coupons.find((c) => c.id === couponRef.current)
      if (coupon) applyCoupon(canvas, coupon)
      if (product) void applyProduct(canvas, product).then(change)
    } finally {
      history.current.lock = false
    }
    const coupon = coupons.find((c) => c.id === couponRef.current)
    fit()
    pushHistory()
    dirty()
    setEmpty(false)
    canvas.discardActiveObject()
    canvas.requestRenderAll()
    refresh()
    if (!product && template.objects.some((o) => o.role === 'product-image')) setTab('product')
    else if (!coupon && template.objects.some((o) => o.role === 'coupon-code')) setTab('coupon')
  }

  const chooseProduct = async (product: Product) => {
    productRef.current = product.id
    setProductId(product.id)
    await applyProduct(cv(), product)
    change()
  }

  const chooseCoupon = (coupon: Coupon) => {
    couponRef.current = coupon.id
    setCouponId(coupon.id)
    applyCoupon(cv(), coupon)
    change()
  }

  const addPhoto = async (product: Product) => {
    if (!product.image_url) return
    try {
      const image = (await loadImage(product.image_url)) as unknown as Obj
      image.set({ name: 'Product photo' } as object)
      const s = Math.min((sizeRef.current.w * 0.6) / image.width, (sizeRef.current.h * 0.6) / image.height)
      image.scale(s)
      addObject(image)
    } catch {
      flash('That image could not be loaded.')
    }
  }

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/')) return flash('Choose an image file.')
    try {
      const url = await downscale(file)
      const target = frameTarget.current
      frameTarget.current = null
      if (target && cv().getObjects().includes(target) && (target as Obj).role === 'product-image') {
        const image = await fillSlot(cv(), target, url)
        cv().setActiveObject(image)
      } else {
        const image = (await loadImage(url)) as unknown as Obj
        image.set({ name: 'Upload' } as object)
        image.scale(Math.min((sizeRef.current.w * 0.6) / image.width, (sizeRef.current.h * 0.6) / image.height))
        addObject(image)
      }
      refresh()
    } catch {
      flash('That image could not be used.')
    }
  }

  const applyFont = async (name: string) => {
    await ensureFonts([name])
    const obj = active()
    if (obj && ('text' in obj || obj.type === 'activeselection')) patch({ fontFamily: name })
    else addObject(textBlock('Your text here', { fontFamily: name, fontWeight: 700, fontSize: 110, width: 800 }))
  }

  const addPairing = async (index: number) => {
    const pairing = PAIRINGS[index]
    await ensureFonts([pairing.head, pairing.sub])
    const canvas = cv()
    const { w, h } = sizeRef.current
    const head = textBlock('Big headline', { fontFamily: pairing.head, fontWeight: pairing.headWeight ?? 700, fontSize: 130, width: w * 0.8, left: w * 0.1, top: h * 0.3 })
    const sub = textBlock('A supporting line that says a little more', { fontFamily: pairing.sub, fontWeight: 400, fontSize: 40, width: w * 0.8, left: w * 0.1, top: h * 0.3 + 230 })
    canvas.add(head, sub)
    canvas.setActiveObject(head)
    canvas.requestRenderAll()
    refresh()
  }

  const exportImage = (format: 'png' | 'jpeg', scale: number) => {
    setMenu(false)
    try {
      const url = snapshot(format, scale)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(titleRef.current || 'design').replace(/[^\w-]+/g, '-')}.${format === 'jpeg' ? 'jpg' : 'png'}`
      a.click()
    } catch {
      flash('An image on the canvas blocks export. Re-add it from your uploads or a product.')
    }
  }

  // -- layers ---------------------------------------------------------------
  const layers: Layer[] = useMemo(() => {
    void tick
    const canvas = canvasRef.current
    if (!canvas) return []
    const current = canvas.getActiveObjects()
    return canvas.getObjects().map((o, index) => {
      const obj = o as Obj & { text?: string; locked?: boolean }
      const text = typeof obj.text === 'string' ? obj.text.replace(/\s+/g, ' ').slice(0, 26) : ''
      return {
        index,
        label: obj.role ? obj.role.replace(/-/g, ' ') : text || (isIcon(obj) ? String(obj.name).slice(5).replace(/-/g, ' ') : obj.name) || obj.type,
        kind: text ? 'Text' : obj.type === 'image' ? 'Image' : isIcon(obj) ? 'Icon' : obj.type === 'group' ? 'Group' : 'Shape',
        visible: obj.visible !== false,
        locked: Boolean(obj.locked),
        selected: current.includes(o),
      }
    })
  }, [tick])

  const layerApi = {
    select: (i: number) => { const o = cv().getObjects()[i]; if (o) { cv().setActiveObject(o); cv().requestRenderAll(); refresh() } },
    toggle: (i: number) => { const o = cv().getObjects()[i]; o.set('visible', o.visible === false); cv().discardActiveObject(); cv().requestRenderAll(); change() },
    lock: (i: number) => { const o = cv().getObjects()[i] as Obj & { locked?: boolean }; applyLock(o, !o.locked); cv().requestRenderAll(); change() },
    move: (i: number, dir: 1 | -1) => { const o = cv().getObjects()[i]; if (dir === 1) cv().bringObjectForward(o); else cv().sendObjectBackwards(o); cv().requestRenderAll(); change() },
  }

  // -- keyboard -------------------------------------------------------------
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      const obj = active()
      if (obj && (obj as unknown as { isEditing?: boolean }).isEditing) return
      const mod = event.metaKey || event.ctrlKey
      const key = event.key.toLowerCase()
      if (mod && key === 'z') { event.preventDefault(); void travel(event.shiftKey ? 1 : -1) }
      else if (mod && key === 'y') { event.preventDefault(); void travel(1) }
      else if (mod && key === 's') { event.preventDefault(); void save() }
      else if (mod && key === 'd') { event.preventDefault(); void duplicate() }
      else if (mod && key === 'a') { event.preventDefault(); const c = cv(); c.discardActiveObject(); const all = c.getObjects().filter((o) => !(o as Obj & { locked?: boolean }).locked); if (all.length) c.setActiveObject(new ActiveSelection(all, { canvas: c })); c.requestRenderAll(); refresh() }
      else if ((event.key === 'Delete' || event.key === 'Backspace') && obj) { event.preventDefault(); remove() }
      else if (obj && event.key.startsWith('Arrow')) {
        event.preventDefault()
        const step = event.shiftKey ? 10 : 1
        patch({
          left: obj.left + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0),
          top: obj.top + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0),
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [travel, save])

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (status === 'unsaved' || status === 'saving') e.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [status])

  const isText = sel?.kind === 'text'
  const fillable = sel && sel.kind !== 'image' && sel.kind !== 'group' && sel.kind !== 'multi'
  const saveLabel = status === 'saved' ? 'All changes saved' : status === 'saving' ? 'Saving…' : status === 'error' ? 'Not saved — retry' : 'Unsaved changes'

  return (
    <>
      <Head title={`${title} · Design studio`} />
      <div className="fixed inset-0 z-40 flex flex-col bg-canvas text-ink">
        {/* top bar */}
        <div className="flex h-14 shrink-0 items-center gap-1.5 border-b border-line bg-canvas px-3">
          <a href="/designs" className="flex h-9 items-center gap-1 rounded-full pr-3.5 pl-2 text-[13px] text-ink-muted transition hover:bg-sunken hover:text-ink">
            <IconChevronLeft className="h-4 w-4" />
            Designs
          </a>
          <span className="mx-1 h-5 w-px bg-line" />
          <input
            value={title}
            onChange={(e) => { setTitle(e.target.value); titleRef.current = e.target.value; dirty() }}
            className="h-9 w-60 min-w-0 rounded-full border border-transparent bg-transparent px-3 text-[14px] font-medium outline-none hover:border-line focus:border-ink"
            aria-label="Design name"
          />
          <span className="hidden text-[12px] text-ink-faint lg:inline" data-testid="status">{saveLabel}</span>

          <div className="flex-1" />

          <button className={pill} disabled={!undoState.undo} onClick={() => void travel(-1)} title="Undo (Ctrl+Z)"><UndoIcon className="h-4 w-4" />Undo</button>
          <button className={pill} disabled={!undoState.redo} onClick={() => void travel(1)} title="Redo (Ctrl+Shift+Z)">Redo<RedoIcon className="h-4 w-4" /></button>
          <span className="mx-1 h-5 w-px bg-line" />
          <div className="flex items-center rounded-full border border-line bg-surface">
            <button className="h-8 w-8 rounded-full text-[15px] hover:bg-sunken" onClick={() => { fitRef.current = false; applyZoom(zoomRef.current - 0.1) }} aria-label="Zoom out">−</button>
            <button className="h-8 w-14 text-[12px] hover:bg-sunken" onClick={fit} title="Fit to screen">{Math.round(zoom * 100)}%</button>
            <button className="h-8 w-8 rounded-full text-[15px] hover:bg-sunken" onClick={() => { fitRef.current = false; applyZoom(zoomRef.current + 0.1) }} aria-label="Zoom in">+</button>
          </div>
          <span className="mx-1 h-5 w-px bg-line" />
          <button className={pill} onClick={() => void save()}>Save</button>
          <div className="relative">
            <button className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-medium text-white transition hover:opacity-90" onClick={() => setMenu((v) => !v)}>
              <IconDownload className="h-3.5 w-3.5" />
              Export
            </button>
            {menu && (
              <div className="absolute right-0 z-50 mt-1.5 w-56 border border-line bg-surface py-1">
                {([['PNG', 'png', 1], ['PNG · 2× (sharp)', 'png', 2], ['JPG', 'jpeg', 1]] as const).map(([label, fmt, scale]) => (
                  <button key={label} className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-[13px] hover:bg-sunken" onClick={() => exportImage(fmt, scale)}>
                    {label}
                    <span className="text-[11px] text-ink-faint">{size.w * scale}×{size.h * scale}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          {/* rail */}
          <div className="flex w-[72px] shrink-0 flex-col items-center gap-1 overflow-y-auto border-r border-line bg-canvas py-2">
            {TABS.map(({ key, label, icon }) => (
              <button key={key} onClick={() => setTab(key)} className={`flex w-14 flex-col items-center gap-1 rounded-2xl py-2 text-[10.5px] transition ${tab === key ? 'bg-ink text-white' : 'text-ink-muted hover:bg-sunken hover:text-ink'}`}>
                {icon}
                {label}
              </button>
            ))}
          </div>

          {/* panel */}
          <div className="w-[320px] shrink-0 overflow-y-auto border-r border-line bg-surface p-4" data-testid="panel">
            {tab === 'templates' && <TemplatesPanel onPick={useTemplate} ready={ready} />}
            {tab === 'product' && <ProductPanel products={products} productId={productId} onChoose={chooseProduct} onAddPhoto={addPhoto} />}
            {tab === 'coupon' && (
              <CouponPanel
                coupons={coupons}
                couponId={couponId}
                onChoose={chooseCoupon}
                onAddCode={() => {
                  const c = coupons.find((x) => x.id === couponId)
                  addObject(textBlock(c?.code ?? 'CODE', { role: 'coupon-code', fontFamily: 'Space Grotesk', fontSize: 64, fill: '#ffffff', backgroundColor: '#111111', padding: 24, charSpacing: 150, textAlign: 'center', width: 460 }))
                }}
                onAddOffer={() => {
                  const c = coupons.find((x) => x.id === couponId)
                  addObject(textBlock(c?.label ?? '20% OFF', { role: 'coupon-label', fontFamily: 'Bebas Neue', fontWeight: 400, fontSize: 160, width: 700 }))
                }}
              />
            )}
            {tab === 'text' && <TextPanel onAdd={addObject} onFont={applyFont} onPairing={addPairing} activeFont={sel?.fontFamily} />}
            {tab === 'elements' && <ElementsPanel onAdd={addObject} />}
            {tab === 'icons' && <IconsPanel onPick={(name, filled) => void loadIcons().then(() => addObject(buildIcon(name, 240, '#111111', filled ? 1.5 : 2, filled)))} />}
            {tab === 'photos' && <PhotosPanel products={products} onUpload={() => { frameTarget.current = null; fileRef.current?.click() }} onAddPhoto={addPhoto} />}
            {tab === 'layers' && <LayersPanel layers={layers} onSelect={layerApi.select} onToggle={layerApi.toggle} onLock={layerApi.lock} onMove={layerApi.move} />}
            {tab === 'canvas' && (
              <CanvasPanel
                size={size}
                onResize={resize}
                onColor={(c) => { setBackground(cv(), c, size.h); cv().requestRenderAll(); change() }}
                onGradient={(from, to) => { setBackground(cv(), { from, to }, size.h); cv().requestRenderAll(); change() }}
              />
            )}
          </div>

          {/* stage */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* contextual bar */}
            <div className="flex h-12 shrink-0 items-center gap-1.5 overflow-x-auto border-b border-line bg-surface px-3" data-testid="quickbar">
              {!sel ? (
                <span className="text-[12px] text-ink-muted">Click something on the canvas to edit it</span>
              ) : (
                <>
                  {fillable && !sel.gradient && (
                    <label className="flex h-8 items-center gap-1.5 rounded-full border border-line px-2 text-[11.5px] text-ink-muted" title="Fill colour">
                      <input type="color" className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0" value={sel.fill} onChange={(e) => patch({ fill: e.target.value })} />
                      Fill
                    </label>
                  )}
                  {isText && (
                    <>
                      <FontSelect className="h-8 w-44 rounded-full border border-line bg-surface px-3 text-[12.5px] outline-none" value={sel.fontFamily} onChange={(v) => patch({ fontFamily: v })} />
                      <div className="flex items-center rounded-full border border-line">
                        <button className="h-8 w-7 hover:bg-sunken" onClick={() => patch({ fontSize: Math.max(4, Math.round(sel.fontSize) - 4) })}>−</button>
                        <input className="h-8 w-12 bg-transparent text-center text-[12.5px] outline-none" type="number" value={Math.round(sel.fontSize)} onChange={(e) => patch({ fontSize: Number(e.target.value) || 1 })} />
                        <button className="h-8 w-7 hover:bg-sunken" onClick={() => patch({ fontSize: Math.round(sel.fontSize) + 4 })}>+</button>
                      </div>
                      <button className={`${pill} !px-3 font-bold ${sel.fontWeight >= 700 ? pillOn : ''}`} onClick={() => patch({ fontWeight: sel.fontWeight >= 700 ? 400 : 700 })}>B</button>
                      <button className={`${pill} !px-3 italic ${sel.fontStyle === 'italic' ? pillOn : ''}`} onClick={() => patch({ fontStyle: sel.fontStyle === 'italic' ? 'normal' : 'italic' })}>I</button>
                      <button className={`${pill} !px-3 underline ${sel.underline ? pillOn : ''}`} onClick={() => patch({ underline: !sel.underline })}>U</button>
                      {(['left', 'center', 'right'] as const).map((a) => (
                        <button key={a} className={`${pill} !px-2.5 ${sel.textAlign === a ? pillOn : ''}`} onClick={() => patch({ textAlign: a })}><AlignIcon kind={a} className="h-4 w-4" /></button>
                      ))}
                    </>
                  )}
                  {sel.kind === 'image' && (
                    <>
                      <button className={pill} onClick={() => api.flip('x')}>Flip</button>
                      <button className={`${pill} ${sel.fx.grayscale ? pillOn : ''}`} onClick={() => api.setFx({ ...sel.fx, grayscale: !sel.fx.grayscale })}>B&W</button>
                    </>
                  )}
                  <span className="mx-1 h-5 w-px bg-line" />
                  <button className={pill} onClick={() => order('front')}>Front</button>
                  <button className={pill} onClick={() => order('bottom')}>Back</button>
                  <button className={pill} onClick={api.toggleLock}>{sel.locked ? 'Unlock' : 'Lock'}</button>
                  <button className={pill} onClick={api.duplicate}>Copy</button>
                  <button className={`${pill} !text-red-600`} onClick={remove}>Delete</button>
                </>
              )}
            </div>

            <div
              ref={stageRef}
              className={`relative min-h-0 flex-1 overflow-auto ${dragging ? 'bg-sunken' : 'bg-canvas'}`}
              onMouseDown={(e) => { if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.stage) { cv().discardActiveObject(); cv().requestRenderAll(); refresh() } }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) { frameTarget.current = null; void upload(f) } }}
            >
              <div data-stage="1" className="flex min-h-full min-w-full items-center justify-center p-12">
                <div className="relative border border-line bg-white" style={{ lineHeight: 0 }}>
                  <canvas ref={elRef} />
                  {ready && empty && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" style={{ lineHeight: 1.4 }}>
                      <div className="pointer-events-auto max-w-xs bg-surface/95 p-5 text-center">
                        <p className="text-[13px] font-medium">Start with a template</p>
                        <p className="mt-1 text-[12px] text-ink-muted">Or add text and shapes from the left.</p>
                        <button className={pill + ' mt-3 border border-line'} onClick={() => setTab('templates')}>Browse templates</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {notice && <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-[12.5px] text-white">{notice}</div>}
              {dragging && <div className="pointer-events-none absolute inset-3 flex items-center justify-center border-2 border-dashed border-ink text-[14px] text-ink">Drop an image to add it</div>}
            </div>
          </div>

          {/* inspector */}
          <div className="w-[280px] shrink-0 overflow-y-auto border-l border-line bg-surface" data-testid="inspector">
            <Inspector sel={sel} api={api} size={size} onBackground={() => setTab('canvas')} />
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = '' }} />
      </div>
    </>
  )
}

