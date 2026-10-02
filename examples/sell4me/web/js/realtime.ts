/**
 * Live updates, through `@pawabase/client`.
 *
 * The browser connects straight to the Pawabase gateway with the project's *publishable* key (the server hands the URL and key down as the shared `app.pawabase` prop).
 * A channel's name is the capability: the help desk's per-ticket and per-store channel names contain a secret only the people allowed to read them were ever given
 * (see `docs` in BLUEPRINT.md, "Realtime"). Browsers cannot publish: replies go through the server, which does it.
 */

import { createClient, type PawabaseClient } from '@pawabase/client'
import { useEffect, useRef, useState } from 'react'
import { useShared } from './hooks'

export type PawabaseConfig = { url: string; key: string; project: string; environment: string }

let shared: { signature: string; client: PawabaseClient } | null = null

/** One client per page load: sockets are expensive, and every component on the page can share the connection. */
export function pawabaseClient(config: PawabaseConfig): PawabaseClient {
  const signature = `${config.url}|${config.key}`
  if (!shared || shared.signature !== signature) {
    shared?.client.dispose()
    shared = {
      signature,
      client: createClient({ url: config.url, apiKey: config.key, auth: { persistSession: false, autoRefreshToken: false } }),
    }
  }
  return shared.client
}

/**
 * Subscribe to `channel` while the component is mounted. `onFrame` receives each message's payload (the `{type, ticket, message}` object the server published).
 * Returns whether the channel is currently joined, for a "connected" dot.
 */
export function useChannel(channel: string | null | undefined, onFrame: (payload: any, event: string) => void): boolean {
  const config = (useShared().app as { pawabase?: PawabaseConfig }).pawabase
  const latest = useRef(onFrame)
  latest.current = onFrame
  const [joined, setJoined] = useState(false)

  useEffect(() => {
    if (!channel || !config?.key) return
    const room = pawabaseClient(config).realtime.channel<any>(channel)
    const stops = [
      room.on('message', (message) => latest.current(message.payload, message.event)),
      room.on('subscribed', () => setJoined(true)),
      room.on('closed', () => setJoined(false)),
      room.on('error', () => setJoined(false)),
    ]
    room.subscribe().catch(() => setJoined(false))
    return () => {
      stops.forEach((stop) => stop())
      void room.unsubscribe()
      setJoined(false)
    }
  }, [channel, config?.url, config?.key]) // eslint-disable-line react-hooks/exhaustive-deps

  return joined
}
