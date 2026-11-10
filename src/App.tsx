import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { api, getSession, setSession, type Activity, type Order, type Review, type Status } from './api'

type Page = 'dashboard' | 'new' | 'details' | 'approvals' | 'activity' | 'settings'
type IconName = 'grid' | 'plus' | 'check' | 'history' | 'settings' | 'bell' | 'search' | 'upload' | 'arrow' | 'up' | 'menu' | 'close' | 'link' | 'file' | 'clock' | 'log-out' | 'shield' | 'eye'
type FormValues = { client: string; phone: string; product: string; quantity: string; dimensions: string; material: string }
const emptyForm: FormValues = { client: '', phone: '', product: '', quantity: '', dimensions: '', material: '' }
const statusLabels: Record<Status, string> = { draft: 'مسودة', pending: 'بانتظار الموافقة', approved: 'معتمد', changes: 'تعديل مطلوب' }
const actLabels: Record<string, string> = { order_created: 'إنشاء طلب طباعة', order_drafted: 'حفظ طلب كمسودة', version_uploaded: 'رفع نسخة جديدة', version_approved: 'موافقة العميل', changes_requested: 'طلب تعديل' }
const formatDate = (value: string) => { try { return new Intl.DateTimeFormat('ar-JO', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value)) } catch { return value } }
const messageOf = (e: unknown) => e instanceof Error ? e.message : 'حدث خطأ، حاول مرة أخرى'
const isImage = (type: string | null | undefined) => Boolean(type?.startsWith('image/'))

function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    plus: <path d="M12 4v16M4 12h16" />,
    check: <path d="m4 12 5 5L20 6" />,
    history: <><path d="M3.3 10A9 9 0 1 1 4 15" /><path d="M3 4v6h6M12 7v5l4 2" /></>,
    settings: <><path d="M10 3h4l.7 2.2 1.7.9 2.3-.6 2 3.5-1.7 1.7v2.6l1.7 1.7-2 3.5-2.3-.6-1.7.9L14 21h-4l-.7-2.2-1.7-.9-2.3.6-2-3.5 1.7-1.7v-2.6L3.3 9l2-3.5 2.3.6 1.7-.9z" /><circle cx="12" cy="12" r="3" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 9h18c0-1-3-2-3-9ZM10 21h4" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    upload: <><path d="M12 16V3m-5 5 5-5 5 5M4 16v4h16v-4" /></>,
    arrow: <path d="M19 12H5m7-7-7 7 7 7" />,
    up: <path d="M12 20V4m-6 6 6-6 6 6" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    close: <path d="M5 5l14 14M19 5 5 19" />,
    link: <><path d="M10 13a5 5 0 0 0 7.3 0l2.1-2.1a5 5 0 0 0-7.1-7.1l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.3 0l-2.1 2.1a5 5 0 0 0 7.1 7.1l1.7-1.7" /></>,
    file: <><path d="M6 2h8l5 5v15H6zM14 2v6h5M9 13h7M9 17h7" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l4 2" /></>,
    'log-out': <><path d="M9 4H5v16h4M15 8l4 4-4 4M19 12H9" /></>,
    shield: <><path d="m12 2 8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z" /><path d="m8 12 3 3 5-6" /></>,
    eye: <><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>
  }
  return <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}
function StatusBadge({ status }: { status: Status }) { return <span className={'status status-' + status}>{statusLabels[status]}</span> }
function Brand({ large = false }: { large?: boolean }) {
  return <div className={'brand-lockup' + (large ? ' brand-large' : '')}><span className="brand-mark"><Icon name="check" size={27} /></span><b>PrintOK</b></div>
}
function Busy({ label = 'جاري تحميل البيانات...' }: { label?: string }) {
  return <div className="busy-state" role="status"><span className="spinner" />{label}</div>
}
function ActualProof({ src, fileType, className = '' }: { src: string; fileType: string; className?: string }) {
  return <div className={'proof-stage actual-proof ' + className}>
    {isImage(fileType) ? <img src={src} alt="ملف التصميم الحالي" className="proof-image" /> :
      <iframe src={src + '#toolbar=0&view=FitH'} title="ملف التصميم PDF" className="proof-pdf" />}
  </div>
}

