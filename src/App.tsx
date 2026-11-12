import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { api, getSession, setSession, type Activity, type Order, type Review, type Status, type Version } from './api'

type Page = 'dashboard' | 'new' | 'details' | 'approvals' | 'activity' | 'settings'
type IconName = 'grid' | 'plus' | 'check' | 'history' | 'settings' | 'bell' | 'search' | 'upload' | 'arrow' | 'up' | 'menu' | 'close' | 'link' | 'file' | 'clock' | 'log-out' | 'shield' | 'eye' | 'filter' | 'calendar' | 'chevron' | 'refresh' | 'user' | 'phone' | 'download' | 'trash'
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
    eye: <><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
    filter: <><path d="M3 5h18M6 12h12M10 19h4" /><circle cx="17" cy="5" r="2" fill="currentColor" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v5M17 3v5M3 10h18" /></>,
    chevron: <path d="m6 9 6 6 6-6" />,
    refresh: <><path d="M20 6v5h-5M4 18v-5h5" /><path d="M6.1 9A7 7 0 0 1 19 11M5 13a7 7 0 0 0 12.9 2" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>,
    phone: <path d="M5 3h4l2 5-2.5 2a15 15 0 0 0 5.5 5.5l2-2.5 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2Z" />,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4" /></>,
    trash: <><path d="M4 7h16M10 4h4M7 7l1 14h8l1-14M10 11v7M14 11v7" /></>
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

const DESIGN_UPDATE_URL = 'https://www.figma.com/design/n6Vv2dTAInthPQ9MEJwh42/PrintOK?node-id=66-128';
const ACCEPTED_FILE_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
const sizeLabel = (size: number) => size >= 1048576 ? (size / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.ceil(size / 1024)) + ' KB';
const normalizeDigits = (value: string) => value.replace(/[٠-٩۰-۹]/g, char => {
  const a = '٠١٢٣٤٥٦٧٨٩'.indexOf(char);
  return String(a >= 0 ? a : '۰۱۲۳۴۵۶۷۸۹'.indexOf(char));
});
type DashboardResponse = { orders: Order[]; stats: { all: number; pending: number; approved: number; changes: number; draft: number }; total: number; page: number; pageSize: number };
function DropFile({ file, onChange, onError, disabled = false, compact = false }: {
  file: File | null; onChange: (file: File | null) => void; onError: (message: string) => void; disabled?: boolean; compact?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const select = (candidate?: File) => {
    if (!candidate) return;
    if (!ACCEPTED_FILE_TYPES.includes(candidate.type) || !candidate.size || candidate.size > 20 * 1024 * 1024) {
      onError('الملف يجب أن يكون PDF أو PNG أو JPG بحجم لا يزيد عن 20MB');
      return;
    }
    onChange(candidate);
  };
  return <div className={'file-drop-widget' + (compact ? ' file-drop-compact' : '')}>
    {file ? <div className="selected-file-card" role="status">
      <span className="selected-file-icon"><Icon name="file" size={24} /></span>
      <div className="selected-file-content"><b title={file.name} dir="auto">{file.name}</b><small>{file.type === 'application/pdf' ? 'PDF' : file.type === 'image/png' ? 'PNG' : 'JPG'} · {sizeLabel(file.size)} · جاهز للرفع</small></div>
      <button className="file-remove-btn" type="button" aria-label="إزالة الملف المختار" onClick={() => { onChange(null); if(picker.current)picker.current.value = ''; }} disabled={disabled}><Icon name="close" size={17} /></button>
    </div> : <div className={'drop-surface' + (dragging ? ' drop-active' : '') + (disabled ? ' drop-disabled' : '')}
      role="button" tabIndex={disabled ? -1 : 0} aria-label="اسحب ملف التصميم وأسقطه هنا أو اضغط للاختيار"
      onClick={() => !disabled && picker.current?.click()}
      onKeyDown={e => { if(!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); picker.current?.click(); } }}
      onDragEnter={e => { e.preventDefault(); e.stopPropagation(); if(!disabled) setDragging(true); }}
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); if(!disabled) setDragging(true); }}
      onDragLeave={e => { e.preventDefault(); e.stopPropagation(); if(!e.currentTarget.contains(e.relatedTarget as Node))setDragging(false); }}
      onDrop={e => { e.preventDefault(); e.stopPropagation(); setDragging(false); if(!disabled) select(e.dataTransfer.files[0]); }}>
      <Icon name="upload" size={26} />
      <strong>{dragging ? 'أفلت الملف هنا' : 'اسحب الملف وأسقطه هنا أو اضغط للاختيار'}</strong>
      <small>PDF / PNG / JPG · حتى 20 MB</small>
    </div>}
    <input ref={picker} className="sr-only" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" disabled={disabled}
      onChange={e => { select(e.target.files?.[0]); e.target.value=''; }} />
    {file && <button className="file-replace-btn" type="button" disabled={disabled} onClick={() => picker.current?.click()}>استبدال الملف</button>}
  </div>;
}

