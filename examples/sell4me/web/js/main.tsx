/**
 * The client entry.
 *
 * Resolves a page component by the name the server sent, and wraps it in the
 * right chrome. Three chromes, and which one a page gets is decided *here*
 * rather than inside each page, so a new screen cannot forget to have one:
 *
 * - `shop/*`     → the merchant's own storefront theme
 * - `auth/*`     → the bare centred column (no store to navigate yet)
 * - `builder/Editor` → nothing at all; it is a full-screen application
 * - anything else → the dashboard shell
 */

import { createInertiaApp } from '@inertiajs/react'
import type { ReactNode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import AppLayout from '@/views/layouts/AppLayout'
import AuthLayout, { WizardLayout } from '@/views/layouts/AuthLayout'
import PosLayout from '@/views/layouts/PosLayout'
import ShopLayout from '@/views/layouts/ShopLayout'
import type { PageModule } from './types'
import './app.css'

const APP_NAME = 'Commerce'

function chromeFor(name: string): (children: ReactNode) => ReactNode {
  if (name.startsWith('shop/')) return (children) => <ShopLayout>{children}</ShopLayout>
  if (name === 'auth/CreateStore') return (children) => <WizardLayout>{children}</WizardLayout>
  if (name.startsWith('auth/') || name.startsWith('errors/')) {
    return (children) => <AuthLayout>{children}</AuthLayout>
  }
  if (name === 'builder/Editor' || name === 'designs/Editor') return (children) => <>{children}</>
  if (name === 'pos/Terminal') return (children) => <PosLayout>{children}</PosLayout>
  return (children) => <AppLayout>{children}</AppLayout>
}

createInertiaApp({
  id: 'app',

  // The browser tab.
  //
  // The dashboard is ours and says so. A *storefront* is the merchant's, and a
  // shopper's tab reading "Home · Commerce" names a company they have never
  // heard of instead of the shop they are standing in — so shop pages set
  // their own title and this leaves it alone.
  title: (title) => {
    if (!title) return APP_NAME
    const shopping = window.location.pathname.startsWith('/pages/')
      || document.documentElement.dataset.surface === 'shop'
    return shopping ? title : `${title} · ${APP_NAME}`
  },

  resolve: async (name) => {
    // Lazy, so Vite code-splits one chunk per page.
    //
    // Eager would put the entire dashboard — forty screens, the charts, the
    // command palette — into the bundle a shopper downloads to look at one
    // product. The two surfaces share this application but not an audience,
    // and a storefront visitor should not pay for the admin.
    //
    // The cost is one small request on a first visit to a screen. React,
    // Inertia and the UI kit are in the shared chunk and load once.
    const pages = import.meta.glob<PageModule>('../views/pages/**/*.tsx')
    const loader = pages[`../views/pages/${name}.tsx`]
    if (!loader) {
      throw new Error(
        `No page component for "${name}". Expected views/pages/${name}.tsx — ` +
          `the name comes from the server's render() call.`,
      )
    }
    const page = await loader()
    // `??=` so a page that declared its own layout keeps it.
    page.default.layout ??= chromeFor(name)
    // The component itself, not the module: Inertia's resolver type accepts a
    // promise of a component, and returning the module makes the whole
    // `createInertiaApp` call fail to type-check.
    return page.default
  },

  setup({ el, App, props }) {
    // The root element may already carry server-rendered markup in a future
    // SSR setup; hydrating what is there beats throwing it away.
    if (el.hasChildNodes()) {
      hydrateRoot(el, <App {...props} />)
    } else {
      createRoot(el).render(<App {...props} />)
    }
  },

  // The thin bar at the top of the window during a navigation. 250ms delay, so
  // a fast page transition shows nothing at all rather than a flash of bar.
  progress: {
    color: 'oklch(0.47 0.12 350)',
    delay: 250,
    showSpinner: false,
  },
})
