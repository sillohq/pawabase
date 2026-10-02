/**
 * The navbar block — the shop's header, as a component a merchant builds.
 *
 * It used to be hard-coded into `ShopLayout`, which is why every shop had the
 * same header whatever template it wore. Now it is a block like any other:
 * five layouts, a choice of icons, optional search and actions, and it is
 * drawn by this one function on both the live shop and the builder's canvas.
 *
 * Every prop may be missing. A store with no built header gets `DEFAULT_NAVBAR`
 * (the classic layout, drawn from the Site panel's logo and links), and a block
 * saved before a field existed keeps working — each read below has its default.
 *
 * Nothing here reads Inertia's page props. The canvas renders in an iframe
 * outside Inertia's tree, so everything the navbar needs — the store's name,
 * logo, navigation and basket count — arrives through `context.shop`.
 */

import { Link } from '@inertiajs/react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import {
  IconBag,
  IconBasket,
  IconCart,
  IconClose,
  IconHeart,
  IconHome,
  IconMail,
  IconMenu,
  IconMenuAlt,
  IconPhone,
  IconPin,
  IconSearch,
  IconSearchAlt,
  IconStore,
  IconUser,
} from '@/views/ui/icons'
import type { BlockContext, BlockNode } from '@/views/ui/blocks'

type Props = Record<string, unknown>
type NavLinkItem = { label: string; url: string }

function str(props: Props, key: string, fallback = ''): string {
  const value = props[key]
  return typeof value === 'string' && value !== '' ? value : fallback
}

function flag(props: Props, key: string, fallback: boolean): boolean {
  const value = props[key]
  return typeof value === 'boolean' ? value : fallback
}

function items<T>(props: Props, key: string): T[] {
  const value = props[key]
  return Array.isArray(value) ? (value as T[]) : []
}

const CART_ICONS = { cart: IconCart, bag: IconBag, basket: IconBasket }
const SEARCH_ICONS = { search: IconSearch, 'search-alt': IconSearchAlt }
const MENU_ICONS = { menu: IconMenu, 'menu-alt': IconMenuAlt }
const ACTION_ICONS = {
  user: IconUser,
  heart: IconHeart,
  phone: IconPhone,
  mail: IconMail,
  pin: IconPin,
  store: IconStore,
  home: IconHome,
}

const HEIGHT = { compact: 'h-12', regular: 'h-16', tall: 'h-20' } as const
const LOGO_HEIGHT = { sm: 'h-5', md: 'h-7', lg: 'h-10' } as const

