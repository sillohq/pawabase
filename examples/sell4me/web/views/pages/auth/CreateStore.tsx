import { Head, router } from '@inertiajs/react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useShared } from '@/js/hooks'
import { RenderBlocks, type BlockContext, type BlockNode } from '@/views/ui/blocks'
import { Button, Field, Input } from '@/views/ui/kit'
import { downscale } from '@/views/ui/studio/build'
import {
  IconBag,
  IconChevronLeft,
  IconDownload,
  IconFile,
  IconGlobe,
  IconImage,
  IconLayout,
  IconMegaphone,
  IconPlus,
  IconProduct,
  IconSearch,
  IconStore,
  IconTag,
  IconTrash,
  IconUser,
} from '@/views/ui/icons'

// -- data shapes --------------------------------------------------------------------

type Template = {
  key: string
  name: string
  description: string
  suits: string
  category: string
  colors: Record<string, string>
  fonts: { heading: string; body: string }
  corner_style: 'sharp' | 'soft' | 'round'
  style: Record<string, string>
  home_preview: BlockNode[]
}

const PREVIEW_CONTEXT: BlockContext = { products: [], collections: [], editing: true }

type Props = { templates: Template[]; categories: string[] }

type Data = {
  name: string
  slug: string
  currency: string
  country: string
  category: string
  template: string
  accent: string
  logo: string
  announcement: string
  product: { title: string; price: string; image: string }
  discountCode: string
  discountPercent: string
  invites: string[]
}

const CURRENCIES: [code: string, label: string, country: string, flag: string][] = [
  ['NGN', 'Nigerian naira', 'NG', '🇳🇬'],
  ['GHS', 'Ghanaian cedi', 'GH', '🇬🇭'],
  ['ZAR', 'South African rand', 'ZA', '🇿🇦'],
  ['KES', 'Kenyan shilling', 'KE', '🇰🇪'],
]

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General', fashion: 'Fashion', beauty: 'Beauty', food: 'Food & drink', home: 'Home',
  kids: 'Kids', electronics: 'Electronics', outdoors: 'Outdoors', pets: 'Pets', gifts: 'Gifts',
  fitness: 'Fitness', hardware: 'Hardware', media: 'Books & media',
}

const HEARD_ICON: Record<string, typeof IconSearch> = {
  fashion: IconTag, beauty: IconStore, food: IconStore, home: IconStore, kids: IconStore,
  electronics: IconStore, outdoors: IconStore, pets: IconStore, gifts: IconStore,
  fitness: IconStore, hardware: IconStore, media: IconFile, general: IconStore,
}

const RADIUS = { sharp: '4px', soft: '14px', round: '26px' }

const ACCENTS = ['#8d3a63', '#3b82f6', '#16a34a', '#f59e0b', '#e11d48', '#0f766e', '#7c3aed', '#111111']

/** Mirrors `app/services/catalog.py::slugify`. */
function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const BLOBS = ['sage', 'clay', 'taupe'] as const

// -- shell ----------------------------------------------------------------------------

