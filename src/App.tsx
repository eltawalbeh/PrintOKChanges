import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'

type Status = 'pending' | 'approved' | 'changes' | 'draft'
type Page = 'dashboard' | 'new' | 'details' | 'review' | 'approvals' | 'activity' | 'settings'
type Version = { number: number; status: Status; date: string; note?: string; fileName?: string }
type Order = { id: string; client: string; phone: string; product: string; quantity: string; size: string; material: string; createdAt: string; versions: Version[] }
type FormValues = { client: string; phone: string; product: string; quantity: string; size: string; material: string }

const STORAGE_KEY = 'printok.orders.v1'
const SHOP_KEY = 'printok.shop.v1'
const emptyForm: FormValues = { client: '', phone: '', product: '', quantity: '', size: '', material: '' }
const formatDate = (value: string) => new Intl.DateTimeFormat('ar-JO', { day: 'numeric', month: 'long' }).format(new Date(value))
const statusOf = (order: Order): Status => order.versions.length ? order.versions[order.versions.length - 1].status : 'draft'
const versionOf = (order: Order) => order.versions.length ? 'V' + order.versions[order.versions.length - 1].number : '—'
const statusLabels: Record<Status, string> = { pending: 'بانتظار الموافقة', approved: 'معتمد', changes: 'تعديل مطلوب', draft: 'مسودة' }

function demoOrders(): Order[] {
  const clients = ['روز كافيه', 'بيت الكوكيز', 'صابون البلد', 'أجمل هدية', 'مخبز السنابل', 'مطبعة الأصيل', 'قهوة نون', 'بيت الورق', 'أزهار عمّان', 'شركة المدار', 'حلويات واحة', 'الأفق الجديد']
  const products = ['ليبل أكواب', 'ستيكر تغليف', 'ليبل منتج', 'ستيكر دائري', 'بطاقات عمل', 'علب تغليف', 'أكياس ورقية', 'بوستر', 'ملصقات', 'بروشور']
  const statuses: Status[] = ['pending', 'approved', 'changes', 'approved', ...Array.from({ length: 20 }, (_, i) => i < 7 ? 'pending' : i < 17 ? 'approved' : 'changes')]
  return statuses.map((status, index) => {
    const day = new Date(2026, 10, 10 - index * 3).toISOString()
    const id = 'PK-' + (1024 - index)
    const v = index === 0 ? 2 : index === 2 ? 3 : 1
    const versions: Version[] = index === 0
      ? [{ number: 1, status: 'changes', date: '2026-11-09T10:00:00.000Z', note: 'طلب العميل تعديلًا' }, { number: 2, status: 'pending', date: '2026-11-10T10:00:00.000Z', note: 'بانتظار مراجعة العميل' }]
      : [{ number: v, status, date: day, note: status === 'changes' ? 'طلب العميل تعديلًا' : undefined }]
    return { id, client: clients[index % clients.length], phone: '0790000000', product: products[index % products.length], quantity: '500', size: '5 × 5 سم', material: 'ورق لاصق مطفي', createdAt: day, versions }
  })
}

function initialOrders(): Order[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed: unknown = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.every(item => item && typeof item.id === 'string' && Array.isArray(item.versions))) return parsed as Order[]
    }
  } catch { /* Fallback to demo data when browser storage is unavailable. */ }
  return demoOrders()
}