/** A link that navigates on the shop and does nothing on the canvas. */
function NavLink({
  href,
  editing,
  className,
  style,
  children,
  label,
}: {
  href: string
  editing?: boolean
  className?: string
  style?: React.CSSProperties
  children: ReactNode
  label?: string
}) {
  if (editing || !href) {
    return (
      <span className={className} style={style} aria-label={label}>
        {children}
      </span>
    )
  }
  if (/^(https?:|mailto:|tel:)/i.test(href)) {
    return (
      <a href={href} className={className} style={style} aria-label={label}>
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className={className} style={style} aria-label={label}>
      {children}
    </Link>
  )
}

export function Navbar({ block, context }: { block: BlockNode; context: BlockContext }) {
  const { props } = block
  const editing = Boolean(context.editing)
  const shop = context.shop ?? { name: '', logo_url: null, header_links: [], cart_count: 0 }
  const [open, setOpen] = useState(false)

  const variant = str(props, 'variant', 'classic')
  const background = str(props, 'background', 'blur')
  const border = str(props, 'border', 'line')
  const height = HEIGHT[str(props, 'height', 'regular') as keyof typeof HEIGHT] ?? HEIGHT.regular
  const wide = str(props, 'width', 'contained') === 'full'
  const sticky = flag(props, 'sticky', true)
  const minimal = variant === 'minimal'
  const floating = variant === 'floating'

  const onPrimary = background === 'primary'
  const ink = onPrimary ? 'var(--shop-bg)' : 'inherit'

  const barStyle: React.CSSProperties = {
    color: ink,
    background:
      background === 'solid'
        ? 'var(--shop-bg)'
        : background === 'transparent'
          ? 'transparent'
          : onPrimary
            ? 'var(--shop-primary)'
            : 'color-mix(in srgb, var(--shop-bg) 94%, transparent)',
    borderBottom: border === 'line' && !floating ? '1px solid var(--shop-line)' : undefined,
    boxShadow: border === 'shadow' ? '0 6px 24px -12px rgb(0 0 0 / .25)' : undefined,
  }

  /* -- pieces --------------------------------------------------------- */

  const logoMode = str(props, 'logo_mode', 'auto')
  const logoImage =
    logoMode === 'image' ? str(props, 'logo_image') : logoMode === 'auto' ? shop.logo_url ?? '' : ''
  const logoText = logoMode === 'text' ? str(props, 'logo_text', shop.name) : shop.name
  const logoHeight = LOGO_HEIGHT[str(props, 'logo_size', 'md') as keyof typeof LOGO_HEIGHT] ?? LOGO_HEIGHT.md

  const brand = (
    <NavLink href="/" editing={editing} className="shrink-0" label={shop.name}>
      {logoImage ? (
        <img src={logoImage} alt={shop.name} className={`${logoHeight} w-auto`} />
      ) : (
        <span
          className="text-[17px] font-semibold tracking-[-0.015em]"
          style={{ fontFamily: 'var(--shop-heading-font)' }}
        >
          {logoText}
        </span>
      )}
    </NavLink>
  )

  const links: NavLinkItem[] =
    str(props, 'links_source', 'site') === 'custom'
      ? items<NavLinkItem>(props, 'links').filter((link) => link.label)
      : shop.header_links
  const linkStyle = str(props, 'link_style', 'plain')
  const linkClass =
    linkStyle === 'pill'
      ? 'rounded-full px-3 py-1.5 transition hover:bg-[color-mix(in_srgb,currentColor_10%,transparent)]'
      : linkStyle === 'underline'
        ? 'underline-offset-[6px] decoration-2 decoration-transparent transition hover:underline hover:decoration-current'
        : 'transition-opacity hover:opacity-60'

  const nav = links.length > 0 && (
    <nav className="flex items-center gap-1 text-[14px]" aria-label="Main">
      {links.map((link) => (
        <NavLink key={`${link.label}${link.url}`} href={link.url} editing={editing} className={`${linkClass} px-2 py-1`}>
          {link.label}
        </NavLink>
      ))}
    </nav>
  )

  const showSearch = flag(props, 'show_search', true)
  const searchBar = str(props, 'search_style', 'icon') === 'bar'
  const SearchGlyph = SEARCH_ICONS[str(props, 'search_icon', 'search') as keyof typeof SEARCH_ICONS] ?? IconSearch

  const searchField = (className = '') => (
    <form
      action="/search"
      method="get"
      role="search"
      onSubmit={(event) => editing && event.preventDefault()}
      className={`relative ${className}`}
    >
      <SearchGlyph className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
      <input
        name="q"
        type="search"
        placeholder={str(props, 'search_placeholder', 'Search the shop')}
        aria-label="Search"
        className="h-9 w-full rounded-full border bg-transparent pl-9 pr-3 text-[13px] outline-none placeholder:opacity-60 focus:border-current"
        style={{ borderColor: onPrimary ? 'currentColor' : 'var(--shop-line)' }}
      />
    </form>
  )

  const iconButton = 'relative rounded-full p-2 transition-opacity hover:opacity-60'

  const CartGlyph = CART_ICONS[str(props, 'cart_icon', 'cart') as keyof typeof CART_ICONS] ?? IconCart
  const count = shop.cart_count ?? 0

  const extras = items<{ icon: string; label: string; url: string }>(props, 'actions')

  const actions = (
    <div className="flex items-center gap-0.5">
      {showSearch && !searchBar && (
        <NavLink href="/search" editing={editing} className={iconButton} label="Search">
          <SearchGlyph className="h-[18px] w-[18px]" />
        </NavLink>
      )}
      {extras.map((action, index) => {
        const Glyph = ACTION_ICONS[action.icon as keyof typeof ACTION_ICONS] ?? IconUser
        return (
          // Beyond the first two, extra buttons move into the menu on a phone:
          // a row of five icons beside a logo does not fit at 360px.
          <NavLink
            key={index}
            href={action.url}
            editing={editing}
            className={`${iconButton} ${index >= 2 ? 'hidden sm:inline-block' : ''}`}
            label={action.label || action.icon}
          >
            <Glyph className="h-[18px] w-[18px]" />
          </NavLink>
        )
      })}
      {flag(props, 'show_cart', true) && (
        <NavLink href="/cart" editing={editing} className={iconButton} label="Basket">
          <CartGlyph className="h-[18px] w-[18px]" />
          {flag(props, 'show_cart_count', true) && count > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold"
              style={{ background: 'var(--shop-accent)', color: 'var(--shop-bg)' }}
            >
              {count}
            </span>
          )}
        </NavLink>
      )}
    </div>
  )

  const ctaLabel = str(props, 'cta_label')
  const cta = ctaLabel && (
    <NavLink
      href={str(props, 'cta_url')}
      editing={editing}
      className="hidden shrink-0 rounded-full px-4 py-2 text-[13px] font-medium transition-opacity hover:opacity-85 md:inline-block"
      style={
        onPrimary
          ? { background: 'var(--shop-bg)', color: 'var(--shop-primary)' }
          : { background: 'var(--shop-primary)', color: 'var(--shop-bg)' }
      }
    >
      {ctaLabel}
    </NavLink>
  )

  const MenuGlyph = MENU_ICONS[str(props, 'menu_icon', 'menu') as keyof typeof MENU_ICONS] ?? IconMenu
  const menuButton = (always: boolean) => (
    <button
      type="button"
      onClick={() => setOpen((value) => !value)}
      aria-expanded={open}
      aria-label={open ? 'Close menu' : 'Open menu'}
      className={`${iconButton} ${always ? '' : 'md:hidden'}`}
    >
      {open ? <IconClose className="h-5 w-5" /> : <MenuGlyph className="h-5 w-5" />}
    </button>
  )

  const drawer = open && (
    <div
      className={`border-t px-4 pb-4 pt-3 ${minimal ? '' : 'md:hidden'}`}
      style={{ borderColor: onPrimary ? 'currentColor' : 'var(--shop-line)' }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3">
        {showSearch && searchField()}
        <nav className="flex flex-col text-[15px]" aria-label="Menu">
          {links.map((link) => (
            <NavLink
              key={`m${link.label}${link.url}`}
              href={link.url}
              editing={editing}
              className="border-b py-3 last:border-b-0"
              style={{ borderColor: onPrimary ? 'currentColor' : 'var(--shop-line)' }}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        {extras.length > 2 && (
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[14px] sm:hidden">
            {extras.slice(2).map((action, index) => {
              const Glyph = ACTION_ICONS[action.icon as keyof typeof ACTION_ICONS] ?? IconUser
              return (
                <NavLink key={index} href={action.url} editing={editing} className="flex items-center gap-2 py-1">
                  <Glyph className="h-4 w-4" />
                  {action.label || action.icon}
                </NavLink>
              )
            })}
          </div>
        )}
        {ctaLabel && (
          <NavLink
            href={str(props, 'cta_url')}
            editing={editing}
            className="rounded-full px-4 py-2.5 text-center text-[14px] font-medium"
            style={
              onPrimary
                ? { background: 'var(--shop-bg)', color: 'var(--shop-primary)' }
                : { background: 'var(--shop-primary)', color: 'var(--shop-bg)' }
            }
          >
            {ctaLabel}
          </NavLink>
        )}
      </div>
    </div>
  )

  const inner = `mx-auto flex w-full items-center ${wide ? 'px-6' : 'max-w-6xl px-4'}`
  const searchInline = showSearch && searchBar

  /* -- layouts -------------------------------------------------------- */

  let row: ReactNode
  if (variant === 'split') {
    row = (
      <div className={`${inner} ${height} grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-4`}>
        <div className="flex items-center gap-2">
          {menuButton(false)}
          <div className="hidden md:block">{nav}</div>
        </div>
        {brand}
        <div className="flex items-center justify-end gap-2">
          {searchInline && searchField('hidden w-44 lg:block')}
          {actions}
          {cta}
        </div>
      </div>
    )
  } else if (variant === 'stacked') {
    row = (
      <>
        <div className={`${inner} ${height} grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-4`}>
          <div className="flex items-center">
            {menuButton(false)}
            {searchInline && searchField('hidden w-52 md:block')}
          </div>
          {brand}
          <div className="flex items-center justify-end gap-2">
            {actions}
            {cta}
          </div>
        </div>
        {nav && (
          <div
            className="hidden justify-center py-2.5 md:flex"
            style={{ borderTop: border === 'none' ? undefined : `1px solid ${onPrimary ? 'currentColor' : 'var(--shop-line)'}` }}
          >
            {nav}
          </div>
        )}
      </>
    )
  } else if (minimal) {
    row = (
      <div className={`${inner} ${height} grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-4`}>
        <div className="flex items-center">{menuButton(true)}</div>
        {brand}
        <div className="flex items-center justify-end gap-2">{actions}</div>
      </div>
    )
  } else {
    // classic, and the body of floating
    row = (
      <div className={`${inner} ${height} gap-6`}>
        {brand}
        <div className="hidden flex-1 md:block">{nav}</div>
        <div className="ml-auto flex items-center gap-2">
          {searchInline && searchField('hidden w-48 lg:block')}
          {actions}
          {cta}
          {menuButton(false)}
        </div>
      </div>
    )
  }

  const stickyClass = sticky ? 'sticky top-0 z-30' : 'relative z-30'

  if (floating) {
    return (
      <header className={`${stickyClass} px-3 pt-3`}>
        <div
          className="mx-auto max-w-6xl overflow-hidden border backdrop-blur"
          style={{
            ...barStyle,
            borderBottom: undefined,
            borderColor: border === 'none' ? 'transparent' : 'var(--shop-line)',
            borderRadius: 'max(var(--shop-radius), 18px)',
            boxShadow: border === 'none' ? undefined : '0 10px 30px -14px rgb(0 0 0 / .3)',
          }}
        >
          {row}
          {drawer}
        </div>
      </header>
    )
  }

  return (
    <header className={`${stickyClass} ${background === 'blur' ? 'backdrop-blur' : ''}`} style={barStyle}>
      {row}
      {drawer}
    </header>
  )
}

export function renderNavbar(block: BlockNode, context: BlockContext): ReactNode {
  return <Navbar block={block} context={context} />
}

/** What a store with no built header gets: the classic bar, from the Site panel. */
export const DEFAULT_NAVBAR: BlockNode = {
  id: 'default-navbar',
  type: 'navbar',
  props: {},
  children: [],
}


/* ==========================================================================
 * The parts
 *
 * The navbar above is one ready-made arrangement. Everything below is the same
 * ingredients as blocks of their own, so a merchant can arrange them however
 * they like inside a `header_bar` — or put one on its own, anywhere. Each part
 * reads only its own props and `context.shop`, so it works in a bar, in a
 * section, or loose at the root of the header.
 * ======================================================================== */

const BUTTON_PAD = { sm: 'p-1.5', md: 'p-2', lg: 'p-2.5' } as const
const GLYPH_SIZE = { sm: 'h-4 w-4', md: 'h-[18px] w-[18px]', lg: 'h-5 w-5' } as const
const LOGO_TEXT = { sm: 'text-[15px]', md: 'text-[17px]', lg: 'text-[22px]', xl: 'text-[28px]' } as const
const LOGO_IMG = { sm: 'h-5', md: 'h-7', lg: 'h-10', xl: 'h-14' } as const

/** How a round button looks: bare icon, outlined, or filled with the brand colour. */
function buttonSkin(style: string): { className: string; style?: React.CSSProperties } {
  if (style === 'filled') {
    return {
      className: 'rounded-full transition-opacity hover:opacity-85',
      style: { background: 'var(--shop-primary)', color: 'var(--shop-bg)' },
    }
  }
  if (style === 'outline') {
    return {
      className: 'rounded-full border transition-opacity hover:opacity-70',
      style: { borderColor: 'currentColor' },
    }
  }
  return { className: 'rounded-full transition-opacity hover:opacity-60' }
}

export function SiteLogo({ block, context }: { block: BlockNode; context: BlockContext }) {
  const { props } = block
  const shop = context.shop ?? { name: '', logo_url: null, header_links: [], cart_count: 0 }
  const mode = str(props, 'logo_mode', 'auto')
  const image = mode === 'image' ? str(props, 'logo_image') : mode === 'auto' ? shop.logo_url ?? '' : ''
  const text = mode === 'text' ? str(props, 'logo_text', shop.name) : shop.name
  const size = str(props, 'logo_size', 'md') as keyof typeof LOGO_IMG
  return (
    <NavLink href="/" editing={context.editing} className="shrink-0" label={shop.name}>
      {image ? (
        <img src={image} alt={shop.name} className={`${LOGO_IMG[size] ?? LOGO_IMG.md} w-auto`} />
      ) : (
        <span
          className={`${LOGO_TEXT[size] ?? LOGO_TEXT.md} font-semibold tracking-[-0.015em]`}
          style={{ fontFamily: 'var(--shop-heading-font)' }}
        >
          {text}
        </span>
      )}
    </NavLink>
  )
}

const LINK_GAP = { sm: 'gap-2', md: 'gap-5', lg: 'gap-9' } as const
const LINK_TEXT = { sm: 'text-[13px]', md: 'text-[14px]', lg: 'text-[16px]' } as const

export function NavLinks({ block, context }: { block: BlockNode; context: BlockContext }) {
  const { props } = block
  const editing = Boolean(context.editing)
  const shop = context.shop ?? { name: '', logo_url: null, header_links: [], cart_count: 0 }
  const [open, setOpen] = useState(false)

  const links: NavLinkItem[] =
    str(props, 'links_source', 'site') === 'custom'
      ? items<NavLinkItem>(props, 'links').filter((link) => link.label)
      : shop.header_links
  if (links.length === 0) {
    return editing ? (
      <span className="text-[12px] opacity-50">Navigation links — add some in the Site panel</span>
    ) : null
  }

  const vertical = str(props, 'orientation', 'horizontal') === 'vertical'
  const collapse = vertical ? 'never' : str(props, 'collapse', 'mobile')
  const style = str(props, 'link_style', 'plain')
  const linkClass =
    style === 'pill'
      ? 'rounded-full px-3 py-1.5 transition hover:bg-[color-mix(in_srgb,currentColor_10%,transparent)]'
      : style === 'underline'
        ? 'underline-offset-[6px] decoration-2 decoration-transparent transition hover:underline hover:decoration-current'
        : style === 'caps'
          ? 'text-[0.85em] font-medium uppercase tracking-[0.12em] transition-opacity hover:opacity-60'
          : 'transition-opacity hover:opacity-60'
  const textClass = LINK_TEXT[str(props, 'text_size', 'md') as keyof typeof LINK_TEXT] ?? LINK_TEXT.md
  const gap = LINK_GAP[str(props, 'gap', 'md') as keyof typeof LINK_GAP] ?? LINK_GAP.md

  const list = (
    <nav
      className={`${vertical ? 'flex-col items-start' : 'items-center'} flex ${gap} ${textClass}`}
      aria-label="Main"
    >
      {links.map((link) => (
        <NavLink key={`${link.label}${link.url}`} href={link.url} editing={editing} className={linkClass}>
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
  if (collapse === 'never') return list

  const MenuGlyph = MENU_ICONS[str(props, 'menu_icon', 'menu') as keyof typeof MENU_ICONS] ?? IconMenu
  return (
    <>
      {collapse === 'mobile' && <div className="hidden md:block">{list}</div>}
      <div className={`relative ${collapse === 'mobile' ? 'md:hidden' : ''}`}>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="rounded-full p-2 transition-opacity hover:opacity-60"
        >
          {open ? <IconClose className="h-5 w-5" /> : <MenuGlyph className="h-5 w-5" />}
        </button>
        {open && (
          <div
            className="absolute left-0 top-full z-40 mt-2 flex w-60 flex-col rounded-[var(--shop-radius)] border p-2 text-[15px] shadow-xl"
            style={{ background: 'var(--shop-bg)', color: 'var(--shop-text)', borderColor: 'var(--shop-line)' }}
          >
            {links.map((link) => (
              <NavLink
                key={`m${link.label}${link.url}`}
                href={link.url}
                editing={editing}
                className="rounded-[calc(var(--shop-radius)-2px)] px-3 py-2.5 hover:bg-[color-mix(in_srgb,currentColor_8%,transparent)]"
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

const SEARCH_WIDTH = { sm: 'w-36', md: 'w-52', lg: 'w-72', full: 'w-full min-w-0 flex-1' } as const

export function SearchBox({ block, context }: { block: BlockNode; context: BlockContext }) {
  const { props } = block
  const editing = Boolean(context.editing)
  const Glyph = SEARCH_ICONS[str(props, 'search_icon', 'search') as keyof typeof SEARCH_ICONS] ?? IconSearch
  const iconOnly = (
    <NavLink href="/search" editing={editing} className="rounded-full p-2 transition-opacity hover:opacity-60" label="Search">
      <Glyph className="h-[18px] w-[18px]" />
    </NavLink>
  )
  if (str(props, 'search_style', 'bar') === 'icon') return iconOnly

  const width = SEARCH_WIDTH[str(props, 'width', 'md') as keyof typeof SEARCH_WIDTH] ?? SEARCH_WIDTH.md
  return (
    <>
      <div className="lg:hidden">{iconOnly}</div>
      <form
        action="/search"
        method="get"
        role="search"
        onSubmit={(event) => editing && event.preventDefault()}
        className={`relative hidden lg:block ${width}`}
      >
        <Glyph className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60" />
        <input
          name="q"
          type="search"
          placeholder={str(props, 'search_placeholder', 'Search the shop')}
          aria-label="Search"
          className="h-9 w-full rounded-full border bg-transparent pl-9 pr-3 text-[13px] outline-none placeholder:opacity-60 focus:border-current"
          style={{ borderColor: 'var(--shop-line)' }}
        />
      </form>
    </>
  )
}

const FLOAT_POSITION = {
  'bottom-right': 'fixed bottom-5 right-5',
  'bottom-left': 'fixed bottom-5 left-5',
  'top-right': 'fixed right-5 top-5',
  'top-left': 'fixed left-5 top-5',
} as const

export function CartButton({ block, context }: { block: BlockNode; context: BlockContext }) {
  const { props } = block
  const editing = Boolean(context.editing)
  const Glyph = CART_ICONS[str(props, 'cart_icon', 'cart') as keyof typeof CART_ICONS] ?? IconCart
  const count = context.shop?.cart_count ?? 0
  const position = str(props, 'cart_position', 'inline') as keyof typeof FLOAT_POSITION | 'inline'
  const floating = position !== 'inline'
  const label = str(props, 'cart_label')
  const size = str(props, 'cart_size', 'md') as keyof typeof BUTTON_PAD
  // A floating cart is a button in its own right, so it gets a body even when
  // the merchant chose the bare icon — a lone glyph over page content is lost.
  const skin = buttonSkin(floating && str(props, 'cart_style', 'plain') === 'plain' ? 'filled' : str(props, 'cart_style', 'plain'))

  const button = (
    <NavLink
      href="/cart"
      editing={editing}
      label="Basket"
      className={`relative inline-flex items-center gap-2 ${BUTTON_PAD[size] ?? BUTTON_PAD.md} ${label ? 'px-4' : ''} ${skin.className} ${floating ? 'shadow-lg' : ''}`}
      style={skin.style}
    >
      <Glyph className={GLYPH_SIZE[size] ?? GLYPH_SIZE.md} />
      {label && <span className="text-[13px] font-medium">{label}</span>}
      {flag(props, 'show_cart_count', true) && count > 0 && (
        <span
          className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold"
          style={{ background: 'var(--shop-accent)', color: 'var(--shop-bg)' }}
        >
          {count}
        </span>
      )}
    </NavLink>
  )
  if (!floating) return button
  // On the canvas a fixed button would sit on top of the merchant's work and
  // could not be selected around; draw it in place with a note instead.
  if (editing) {
    return (
      <span className="inline-flex flex-col items-start gap-1">
        {button}
        <span className="text-[10px] opacity-60">floats {position.replace('-', ' ')}</span>
      </span>
    )
  }
  return <div className={`${FLOAT_POSITION[position]} z-40`}>{button}</div>
}

export function IconButton({ block, context }: { block: BlockNode; context: BlockContext }) {
  const { props } = block
  const Glyph = ACTION_ICONS[str(props, 'icon', 'user') as keyof typeof ACTION_ICONS] ?? IconUser
  const size = str(props, 'icon_size', 'md') as keyof typeof BUTTON_PAD
  const skin = buttonSkin(str(props, 'icon_style', 'plain'))
  const label = str(props, 'label')
  const shown = flag(props, 'show_label', false) && label
  return (
    <NavLink
      href={str(props, 'url')}
      editing={context.editing}
      label={label || str(props, 'icon', 'user')}
      className={`inline-flex items-center gap-2 ${BUTTON_PAD[size] ?? BUTTON_PAD.md} ${shown ? 'px-4' : ''} ${skin.className}`}
      style={skin.style}
    >
      <Glyph className={GLYPH_SIZE[size] ?? GLYPH_SIZE.md} />
      {shown && <span className="text-[13px] font-medium">{label}</span>}
    </NavLink>
  )
}

const SPACE = { sm: 'w-3', md: 'w-6', lg: 'w-12' } as const

export function FlexSpace({ block }: { block: BlockNode }) {
  const size = str(block.props, 'size', 'grow')
  return <div aria-hidden className={size === 'grow' ? 'min-w-0 flex-1' : `${SPACE[size as keyof typeof SPACE] ?? 'w-6'} shrink-0`} />
}

/** The bar's own chrome — shared by `HeaderBar` so it is not written twice. */
export function barChrome(props: Props): { className: string; style: React.CSSProperties; inner: string; floating: boolean } {
  const background = str(props, 'background', 'blur')
  const border = str(props, 'border', 'line')
  const shape = str(props, 'shape', 'bar')
  const floating = shape !== 'bar'
  const onPrimary = background === 'primary'
  const fill =
    background === 'solid'
      ? 'var(--shop-bg)'
      : background === 'surface'
        ? 'var(--shop-surface)'
        : background === 'transparent'
          ? 'transparent'
          : onPrimary
            ? 'var(--shop-primary)'
            : 'color-mix(in srgb, var(--shop-bg) 94%, transparent)'
  const style: React.CSSProperties = {
    background: fill,
    color: onPrimary ? 'var(--shop-bg)' : 'inherit',
    borderBottom: !floating && border === 'line' ? '1px solid var(--shop-line)' : undefined,
    boxShadow:
      border === 'shadow' || (floating && border !== 'none') ? '0 10px 30px -14px rgb(0 0 0 / .3)' : undefined,
  }
  if (floating) {
    style.border = border === 'none' ? '1px solid transparent' : '1px solid var(--shop-line)'
    style.borderRadius = shape === 'pill' ? '9999px' : 'max(var(--shop-radius), 18px)'
  }
  return {
    className: `${background === 'blur' ? 'backdrop-blur' : ''}`,
    style,
    inner: str(props, 'width', 'contained') === 'full' ? 'px-6' : 'mx-auto max-w-6xl px-4',
    floating,
  }
}

export const renderSiteLogo = (block: BlockNode, context: BlockContext): ReactNode => <SiteLogo block={block} context={context} />
export const renderNavLinks = (block: BlockNode, context: BlockContext): ReactNode => <NavLinks block={block} context={context} />
export const renderSearchBox = (block: BlockNode, context: BlockContext): ReactNode => <SearchBox block={block} context={context} />
export const renderCartButton = (block: BlockNode, context: BlockContext): ReactNode => <CartButton block={block} context={context} />
export const renderIconButton = (block: BlockNode, context: BlockContext): ReactNode => <IconButton block={block} context={context} />
export const renderFlexSpace = (block: BlockNode): ReactNode => <FlexSpace block={block} />