function StepShell({
  index, total, blob, icon, eyebrow, title, subtitle, children, skip,
}: {
  index: number
  total: number
  blob: (typeof BLOBS)[number]
  icon: ReactNode
  eyebrow: string
  title: string
  subtitle?: string
  children: ReactNode
  skip?: () => void
}) {
  return (
    <div>
      <Head title="Create your store" />
      <div className="mb-6 flex items-center gap-1">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i <= index ? 'bg-brand' : 'bg-line-soft'}`}
          />
        ))}
      </div>

      <div className="relative mb-6 flex items-center gap-3">
        <span
          aria-hidden
          className="pointer-events-none absolute -left-3 -top-3 h-16 w-16 rounded-full opacity-60"
          style={{ background: `var(--color-${blob})` }}
        />
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink text-surface">
          {icon}
        </span>
        <div className="relative min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-faint">{eyebrow}</p>
          <h1 className="text-[19px] font-bold tracking-[-0.02em] text-ink">{title}</h1>
        </div>
      </div>

      {subtitle && <p className="mb-5 -mt-3 text-[13px] text-ink-muted">{subtitle}</p>}

      {children}

      {skip && (
        <button type="button" onClick={skip} className="mt-4 w-full text-center text-[12.5px] font-medium text-ink-muted hover:text-ink">
          Skip this — I'll do it later
        </button>
      )}
    </div>
  )
}

function Nav({ onBack, onNext, nextLabel = 'Continue', disabled, loading }: {
  onBack?: () => void
  onNext: () => void
  nextLabel?: string
  disabled?: boolean
  loading?: boolean
}) {
  return (
    <div className="mt-6 flex gap-2">
      {onBack && (
        <button type="button" onClick={onBack} className="flex h-11 shrink-0 items-center justify-center gap-1 rounded-full border border-line px-4 text-[13px] font-medium text-ink-muted hover:text-ink">
          <IconChevronLeft className="h-4 w-4" />
          Back
        </button>
      )}
      <Button tone="primary" className="flex-1" disabled={disabled} loading={loading} onClick={onNext}>
        {nextLabel}
      </Button>
    </div>
  )
}

const chip = (active: boolean) =>
  `rounded-full px-3.5 py-2 text-[12.5px] font-medium transition ${
    active ? 'bg-ink text-surface' : 'bg-sunken text-ink-muted hover:bg-line-soft'
  }`

// -- template preview -----------------------------------------------------------------

/** The logical width the real storefront blocks are laid out at — the same
 *  numbers the builder's canvas and the live shop use. The preview renders at
 *  this width and is scaled down to fit, so what a merchant sees is the real
 *  homepage, shrunk, not a redrawn guess at what it looks like. */
const PREVIEW_WIDTH = 1280

function TemplatePreview({ template, accent, large }: { template: Template; accent?: string; large?: boolean }) {
  const wrapRef = useState<HTMLDivElement | null>(null)
  const [node, setNode] = wrapRef
  const [scale, setScale] = useState(0)

  useEffect(() => {
    if (!node) return
    const measure = () => setScale(node.clientWidth / PREVIEW_WIDTH)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [node])

  const c = template.colors
  const accentColor = accent || c.accent
  const radius = RADIUS[template.corner_style] ?? '10px'
  const height = large ? 340 : 190

  return (
    <div
      ref={setNode}
      className="relative w-full overflow-hidden border border-line"
      style={{ height, background: c.background, borderRadius: radius }}
    >
      {template.home_preview.length === 0 || scale === 0 ? (
        <div className="flex h-full items-center justify-center text-[11px] text-ink-faint">Loading preview…</div>
      ) : (
        <div
          className="shop-surface absolute left-0 top-0 origin-top-left"
          data-scale={template.style.scale}
          data-tracking={template.style.tracking}
          data-case={template.style.case}
          data-rhythm={template.style.rhythm}
          data-edge={template.style.edge}
          data-texture={template.style.texture}
          data-measure={template.style.measure}
          style={
            {
              width: PREVIEW_WIDTH,
              transform: `scale(${scale})`,
              pointerEvents: 'none',
              background: c.background,
              color: c.text,
              fontFamily: `"${template.fonts.body}", ui-sans-serif, system-ui, sans-serif`,
              fontSize: 15,
              '--shop-bg': c.background,
              '--shop-surface': c.surface,
              '--shop-text': c.text,
              '--shop-muted': c.muted,
              '--shop-line': c.border,
              '--shop-primary': c.primary,
              '--shop-accent': accentColor,
              '--shop-radius': radius,
              '--shop-heading-font': `"${template.fonts.heading}", ui-serif, Georgia, serif`,
            } as React.CSSProperties
          }
        >
          <RenderBlocks blocks={template.home_preview} context={PREVIEW_CONTEXT} />
        </div>
      )}
    </div>
  )
}

// -- steps ------------------------------------------------------------------------------

const TOTAL_STEPS = 12

export default function CreateStore({ templates, categories }: Props) {
  const { errors } = useShared()
  const [step, setStep] = useState(0)
  const [touchedSlug, setTouchedSlug] = useState(false)
  const [busy, setBusy] = useState(false)
  const [fontsLoaded, setFontsLoaded] = useState(false)
  const [data, setData] = useState<Data>({
    name: '', slug: '', currency: 'NGN', country: 'NG', category: 'all', template: '',
    accent: '', logo: '', announcement: '', product: { title: '', price: '', image: '' },
    discountCode: '', discountPercent: '15', invites: [],
  })

  const set = <K extends keyof Data>(key: K, value: Data[K]) => setData((d) => ({ ...d, [key]: value }))
  const setProduct = (patch: Partial<Data['product']>) => setData((d) => ({ ...d, product: { ...d.product, ...patch } }))
  const next = () => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1))
  const back = () => setStep((s) => Math.max(0, s - 1))

  useEffect(() => {
    const families = [...new Set(templates.map((t) => t.fonts.heading))]
    const href = 'https://fonts.googleapis.com/css2?' + families.map((f) => `family=${f.replace(/ /g, '+')}:wght@600;700`).join('&') + '&display=swap'
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.onload = () => setFontsLoaded(true)
    link.onerror = () => setFontsLoaded(true)
    document.head.appendChild(link)
  }, [templates])

  const shownTemplates = useMemo(
    () => (data.category === 'all' ? templates : templates.filter((t) => t.category === data.category)),
    [templates, data.category],
  )
  const presentCategories = useMemo(() => new Set(templates.map((t) => t.category)), [templates])
  const chosenTemplate = templates.find((t) => t.key === data.template)
  const accentOptions = useMemo(
    () => [...new Set([chosenTemplate?.colors.accent, ...ACCENTS].filter(Boolean) as string[])],
    [chosenTemplate],
  )

  function launch() {
    setBusy(true)
    router.post(
      '/onboarding/store',
      {
        name: data.name,
        slug: data.slug,
        currency: data.currency,
        country: data.country,
        template: data.template,
        colors: data.accent ? { accent: data.accent } : undefined,
        product: data.product.title.trim() ? data.product : undefined,
        logo: data.logo || undefined,
        announcement: data.announcement.trim() || undefined,
        discount: data.discountCode.trim() ? { code: data.discountCode, percent: Number(data.discountPercent) || 15 } : undefined,
        invites: data.invites.length ? data.invites : undefined,
      },
      { onFinish: () => setBusy(false) },
    )
  }

  async function onLogoFile(file: File) {
    if (!file.type.startsWith('image/')) return
    set('logo', await downscale(file, 600))
  }

  async function onProductFile(file: File) {
    if (!file.type.startsWith('image/')) return
    setProduct({ image: await downscale(file, 1200) })
  }

  // -- step 0: name -----------------------------------------------------------------
  if (step === 0) {
    return (
      <StepShell index={0} total={TOTAL_STEPS} blob="sage" icon={<IconStore className="h-5 w-5" />} eyebrow="Let's build your store" title="What should we call it?">
        <Field error={errors.name}>
          <Input
            autoFocus
            value={data.name}
            invalid={Boolean(errors.name)}
            placeholder="Northwind Supply"
            className="!h-14 !text-[18px]"
            onChange={(e) => {
              const value = e.target.value
              setData((d) => ({ ...d, name: value, slug: touchedSlug ? d.slug : slugify(value) }))
            }}
            onKeyDown={(e) => e.key === 'Enter' && data.name.trim() && next()}
          />
        </Field>
        <Nav onNext={next} disabled={!data.name.trim()} />
      </StepShell>
    )
  }

  // -- step 1: address ----------------------------------------------------------------
  if (step === 1) {
    return (
      <StepShell index={1} total={TOTAL_STEPS} blob="clay" icon={<IconGlobe className="h-5 w-5" />} eyebrow="Your web address" title="Where will shoppers find you?">
        <Field error={errors.slug}>
          <div className="flex h-14 items-center overflow-hidden rounded-2xl border border-transparent bg-sunken pl-4 pr-1 text-[15px] focus-within:border-brand">
            <Input
              autoFocus
              value={data.slug}
              invalid={Boolean(errors.slug)}
              className="!h-full !border-0 !bg-transparent !p-0 !text-[15px] font-medium"
              onChange={(e) => { setTouchedSlug(true); set('slug', slugify(e.target.value)) }}
              onKeyDown={(e) => e.key === 'Enter' && data.slug.length >= 3 && next()}
            />
            <span className="shrink-0 whitespace-nowrap pr-3 text-ink-faint">.shop.localhost</span>
          </div>
        </Field>
        <Nav onBack={back} onNext={next} disabled={data.slug.length < 3} />
      </StepShell>
    )
  }

  // -- step 2: category ---------------------------------------------------------------
  if (step === 2) {
    return (
      <StepShell
        index={2} total={TOTAL_STEPS} blob="taupe" icon={<IconTag className="h-5 w-5" />}
        eyebrow="Two second question" title="What are you selling?"
        subtitle="This just picks better starting templates for you."
        skip={next}
      >
        <div className="grid grid-cols-2 gap-2">
          {categories.filter((k) => presentCategories.has(k)).map((key) => {
            const Icon = HEARD_ICON[key] ?? IconStore
            return (
              <button
                key={key}
                type="button"
                onClick={() => { set('category', key); next() }}
                className="flex items-center gap-2.5 rounded-2xl bg-sunken px-3.5 py-3 text-left text-[13px] font-medium text-ink transition hover:bg-line-soft"
              >
                <Icon className="h-4 w-4 shrink-0 text-ink-muted" />
                {CATEGORY_LABELS[key] ?? key}
              </button>
            )
          })}
        </div>
      </StepShell>
    )
  }

  // -- step 3: currency/country --------------------------------------------------------
  if (step === 3) {
    return (
      <StepShell index={3} total={TOTAL_STEPS} blob="sage" icon={<IconBag className="h-5 w-5" />} eyebrow="Getting paid" title="Where are you selling from?">
        <div className="grid grid-cols-2 gap-2">
          {CURRENCIES.map(([code, label, country, flag]) => (
            <button
              key={code}
              type="button"
              onClick={() => setData((d) => ({ ...d, currency: code, country }))}
              className={`flex flex-col items-start gap-1 rounded-2xl border px-4 py-3 text-left transition ${
                data.currency === code ? 'border-brand bg-brand-soft' : 'border-transparent bg-sunken hover:bg-line-soft'
              }`}
            >
              <span className="text-[20px] leading-none">{flag}</span>
              <span className="text-[13px] font-semibold text-ink">{code}</span>
              <span className="text-[11.5px] text-ink-muted">{label}</span>
            </button>
          ))}
        </div>
        {errors.currency && <p className="mt-2 text-[12.5px] text-critical">{errors.currency}</p>}
        <Nav onBack={back} onNext={next} />
      </StepShell>
    )
  }

  // -- step 4: template ------------------------------------------------------------------
  if (step === 4) {
    return (
      <StepShell
        index={4} total={TOTAL_STEPS} blob="clay" icon={<IconLayout className="h-5 w-5" />}
        eyebrow={`${templates.length} real templates`} title="Pick a look for your store"
        subtitle="Every one of these is a real, finished storefront — colours, fonts and a whole site."
        skip={next}
      >
        <div className="mb-3 flex flex-wrap gap-1.5">
          <button type="button" onClick={() => set('category', 'all')} className={chip(data.category === 'all')}>All</button>
          {categories.filter((k) => presentCategories.has(k)).map((key) => (
            <button key={key} type="button" onClick={() => set('category', key)} className={chip(data.category === key)}>
              {CATEGORY_LABELS[key] ?? key}
            </button>
          ))}
        </div>
        <div className={`grid max-h-[440px] grid-cols-2 gap-3 overflow-y-auto pr-1 transition-opacity ${fontsLoaded ? 'opacity-100' : 'opacity-0'}`}>
          {shownTemplates.map((template) => {
            const active = data.template === template.key
            return (
              <button
                key={template.key}
                type="button"
                onClick={() => { set('template', active ? '' : template.key); if (!data.accent) set('accent', '') }}
                className={`rounded-2xl p-1.5 text-left transition ${active ? 'bg-ink' : 'bg-transparent hover:bg-sunken'}`}
              >
                <TemplatePreview template={template} />
                <p className={`mt-2 px-1 text-[12.5px] font-semibold ${active ? 'text-surface' : 'text-ink'}`}>{template.name}</p>
                <p className={`px-1 text-[11px] leading-snug ${active ? 'text-surface/70' : 'text-ink-muted'}`}>{template.suits}</p>
              </button>
            )
          })}
        </div>
        <Nav onBack={back} onNext={next} nextLabel={chosenTemplate ? `Use ${chosenTemplate.name}` : 'Continue'} />
      </StepShell>
    )
  }

  // -- step 5: colour ------------------------------------------------------------------
  if (step === 5) {
    const preview = chosenTemplate ?? templates[0]
    return (
      <StepShell
        index={5} total={TOTAL_STEPS} blob="taupe" icon={<IconStore className="h-5 w-5" />}
        eyebrow="Make it yours" title="Pick an accent colour"
        subtitle="Watch your own storefront change as you pick."
        skip={next}
      >
        {preview && <TemplatePreview template={preview} accent={data.accent || undefined} large />}
        <div className="mt-4 flex flex-wrap gap-3">
          {accentOptions.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={color}
              onClick={() => set('accent', color)}
              className="flex h-12 w-12 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-surface transition"
              style={{ background: color, ringColor: (data.accent || chosenTemplate?.colors.accent) === color ? 'var(--color-ink)' : 'transparent' } as never}
            >
              {(data.accent || chosenTemplate?.colors.accent) === color && <span className="h-2.5 w-2.5 rounded-full bg-white" />}
            </button>
          ))}
          <label className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-line text-[9px] text-ink-muted">
            Custom
            <input type="color" className="sr-only" onChange={(e) => set('accent', e.target.value)} />
          </label>
        </div>
        <Nav onBack={back} onNext={next} />
      </StepShell>
    )
  }

  // -- step 6: logo --------------------------------------------------------------------
  if (step === 6) {
    return (
      <StepShell index={6} total={TOTAL_STEPS} blob="sage" icon={<IconImage className="h-5 w-5" />} eyebrow="Branding" title="Add your logo" skip={next}>
        <label className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line text-ink-muted hover:border-brand hover:text-brand">
          {data.logo ? (
            <img src={data.logo} alt="Logo preview" className="max-h-28 max-w-[70%] object-contain" />
          ) : (
            <>
              <IconPlus className="h-6 w-6" />
              <span className="text-[13px] font-medium">Upload an image</span>
            </>
          )}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onLogoFile(f) }} />
        </label>
        {data.logo && (
          <button type="button" className="mt-2 text-[12px] text-ink-muted underline" onClick={() => set('logo', '')}>Remove</button>
        )}
        <Nav onBack={back} onNext={next} />
      </StepShell>
    )
  }

  // -- step 7: announcement -------------------------------------------------------------
  if (step === 7) {
    return (
      <StepShell index={7} total={TOTAL_STEPS} blob="clay" icon={<IconMegaphone className="h-5 w-5" />} eyebrow="One more touch" title="Got an announcement?" subtitle="Shows in a bar across the top of your shop." skip={next}>
        <Input
          autoFocus
          value={data.announcement}
          maxLength={200}
          placeholder="Free shipping on orders over $50"
          onChange={(e) => set('announcement', e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && next()}
        />
        {data.announcement && (
          <div className="mt-3 rounded-xl px-3 py-2 text-center text-[12.5px] font-medium" style={{ background: data.accent || chosenTemplate?.colors.primary || '#111', color: '#fff' }}>
            {data.announcement}
          </div>
        )}
        <Nav onBack={back} onNext={next} />
      </StepShell>
    )
  }

  // -- step 8: first product ------------------------------------------------------------
  if (step === 8) {
    return (
      <StepShell
        index={8} total={TOTAL_STEPS} blob="taupe" icon={<IconProduct className="h-5 w-5" />}
        eyebrow="Almost there" title="Add your first product"
        subtitle="A store with something in it is a store people can actually buy from."
        skip={next}
      >
        <div className="flex gap-3">
          <label className="flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-line text-ink-muted hover:border-brand hover:text-brand">
            {data.product.image ? (
              <img src={data.product.image} alt="" className="h-full w-full rounded-2xl object-cover" />
            ) : (
              <IconImage className="h-5 w-5" />
            )}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onProductFile(f) }} />
          </label>
          <div className="flex-1 space-y-2.5">
            <Input placeholder="Product name" value={data.product.title} onChange={(e) => setProduct({ title: e.target.value })} />
            <Input
              placeholder={`Price (${data.currency})`}
              inputMode="decimal"
              value={data.product.price}
              onChange={(e) => setProduct({ price: e.target.value.replace(/[^0-9.]/g, '') })}
            />
          </div>
        </div>
        <Nav onBack={back} onNext={next} nextLabel={data.product.title.trim() ? 'Continue' : 'Continue'} />
      </StepShell>
    )
  }

  // -- step 9: launch discount -----------------------------------------------------------
  if (step === 9) {
    return (
      <StepShell
        index={9} total={TOTAL_STEPS} blob="clay" icon={<IconTag className="h-5 w-5" />}
        eyebrow="Marketing, started" title="Create a launch discount code"
        subtitle="A code ready for the first customers you tell about this."
        skip={next}
      >
        <div className="flex gap-2.5">
          <Input
            autoFocus
            placeholder="LAUNCH15"
            value={data.discountCode}
            className="flex-1 font-mono uppercase tracking-wide"
            onChange={(e) => set('discountCode', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          />
          <div className="flex h-12 w-24 shrink-0 items-center overflow-hidden rounded-2xl bg-sunken px-3">
            <input
              type="number" min={1} max={90} value={data.discountPercent}
              className="w-full bg-transparent text-[14px] outline-none"
              onChange={(e) => set('discountPercent', e.target.value)}
            />
            <span className="text-ink-faint">%</span>
          </div>
        </div>
        {data.discountCode.trim() && (
          <p className="mt-2.5 text-[12.5px] text-ink-muted">
            Shoppers who enter <span className="font-mono font-semibold text-ink">{data.discountCode}</span> get {data.discountPercent || 15}% off.
          </p>
        )}
        <Nav onBack={back} onNext={next} />
      </StepShell>
    )
  }

  // -- step 10: invite your team ----------------------------------------------------------
  if (step === 10) {
    return (
      <StepShell
        index={10} total={TOTAL_STEPS} blob="taupe" icon={<IconUser className="h-5 w-5" />}
        eyebrow="You don't have to run this alone" title="Invite your team"
        subtitle="They'll get access as a manager as soon as they accept."
        skip={next}
      >
        <div className="space-y-2">
          {data.invites.map((email, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                type="email"
                value={email}
                placeholder="teammate@example.com"
                onChange={(e) => {
                  const invites = [...data.invites]
                  invites[i] = e.target.value
                  set('invites', invites)
                }}
              />
              <button
                type="button"
                aria-label="Remove"
                onClick={() => set('invites', data.invites.filter((_, idx) => idx !== i))}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-faint hover:bg-sunken hover:text-critical"
              >
                <IconTrash className="h-4 w-4" />
              </button>
            </div>
          ))}
          {data.invites.length < 4 && (
            <button
              type="button"
              onClick={() => set('invites', [...data.invites, ''])}
              className="flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-line py-3 text-[12.5px] font-medium text-ink-muted hover:border-brand hover:text-brand"
            >
              <IconPlus className="h-3.5 w-3.5" />
              Add a teammate
            </button>
          )}
        </div>
        <Nav onBack={back} onNext={next} />
      </StepShell>
    )
  }

  // -- step 11: review & launch ----------------------------------------------------------
  const summary: { label: string; value: string }[] = [
    { label: 'Store', value: data.name },
    { label: 'Address', value: `${data.slug}.shop.localhost` },
    { label: 'Currency', value: data.currency },
    { label: 'Template', value: chosenTemplate?.name ?? 'Default look' },
  ]
  if (data.product.title.trim()) summary.push({ label: 'First product', value: data.product.title })
  if (data.discountCode.trim()) summary.push({ label: 'Discount code', value: `${data.discountCode} (${data.discountPercent || 15}%)` })
  const validInvites = data.invites.map((e) => e.trim()).filter(Boolean)
  if (validInvites.length) summary.push({ label: 'Invited', value: validInvites.join(', ') })

  return (
    <StepShell index={11} total={TOTAL_STEPS} blob="sage" icon={<IconDownload className="h-5 w-5" />} eyebrow="Ready" title={`${data.name || 'Your store'} is ready to launch`}>
      <div className="space-y-1.5 rounded-2xl bg-sunken p-4">
        {summary.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 text-[13px]">
            <span className="shrink-0 text-ink-muted">{row.label}</span>
            <span className="max-w-[65%] truncate font-medium text-ink">{row.value}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12px] text-ink-muted">
        Payouts are the one thing you'll do after this — connect a bank account once you're in, and you're open for business.
      </p>
      <Nav onBack={back} onNext={launch} nextLabel="Create my store" loading={busy} />
    </StepShell>
  )
}
