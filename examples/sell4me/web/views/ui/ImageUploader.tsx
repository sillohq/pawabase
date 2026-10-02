/**
 * Drag-and-drop image upload for a product.
 *
 * Uploads go straight to `POST /products/{id}/images` with `fetch` rather than
 * through Inertia's form helper, for two reasons:
 *
 * 1. An Inertia post re-renders the page, which would throw away everything
 *    else the merchant has typed into the product form but not yet saved.
 * 2. Eight files are eight independent requests. One that fails should leave
 *    the other seven on the page, not roll the whole drop back.
 *
 * The server answers in milliseconds — it writes the original and queues the
 * resizing — so an image appears immediately and its derivatives arrive
 * behind it. `processing` is what the row shows in between, and the poll below
 * is what clears it.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { cx } from '@/js/hooks'
import { IconImage, IconPlus, IconTrash } from '@/views/ui/icons'

export type UploadedImage = {
  id: number
  url: string
  alt: string | null
  placeholder?: string | null
  dominant_color?: string | null
  processing?: boolean
}

/** How often to ask whether the derivatives are ready. */
const POLL_MS = 2500
/** Give up polling after this long — a stuck worker should not poll forever. */
const POLL_CEILING_MS = 60_000

export function ImageUploader({
  productId,
  initial,
  onChange,
}: {
  /** Null while the product is still being created — see `NewProductNotice`. */
  productId: number | null
  initial: UploadedImage[]
  onChange?: (images: UploadedImage[]) => void
}) {
  const [images, setImages] = useState<UploadedImage[]>(initial)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  const update = useCallback(
    (next: UploadedImage[]) => {
      setImages(next)
      onChange?.(next)
    },
    [onChange],
  )

  const upload = useCallback(
    async (files: FileList | File[]) => {
      if (productId === null) return
      setError(null)

      for (const file of Array.from(files)) {
        setBusy((count) => count + 1)
        try {
          const body = new FormData()
          body.append('file', file)

          const response = await fetch(`/products/${productId}/images`, {
            method: 'POST',
            body,
            headers: { 'X-XSRF-TOKEN': readXsrfToken() },
            credentials: 'same-origin',
          })
          const payload = await response.json()

          if (!response.ok) {
            // The server's message names the actual problem — the size, the
            // type — so it is shown rather than a generic failure.
            setError(payload.error ?? 'That upload failed.')
            continue
          }
          setImages((current) => {
            const next = [...current, payload as UploadedImage]
            onChange?.(next)
            return next
          })
        } catch {
          setError('That upload failed. Check your connection and try again.')
        } finally {
          setBusy((count) => count - 1)
        }
      }
    },
    [productId, onChange],
  )

  // Poll while anything is still being resized. Stops on its own once every
  // row has its derivatives, and gives up entirely after a minute.
  const pending = images.some((image) => image.processing)
  useEffect(() => {
    if (!pending || productId === null) return
    const started = Date.now()

    const timer = window.setInterval(async () => {
      if (Date.now() - started > POLL_CEILING_MS) {
        window.clearInterval(timer)
        // Clear the flag rather than spinning forever. The original is already
        // being served; only the derivatives are late.
        setImages((current) => current.map((image) => ({ ...image, processing: false })))
        return
      }
      try {
        const response = await fetch(`/products/${productId}/images/status`, {
          headers: { Accept: 'application/json' },
          credentials: 'same-origin',
        })
        if (!response.ok) return
        const payload = (await response.json()) as { images: UploadedImage[] }
        setImages((current) =>
          current.map((image) => payload.images.find((row) => row.id === image.id) ?? image),
        )
      } catch {
        // A failed poll is not worth reporting: the image is already visible.
      }
    }, POLL_MS)

    return () => window.clearInterval(timer)
  }, [pending, productId])

  async function remove(image: UploadedImage) {
    update(images.filter((entry) => entry.id !== image.id))
    try {
      await fetch(`/images/${image.id}/delete`, {
        method: 'POST',
        headers: { 'X-XSRF-TOKEN': readXsrfToken() },
        credentials: 'same-origin',
      })
    } catch {
      // Removed from the page either way. A delete that failed leaves an
      // object in storage, which is a bill; putting the tile back would be a
      // merchant clicking delete twice on an image that never goes away.
    }
  }

  async function reorder(from: number, to: number) {
    if (from === to) return
    const next = [...images]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    update(next)

    if (productId === null) return
    await fetch(`/products/${productId}/images/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-XSRF-TOKEN': readXsrfToken(),
      },
      credentials: 'same-origin',
      body: JSON.stringify({ ids: next.map((image) => image.id) }),
    })
  }

  if (productId === null) {
    return (
      <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--color-line)] px-4 py-8 text-center">
        <IconImage className="mx-auto h-5 w-5 text-[var(--color-ink-faint)]" />
        <p className="mt-2 text-[12.5px] text-[var(--color-ink-muted)]">
          Save the product first, then add photos.
        </p>
        <p className="mt-1 text-[11.5px] text-[var(--color-ink-faint)]">
          Uploads need somewhere to belong.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          if (event.dataTransfer.files.length) void upload(event.dataTransfer.files)
        }}
        onClick={() => input.current?.click()}
        className={cx(
          'cursor-pointer rounded-[var(--radius-sm)] border border-dashed px-4 py-7 text-center transition',
          dragging
            ? 'border-brand bg-brand/5'
            : 'border-[var(--color-line)] hover:border-brand/60 hover:bg-[var(--color-sunken)]',
        )}
      >
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files?.length) void upload(event.target.files)
            // Reset, so re-picking the same file fires `change` again.
            event.target.value = ''
          }}
        />
        <IconPlus className="mx-auto h-5 w-5 text-[var(--color-ink-faint)]" />
        <p className="mt-2 text-[12.5px] text-[var(--color-ink)]">
          {busy > 0 ? `Uploading ${busy}…` : 'Drop photos here, or click to choose'}
        </p>
        <p className="mt-0.5 text-[11.5px] text-[var(--color-ink-faint)]">
          JPEG, PNG, WebP or AVIF. We make the sizes your shop needs.
        </p>
      </div>

      {error && <p className="text-[12px] text-critical">{error}</p>}

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((image, index) => (
            <figure
              key={image.id}
              draggable
              onDragStart={(event) => event.dataTransfer.setData('text/plain', String(index))}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                const from = Number(event.dataTransfer.getData('text/plain'))
                if (!Number.isNaN(from)) void reorder(from, index)
              }}
              className="group relative aspect-square overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-line)]"
              style={{ background: image.dominant_color ?? 'var(--color-sunken)' }}
            >
              <img
                src={image.url}
                alt={image.alt ?? ''}
                loading="lazy"
                className={cx(
                  'h-full w-full object-cover transition',
                  image.processing && 'opacity-70',
                )}
              />

              {index === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-[var(--color-ink)]/80 px-2 py-0.5 text-[10px] font-medium text-white">
                  Main
                </span>
              )}
              {image.processing && (
                <span className="absolute bottom-1.5 left-1.5 rounded-full bg-[var(--color-ink)]/80 px-2 py-0.5 text-[10px] text-white">
                  Optimising…
                </span>
              )}

              <button
                type="button"
                onClick={() => void remove(image)}
                aria-label="Remove image"
                className="absolute right-1.5 top-1.5 rounded-full bg-[var(--color-ink)]/80 p-1.5 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100"
              >
                <IconTrash className="h-3 w-3" />
              </button>
            </figure>
          ))}
        </div>
      )}

      {images.length > 1 && (
        <p className="text-[11.5px] text-[var(--color-ink-faint)]">
          Drag to reorder. The first one is what customers see in listings.
        </p>
      )}
    </div>
  )
}

/**
 * The CSRF token, from the cookie the session middleware sets.
 *
 * Read here rather than from a meta tag because the cookie is what the server
 * compares against, and a meta tag rendered once would go stale the moment the
 * session rotates.
 */
function readXsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : ''
}