function FeedbackPanel({ order, onOpen }: { order: Order; onOpen: (versionId: string, download?: boolean) => void }) {
  const feedback = order.versions?.find(v => v.status === 'changes' && (v.note || v.revisionFileName));
  if (!feedback) return null;
  return <section className="card feedback-panel">
    <div className="feedback-header"><h2>ملاحظات العميل</h2><span className="version-chip">النسخة V{feedback.number}</span></div>
    {feedback.note && <div className="feedback-note">{feedback.note}</div>}
    {feedback.revisionFileName && <div className="feedback-attachment">
      <h3>مرفق العميل</h3>
      <div className="stored-file-card"><span className="selected-file-icon"><Icon name="file" size={23}/></span>
        <div><b dir="auto">{feedback.revisionFileName}</b><small>{feedback.revisionFileType === 'application/pdf' ? 'PDF' : 'صورة'} · {feedback.revisionFileSize ? sizeLabel(feedback.revisionFileSize) : ''} · ملف مرجعي فقط</small></div>
      </div>
      <div className="feedback-buttons"><button className="btn btn-outline" onClick={() => onOpen(feedback.id,false)}><Icon name="eye" size={18}/>عرض المرفق</button><button className="btn btn-primary" onClick={() => onOpen(feedback.id,true)}><Icon name="download" size={18}/>تنزيل الملف</button></div>
    </div>}
    <p className="muted feedback-footnote">مرفق العميل للمراجعة فقط ولا يستبدل نسخة الإنتاج. يجب اعتماد أي نسخة جديدة بشكل مستقل.</p>
  </section>;
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
  const [revisionFile, setRevisionFile] = useState<File | null>(null)
  const [newVersionFile, setNewVersionFile] = useState<File | null>(null)
  const [revisionSuccess, setRevisionSuccess] = useState(false)
  const [revisionAttachmentUrl, setRevisionAttachmentUrl] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | Status>('all')
  const [period, setPeriod] = useState<'all' | '7' | '30' | '90' | '365'>('all')
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest')
  const [pageIndex, setPageIndex] = useState(1)
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState({ all: 0, pending: 0, approved: 0, changes: 0, draft: 0 })
  const [syncedAt, setSyncedAt] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const [decision, setDecision] = useState<'approved' | 'changes' | null>(null)
  const [note, setNote] = useState('')

  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(''), 4500); return () => clearTimeout(id) }, [toast])

  const orderPath = () => {
    const params = new URLSearchParams();
    const term = normalizeDigits(search).trim();
    if (term) params.set('q', term);
    if (page === 'approvals') params.set('status', 'pending');
    else if (filter !== 'all') params.set('status', filter);
    if (period !== 'all') params.set('days', period);
    if (sort === 'oldest') params.set('sort', 'oldest');
    params.set('page', String(pageIndex));
    return '/orders?' + params.toString();
  };
  const applyList = (data: DashboardResponse) => {
    setOrders(data.orders);
    setStats(data.stats);
    setTotal(data.total);
    setSyncedAt(new Date());
  };
  async function refresh(token: string) {
    setLoading(true);
    try {
      const [o, settings, activity] = await Promise.all([
        api<DashboardResponse>(orderPath(), { token }),
        api<{ shopName: string }>('/settings', { token }),
        api<{ events: Activity[] }>('/events', { token })
      ]);
      applyList(o); setShop(settings.shopName); setEvents(activity.events); setError('');
    } catch (e) { setError(messageOf(e)); throw e; }
    finally { setLoading(false); }
  }
  useEffect(() => {
    if (!session || customerMode || !['dashboard','approvals'].includes(page)) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setRefreshing(true);
      api<DashboardResponse>(orderPath(), {token:session,signal:controller.signal})
        .then(data => { if (!controller.signal.aborted) { applyList(data); setError(''); } })
        .catch(e => { if (!controller.signal.aborted) setError(messageOf(e)); })
        .finally(() => { if (!controller.signal.aborted) setRefreshing(false); });
    }, 320);
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [session,customerMode,page,search,filter,period,sort,pageIndex]);
  useEffect(() => {
    if (!session || customerMode) return;
    let active = true;
    let inFlight = false;
    const poll = async () => {
      if (!active || inFlight || document.visibilityState !== 'visible' || working) return;
      inFlight = true;
      try {
        if (page === 'dashboard' || page === 'approvals') {
          const data = await api<DashboardResponse>(orderPath(), {token:session});
          if (active) applyList(data);
        } else if (page === 'details' && selectedId) {
          const r = await api<{order:Order}>('/orders/' + selectedId, {token:session});
          if (active) setDetail(r.order);
        } else if (page === 'activity') {
          const r = await api<{events:Activity[]}>('/events', {token:session});
          if (active) setEvents(r.events);
        }
      } catch { /* Keep the last confirmed state; manual refresh remains available. */ }
      finally { inFlight = false; }
    };
    const timer = window.setInterval(poll,10000);
    window.addEventListener('focus',poll);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus',poll); };
  }, [session,customerMode,page,selectedId,working,search,filter,period,sort,pageIndex]);
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
  async function newVersion(file: File) {
    if (!detail || !file) return;
    const data = new FormData();
    data.append('file',file);
    setWorking(true);
    try {
      await api('/orders/'+detail.id+'/versions',{method:'POST',token:session,body:data});
      setNewVersionFile(null);
      setToast('تم رفع نسخة جديدة بنجاح؛ تحتاج موافقة مستقلة من العميل.');
      await refresh(session);
      await openOrder(detail.id);
    } catch(e) { setToast(messageOf(e)); }
    finally { setWorking(false); }
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
    if (!review || !reviewToken || !decision) return;
    if (decision === 'changes' && !note.trim() && !revisionFile) { setToast('يجب كتابة ملاحظة أو إرفاق ملف واحد على الأقل'); return; }
    setWorking(true);
    try {
      const body = decision === 'changes' ? new FormData() : { decision, note: '' };
      if (body instanceof FormData) {
        body.append('decision','changes');
        body.append('note',note);
        if (revisionFile) body.append('file',revisionFile);
      }
      const result = await api<{status:Status}>('/review/' + encodeURIComponent(reviewToken) + '/decision', { method:'POST', body });
      setReview(prev => prev ? {...prev,status:result.status,note} : prev);
      setRevisionSuccess(result.status === 'changes');
      setDecision(null);
      setNote('');
      setRevisionFile(null);
      setToast(result.status === 'approved' ? 'تم اعتماد النسخة المحددة بنجاح' : 'تم استلام طلب التعديل والمرفق المرجعي');
    } catch(e) { setToast(messageOf(e)); }
    finally { setWorking(false); }
  }
  async function openRevisionFile(versionId: string, download = false) {
    if (!detail) return;
    try {
      const file = await api<{url:string}>('/orders/' + detail.id + '/revisions/' + versionId + '/file' + (download ? '?download=1' : ''),{token:session});
      window.open(file.url,'_blank','noopener,noreferrer');
    } catch(e) { setToast(messageOf(e)); }
  }
  async function saveSettings() {
    setWorking(true)
    try {
      const result = await api<{ shopName: string }>('/settings', { method: 'PATCH', token: session, body: { shopName: shop } })
      setShop(result.shopName); setToast('تم حفظ الإعدادات في Neon')
    } catch (e) { setToast(messageOf(e)) }
    finally { setWorking(false) }
  }

  const filtered = orders
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
        {revisionSuccess ? <>
          <h1>تم إرسال طلب التعديل</h1>
          <p className="customer-sub">{review.client} · طلب <span dir="ltr">{review.ref}</span> · النسخة V{review.version}</p>
          <section className="card revision-success-card">
            <div className="revision-success-icon"><Icon name="check" size={52}/></div>
            <h2>تم استلام طلب التعديل</h2>
            <p>وصلت ملاحظاتك وملفك إلى المطبعة بنجاح.</p>
            <StatusBadge status="changes"/>
            <p className="muted">سيُطلب منك اعتماد التصميم الجديد عند إرساله. النسخة الحالية غير معتمدة.</p>
          </section>
          <button className="btn btn-primary customer-action" onClick={() => setRevisionSuccess(false)}>العودة إلى تفاصيل المراجعة</button>
          <p className="muted customer-footer">لا تحتاج إلى إنشاء حساب.</p>
        </> : decision === 'changes' && review.status === 'pending' ? <>
          <h1>طلب تعديل على التصميم</h1>
          <p className="customer-sub">{review.client} · طلب <span dir="ltr">{review.ref}</span> · النسخة V{review.version}</p>
          <p className="revision-pill">طلب تعديل · V{review.version}</p>
          <label className="revision-label" htmlFor="revision-note">ما التعديل المطلوب؟</label>
          <p className="muted revision-hint">اكتب الملاحظات أو أرفق ملفاً يوضح التعديل.</p>
          <textarea id="revision-note" className="field-control revision-textarea" rows={5} placeholder="مثال: يرجى تكبير الشعار وتغيير لون الخلفية..." value={note} onChange={e => setNote(e.target.value)} autoFocus/>
          <h3 className="revision-label">ملف مرجعي للتعديل (إن وجد)</h3>
          <DropFile file={revisionFile} onChange={setRevisionFile} onError={setToast} disabled={working} compact/>
          <div className="revision-privacy">الملف المرجعي لا يستبدل نسخة الطباعة تلقائياً، ولا يُعد موافقة.</div>
          <button className="btn btn-primary customer-action" disabled={working} onClick={submitDecision}>{working ? 'جاري إرسال الملاحظات والملف...' : 'إرسال طلب التعديل'}</button>
          <button className="revision-cancel-btn" type="button" disabled={working} onClick={() => setDecision(null)}>العودة لمراجعة التصميم</button>
          <p className="muted customer-footer">يجب كتابة ملاحظة أو إرفاق ملف واحد على الأقل.</p>
        </> : <>
          <h1>مراجعة التصميم</h1>
          <p className="customer-sub">{review.client} · طلب <span dir="ltr">{review.ref}</span></p>
          <div className="card customer-proof"><div className="proof-version">النسخة V{review.version}</div>{proofUrl ? <ActualProof src={proofUrl} fileType={review.fileType} className="proof-small" /> : <Busy label="جاري تحميل الملف..." />}</div>
          <p className="customer-instruction">راجع النصوص والمقاس والألوان قبل الموافقة.</p>
          <p className="muted customer-note">موافقتك تخص النسخة V{review.version} فقط.<br/>أي نسخة جديدة تحتاج موافقة جديدة.</p>
          {review.status === 'pending' ? <>
            <button className="btn btn-approve customer-action" disabled={working} onClick={() => setDecision('approved')}><Icon name="check"/>أوافق على النسخة V{review.version}</button>
            <button className="btn btn-outline customer-action" disabled={working} onClick={() => setDecision('changes')}>أطلب تعديلًا</button>
          </> : <div className="review-result"><StatusBadge status={review.status}/><p>{review.status==='approved'?'تم تسجيل الموافقة على هذه النسخة.':'تم إرسال طلب تعديل لهذه النسخة، بانتظار نسخة جديدة.'}</p></div>}
          <p className="muted customer-footer">لا يبدأ الإنتاج قبل موافقة صريحة على هذه النسخة.<br/>رابط خاص بهذا الطلب · لا تحتاج لإنشاء حساب</p>
        </>}
      </> : <Busy />}
    </main>
    {decision === 'approved' && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-label="تأكيد موافقة التصميم">
      <button className="close-btn" onClick={() => setDecision(null)} aria-label="إغلاق"><Icon name="close"/></button>
      <h2>تأكيد الموافقة</h2><p className="muted">هل تؤكد اعتماد هذه النسخة تحديداً؟</p>
      <div className="modal-actions"><button className="btn btn-outline" onClick={() => setDecision(null)}>إلغاء</button><button className="btn btn-approve" onClick={submitDecision} disabled={working}>{working?'جاري التأكيد...':'تأكيد الموافقة'}</button></div>
    </section></div>}
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
        <header className="page-heading"><div><h1>{page==='approvals'?'الموافقات':'لوحة الطلبات'}</h1><p>{page==='approvals'?'النسخ التي تنتظر موافقة العميل':'تابع ملفات التصاميم وموافقات العملاء من مكان واحد'}</p></div>
          <div className="page-heading-actions"><button className="btn btn-outline refresh-action" onClick={() => refresh(session).catch(()=>{})} disabled={loading} title="تحديث الطلبات"><Icon name="refresh" size={18}/>تحديث</button><button className="btn btn-primary new-action" onClick={() => navigate('new')}><Icon name="plus" size={23}/>طلب طباعة جديد</button></div>
        </header>
        <div className="stats-grid">
          <div className="card stat-card"><div>جميع الطلبات</div><strong>{stats.all.toString().padStart(2,'0')}</strong><small><Icon name="up" size={13}/>الطلبات المسجلة</small></div>
          <div className="card stat-card"><div>بانتظار الموافقة</div><strong>{stats.pending.toString().padStart(2,'0')}</strong><small>تحتاج متابعة العميل</small></div>
          <div className="card stat-card"><div>جاهزة للإنتاج</div><strong>{stats.approved.toString().padStart(2,'0')}</strong><small>تم اعتماد التصميم</small></div>
        </div>
        <section className="card orders-card">
          <div className="section-heading"><h2>{page==='approvals'?'الموافقات المعلقة':'الطلبات الأخيرة'}</h2><p>تفاصيل الطلب وحالة آخر نسخة</p></div>
          <div className="orders-status-strip"><span className={'live-indicator'+(refreshing?' live-syncing':'')}><span/>تحديث تلقائي كل 10 ثوانٍ</span>{syncedAt && <span>آخر مزامنة {syncedAt.toLocaleTimeString('ar-JO',{hour:'2-digit',minute:'2-digit'})}</span>}</div>
          <div className="table-toolbar enhanced-toolbar">
            <div className="toolbar-filters">
              {page!=='approvals'&&<label className="filter-field"><Icon name="filter" size={18}/><span>الحالة</span><select value={filter} aria-label="تصفية حسب حالة الطلب" onChange={e=>{setFilter(e.target.value as 'all'|Status);setPageIndex(1);}}>
                <option value="all">كل الحالات</option><option value="pending">بانتظار الموافقة</option><option value="approved">معتمد</option><option value="changes">تعديل مطلوب</option><option value="draft">مسودة</option></select><Icon name="chevron" size={15}/></label>}
              <label className="filter-field"><Icon name="calendar" size={18}/><span>الفترة</span><select value={period} aria-label="تصفية حسب الفترة" onChange={e=>{setPeriod(e.target.value as typeof period);setPageIndex(1);}}>
                <option value="all">كل الفترات</option><option value="7">آخر 7 أيام</option><option value="30">آخر 30 يوماً</option><option value="90">آخر 90 يوماً</option><option value="365">آخر سنة</option></select><Icon name="chevron" size={15}/></label>
              <label className="filter-field"><Icon name="arrow" size={18}/><span>الترتيب</span><select value={sort} aria-label="ترتيب الطلبات" onChange={e=>{setSort(e.target.value as 'newest'|'oldest');setPageIndex(1);}}>
                <option value="newest">الأحدث أولاً</option><option value="oldest">الأقدم أولاً</option></select><Icon name="chevron" size={15}/></label>
              {(filter!=='all'||period!=='all'||sort!=='newest'||search) && <button className="clear-filters" onClick={()=>{setFilter('all');setPeriod('all');setSort('newest');setSearch('');setPageIndex(1);}}><Icon name="close" size={15}/>إزالة الفلاتر</button>}
            </div>
            <label className="search-box"><Icon name="search" size={20}/><input value={search} onChange={e=>{setSearch(e.target.value);setPageIndex(1);}} placeholder="الاسم، رقم الطلب، رقم الهاتف، المنتج" aria-label="البحث برقم الطلب أو الهاتف أو اسم العميل أو المنتج"/>{search && <button type="button" aria-label="مسح البحث" onClick={()=>{setSearch('');setPageIndex(1);}}><Icon name="close" size={15}/></button>}</label>
          </div>
          <p className="results-count" role="status">{total} نتيجة مطابقة{refreshing?' · جاري التحديث...':''}</p>
          {loading ? <Busy/> : <div className="table-scroll"><table className="orders-table"><thead><tr><th>رقم الطلب</th><th>العميل</th><th>النوع</th><th>الإصدار</th><th>الحالة</th></tr></thead><tbody>
            {filtered.map(order=><tr key={order.id} onClick={()=>openOrder(order.id)}><td><button className="order-link" dir="ltr" onClick={e=>{e.stopPropagation();openOrder(order.id);}}>#{order.ref}</button></td><td>{order.client}<span className="order-phone">{order.phone}</span></td><td>{order.product}</td><td className="muted" dir="ltr">{order.currentVersion?'V'+order.currentVersion:'—'}</td><td><StatusBadge status={order.status}/></td></tr>)}
          </tbody></table>{!filtered.length&&<div className="empty-state">{search||filter!=='all'||period!=='all'?'لا توجد طلبات مطابقة. جرّب تعديل خيارات البحث أو الفلاتر.':'لا توجد طلبات بعد. ابدأ بإضافة طلب طباعة جديد.'}</div>}</div>}
          {total>50&&<div className="pagination-controls"><button className="btn btn-outline" type="button" disabled={pageIndex<=1} onClick={()=>setPageIndex(p=>Math.max(1,p-1))}>السابق</button><span>صفحة {pageIndex} من {Math.ceil(total/50)}</span><button className="btn btn-outline" type="button" disabled={pageIndex>=Math.ceil(total/50)} onClick={()=>setPageIndex(p=>p+1)}>التالي</button></div>}
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
            <div className="file-section"><h3>ملف التصميم — النسخة V1</h3><DropFile file={artwork} onChange={setArtwork} onError={setToast} disabled={working}/>{artwork && <p className="file-ready-hint"><Icon name="check" size={17}/>تم اختيار الملف، وسيتم رفعه وحفظه بعد إرسال الطلب.</p>}</div>
          </section>
          <div className="create-footer"><div className="create-buttons"><button className="btn btn-primary" type="submit" disabled={working}>{working ? 'جاري حفظ الطلب...' : 'حفظ وإرسال للمراجعة'}</button><button className="btn btn-outline" type="button" disabled={working} onClick={() => { const f = document.querySelector('form'); if (f?.reportValidity()) saveOrder({ preventDefault() {} } as FormEvent, true) }}>حفظ كمسودة</button></div><p>لن يبدأ الإنتاج قبل موافقة صريحة على النسخة المرفوعة</p></div>
        </form>
      </>}
      {page === 'details' && <>{loading ? <Busy/> : detail ? <>
        <header className="page-heading details-heading"><div><h1>تفاصيل طلب <span dir="ltr">{detail.ref}</span></h1><p>{detail.client} · {detail.product} · آخر نسخة {detail.currentVersion?'V'+detail.currentVersion:'مسودة'}</p></div>
          <button className="btn btn-primary copy-action" disabled={working||detail.status!=='pending'} onClick={copyReviewLink}><Icon name="link" size={18}/>نسخ رابط المراجعة</button>
        </header>
        <div className="details-status"><StatusBadge status={detail.status}/></div>
        <section className="card customer-details">
          <div className="customer-details-heading"><Icon name="user" size={22}/><h2>معلومات العميل وتفاصيل الطلب</h2></div>
          <div className="customer-details-grid">
            <div><small>اسم العميل</small><strong>{detail.client}</strong></div>
            <div><small>رقم الموبايل</small><a dir="ltr" href={'tel:'+detail.phone.replace(/[^\d+]/g,'')}><Icon name="phone" size={17}/>{detail.phone}</a></div>
            <div><small>اسم المنتج / المشروع</small><strong>{detail.product}</strong></div>
            <div><small>الكمية</small><strong>{detail.quantity}</strong></div>
            <div><small>المقاس</small><strong>{detail.dimensions||'غير محدد'}</strong></div>
            <div><small>الخامة</small><strong>{detail.material||'غير محددة'}</strong></div>
            <div><small>تاريخ إنشاء الطلب</small><strong>{formatDate(detail.createdAt)}</strong></div>
            <div><small>رقم الطلب</small><strong dir="ltr">{detail.ref}</strong></div>
          </div>
        </section>
        <div className="detail-grid">
          <section className="card detail-proof-card">
            <div className="detail-panel-heading"><h2>التصميم الحالي — {detail.currentVersion?'V'+detail.currentVersion:'مسودة'}</h2><span className="version-chip">النسخة الحالية</span></div>
            {proofUrl && detail.fileType ? <ActualProof src={proofUrl} fileType={detail.fileType}/> : <div className="proof-stage proof-placeholder"><Icon name="file" size={34}/><p>لا يوجد ملف مرفوع بعد</p></div>}
            {detail.fileName && <div className="file-saved-state"><Icon name="check" size={17}/><span>تم رفع الملف وحفظه: <b dir="auto">{detail.fileName}</b></span></div>}
            <p className={'detail-warning '+(detail.status==='approved'?'approved-text':'')}>{detail.status==='approved'?'تم اعتماد النسخة الحالية ويمكن تجهيز الإنتاج.':detail.status==='changes'?'طلب العميل تعديلات على هذه النسخة.':detail.status==='pending'?'النسخة الحالية غير معتمدة — الإنتاج متوقف.':'يجب رفع ملف قبل إرسال المسودة.'}<br/>كل نسخة جديدة تحتاج موافقة جديدة.</p>
          </section>
          <section className="card versions-card"><h2>الإصدارات والموافقات</h2>
            <div className="versions-list">
              {(detail.versions||[]).map((v:Version,index)=><div className={'version-item '+(!index?'current-version':'')} key={v.id}><span className={'version-dot dot-'+v.status}/><div><b>V{v.number} · {formatDate(v.date)}</b><p>{v.note||statusLabels[v.status]}</p><small title={v.fileName}>{v.fileName}</small>{v.revisionFileName&&<small>مرفق العميل: {v.revisionFileName}</small>}</div></div>)}
              <div className="version-item"><span className="version-dot dot-created"/><div><b>إنشاء الطلب · {formatDate(detail.createdAt)}</b><p>الطلب مسجل في Neon</p></div></div>
            </div>
            <div className="new-version-action"><h3>رفع نسخة جديدة {detail.currentVersion?'V'+(detail.currentVersion+1):'V1'}</h3><DropFile file={newVersionFile} onChange={setNewVersionFile} onError={setToast} compact disabled={working}/><button className="btn btn-outline full-width" type="button" disabled={!newVersionFile||working} onClick={()=>newVersionFile&&newVersion(newVersionFile)}>{working?'جاري الرفع...':'تأكيد رفع النسخة الجديدة'}</button></div>
          </section>
        </div>
        <FeedbackPanel order={detail} onOpen={openRevisionFile}/>
        <section className="card flow-card"><h3>تسلسل الطلب — {detail.status==='approved'?'النسخة الحالية معتمدة':'الموافقة مرتبطة بالنسخة الحالية فقط'}</h3><div className="flow-line"><span>إنشاء الطلب</span><Icon name="arrow" size={17}/><span>رفع التصميم</span><Icon name="arrow" size={17}/><span>مراجعة العميل</span><Icon name="arrow" size={17}/><b>{statusLabels[detail.status]}</b></div></section>
      </> : <div className="card empty-state">اختر طلباً لعرض تفاصيله.</div>}</>}
      {page === 'activity' && <><header className="page-heading"><div><h1>سجل النشاط</h1><p>القرارات المسجلة فعلياً في قاعدة البيانات</p></div></header><section className="card activity-card"><h2>آخر النشاطات</h2>{events.map(event => <div className="activity-item" key={event.id}><span className="activity-icon"><Icon name="clock" size={17} /></span><div><b>{actLabels[event.type] || event.type} · {event.ref}</b><p>{event.client}</p></div><time>{formatDate(event.date)}</time></div>)}{!events.length && <div className="empty-state">لم يتم تسجيل نشاط بعد.</div>}</section></>}
      {page === 'settings' && <><header className="page-heading"><div><h1>الإعدادات</h1><p>بيانات المطبعة المحفوظة في قاعدة البيانات</p></div></header><section className="card settings-card"><h2>بيانات المطبعة</h2><label className="form-field">اسم المطبعة<input className="field-control" maxLength={120} value={shop} onChange={e => setShop(e.target.value)} /></label><button className="btn btn-primary settings-save" disabled={working} onClick={saveSettings}>{working ? 'جاري الحفظ...' : 'حفظ التغييرات'}</button><div className="settings-notice"><Icon name="shield" size={20} /><span>كلمة مرور مؤقتة مشتركة، سيتم استبدالها بحسابات موظفين وصلاحيات لاحقاً.</span></div><div className="project-references"><h3>مراجع المشروع</h3><a href={DESIGN_UPDATE_URL} target="_blank" rel="noopener noreferrer"><Icon name="link" size={16}/>التصميم الجديد — تعديلات ومراجعة العميل</a><div><a href="https://www.figma.com/make/t0hQzy8mlmmV2ywJHOnnXp/PrintOK" target="_blank" rel="noopener noreferrer">Figma Make</a></div><div><a href="https://github.com/eltawalbeh/PrintOK" target="_blank" rel="noopener noreferrer">Main GitHub Repository</a></div><div><a href="https://github.com/eltawalbeh/PrintOKChanges" target="_blank" rel="noopener noreferrer">Changes Repository</a></div><div><a href="https://printok.figma.site/" target="_blank" rel="noopener noreferrer">Published Website</a></div></div></section></>}
    </main>
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>
}