type IconName = 'grid' | 'plus' | 'check' | 'history' | 'settings' | 'bell' | 'search' | 'upload' | 'arrow' | 'up' | 'menu' | 'close' | 'link' | 'file' | 'clock'
function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    plus: <path d="M12 4v16M4 12h16" />,
    check: <path d="m4 12 5 5L20 6" />,
    history: <><path d="M3.3 10A9 9 0 1 1 4 15" /><path d="M3 4v6h6M12 7v5l4 2" /></>,
    settings: <><path d="M10 3h4l.7 2.2 1.7.9 2.3-.6 2 3.5-1.7 1.7v2.6l1.7 1.7-2 3.5-2.3-.6-1.7.9L14 21h-4l-.7-2.2-1.7-.9-2.3.6-2-3.5L5 13.3v-2.6L3.3 9l2-3.5 2.3.6 1.7-.9z" /><circle cx="12" cy="12" r="3" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 9h18c0-1-3-2-3-9ZM10 21h4" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    upload: <><path d="M12 16V3m-5 5 5-5 5 5M4 16v4h16v-4" /></>,
    arrow: <path d="M19 12H5m7-7-7 7 7 7" />,
    up: <path d="M12 20V4m-6 6 6-6 6 6" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    close: <path d="M5 5l14 14M19 5 5 19" />,
    link: <><path d="M10 13a5 5 0 0 0 7.3 0l2.1-2.1a5 5 0 0 0-7.1-7.1l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.3 0l-2.1 2.1a5 5 0 0 0 7.1 7.1l1.7-1.7" /></>,
    file: <><path d="M6 2h8l5 5v15H6zM14 2v6h5M9 13h7M9 17h7" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l4 2" /></>
  }
  return <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function StatusBadge({ status }: { status: Status }) { return <span className={'status status-' + status}>{statusLabels[status]}</span> }
function Proof({ order, small = false }: { order: Order; small?: boolean }) {
  return <div className={'proof-stage' + (small ? ' proof-small' : '')}>
    <div className="sticker" aria-label="نموذج مرئي لتصميم الطباعة">
      <div className="sticker-bar" />
      <b>{order.id === 'PK-1024' ? 'ROSE' : 'PRINT'}</b>
      <strong>{order.id === 'PK-1024' ? 'COFFEE' : 'PROOF'}</strong>
      <div className="sticker-rule" />
      <span>{order.id === 'PK-1024' ? '500 ml' : order.quantity + ' pcs'}</span>
    </div>
  </div>
}