export default function App() {
  const url = new URLSearchParams(window.location.search)
  const reviewToken = url.get('token')
  const customerMode = Boolean(reviewToken && url.has('review'))
  const [password, setPassword] = useState('')
  const [session, setSessionValue] = useState(getSession)
  const [checking, setChecking] = useState(Boolean(getSession()))
  const [loading, setLoading] = useState(false)
  const [working, setWorking] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [detail, setDetail] = useState<Order | null>(null)
  const [review, setReview] = useState<Review | null>(null)
  const [proofUrl, setProofUrl] = useState('')
  const [events, setEvents] = useState<Activity[]>([])
  const [shop, setShop] = useState('مطبعة المدى')
  const [page, setPage] = useState<Page>('dashboard')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState<FormValues>(emptyForm)
  const [artwork, setArtwork] = useState<File | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | Status>('all')
  const [period, setPeriod] = useState<'30' | 'all'>('all')
  const [mobileNav, setMobileNav] = useState(false)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const [decision, setDecision] = useState<'approved' | 'changes' | null>(null)
  const [note, setNote] = useState('')

  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(''), 4500); return () => clearTimeout(id) }, [toast])

  async function refresh(token: string) {
    setLoading(true)
    try {
      const [o, s, a] = await Promise.all([
        api<{ orders: Order[] }>('/orders', { token }),
        api<{ shopName: string }>('/settings', { token }),
        api<{ events: Activity[] }>('/events', { token })
      ])
      setOrders(o.orders); setShop(s.shopName); setEvents(a.events); setError('')
    } catch (e) { setError(messageOf(e)); throw e }
    finally { setLoading(false) }
  }
  useEffect(() => {
    if (customerMode) {
      setLoading(true)
      Promise.all([
        api<Review>('/review/' + encodeURIComponent(reviewToken!)),
        api<{ url: string; fileType: string }>('/review/' + encodeURIComponent(reviewToken!) + '/file')
      ]).then(([r, file]) => { setReview(r); setProofUrl(file.url); setError('') })
        .catch(e => setError(messageOf(e))).finally(() => setLoading(false))
      return
    }
    const token = getSession()
    if (!token) { setChecking(false); return }
    api<{ authenticated: boolean }>('/auth/session', { token }).then(() => {
      setSessionValue(token); return refresh(token)
    }).catch(e => {
      if (e?.status === 401) { setSession(''); setSessionValue('') }
      else setError(messageOf(e))
    }).finally(() => setChecking(false))
  }, [])

  async function login(event: FormEvent) {
    event.preventDefault()
    setWorking(true); setError('')
    try {
      const result = await api<{ token: string }>('/auth/login', { method: 'POST', body: { password } })
      setSession(result.token); setSessionValue(result.token); setPassword('')
      await refresh(result.token); setToast('تم تسجيل الدخول بنجاح')
    } catch (e) { setError(messageOf(e)) }
    finally { setWorking(false) }
  }
  async function logout() {
    try { if (session) await api('/auth/logout', { method: 'POST', token: session }) } catch { /* Token is cleared regardless. */ }
    setSession(''); setSessionValue(''); setOrders([]); setDetail(null); setPage('dashboard'); setError('')
  }
  const navigate = (next: Page) => { setPage(next); setMobileNav(false); setSearch(''); setFilter('all'); setError(''); setProofUrl('') }
  async function openOrder(id: string) {
    setSelectedId(id); setPage('details'); setProofUrl(''); setWorking(false); setLoading(true); setError('')
    try {
      const response = await api<{ order: Order }>('/orders/' + id, { token: session })
      setDetail(response.order)
      if (response.order.versionId) {
        const file = await api<{ url: string; fileType: string }>('/orders/' + id + '/files/' + response.order.versionId, { token: session })
        setProofUrl(file.url)
      }
    } catch (e) { setError(messageOf(e)) } finally { setLoading(false) }
  }
  async function saveOrder(event: FormEvent, draft = false) {
    event.preventDefault()
    if (!draft && !artwork) { setToast('يرجى رفع ملف التصميم أولاً'); return }
    if (!form.client.trim() || !form.phone.trim() || !form.product.trim() || !Number(form.quantity)) { setToast('يرجى تعبئة الحقول المطلوبة'); return }
    const data = new FormData()
    Object.entries(form).forEach(([key, value]) => data.append(key, value))
    data.append('draft', String(draft))
    if (artwork) data.append('file', artwork)
    setWorking(true)
    try {
      const r = await api<{ id: string; ref: string }>('/orders', { method: 'POST', body: data, token: session })
      setForm(emptyForm); setArtwork(null)
      setToast(draft ? 'تم حفظ المسودة على قاعدة البيانات' : 'تم حفظ الطلب ورفع ملف التصميم')
      await refresh(session); await openOrder(r.id)
    } catch (e) { setToast(messageOf(e)) }
    finally { setWorking(false) }
  }
  async function newVersion(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !detail) return
    const data = new FormData(); data.append('file', file)
    setWorking(true)
    try {
      await api('/orders/' + detail.id + '/versions', { method: 'POST', token: session, body: data })
      setToast('تم رفع نسخة جديدة. تحتاج موافقة مستقلة من العميل.')
      await refresh(session); await openOrder(detail.id)
    } catch (e) { setToast(messageOf(e)) }
    finally { setWorking(false); event.target.value = '' }
  }
  async function copyReviewLink() {
    if (!detail) return
    setWorking(true)
    try {
      const result = await api<{ token: string; version: number }>('/orders/' + detail.id + '/review-link', { method: 'POST', token: session })
      const url = new URL(window.location.pathname, window.location.origin)
      url.searchParams.set('review', detail.id)
      url.searchParams.set('v', String(result.version))
      url.searchParams.set('token', result.token)
      await navigator.clipboard.writeText(url.toString())
      setToast('تم نسخ رابط مراجعة النسخة الحالية، صالح لمدة 14 يوماً')
    } catch (e) { setToast(messageOf(e)) }
    finally { setWorking(false) }
  }
  async function submitDecision() {
    if (!review || !reviewToken || !decision) return
    if (decision === 'changes' && !note.trim()) { setToast('أدخل تفاصيل التعديل المطلوب'); return }
    setWorking(true)
    try {
      const result = await api<{ status: Status }>('/review/' + encodeURIComponent(reviewToken) + '/decision', { method: 'POST', body: { decision, note } })
      setReview(r => r ? { ...r, status: result.status, note } : r)
      setDecision(null); setNote('')
      setToast(result.status === 'approved' ? 'تم اعتماد النسخة المحددة بنجاح' : 'تم إرسال طلب التعديل للمطبعة')
    } catch (e) { setToast(messageOf(e)) }
    finally { setWorking(false) }
  }
  async function saveSettings() {
    setWorking(true)
    try {
      const result = await api<{ shopName: string }>('/settings', { method: 'PATCH', token: session, body: { shopName: shop } })
      setShop(result.shopName); setToast('تم حفظ الإعدادات في Neon')
    } catch (e) { setToast(messageOf(e)) }
    finally { setWorking(false) }
  }

  const filtered = useMemo(() => orders.filter(order => {
    if (page === 'approvals' && order.status !== 'pending') return false
    if (filter !== 'all' && order.status !== filter) return false
    if (period === '30' && new Date(order.createdAt).getTime() < Date.now() - 30 * 86400000) return false
    const term = search.trim().toLowerCase()
    return !term || [order.ref, order.client, order.phone, order.product].some(value => value.toLowerCase().includes(term))
  }), [orders, search, page, filter, period])
  const stats = { all: orders.filter(o => o.status !== 'draft').length, pending: orders.filter(o => o.status === 'pending').length, approved: orders.filter(o => o.status === 'approved').length }
  const menu: { page: Page; title: string; icon: IconName }[] = [
    { page: 'dashboard', title: 'الطلبات', icon: 'grid' },
    { page: 'new', title: 'طلب جديد', icon: 'plus' },
    { page: 'approvals', title: 'الموافقات', icon: 'check' },
    { page: 'activity', title: 'سجل النشاط', icon: 'history' },
    { page: 'settings', title: 'الإعدادات', icon: 'settings' }
  ]

  if (customerMode) return <div className="customer-shell" dir="rtl">
    <header className="customer-header"><span className="brand-mark"><Icon name="check" size={25} /></span><b>PrintOK</b></header>
    <main className="customer-main">
      {loading ? <Busy /> : error ? <div className="card missing-order"><h1>تعذر فتح المراجعة</h1><p>{error}</p></div> : review ? <>
        <h1>مراجعة التصميم</h1>
        <p className="customer-sub">{review.client} · طلب <span dir="ltr">{review.ref}</span></p>
        <div className="card customer-proof"><div className="proof-version">النسخة V{review.version}</div>{proofUrl ? <ActualProof src={proofUrl} fileType={review.fileType} className="proof-small" /> : <Busy label="جاري تحميل الملف..." />}</div>
        <p className="customer-instruction">راجع النصوص والمقاس والألوان قبل الموافقة.</p>
        <p className="muted customer-note">موافقتك تخص النسخة V{review.version} فقط.<br />أي نسخة جديدة تحتاج موافقة جديدة.</p>
        {review.status === 'pending' ? <>
          <button className="btn btn-approve customer-action" disabled={working} onClick={() => setDecision('approved')}><Icon name="check" />أوافق على النسخة V{review.version}</button>
          <button className="btn btn-outline customer-action" disabled={working} onClick={() => setDecision('changes')}>أطلب تعديلًا</button>
        </> : <div className="review-result"><StatusBadge status={review.status} /><p>{review.status === 'approved' ? 'تم تسجيل الموافقة بالفعل على هذه النسخة.' : 'تم تسجيل طلب التعديل. سيتم رفع نسخة جديدة.'}</p></div>}
        <p className="muted customer-footer">لا يبدأ الإنتاج قبل موافقة صريحة على هذه النسخة.<br />رابط خاص بهذا الطلب · لا تحتاج لإنشاء حساب</p>
      </> : <Busy />}
    </main>
    {decision && <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-label="قرار مراجعة التصميم">
      <button className="close-btn" onClick={() => setDecision(null)} aria-label="إغلاق"><Icon name="close" /></button>
      <h2>{decision === 'approved' ? 'تأكيد الموافقة' : 'طلب تعديل التصميم'}</h2>
      <p className="muted">{decision === 'approved' ? 'هل تؤكد اعتماد هذه النسخة تحديداً؟' : 'اكتب ملاحظات التعديل المطلوبة على هذه النسخة.'}</p>
      {decision === 'changes' && <textarea className="field-control" rows={4} value={note} onChange={e => setNote(e.target.value)} placeholder="تفاصيل التعديلات..." autoFocus />}
      <div className="modal-actions"><button className="btn btn-outline" onClick={() => setDecision(null)}>إلغاء</button><button className={'btn ' + (decision === 'approved' ? 'btn-approve' : 'btn-primary')} disabled={working} onClick={submitDecision}>{working ? 'جاري الحفظ...' : 'تأكيد القرار'}</button></div>
    </div></div>}
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>

  if (checking) return <div className="auth-screen"><Busy label="جاري التحقق من جلسة الدخول..." /></div>
  if (!session) return <div className="auth-screen" dir="rtl">
    <div className="auth-decoration auth-decoration-one" /><div className="auth-decoration auth-decoration-two" />
    <section className="auth-card">
      <Brand large />
      <div className="auth-symbol"><Icon name="shield" size={32} /></div>
      <h1>مرحباً بك في PrintOK</h1>
      <p className="muted">مساحة إدارة طلبات الطباعة والموافقات</p>
      <form onSubmit={login} className="auth-form">
        <label htmlFor="staff-password">كلمة المرور</label>
        <input autoComplete="current-password" id="staff-password" type="password" className="field-control" value={password} onChange={e => setPassword(e.target.value)} placeholder="أدخل كلمة المرور" required minLength={8} />
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="btn btn-primary" disabled={working}>{working ? 'جاري التحقق...' : 'دخول إلى المطبعة'}<Icon name="arrow" size={18} /></button>
      </form>
      <div className="auth-footer"><Icon name="shield" size={15} />اتصال محمي · جلسة مؤقتة لمدة 12 ساعة</div>
    </section>
  </div>

  return <div className="app-shell" dir="rtl">
    <aside className={'sidebar' + (mobileNav ? ' sidebar-open' : '')}>
      <div className="sidebar-brand"><Brand /></div><p className="sidebar-caption">مساحة المطبعة</p>
      <nav className="nav-list" aria-label="التنقل الرئيسي">
        {menu.map(item => <button type="button" key={item.page} className={'nav-item ' + ((page === item.page || (page === 'details' && item.page === 'dashboard')) ? 'nav-active' : '')} onClick={() => navigate(item.page)}><Icon name={item.icon} size={23} /><span>{item.title}</span></button>)}
      </nav>
      <div className="sidebar-footer"><b>{shop}</b><span>قاعدة البيانات متصلة بـNeon</span><button className="logout-button" onClick={logout}><Icon name="log-out" size={16} />تسجيل الخروج</button></div>
    </aside>
    {mobileNav && <button className="nav-scrim" onClick={() => setMobileNav(false)} aria-label="إغلاق القائمة" />}
    <main className="workspace">
      <div className="workspace-top"><button className="mobile-menu-btn" onClick={() => setMobileNav(true)} aria-label="فتح القائمة"><Icon name="menu" /></button><button className="notifications" onClick={() => setToast('لا توجد إشعارات جديدة')}><Icon name="bell" size={20} /><span>الإشعارات</span></button></div>
      {error && <div className="inline-error" role="alert">{error}<button onClick={() => refresh(session).catch(() => {})}>إعادة المحاولة</button></div>}
      {(page === 'dashboard' || page === 'approvals') && <>
        <header className="page-heading"><div><h1>{page === 'approvals' ? 'الموافقات' : 'لوحة الطلبات'}</h1><p>{page === 'approvals' ? 'النسخ التي تنتظر موافقة العميل' : 'تابع ملفات التصاميم وموافقات العملاء من مكان واحد'}</p></div><button className="btn btn-primary new-action" onClick={() => navigate('new')}><Icon name="plus" size={23} />طلب طباعة جديد</button></header>
        <div className="stats-grid">
          <div className="card stat-card"><div>جميع الطلبات</div><strong>{stats.all.toString().padStart(2, '0')}</strong><small><Icon name="up" size={13} />الطلبات المسجلة</small></div>
          <div className="card stat-card"><div>بانتظار الموافقة</div><strong>{stats.pending.toString().padStart(2, '0')}</strong><small>تحتاج متابعة العميل</small></div>
          <div className="card stat-card"><div>جاهزة للإنتاج</div><strong>{stats.approved.toString().padStart(2, '0')}</strong><small>تم اعتماد التصميم</small></div>
        </div>
        <section className="card orders-card"><div className="section-heading"><h2>{page === 'approvals' ? 'الموافقات المعلقة' : 'الطلبات الأخيرة'}</h2><p>تفاصيل الطلب وحالة آخر نسخة</p></div>
          <div className="table-toolbar"><div className="toolbar-filters">
            <label className="select-wrap"><span className="sr-only">الفترة</span><select value={period} onChange={e => setPeriod(e.target.value as '30' | 'all')}><option value="all">كل الفترات</option><option value="30">آخر 30 يوم</option></select></label>
            <label className="select-wrap"><span className="sr-only">حالة الطلب</span><select value={filter} onChange={e => setFilter(e.target.value as 'all' | Status)}><option value="all">كل الحالات</option><option value="pending">بانتظار الموافقة</option><option value="approved">معتمد</option><option value="changes">تعديل مطلوب</option><option value="draft">مسودة</option></select></label>
          </div><label className="search-box"><Icon name="search" size={20} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث باسم العميل أو رقم الطلب" aria-label="البحث" /></label></div>
          {loading ? <Busy /> : <div className="table-scroll"><table className="orders-table"><thead><tr><th>رقم الطلب</th><th>العميل</th><th>النوع</th><th>الإصدار</th><th>الحالة</th></tr></thead><tbody>
            {filtered.map(order => <tr key={order.id} onClick={() => openOrder(order.id)}><td><button className="order-link" dir="ltr" onClick={e => { e.stopPropagation(); openOrder(order.id) }}>#{order.ref}</button></td><td>{order.client}</td><td>{order.product}</td><td className="muted" dir="ltr">{order.currentVersion ? 'V' + order.currentVersion : '—'}</td><td><StatusBadge status={order.status} /></td></tr>)}
          </tbody></table>{!filtered.length && <div className="empty-state">لا توجد طلبات مطابقة حالياً. ابدأ بإضافة أول طلب طباعة.</div>}</div>}
        </section>
      </>}
      {page === 'new' && <><header className="page-heading"><div><h1>طلب طباعة جديد</h1><p>عبّئ التفاصيل وارفع ملف البروفا قبل إرساله للعميل</p></div></header>
        <form onSubmit={e => saveOrder(e)}>
          <section className="card create-card"><div className="section-heading"><h2>تفاصيل العميل والطباعة</h2><p>الحقول ذات العلامة * مطلوبة</p></div>
            <div className="fields-grid">
              <label className="form-field">اسم العميل *<input required className="field-control" placeholder="مثال: روز كافيه" value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} /></label>
              <label className="form-field">رقم الموبايل *<input required className="field-control" inputMode="tel" dir="ltr" placeholder="07XXXXXXXX" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></label>
              <label className="form-field">اسم المنتج / المشروع *<input required className="field-control" placeholder="ليبل للأكواب الورقية" value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} /></label>
              <label className="form-field">الكمية *<input required className="field-control" type="number" min={1} placeholder="500" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} /></label>
              <label className="form-field">المقاس<input className="field-control" placeholder="5 × 5 سم" value={form.dimensions} onChange={e => setForm(f => ({ ...f, dimensions: e.target.value }))} /></label>
              <label className="form-field">الخامة<input className="field-control" placeholder="ورق لاصق مطفي" value={form.material} onChange={e => setForm(f => ({ ...f, material: e.target.value }))} /></label>
            </div><div className="form-divider" />
            <label className="file-section">ملف التصميم — النسخة V1
              <span className="upload-zone"><Icon name="upload" size={25} /><strong>{artwork ? artwork.name : 'اضغط لاختيار الملف'}</strong><small>PDF / PNG / JPG · حتى 20 MB</small></span>
              <input className="file-input" type="file" accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg" onChange={e => setArtwork(e.target.files?.[0] || null)} />
            </label>
          </section>
          <div className="create-footer"><div className="create-buttons"><button className="btn btn-primary" type="submit" disabled={working}>{working ? 'جاري حفظ الطلب...' : 'حفظ وإرسال للمراجعة'}</button><button className="btn btn-outline" type="button" disabled={working} onClick={() => { const f = document.querySelector('form'); if (f?.reportValidity()) saveOrder({ preventDefault() {} } as FormEvent, true) }}>حفظ كمسودة</button></div><p>لن يبدأ الإنتاج قبل موافقة صريحة على النسخة المرفوعة</p></div>
        </form>
      </>}
      {page === 'details' && <>{loading ? <Busy /> : detail ? <>
        <header className="page-heading details-heading"><div><h1>تفاصيل طلب <span dir="ltr">{detail.ref}</span></h1><p>{detail.client} · {detail.product} · آخر نسخة {detail.currentVersion ? 'V' + detail.currentVersion : 'مسودة'}</p></div><button className="btn btn-primary copy-action" disabled={working || detail.status !== 'pending'} onClick={copyReviewLink}><Icon name="link" size={18} />نسخ رابط المراجعة</button></header>
        <div className="details-status"><StatusBadge status={detail.status} /></div>
        <div className="detail-grid">
          <section className="card detail-proof-card"><div className="detail-panel-heading"><h2>التصميم الحالي — {detail.currentVersion ? 'V' + detail.currentVersion : 'مسودة'}</h2><span className="version-chip">النسخة الحالية</span></div>
            {proofUrl && detail.fileType ? <ActualProof src={proofUrl} fileType={detail.fileType} /> : <div className="proof-stage proof-placeholder"><Icon name="file" size={34} /><p>لا يوجد ملف مرفوع بعد</p></div>}
            <p className={'detail-warning ' + (detail.status === 'approved' ? 'approved-text' : '')}>{detail.status === 'approved' ? 'تم اعتماد النسخة الحالية ويمكن تجهيز الإنتاج.' : detail.status === 'changes' ? 'طلب العميل تعديلات على هذه النسخة.' : detail.status === 'pending' ? 'النسخة الحالية غير معتمدة — الإنتاج متوقف.' : 'يجب رفع ملف قبل إرسال المسودة.'}<br />كل نسخة جديدة تحتاج موافقة جديدة.</p>
          </section>
          <section className="card versions-card"><h2>الإصدارات والموافقات</h2><div className="versions-list">
            {(detail.versions || []).map((v, index) => <div className={'version-item ' + (!index ? 'current-version' : '')} key={v.id}><span className={'version-dot dot-' + v.status} /><div><b>V{v.number} · {formatDate(v.date)}</b><p>{v.note || statusLabels[v.status]}</p><small title={v.fileName}>{v.fileName}</small></div></div>)}
            <div className="version-item"><span className="version-dot dot-created" /><div><b>إنشاء الطلب · {formatDate(detail.createdAt)}</b><p>طلب الطباعة مسجل في Neon</p></div></div>
          </div><label className="btn btn-outline full-width upload-new">{working ? 'جاري رفع النسخة...' : 'رفع نسخة جديدة'}<input className="file-input" type="file" disabled={working} accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg" onChange={newVersion} /></label></section>
        </div>
        <section className="card flow-card"><h3>تسلسل الطلب — {detail.status === 'approved' ? 'النسخة الحالية معتمدة' : 'الموافقة مرتبطة بالنسخة الحالية فقط'}</h3><div className="flow-line"><span>إنشاء الطلب</span><Icon name="arrow" size={17} /><span>رفع التصميم</span><Icon name="arrow" size={17} /><span>مراجعة العميل</span><Icon name="arrow" size={17} /><b>{statusLabels[detail.status]}</b></div></section>
      </> : <div className="card empty-state">اختر طلباً لعرض تفاصيله.</div>}</>}
      {page === 'activity' && <><header className="page-heading"><div><h1>سجل النشاط</h1><p>القرارات المسجلة فعلياً في قاعدة البيانات</p></div></header><section className="card activity-card"><h2>آخر النشاطات</h2>{events.map(event => <div className="activity-item" key={event.id}><span className="activity-icon"><Icon name="clock" size={17} /></span><div><b>{actLabels[event.type] || event.type} · {event.ref}</b><p>{event.client}</p></div><time>{formatDate(event.date)}</time></div>)}{!events.length && <div className="empty-state">لم يتم تسجيل نشاط بعد.</div>}</section></>}
      {page === 'settings' && <><header className="page-heading"><div><h1>الإعدادات</h1><p>بيانات المطبعة المحفوظة في قاعدة البيانات</p></div></header><section className="card settings-card"><h2>بيانات المطبعة</h2><label className="form-field">اسم المطبعة<input className="field-control" maxLength={120} value={shop} onChange={e => setShop(e.target.value)} /></label><button className="btn btn-primary settings-save" disabled={working} onClick={saveSettings}>{working ? 'جاري الحفظ...' : 'حفظ التغييرات'}</button><div className="settings-notice"><Icon name="shield" size={20} /><span>كلمة مرور مؤقتة مشتركة، سيتم استبدالها بحسابات موظفين وصلاحيات لاحقاً.</span></div></section></>}
    </main>
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>
}
