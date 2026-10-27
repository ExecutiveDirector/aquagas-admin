import * as Sentry from '@sentry/react'

// Error tracking. A Sentry DSN only lets clients send events (it is not a
// secret). Override per environment with VITE_SENTRY_DSN; set it to "off" to
// disable. No personal data, replays or performance traces are sent.
const DEFAULT_DSN =
  'https://140b851a0b9901e6a9674273921fa5e5@o4512316675588096.ingest.de.sentry.io/4512317082566736'

export function initSentry() {
  const configured = (import.meta.env.VITE_SENTRY_DSN as string | undefined)?.trim()
  if (configured === 'off') return
  try {
    Sentry.init({
      dsn: configured || DEFAULT_DSN,
      environment: import.meta.env.MODE === 'production' ? 'production' : 'development',
      enabled: import.meta.env.PROD,
      sendDefaultPii: false,
      tracesSampleRate: 0,
      initialScope: { tags: { app: 'admin' } },
    })
  } catch (e) {
    console.warn('[Sentry] init failed (non-fatal)', e)
  }
}

export { Sentry }