export default function App() {
  const query = new URLSearchParams(window.location.search)
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [page, setPage] = useState<Page>(query.has('review') ? 'review' : 'dashboard')
  const [selectedId, setSelectedId] = useState(query.get('review') || 'PK-1024')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | Status>('all')
  const [period, setPeriod] = useState<'30' | 'all'>('30')
  const [form, setForm] = useState<FormValues>(emptyForm)
  const [selectedFile, setSelectedFile] = useState('')
  const [toast, setToast] = useState('')
  const [decision, setDecision] = useState<'approved' | 'changes' | null>(null)
  const [reason, setReason] = useState('')
  const [shop, setShop] = useState(() => { try { return localStorage.getItem(SHOP_KEY) || 'مطبعة المدى' } catch { return 'مطبعة المدى' } })
  const [mobileNav, setMobileNav] = useState(false)

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(orders)) } catch { /* Storage may be disabled. */ } }, [orders])
  useEffect(() => { try { localStorage.setItem(SHOP_KEY, shop) } catch { /* Storage may be disabled. */ } }, [shop])
  useEffect(() => { if (!toast) return; const id = window.setTimeout(() => setToast(''), 3400); return () => clearTimeout(id) }, [toast])

  const active = orders.find(order => order.id === selectedId)
  const stats = useMemo(() => ({
    all: orders.filter(order => statusOf(order) !== 'draft').length,
    pending: orders.filter(order => statusOf(order) === 'pending').length,
    approved: orders.filter(order => statusOf(order) === 'approved').length
  }), [orders])
  const filtered = useMemo(() => orders.filter(order => {
    const status = statusOf(order)
    if (page === 'approvals' && status !== 'pending') return false
    if (filter !== 'all' && status !== filter) return false
    if (period === '30' && (Date.now() - new Date(order.createdAt).getTime()) > 30 * 86400000) return false
    const term = search.trim().toLowerCase()
    return !term || [order.id, order.client, order.product, order.phone].some(value => value.toLowerCase().includes(term))
  }), [orders, page, filter, period, search])

  const navigate = (next: Page) => {
    setPage(next); setMobileNav(false); setFilter('all'); setSearch('')
    if (next !== 'review') window.history.replaceState({}, '', window.location.pathname)
  }
  const openOrder = (id: string) => { setSelectedId(id); navigate('details') }
  const makeReviewUrl = (order: Order) => {
    const url = new URL(window.location.href)
    url.search = ''
    url.searchParams.set('review', order.id)
    url.searchParams.set('v', versionOf(order))
    return url.toString()
  }
  const copyReviewUrl = async (order: Order) => {
    try { await navigator.clipboard.writeText(makeReviewUrl(order)); setToast('تم نسخ رابط العرض التجريبي — يتطلب الربط بخادم للمشاركة بين الأجهزة') }
    catch { window.prompt('انسخ رابط العرض التجريبي', makeReviewUrl(order)) }
  }
  const openReview = (order: Order) => {
    setSelectedId(order.id); setPage('review')
    window.history.pushState({}, '', new URL(makeReviewUrl(order)).pathname + new URL(makeReviewUrl(order)).search)
  }
  const saveOrder = (event: FormEvent, draft: boolean) => {
    event.preventDefault()
    if (!draft && (!form.client.trim() || !form.phone.trim() || !form.product.trim() || !form.quantity.trim() || !selectedFile)) {
      setToast('أكمل الحقول المطلوبة وارفع ملف التصميم قبل الإرسال'); return
    }
    const nextId = 'PK-' + (Math.max(1024, ...orders.map(o => Number(o.id.replace(/\D/g, '')) || 0)) + 1)
    const order: Order = { id: nextId, ...form, createdAt: new Date().toISOString(), versions: draft ? [] : [{ number: 1, status: 'pending', date: new Date().toISOString(), fileName: selectedFile }] }
    setOrders(prev => [order, ...prev]); setSelectedId(order.id); setForm(emptyForm); setSelectedFile('')
    setToast(draft ? 'تم حفظ المسودة على هذا المتصفح' : 'تم إنشاء الطلب وإرساله للمراجعة في النسخة التجريبية')
    navigate('details')
  }
  const uploadVersion = (event: ChangeEvent<HTMLInputElement>) => {
    if (!active || !event.target.files?.[0]) return
    const file = event.target.files[0]
    const version: Version = { number: (active.versions.at(-1)?.number || 0) + 1, status: 'pending', date: new Date().toISOString(), fileName: file.name, note: 'نسخة جديدة تنتظر الموافقة' }
    setOrders(prev => prev.map(order => order.id === active.id ? { ...order, versions: [...order.versions, version] } : order))
    event.target.value = ''
    setToast('تم تسجيل النسخة الجديدة؛ الموافقات السابقة لا تنطبق عليها')
  }
  const submitDecision = () => {
    if (!active || !active.versions.length || statusOf(active) !== 'pending') { setDecision(null); setToast('هذه النسخة ليست بانتظار الموافقة'); return }
    if (decision === 'changes' && !reason.trim()) { setToast('يرجى توضيح التعديل المطلوب'); return }
    setOrders(prev => prev.map(order => order.id === active.id ? {
      ...order, versions: order.versions.map((v, i) => i === order.versions.length - 1 ? { ...v, status: decision || 'pending', note: decision === 'changes' ? reason.trim() : 'تمت موافقة العميل' } : v)
    } : order))
    setToast(decision === 'approved' ? 'تم اعتماد هذه النسخة فقط' : 'تم تسجيل طلب التعديل لهذه النسخة')
    setDecision(null); setReason('')
  }

  const menu: { page: Page; title: string; icon: IconName }[] = [
    { page: 'dashboard', title: 'الطلبات', icon: 'grid' },
    { page: 'new', title: 'طلب جديد', icon: 'plus' },
    { page: 'approvals', title: 'الموافقات', icon: 'check' },
    { page: 'activity', title: 'سجل النشاط', icon: 'history' },
    { page: 'settings', title: 'الإعدادات', icon: 'settings' }
  ]

  if (page === 'review') {
    const status = active ? statusOf(active) : undefined
    const requestedVersion = query.get('v')
    const outdatedLink = Boolean(active && requestedVersion && requestedVersion !== versionOf(active))
    return <div className="customer-shell" dir="rtl">
      <header className="customer-header"><span className="brand-mark"><Icon name="check" size={25} /></span><b>PrintOK</b></header>
      <main className="customer-main">
        {active ? <>
          <h1>مراجعة التصميم</h1>
          <p className="customer-sub">{active.client} · طلب <span dir="ltr">{active.id}</span></p>
          <div className="card customer-proof">
            <div className="proof-version">النسخة {versionOf(active)}</div>
            <Proof order={active} small />
          </div>
          <p className="customer-instruction">راجع النصوص والمقاس والألوان قبل الموافقة.</p>
          <p className="muted customer-note">موافقتك تخص النسخة {versionOf(active)} فقط.<br />أي نسخة جديدة تحتاج موافقة جديدة.</p>
          {outdatedLink && <p className="warning-message">هذا الرابط يشير إلى نسخة سابقة. افتح رابط النسخة الأحدث للمراجعة.</p>}
          {status === 'pending' && !outdatedLink ? <>
            <button className="btn btn-approve customer-action" onClick={() => setDecision('approved')}><Icon name="check" />أوافق على النسخة {versionOf(active)}</button>
            <button className="btn btn-outline customer-action" onClick={() => setDecision('changes')}>أطلب تعديلًا</button>
          </> : <div className="review-result"><StatusBadge status={status || 'draft'} /><p>{status === 'approved' ? 'تم تسجيل الموافقة لهذه النسخة.' : status === 'changes' ? 'تم تسجيل طلب التعديل. بانتظار نسخة جديدة.' : 'لا يمكن مراجعة مسودة قبل إرسالها.'}</p></div>}
          <p className="muted customer-footer">لا يبدأ الإنتاج قبل موافقة صريحة على هذه النسخة.<br />رابط خاص بهذا الطلب · لا تحتاج لإنشاء حساب<br /><small>عرض تجريبي محلي — لا يشارك بيانات الطلبات بين الأجهزة</small></p>
        </> : <div className="card missing-order"><h1>الطلب غير موجود</h1><p>هذا العرض التجريبي يحفظ الطلبات على المتصفح الحالي فقط.</p></div>}
        <button className="demo-back" onClick={() => navigate('dashboard')}>العودة إلى لوحة المطبعة (تجربة)</button>
      </main>
      {decision && <div className="modal-backdrop" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-label="تأكيد قرار المراجعة">
        <button className="close-btn" onClick={() => setDecision(null)} aria-label="إغلاق"><Icon name="close" /></button>
        <h2>{decision === 'approved' ? 'تأكيد الموافقة' : 'طلب تعديل التصميم'}</h2>
        <p className="muted">{decision === 'approved' ? 'سيتم اعتماد النسخة ' + (active ? versionOf(active) : '') + ' فقط.' : 'اكتب ملاحظاتك ليتم تسجيلها مع رقم النسخة.'}</p>
        {decision === 'changes' && <textarea className="field-control" value={reason} onChange={e => setReason(e.target.value)} placeholder="ما الذي يحتاج إلى تعديل؟" rows={4} autoFocus />}
        <div className="modal-actions"><button className="btn btn-outline" onClick={() => setDecision(null)}>إلغاء</button><button className={'btn ' + (decision === 'approved' ? 'btn-approve' : 'btn-primary')} onClick={submitDecision}>تأكيد</button></div>
      </section></div>}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  }

  return <div className="app-shell" dir="rtl">
    <aside className={'sidebar' + (mobileNav ? ' sidebar-open' : '')}>
      <div className="sidebar-brand"><span className="brand-mark"><Icon name="check" size={27} /></span><b>PrintOK</b></div>
      <p className="sidebar-caption">مساحة المطبعة</p>
      <nav aria-label="التنقل الرئيسي" className="nav-list">
        {menu.map(item => <button type="button" key={item.page} className={'nav-item ' + ((page === item.page || (page === 'details' && item.page === 'dashboard')) ? 'nav-active' : '')} onClick={() => navigate(item.page)}>
          <Icon name={item.icon} size={23} /><span>{item.title}</span>
        </button>)}
      </nav>
      <div className="sidebar-footer"><b>{shop || 'المطبعة'}</b><span>اشتراك تجريبي</span></div>
    </aside>
    {mobileNav && <button className="nav-scrim" aria-label="إغلاق القائمة" onClick={() => setMobileNav(false)} />}
    <main className="workspace">
      <div className="workspace-top">
        <button className="mobile-menu-btn" onClick={() => setMobileNav(true)} aria-label="فتح القائمة"><Icon name="menu" /></button>
        <button className="notifications" onClick={() => setToast('لا توجد إشعارات جديدة')}><Icon name="bell" size={20} /><span>الإشعارات</span></button>
      </div>
      {(page === 'dashboard' || page === 'approvals') && <>
        <header className="page-heading"><div><h1>{page === 'approvals' ? 'الموافقات' : 'لوحة الطلبات'}</h1><p>{page === 'approvals' ? 'النسخ التي تنتظر موافقة العميل' : 'تابع ملفات التصاميم وموافقات العملاء من مكان واحد'}</p></div>
          <button className="btn btn-primary new-action" onClick={() => navigate('new')}><Icon name="plus" size={23} />طلب طباعة جديد</button>
        </header>
        <div className="stats-grid">
          <div className="card stat-card"><div>جميع الطلبات</div><strong>{stats.all.toString().padStart(2, '0')}</strong><small><Icon name="up" size={13} /> طلبات الطباعة المسجلة</small></div>
          <div className="card stat-card"><div>بانتظار الموافقة</div><strong>{stats.pending.toString().padStart(2, '0')}</strong><small>تحتاج متابعة العميل</small></div>
          <div className="card stat-card"><div>جاهزة للإنتاج</div><strong>{stats.approved.toString().padStart(2, '0')}</strong><small>تمت الموافقة على التصميم</small></div>
        </div>
        <section className="card orders-card"><div className="section-heading"><h2>{page === 'approvals' ? 'طلبات بانتظار الموافقة' : 'الطلبات الأخيرة'}</h2><p>تفاصيل الطلب وحالة آخر نسخة</p></div>
          <div className="table-toolbar">
            <div className="toolbar-filters"><label className="select-wrap"><span className="sr-only">الفترة</span><select value={period} onChange={e => setPeriod(e.target.value as '30' | 'all')}><option value="30">آخر 30 يوم</option><option value="all">جميع الفترات</option></select></label>
            <label className="select-wrap"><span className="sr-only">حالة الطلب</span><select value={filter} onChange={e => setFilter(e.target.value as 'all' | Status)}><option value="all">كل الحالات</option><option value="pending">بانتظار الموافقة</option><option value="approved">معتمد</option><option value="changes">تعديل مطلوب</option><option value="draft">مسودة</option></select></label></div>
            <label className="search-box"><Icon name="search" size={20} /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث باسم العميل أو رقم الطلب" aria-label="بحث بالطلبات" /></label>
          </div>
          <div className="table-scroll"><table className="orders-table"><thead><tr><th>رقم الطلب</th><th>العميل</th><th>النوع</th><th>الإصدار</th><th>الحالة</th></tr></thead><tbody>
            {filtered.map(order => <tr key={order.id} onClick={() => openOrder(order.id)}><td><button className="order-link" onClick={e => { e.stopPropagation(); openOrder(order.id) }} dir="ltr">#{order.id}</button></td><td>{order.client}</td><td>{order.product}</td><td className="muted" dir="ltr">{versionOf(order)}</td><td><StatusBadge status={statusOf(order)} /></td></tr>)}
          </tbody></table>{!filtered.length && <div className="empty-state">لا توجد طلبات تطابق البحث أو الفلاتر الحالية.</div>}</div>
        </section>
      </>}

      {page === 'new' && <><header className="page-heading"><div><h1>طلب طباعة جديد</h1><p>عبّئ التفاصيل وارفع ملف البروفا قبل إرساله للعميل</p></div></header>
        <form id="order-form" onSubmit={e => saveOrder(e, false)}>
          <section className="card create-card">
            <div className="section-heading"><h2>تفاصيل العميل والطباعة</h2><p>الحقول ذات العلامة * مطلوبة</p></div>
            <div className="fields-grid">
              <label className="form-field">اسم العميل *<input required className="field-control" value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} placeholder="مثال: روز كافيه" /></label>
              <label className="form-field">رقم الموبايل *<input required className="field-control" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="07XXXXXXXX" inputMode="tel" dir="ltr" /></label>
              <label className="form-field">اسم المنتج / المشروع *<input required className="field-control" value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} placeholder="ليبل للأكواب الورقية" /></label>
              <label className="form-field">الكمية *<input required className="field-control" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="500" type="number" min="1" /></label>
              <label className="form-field">المقاس<input className="field-control" value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))} placeholder="5 × 5 سم" /></label>
              <label className="form-field">الخامة<input className="field-control" value={form.material} onChange={e => setForm(f => ({ ...f, material: e.target.value }))} placeholder="ورق لاصق مطفي" /></label>
            </div>
            <div className="form-divider" />
            <label className="file-section">ملف التصميم — النسخة V1
              <span className="upload-zone"><Icon name="upload" size={25} /><strong>{selectedFile || 'اسحب الملف هنا أو اضغط للرفع'}</strong><small>PDF / PNG / JPG · النسخة الأولى V1</small></span>
              <input className="file-input" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={e => setSelectedFile(e.target.files?.[0]?.name || '')} />
            </label>
          </section>
          <div className="create-footer"><div className="create-buttons"><button className="btn btn-primary" type="submit">حفظ وإرسال للمراجعة</button><button className="btn btn-outline" type="button" onClick={e => saveOrder(e as unknown as FormEvent, true)}>حفظ كمسودة</button></div><p>لن يبدأ الإنتاج قبل موافقة صريحة على نسخة التصميم</p></div>
        </form>
      </>}

      {page === 'details' && active && <><header className="page-heading details-heading"><div><h1>تفاصيل طلب <span dir="ltr">{active.id}</span></h1><p>{active.client} · {active.product} · آخر نسخة {versionOf(active)}</p></div><button className="btn btn-primary copy-action" onClick={() => copyReviewUrl(active)}><Icon name="link" size={18} />نسخ رابط المراجعة</button></header>
        <div className="details-status"><StatusBadge status={statusOf(active)} /></div>
        <div className="detail-grid">
          <section className="card detail-proof-card"><div className="detail-panel-heading"><h2>التصميم الحالي — {versionOf(active)}</h2><span className="version-chip">النسخة الحالية</span></div><Proof order={active} />
            <p className={'detail-warning ' + (statusOf(active) === 'approved' ? 'approved-text' : '')}>{statusOf(active) === 'approved' ? 'تم اعتماد هذه النسخة — يمكن تجهيز الإنتاج.' : statusOf(active) === 'changes' ? 'التعديل مطلوب — ارفع نسخة جديدة للمراجعة.' : statusOf(active) === 'draft' ? 'المسودة لم تُرسل للمراجعة بعد.' : 'النسخة ' + versionOf(active) + ' غير معتمدة — الإنتاج متوقف.'}<br />أي نسخة جديدة تحتاج موافقة جديدة.</p>
          </section>
          <section className="card versions-card"><h2>الإصدارات والموافقات</h2><div className="versions-list">
            {active.versions.slice().reverse().map((v, i) => <div className={'version-item ' + (i === 0 ? 'current-version' : '')} key={v.number}><span className={'version-dot ' + ('dot-' + v.status)} /><div><b>V{v.number} · {formatDate(v.date)}</b><p>{v.note || statusLabels[v.status]}</p>{v.fileName && <small title={v.fileName}>{v.fileName}</small>}</div></div>)}
            <div className="version-item"><span className="version-dot dot-created" /><div><b>الطلب · {formatDate(active.createdAt)}</b><p>تم إنشاء طلب الطباعة</p></div></div>
          </div><label className="btn btn-outline full-width upload-new">رفع نسخة جديدة<input className="file-input" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={uploadVersion} /></label></section>
        </div>
        <section className="card flow-card"><h3>تسلسل الطلب — {statusOf(active) === 'approved' ? 'تم اعتماد النسخة ' + versionOf(active) : 'بانتظار موافقة العميل على النسخة ' + versionOf(active)}</h3><div className="flow-line"><span>إنشاء الطلب</span><Icon name="arrow" size={17} /><span>رفع V1</span><Icon name="arrow" size={17} /><span>تعديل مطلوب</span><Icon name="arrow" size={17} /><span>رفع {versionOf(active)}</span><Icon name="arrow" size={17} /><b>{statusLabels[statusOf(active)]}</b></div></section>
        <div className="demo-review-action"><button className="btn btn-outline" onClick={() => openReview(active)}>فتح شاشة العميل التجريبية</button><p>الموافقة في هذه النسخة تجريبية ومحلية داخل المتصفح.</p></div>
      </>}
      {page === 'details' && !active && <section className="card empty-state">لم يتم العثور على هذا الطلب. <button className="btn btn-outline" onClick={() => navigate('dashboard')}>العودة للطلبات</button></section>}

      {page === 'activity' && <><header className="page-heading"><div><h1>سجل النشاط</h1><p>تسلسل الإصدارات والقرارات المسجلة في هذا المتصفح</p></div></header><section className="card activity-card"><h2>آخر النشاطات</h2>
        {orders.flatMap(o => [{ key: o.id + '-created', date: o.createdAt, title: 'إنشاء طلب ' + o.id, sub: o.client }, ...o.versions.map(v => ({ key: o.id + '-' + v.number, date: v.date, title: o.id + ' · ' + 'V' + v.number + ' · ' + statusLabels[v.status], sub: v.note || o.client }))]).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20).map(e => <div className="activity-item" key={e.key}><span className="activity-icon"><Icon name="clock" size={17} /></span><div><b>{e.title}</b><p>{e.sub}</p></div><time>{formatDate(e.date)}</time></div>)}
      </section></>}
      {page === 'settings' && <><header className="page-heading"><div><h1>الإعدادات</h1><p>تخصيص بيانات المطبعة في العرض التجريبي</p></div></header><section className="card settings-card"><h2>بيانات المطبعة</h2><label className="form-field">اسم المطبعة<input className="field-control" value={shop} onChange={e => setShop(e.target.value)} /></label><p className="muted">تُحفظ الإعدادات محليًا على هذا المتصفح فقط.</p><div className="settings-notice"><Icon name="file" size={20} /><span>الرفع والمشاركة والموافقات الفعلية تتطلب قاعدة بيانات وواجهة خلفية وصلاحيات آمنة.</span></div></section></>}
    </main>
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>
}
