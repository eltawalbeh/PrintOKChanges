import { useEffect, useState } from 'react'
import { isTelegramMiniApp } from './telegram'

type InstallEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function installed(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
}

export function registerPrintOKPWA(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  const base = import.meta.env.BASE_URL
  const swUrl = new URL(base + 'sw.js', window.location.origin)
  const scope = new URL(base, window.location.origin)
  if (swUrl.origin !== window.location.origin) return
  const register = () => {
    navigator.serviceWorker.register(swUrl.href, { scope: scope.pathname })
      .catch(error => console.warn('PrintOK PWA registration unavailable:', error))
  }
  if (document.readyState === 'complete') register()
  else window.addEventListener('load', register, { once: true })
}

export default function PWAInstall() {
  const [promptEvent, setPromptEvent] = useState<InstallEvent | null>(null)
  const [device, setDevice] = useState<'ios' | 'android' | null>(null)
  const [visible, setVisible] = useState(false)
  const [instructions, setInstructions] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (installed() || isTelegramMiniApp() || new URLSearchParams(location.search).has('review')) return
    if (sessionStorage.getItem('printok-install-dismissed') === '1') return
    const ua = navigator.userAgent
    const ios = /iPhone|iPad|iPod/i.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const android = /Android/i.test(ua)
    if (ios || android) { setDevice(ios ? 'ios' : 'android'); setVisible(true) }
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as InstallEvent)
      setVisible(true)
    }
    const onInstalled = () => { setPromptEvent(null); setVisible(false) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  function dismiss() {
    setVisible(false)
    sessionStorage.setItem('printok-install-dismissed', '1')
  }

  async function install() {
    if (!promptEvent) { setInstructions(value => !value); return }
    setBusy(true)
    try {
      await promptEvent.prompt()
      const choice = await promptEvent.userChoice
      if (choice.outcome === 'accepted') { setVisible(false); setPromptEvent(null) }
      else setInstructions(true)
    } catch {
      setInstructions(true)
    } finally { setBusy(false) }
  }

  if (!visible || installed()) return null

  return <aside className="printok-install" dir="rtl" aria-label="تثبيت تطبيق PrintOK">
    <button className="printok-install-close" aria-label="إغلاق اقتراح التثبيت" type="button" onClick={dismiss}>×</button>
    <div className="printok-install-heading">
      <span className="printok-install-logo" aria-hidden="true">✓</span>
      <span><strong>PrintOK على هاتفك</strong><small>افتح النظام كتطبيق من الشاشة الرئيسية</small></span>
    </div>
    <button className="printok-install-action" type="button" disabled={busy} onClick={install}>
      {busy ? 'جاري فتح نافذة التثبيت...' : promptEvent ? 'تثبيت التطبيق' : 'طريقة التثبيت'}
    </button>
    {instructions && <p className="printok-install-hint">
      {device === 'ios'
        ? 'على الآيفون: افتح PrintOK في Safari، اضغط زر المشاركة، ثم اختر «إضافة إلى الشاشة الرئيسية» (Add to Home Screen).'
        : 'افتح قائمة المتصفح ⋮ واختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».'}
    </p>}
  </aside>
}
