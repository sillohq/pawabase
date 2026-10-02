/*
 * Icons — Hugeicons, thin (1.5) stroke, no chrome.
 *
 * Every icon in the application renders through here, so weight and sizing
 * stay consistent: a bare stroke glyph, never a filled or boxed badge. Size
 * comes from the caller's `className` (`h-4 w-4`); `strokeWidth` defaults thin.
 *
 * Going through one wrapper rather than importing glyphs at each call site is
 * what stops the set drifting — an icon imported directly somewhere would
 * render at the library's default weight and be visibly heavier than its
 * neighbours.
 *
 * Every icon here sits beside a text label. None of them is the only way to
 * understand a control.
 */
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Album02Icon,
  AlertCircleIcon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  Call02Icon,
  Cancel01Icon,
  ChartLineData01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  CodeIcon,
  ColorsIcon,
  CopyIcon,
  CreditCardIcon,
  Delete02Icon,
  DiscountTag01Icon,
  Download04Icon,
  DragDropIcon,
  EyeIcon,
  File01Icon,
  FilterIcon,
  Globe02Icon,
  GridViewIcon,
  HeartIcon,
  Home01Icon,
  Image02Icon,
  Invoice03Icon,
  Layers01Icon,
  LayoutTable01Icon,
  Link04Icon,
  Loading03Icon,
  Location01Icon,
  Logout03Icon,
  Mail01Icon,
  CustomerService01Icon,
  Megaphone01Icon,
  Menu01Icon,
  Menu02Icon,
  Moon02Icon,
  MoreHorizontalIcon,
  Notification03Icon,
  PackageIcon,
  PencilEdit02Icon,
  PlusSignIcon,
  RefreshIcon,
  Search01Icon,
  Search02Icon,
  Settings02Icon,
  ShoppingBag01Icon,
  ShoppingBag03Icon,
  ShoppingBasket01Icon,
  ShoppingCart01Icon,
  Store01Icon,
  Sun03Icon,
  TruckIcon,
  UserGroupIcon,
  UserCircleIcon,
  ViewIcon,
  ZapIcon,
} from '@hugeicons/core-free-icons'

type IconProps = { className?: string; strokeWidth?: number }

// The library's glyph type is not exported in a form worth threading through
// here; every value passed in comes from the import block above.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function make(glyph: any) {
  return function Icon({ className, strokeWidth = 1.5 }: IconProps) {
    return <HugeiconsIcon icon={glyph} className={className ?? 'h-4 w-4'} strokeWidth={strokeWidth} />
  }
}

/* -- shell ------------------------------------------------------------- */
export const IconHome = make(Home01Icon)
export const IconSearch = make(Search01Icon)
export const IconBell = make(Notification03Icon)
export const IconGrid = make(GridViewIcon)
export const IconLogout = make(Logout03Icon)
export const IconSun = make(Sun03Icon)
export const IconMoon = make(Moon02Icon)
export const IconUser = make(UserCircleIcon)
export const IconSettings = make(Settings02Icon)

/* -- commerce ---------------------------------------------------------- */
export const IconOrders = make(ShoppingBag03Icon)
export const IconCart = make(ShoppingCart01Icon)
export const IconBag = make(ShoppingBag01Icon)
export const IconBasket = make(ShoppingBasket01Icon)
export const IconMenu = make(Menu01Icon)
export const IconMenuAlt = make(Menu02Icon)
export const IconSearchAlt = make(Search02Icon)
export const IconHeart = make(HeartIcon)
export const IconPhone = make(Call02Icon)
export const IconPin = make(Location01Icon)
export const IconProduct = make(PackageIcon)
export const IconInventory = make(Layers01Icon)
export const IconCollection = make(Album02Icon)
export const IconCustomers = make(UserGroupIcon)
export const IconStore = make(Store01Icon)
export const IconTruck = make(TruckIcon)
export const IconInvoice = make(Invoice03Icon)

/* -- money ------------------------------------------------------------- */
export const IconCard = make(CreditCardIcon)
export const IconRefund = make(RefreshIcon)
export const IconTag = make(DiscountTag01Icon)
export const IconChart = make(ChartLineData01Icon)

/* -- marketing --------------------------------------------------------- */
export const IconMegaphone = make(Megaphone01Icon)
export const IconCustomerService = make(CustomerService01Icon)
export const IconMail = make(Mail01Icon)

/* -- developer --------------------------------------------------------- */
export const IconCode = make(CodeIcon)
export const IconLink = make(Link04Icon)
export const IconGlobe = make(Globe02Icon)
export const IconZap = make(ZapIcon)

/* -- builder ----------------------------------------------------------- */
export const IconLayout = make(LayoutTable01Icon)
export const IconDrag = make(DragDropIcon)
export const IconColors = make(ColorsIcon)
export const IconImage = make(Image02Icon)
export const IconEye = make(EyeIcon)
export const IconPreview = make(ViewIcon)

/* -- actions ----------------------------------------------------------- */
export const IconPlus = make(PlusSignIcon)
export const IconEdit = make(PencilEdit02Icon)
export const IconTrash = make(Delete02Icon)
export const IconCopy = make(CopyIcon)
export const IconDownload = make(Download04Icon)
export const IconClose = make(Cancel01Icon)
export const IconMore = make(MoreHorizontalIcon)
export const IconFilter = make(FilterIcon)
export const IconFile = make(File01Icon)

/* -- state ------------------------------------------------------------- */
export const IconCheck = make(CheckmarkCircle02Icon)
export const IconWarning = make(AlertCircleIcon)
export const IconClock = make(Clock01Icon)
export const IconSpinner = make(Loading03Icon)

/* -- direction --------------------------------------------------------- */
export const IconChevronDown = make(ArrowDown01Icon)
export const IconChevronRight = make(ArrowRight01Icon)
export const IconChevronLeft = make(ArrowLeft01Icon)
export const IconChevronUp = make(ArrowUp01Icon)
export const IconExternal = make(Link04Icon)
