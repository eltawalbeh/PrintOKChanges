/**
 * Telegram Mini App presentation adapter.
 *
 * Telegram initData is NOT authentication here. Existing PrintOK password
 * sessions continue to gate private Neon APIs. Never trust initDataUnsafe.
 * See https://core.telegram.org/bots/webapps
 */
type TelegramBackButton = {
  onClick(handler: () => void): TelegramBackButton
  offClick(handler: () => void): TelegramBackButton
  show(): TelegramBackButton
  hide(): TelegramBackButton
}
type TelegramWebApp = {
  initData: string
  platform: string
  version: string
  colorScheme: 'light' | 'dark'
  themeParams: Record<string, string | undefined>
  BackButton: TelegramBackButton
  ready(): void
  expand(): void
  setHeaderColor?(color: string): void
  setBackgroundColor?(color: string): void
  onEvent?(name: string, handler: () => void): void
  offEvent?(name: string, handler: () => void): void
}
declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp }
  }
}

let initialized = false

export function telegramWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null
  const app = window.Telegram?.WebApp
  // A Telegram bridge may also be loaded in ordinary browsers. A signed launch
  // payload is required before applying Telegram-only presentation features.
  return app && typeof app.initData === 'string' && app.initData.length > 0 ? app : null
}

export function isTelegramMiniApp(): boolean {
  return telegramWebApp() !== null
}

export function initializeTelegramMiniApp(): void {
  const app = telegramWebApp()
  if (!app || initialized) return
  initialized = true
  document.documentElement.classList.add('printok-telegram')
  document.documentElement.dataset.telegramPlatform = app.platform || 'unknown'

  // Existing PrintOK UI uses a light palette, so align Telegram's native
  // header/background with the app. Avoid forcing a dark theme without a
  // complete dark-mode contrast audit.
  const applyChrome = () => {
    try { app.setHeaderColor?.('#ffffff') } catch { /* Older Telegram clients */ }
    try { app.setBackgroundColor?.('#f7f9fb') } catch { /* Older Telegram clients */ }
  }
  applyChrome()
  try { app.onEvent?.('themeChanged', applyChrome) } catch { /* Optional */ }
  try { app.expand() } catch { /* Optional */ }

  // Signal that React's first render can be shown, without manipulating
  // Telegram account information or the existing password-based login.
  requestAnimationFrame(() => {
    try { app.ready() } catch { /* Optional */ }
  })
}

/**
 * Keep Telegram's native back button in sync with PrintOK's internal screens.
 * The returned cleanup prevents listeners leaking on repeated navigation.
 */
export function setTelegramBackHandler(handler: (() => void) | null): () => void {
  const app = telegramWebApp()
  if (!app?.BackButton) return () => {}
  try {
    if (handler) {
      app.BackButton.onClick(handler)
      app.BackButton.show()
    } else {
      app.BackButton.hide()
    }
  } catch { /* Older clients gracefully use the app's own navigation */ }

  return () => {
    try {
      if (handler) app.BackButton.offClick(handler)
      app.BackButton.hide()
    } catch { /* Optional */ }
  }
}
