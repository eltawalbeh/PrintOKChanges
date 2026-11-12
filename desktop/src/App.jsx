import React, { useEffect, useMemo, useRef, useState } from 'react'
const bridge=window.printokDesktop
const emptyForm={client:'',phone:'',product:'',quantity:'',dimensions:'',material:''}
const statName={draft:'مسودة',pending:'بانتظار الموافقة',approved:'معتمد',changes:'تعديل مطلوب'}
const eventName={order_created:'إنشاء طلب',version_uploaded:'رفع نسخة',version_approved:'اعتماد التصميم',changes_requested:'طلب تعديل'}
const formatDate=d=>{try{return new Intl.DateTimeFormat('ar-JO',{dateStyle:'medium'}).format(new Date(d))}catch{return d}}
const digits=str=>String(str||'').replace(/[٠-٩۰-۹]/g,c=>{const n='٠١٢٣٤٥٦٧٨٩'.indexOf(c);return String(n>=0?n:'۰۱۲۳۴۵۶۷۸۹'.indexOf(c))})
const fileSize=n=>n>=1024*1024?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.ceil(n/1024))+' KB'
function Icon({name,size=20}){
  const shapes={
    grid:<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    plus:<path d="M12 4v16M4 12h16"/>,
    file:<><path d="M6 2h8l5 5v15H6zM14 2v6h5M9 13h7M9 17h7"/></>,
    folder:<path d="M3 6h7l2 2h9v11H3z"/>,
    users:<><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a4 4 0 0 1 0 8M17 15a5 5 0 0 1 4 5"/></>,
    clock:<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/></>,
    settings:<><circle cx="12" cy="12" r="3"/><path d="M10 2h4l1 3 2 1 3-1 2 4-2 2v2l2 2-2 4-3-1-2 1-1 3h-4l-1-3-2-1-3 1-2-4 2-2v-2L2 9l2-4 3 1 2-1z"/></>,
    logout:<><path d="M9 4H5v16h4M15 8l4 4-4 4M19 12H9"/></>,
    search:<><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></>,
    upload:<><path d="M12 16V3m-5 5 5-5 5 5M4 16v4h16v-4"/></>,
    check:<path d="m4 12 5 5L20 6"/>,
    refresh:<><path d="M20 6v5h-5M4 18v-5h5"/><path d="M6.1 9A7 7 0 0 1 19 11M5 13a7 7 0 0 0 12.9 2"/></>,
    eye:<><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>,
    monitor:<><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></>,
    download:<><path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/></>,
    arrow:<path d="M19 12H5m7-7-7 7 7 7"/>,
    close:<path d="M5 5 19 19M19 5 5 19"/>,
    shield:<><path d="m12 2 8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z"/><path d="m8 12 3 3 5-6"/></>,
    info:<><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
    phone:<path d="M4 4h5l2 5-2 2a14 14 0 0 0 4 4l2-2 5 2v5A16 16 0 0 1 4 4z"/>,
    globe:<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c6 6 6 12 0 18M12 3c-6 6-6 12 0 18"/></>,
    backup:<><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 4v6h8V4M8 17h8"/></>,
    sort:<path d="M8 3v18m-4-4 4 4 4-4M16 21V3m-4 4 4-4 4 4"/>,
    checkcircle:<><circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/></>,
    alert:<><path d="M12 3 2 21h20zM12 9v5M12 18h.01"/></>
  }
  return <svg className="ico" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[name]||shapes.info}</svg>
}
function Status({value}){return <span className={'status '+value}>{statName[value]||value}</span>}
function FileDrop({file,onPick,onClear,busy=false,title='ملف التصميم'}){
  const [over,setOver]=useState(false)
  const stage=async(files)=>{if(!files?.length||busy)return;try{await onPick(files[0])}catch(e){throw e}}
  return <section className="file-stage">
    <div className="file-label">{title}</div>
    {file?<div className="selected-file"><div className="selected-file-icon"><Icon name="file" size={25}/></div><div className="selected-file-text"><b dir="auto">{file.name}</b><small>{file.type} · {fileSize(file.size)} · جاهز للحفظ</small></div><button type="button" className="remove-file" aria-label="إزالة الملف" onClick={onClear} disabled={busy}><Icon name="close" size={17}/></button></div>:
    <button type="button" className={'file-drop'+(over?' drag-over':'')} disabled={busy}
      onDragOver={e=>{e.preventDefault();setOver(true)}}
      onDragLeave={e=>{e.preventDefault();setOver(false)}}
      onDrop={e=>{e.preventDefault();setOver(false);stage(e.dataTransfer.files)}}
      onClick={()=>onPick(null)}>
      <Icon name="upload" size={28}/>
      <b>{over?'أفلت الملف هنا':'اسحب الملف وأسقطه هنا، أو اضغط للاختيار'}</b>
      <small>PDF / PNG / JPG · حتى 25 MB</small>
    </button>}
    {file&&<button type="button" className="link-action" disabled={busy} onClick={()=>onPick(null)}>استبدال الملف</button>}
  </section>
}
function AuthScreen({auth,onSuccess,notify}){
  const [password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[busy,setBusy]=useState(false)
  const submit=async e=>{
    e.preventDefault();setBusy(true)
    try{
      if(auth.firstRun) await bridge.setupPassword(password,confirm)
      else await bridge.login(password)
      onSuccess()
    }catch(e){notify(e.message,'error')}
    finally{setBusy(false)}
  }
  return <div className="auth-shell">
    <div className="auth-card">
      <div className="brand"><span className="brand-icon"><Icon name="check" size={26}/></span><strong>PrintOK</strong><small>Desktop</small></div>
      <div className="auth-shield"><Icon name="shield" size={32}/></div>
      <h1>{auth.firstRun?'أهلاً بك في نسخة Windows':'مرحباً بعودتك'}</h1>
      <p>{auth.firstRun?'أنشئ كلمة مرور محلية لحماية واجهة المطبعة على هذا الكمبيوتر.':'سجّل دخولك إلى بيانات المطبعة المحلية.'}</p>
      <form onSubmit={submit}>
        <label htmlFor="pw">كلمة المرور</label>
        <input id="pw" type="password" minLength={8} required autoFocus autoComplete={auth.firstRun?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="أدخل كلمة المرور"/>
        {auth.firstRun&&<><label htmlFor="pw2">تأكيد كلمة المرور</label><input id="pw2" type="password" minLength={8} required value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="أعد كتابة كلمة المرور"/></>}
        <button className="btn primary" disabled={busy}>{busy?'جاري التحقق...':auth.firstRun?'إنشاء كلمة المرور والدخول':'دخول'}<Icon name="arrow" size={18}/></button>
      </form>
      <div className="auth-note"><Icon name="monitor" size={16}/>بيانات العملاء والملفات محفوظة على جهازك، لا على خادم خارجي.</div>
    </div>
  </div>
}
export default function App(){
  const [auth,setAuth]=useState(null),[db,setDb]=useState(null),[view,setView]=useState('dashboard')
  const [selectedId,setSelectedId]=useState(''),[query,setQuery]=useState(''),[filter,setFilter]=useState('all')
  const [range,setRange]=useState('all'),[sort,setSort]=useState('newest')
  const [form,setForm]=useState(emptyForm),[artwork,setArtwork]=useState(null),[newVersionFile,setNewVersionFile]=useState(null)
  const [revisionFile,setRevisionFile]=useState(null),[note,setNote]=useState(''),[decision,setDecision]=useState('')
  const [busy,setBusy]=useState(false),[toast,setToast]=useState(null),[preview,setPreview]=useState(null)
  const [update,setUpdate]=useState(null),[storageMove,setStorageMove]=useState(null)
  const [passwords,setPasswords]=useState({old:'',next:'',confirm:''})
  const alive=useRef(true)
  const notify=(message,type='ok')=>setToast({message,type})
  useEffect(()=>{bridge.authStatus().then(setAuth).catch(e=>notify(e.message,'error'));return()=>{alive.current=false}},[])
  useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(null),4500);return()=>clearTimeout(t)},[toast])
  const load=async()=>{const data=await bridge.load();if(alive.current)setDb(data);return data}
  const enter=async()=>{setAuth({unlocked:true,firstRun:false});try{await load();bridge.checkUpdates().then(setUpdate).catch(()=>{})}catch(e){notify(e.message,'error')}}
  useEffect(()=>{if(auth?.unlocked){load().catch(e=>notify(e.message,'error'));bridge.checkUpdates().then(setUpdate).catch(()=>{})}},[auth?.unlocked])
  const orders=db?.orders||[]
  const current=orders.find(o=>o.id===selectedId)
  const statusCounts=useMemo(()=>({
    total:orders.length,pending:orders.filter(x=>x.status==='pending').length,
    approved:orders.filter(x=>x.status==='approved').length,changes:orders.filter(x=>x.status==='changes').length
  }),[orders])
  const clients=useMemo(()=>{
    const out=new Map()
    for(const o of orders){
      const phone=digits(o.phone).replace(/\D/g,'')
      if(!out.has(phone))out.set(phone,{key:phone,name:o.client,phone:o.phone,orders:[],latest:o.createdAt})
      const c=out.get(phone);c.orders.push(o);if(o.createdAt>c.latest)c.latest=o.createdAt
    }
    return [...out.values()].sort((a,b)=>b.latest.localeCompare(a.latest))
  },[orders])
  const filtered=useMemo(()=>{
    const q=digits(query).toLocaleLowerCase().trim()
    return orders.filter(o=>{
      if(filter!=='all'&&o.status!==filter)return false
      if(range!=='all'&&(Date.now()-new Date(o.createdAt).getTime())>Number(range)*86400000)return false
      const hay=digits([o.ref,o.client,o.phone,o.product].join(' ')).toLocaleLowerCase()
      return !q||hay.includes(q)||hay.replace(/\D/g,'').includes(q.replace(/\D/g,''))
    }).sort((a,b)=>sort==='newest'?b.createdAt.localeCompare(a.createdAt):a.createdAt.localeCompare(b.createdAt))
  },[orders,filter,range,query,sort])
  const call=async(action,success)=>{setBusy(true);try{const value=await action();await load();if(success)notify(success);return value}catch(e){notify(e.message,'error');return null}finally{setBusy(false)}}
  const pick=async(file,setter)=>{
    try{
      const item=file?await bridge.stageDroppedFile(file):await bridge.chooseFile()
      if(item)setter(item)
    }catch(e){notify(e.message,'error')}
  }
  const navigate=(next)=>{setView(next);setQuery('');setFilter('all');setRange('all');setSort('newest')}
  const createOrder=async(draft=false)=>{
    const fields={...form,quantity:Number(form.quantity)}
    if(!fields.client.trim()||!fields.phone.trim()||!fields.product.trim()||fields.quantity<=0||!Number.isInteger(fields.quantity)){notify('أكمل بيانات العميل ورقم هاتف صحيحاً والمنتج والكمية','error');return}
    if(!draft&&!artwork){notify('اختر ملف التصميم أولاً','error');return}
    const created=await call(()=>bridge.createOrder(fields,artwork?.token,draft),draft?'تم حفظ المسودة على جهازك':'تم حفظ الطلب والملف في مجلد العميل')
    if(created){setSelectedId(created.id);setArtWorkSafe();setForm(emptyForm);setView('details')}
  }
  const setArtWorkSafe=()=>{setArtwork(null);setNewVersionFile(null);setRevisionFile(null);setNote('');setDecision('')}
  const addVersion=async()=>{
    if(!newVersionFile){notify('اختر ملف النسخة الجديدة','error');return}
    const x=await call(()=>bridge.addVersion(current.id,newVersionFile.token),'تم حفظ النسخة الجديدة، وتحتاج موافقة مستقلة')
    if(x)setNewVersionFile(null)
  }
  const approve=async()=>{
    if(decision==='changes'&&!note.trim()&&!revisionFile){notify('أضف ملاحظة أو ملفاً مرجعياً','error');return}
    const x=await call(()=>bridge.decide(current.id,decision,note,revisionFile?.token),decision==='approved'?'تم اعتماد النسخة الحالية محلياً':'تم تسجيل طلب التعديل')
    if(x)setArtWorkSafe()
  }
  useEffect(()=>{
    if(view!=='details'||!current?.versions?.length){setPreview(null);return}
    const v=current.versions.at(-1)
    let on=true
    bridge.preview(current.id,v.number).then(data=>{if(on)setPreview(data)}).catch(()=>{if(on)setPreview(null)})
    return()=>{on=false}
  },[view,current?.id,current?.versions?.length,current?.versions?.at(-1)?.number])
  const openDetail=id=>{setSelectedId(id);setView('details');setArtWorkSafe()}
  const logout=async()=>{await bridge.logout();setDb(null);setAuth({unlocked:false,firstRun:false});setView('dashboard')}
  if(!bridge)return <div className="fatal">يرجى فتح هذا المشروع من خلال تطبيق PrintOK Desktop على Windows.</div>
  if(!auth)return <div className="loading-state">جاري تشغيل PrintOK Desktop...</div>
  if(!auth.unlocked)return <><AuthScreen auth={auth} onSuccess={enter} notify={notify}/>{toast&&<div className={'toast '+toast.type}>{toast.message}</div>}</>
  if(!db)return <div className="loading-state">جاري قراءة قاعدة البيانات المحلية...</div>
  const menu=[
    {id:'dashboard',title:'لوحة الطلبات',icon:'grid'},
    {id:'orders',title:'جميع الطلبات',icon:'file'},
    {id:'create',title:'طلب طباعة جديد',icon:'plus'},
    {id:'clients',title:'العملاء',icon:'users'},
    {id:'activity',title:'سجل النشاط',icon:'clock'},
    {id:'settings',title:'الإعدادات والتخزين',icon:'settings'}
  ]
  return <div className="shell" dir="rtl">
    <aside className="sidebar">
      <div className="sidebar-top"><div className="brand"><span className="brand-icon"><Icon name="check" size={26}/></span><strong>PrintOK</strong></div><p>نسخة Windows · تخزين محلي</p></div>
      <nav>{menu.map(item=><button key={item.id} className={'nav-link'+(view===item.id?' active':'')} onClick={()=>navigate(item.id)}><Icon name={item.icon}/>{item.title}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className="storage-dot"><span/>الملفات محفوظة محلياً</div>
        <strong>{db.shopName}</strong><small>الإصدار {db.version}</small>
        <button onClick={logout}><Icon name="logout" size={17}/> تسجيل الخروج</button>
      </div>
    </aside>
    <main className="main">
      <header className="topbar"><div className="breadcrumb"><Icon name="monitor" size={17}/>PrintOK Desktop / {menu.find(m=>m.id===view)?.title||'تفاصيل الطلب'}</div>
        <div className="top-actions">
          {update?.hasUpdate&&<button className="update-alert" onClick={()=>bridge.openUpdate(update.releaseUrl)}><Icon name="download" size={17}/>تحديث جديد {update.latestVersion}</button>}
          <button className="icon-btn" title="تحديث البيانات المحلية" onClick={()=>load().then(()=>notify('تم تحديث البيانات المحلية')).catch(e=>notify(e.message,'error'))}><Icon name="refresh"/></button>
          <span className="top-user">LOCAL <Icon name="shield" size={17}/></span>
        </div>
      </header>
      <div className="content">
        {(view==='dashboard'||view==='orders')&&<>
          <div className="page-title"><div><h1>{view==='dashboard'?'لوحة الطلبات':'جميع طلبات الطباعة'}</h1><p>البيانات موجودة على الكمبيوتر، داخل مجلدات منظمة لكل عميل.</p></div><button className="btn primary" onClick={()=>navigate('create')}><Icon name="plus"/>طلب جديد</button></div>
          <div className="stats">
            <div className="card stat"><span>إجمالي الطلبات</span><b>{statusCounts.total}</b><small>مسجلة على هذا الجهاز</small></div>
            <div className="card stat"><span>بانتظار الموافقة</span><b>{statusCounts.pending}</b><small>تحتاج متابعة</small></div>
            <div className="card stat"><span>جاهزة للإنتاج</span><b>{statusCounts.approved}</b><small>تم اعتماد النسخة</small></div>
          </div>
          <section className="card orders-panel"><div className="section-title"><h2>الطلبات</h2><small>{filtered.length} نتيجة</small></div>
            <div className="filters">
              <label className="search"><Icon name="search" size={19}/><input aria-label="بحث باسم العميل أو رقم الهاتف أو رقم الطلب" placeholder="بحث برقم الهاتف، الطلب، العميل، المنتج" value={query} onChange={e=>setQuery(e.target.value)}/></label>
              <label className="select"><Icon name="info" size={16}/><select value={filter} aria-label="تصفية الحالة" onChange={e=>setFilter(e.target.value)}><option value="all">كل الحالات</option><option value="pending">بانتظار الموافقة</option><option value="approved">معتمد</option><option value="changes">تعديل مطلوب</option><option value="draft">مسودة</option></select></label>
              <label className="select"><Icon name="clock" size={16}/><select value={range} aria-label="الفترة" onChange={e=>setRange(e.target.value)}><option value="all">كل الفترات</option><option value="7">آخر 7 أيام</option><option value="30">آخر 30 يوماً</option><option value="90">آخر 90 يوماً</option></select></label>
              <label className="select"><Icon name="sort" size={16}/><select value={sort} aria-label="الترتيب" onChange={e=>setSort(e.target.value)}><option value="newest">الأحدث أولاً</option><option value="oldest">الأقدم أولاً</option></select></label>
            </div>
            <div className="table-wrap"><table><thead><tr><th>رقم الطلب</th><th>العميل</th><th>المنتج</th><th>الإصدار</th><th>الحالة</th><th>التاريخ</th></tr></thead><tbody>
              {filtered.map(o=><tr key={o.id} onClick={()=>openDetail(o.id)} tabIndex={0} onKeyDown={e=>{if(e.key==='Enter')openDetail(o.id)}}><td className="order-ref">{o.ref}</td><td><strong>{o.client}</strong><small dir="ltr">{o.phone}</small></td><td>{o.product}</td><td>V{o.versions.length||0}</td><td><Status value={o.status}/></td><td>{formatDate(o.createdAt)}</td></tr>)}
            </tbody></table>{!filtered.length&&<div className="empty"><Icon name="file" size={36}/><h3>لا توجد طلبات مطابقة</h3><p>أنشئ أول طلب أو غيّر خيارات البحث.</p></div>}</div>
          </section>
        </>}
        {view==='create'&&<>
          <div className="page-title"><div><h1>إنشاء طلب طباعة</h1><p>اختر العميل والمنتج ثم ارفع الملف؛ سيتم حفظه داخل مجلد العميل على Windows.</p></div></div>
          <section className="card form-card"><h2>بيانات الطلب</h2>
            <form onSubmit={e=>{e.preventDefault();createOrder(false)}}>
              <div className="form-grid">
                {[{key:'client',label:'اسم العميل *',placeholder:'روز كافيه'},{key:'phone',label:'رقم الهاتف *',placeholder:'07XXXXXXXX'},{key:'product',label:'اسم المنتج *',placeholder:'ليبل أكواب'},{key:'quantity',label:'الكمية *',placeholder:'500',type:'number'},{key:'dimensions',label:'المقاس',placeholder:'5 × 5 سم'},{key:'material',label:'الخامة',placeholder:'لاصق مطفي'}].map(x=><label key={x.key}>{x.label}<input type={x.type||'text'} min={x.type==='number'?1:undefined} required={x.label.endsWith('*')} placeholder={x.placeholder} value={form[x.key]} onChange={e=>setForm(f=>({...f,[x.key]:e.target.value}))}/></label>)}
              </div>
              <FileDrop file={artwork} onPick={file=>pick(file,setArtwork)} onClear={()=>setArtwork(null)} busy={busy} title="ملف التصميم — النسخة الأولى"/>
              <div className="form-actions"><button className="btn primary" type="submit" disabled={busy}>{busy?'جاري الحفظ...':'حفظ وإضافة الملف'}</button><button className="btn outline" type="button" disabled={busy} onClick={()=>createOrder(true)}>حفظ كمسودة</button></div>
            </form>
          </section>
        </>}
        {view==='details'&&current&&<>
          <div className="page-title"><div><button className="back" onClick={()=>navigate('orders')}>العودة إلى الطلبات</button><h1>تفاصيل الطلب <span dir="ltr">{current.ref}</span></h1><p>{current.client} · {current.product}</p></div><Status value={current.status}/></div>
          <section className="card customer-box"><h2><Icon name="users" size={21}/>بيانات العميل</h2><div className="detail-fields">
            {[['العميل',current.client],['رقم الهاتف',current.phone],['المنتج',current.product],['الكمية',current.quantity],['المقاس',current.dimensions||'غير محدد'],['الخامة',current.material||'غير محددة'],['تاريخ الطلب',formatDate(current.createdAt)]].map(([a,b])=><div key={a}><small>{a}</small><b>{b}</b></div>)}
          </div><button className="btn outline" onClick={()=>call(()=>bridge.openClientFolder(current.id))}><Icon name="folder"/>فتح مجلد العميل في Windows</button></section>
          <div className="detail-columns">
            <section className="card preview-panel"><h2>التصميم الحالي</h2>
              {preview?<div className="artwork-preview"><img alt="معاينة الملف" src={preview}/></div>:<div className="artwork-no-preview"><Icon name="file" size={43}/><p>{current.versions.at(-1)?.file?.name||'لا يوجد تصميم حتى الآن'}</p><small>افتح الملف باستخدام البرنامج الافتراضي على Windows</small></div>}
              {current.versions.at(-1)?.file&&<div className="file-actions"><div className="file-good"><Icon name="checkcircle" size={16}/>الملف محفوظ محلياً</div><button className="btn outline" onClick={()=>call(()=>bridge.openFile(current.id,current.versions.at(-1).number))}><Icon name="eye" size={17}/>فتح الملف</button></div>}
              <div className="production-note"><Icon name="info" size={18}/>{current.status==='approved'?'النسخة الحالية معتمدة محلياً.':'الإنتاج متوقف لحين اعتماد النسخة الحالية.'}</div>
            </section>
            <section className="card versions-panel"><h2>الإصدارات والموافقات</h2><div className="versions-list">
              {[...current.versions].reverse().map((v,i)=><div className="version-item" key={v.number}><div className="version-circle">{v.number}</div><div><b>V{v.number} · {formatDate(v.createdAt)}</b><div><Status value={v.status}/></div>{v.note&&<p>{v.note}</p>}{v.referenceFile&&<button className="link-action" onClick={()=>call(()=>bridge.openFile(current.id,v.number,'reference'))}>مرفق تعديل: {v.referenceFile.name}</button>}</div><button className="version-open" title="فتح النسخة" onClick={()=>call(()=>bridge.openFile(current.id,v.number))}><Icon name="file" size={18}/></button></div>)}
            </div><FileDrop file={newVersionFile} onPick={file=>pick(file,setNewVersionFile)} onClear={()=>setNewVersionFile(null)} busy={busy} title={'إضافة نسخة جديدة — V'+(current.versions.length+1)}/>
              <button className="btn primary full" disabled={!newVersionFile||busy} onClick={addVersion}>حفظ النسخة الجديدة</button>
            </section>
          </div>
          {current.status==='pending'&&<section className="card decision-panel"><h2>قرار مراجعة النسخة الحالية</h2><p className="subtext">هذا القرار محلي داخل تطبيق Windows، ولا يرسل موافقة عبر رابط العميل على الإنترنت.</p>
            <div className="decision-actions"><button className={'btn '+(decision==='approved'?'primary':'outline')} onClick={()=>setDecision('approved')}><Icon name="check"/>اعتماد النسخة</button><button className={'btn '+(decision==='changes'?'primary':'outline')} onClick={()=>setDecision('changes')}><Icon name="info"/>طلب تعديل</button></div>
            {decision==='changes'&&<><textarea className="note-area" placeholder="ما التعديل المطلوب؟" value={note} onChange={e=>setNote(e.target.value)}/><FileDrop file={revisionFile} onPick={file=>pick(file,setRevisionFile)} onClear={()=>setRevisionFile(null)} busy={busy} title="ملف مرجعي للتعديل (اختياري)"/></>}
            {decision&&<button className="btn primary" disabled={busy} onClick={approve}>{busy?'جاري التسجيل...':'تأكيد القرار المحلي'}</button>}
          </section>}
        </>}
        {view==='clients'&&<>
          <div className="page-title"><div><h1>العملاء ومجلدات التخزين</h1><p>الملفات مقسمة حسب العميل، مع إمكانية فتح مجلده أو تحديد مسار خاص به.</p></div></div>
          <section className="card clients-panel"><div className="section-title"><h2>العملاء</h2><span>{clients.length} عميل</span></div>
            {clients.map(c=><div className="client-row" key={c.key}><div className="client-avatar"><Icon name="users"/></div><div className="client-description"><strong>{c.name}</strong><small dir="ltr">{c.phone} · {c.orders.length} طلب</small></div><button className="btn outline" onClick={()=>call(()=>bridge.openClientFolder(null,c.phone,c.name))}><Icon name="folder" size={18}/>فتح المجلد</button><button className="btn outline" onClick={async()=>{const x=await call(()=>bridge.chooseClientFolder(c.phone),'تم تحديث موقع الحفظ لهذا العميل (للملفات الجديدة)');if(x)navigate('settings')}}>تغيير المسار</button></div>)}
            {!clients.length&&<div className="empty">لم تضف أي عميل بعد.</div>}
          </section>
        </>}
        {view==='activity'&&<>
          <div className="page-title"><div><h1>سجل النشاط</h1><p>قرارات الطلبات المحلية بترتيب أحدث عملية.</p></div></div>
          <section className="card activity-panel">{db.activity.map(ev=><div className="activity-line" key={ev.id}><div className="activity-icon"><Icon name="clock" size={17}/></div><div><strong>{eventName[ev.type]||ev.type} · {ev.ref}</strong><p>{ev.detail||''}</p></div><time>{formatDate(ev.time)}</time></div>)}{!db.activity.length&&<div className="empty">لا يوجد نشاط حتى الآن.</div>}</section>
        </>}
        {view==='settings'&&<>
          <div className="page-title"><div><h1>الإعدادات والتخزين</h1><p>تحكم بمجلد البيانات الرئيسي ومسارات حفظ ملفات كل عميل.</p></div></div>
          <section className="card settings-panel"><h2><Icon name="folder"/>مجلد التخزين الرئيسي</h2><p className="subtext">يُخزن ملف بيانات الطلبات داخل هذا المجلد، بالإضافة إلى ملفات العملاء الذين لم تحدد لهم مساراً خاصاً.</p>
            <div className="path-card" dir="ltr">{db.root}</div><div className="settings-actions"><button className="btn outline" disabled={busy} onClick={()=>call(()=>bridge.openStorageRoot())}><Icon name="folder"/>فتح المجلد</button><button className="btn primary" disabled={busy} onClick={async()=>{const x=await call(()=>bridge.chooseStorageRoot());if(x?.moved)setStorageMove(x)}}><Icon name="settings" size={18}/>تغيير موقع التخزين ونقل الملفات</button></div>
            {storageMove&&<p className="notice warning">تم نسخ بياناتك إلى المكان الجديد. المجلد القديم بقي كما هو لسلامتك: <span dir="ltr">{storageMove.oldLocation}</span></p>}
          </section>
          <section className="card settings-panel"><h2><Icon name="users"/>مواقع تخزين العملاء</h2><p className="subtext">يمكنك تعيين مجلد مستقل لأي عميل. التغيير ينطبق على الملفات الجديدة، وتظل الملفات السابقة في مواقعها المحفوظة.</p>
            {clients.map(c=><div className="folder-setting-row" key={c.key}><div className="folder-setting-info"><b>{c.name}</b><small dir="ltr">{c.phone}</small><div className="folder-path" dir="ltr">{db.clientFolders[keyFromPhone(c.phone)]||'المسار الافتراضي داخل المجلد الرئيسي'}</div></div><div><button className="btn outline tiny" disabled={busy} onClick={()=>call(()=>bridge.chooseClientFolder(c.phone),'تم تغيير مسار هذا العميل')}>اختيار مجلد</button>{db.clientFolders[keyFromPhone(c.phone)]&&<button className="btn ghost tiny" disabled={busy} onClick={()=>call(()=>bridge.resetClientFolder(c.phone),'تمت العودة للمجلد الافتراضي')}>افتراضي</button>}</div></div>)}
            {!clients.length&&<p className="subtext">بعد إضافة عميل، سيظهر هنا لتحديد مجلد التخزين الخاص به.</p>}
          </section>
          <section className="card settings-panel"><h2><Icon name="backup"/>نسخة احتياطية</h2><p className="subtext">انسخ ملف البيانات وملفات العملاء إلى مجلد تختاره. الملفات المحفوظة خارج المجلد الرئيسي تُضاف مع قائمة لاستعادتها يدوياً.</p><button className="btn outline" disabled={busy} onClick={()=>call(()=>bridge.backup(),'تم إنشاء نسخة احتياطية على الكمبيوتر')}><Icon name="backup"/>إنشاء نسخة احتياطية</button></section>
          <section className="card settings-panel"><h2><Icon name="globe"/>تحديثات البرنامج</h2><p className="subtext">الطلبات والملفات تعمل بدون إنترنت. الإنترنت يُستخدم فقط لفحص إصدارات Desktop الجديدة وتحميلها من GitHub.</p>
            <div className="update-line"><span>الإصدار المثبت: {db.version}</span><span>{update?.online?'تم الاتصال بخدمة التحديثات':update?.message||'لم يتم فحص التحديثات'}</span></div>
            <div className="settings-actions"><button className="btn outline" onClick={async()=>{setBusy(true);try{const r=await bridge.checkUpdates();setUpdate(r);notify(r.hasUpdate?'يوجد تحديث جديد: '+r.latestVersion:r.message)}finally{setBusy(false)}}} disabled={busy}><Icon name="refresh"/>فحص التحديثات</button>{update?.hasUpdate&&<button className="btn primary" onClick={()=>bridge.openUpdate(update.releaseUrl)}><Icon name="download"/>فتح إصدار {update.latestVersion}</button>}</div>
          </section>
          <section className="card settings-panel"><h2><Icon name="settings"/>اسم المطبعة</h2><label>اسم المطبعة<input className="wide-input" value={db.shopName} onChange={e=>setDb(x=>({...x,shopName:e.target.value}))}/></label><button className="btn primary" disabled={busy} onClick={()=>call(()=>bridge.saveShopName(db.shopName),'تم حفظ اسم المطبعة')}>حفظ الاسم</button></section>
          <section className="card settings-panel"><h2><Icon name="shield"/>تغيير كلمة المرور المحلية</h2><div className="passwords"><input type="password" value={passwords.old} onChange={e=>setPasswords(x=>({...x,old:e.target.value}))} placeholder="كلمة المرور الحالية"/><input type="password" value={passwords.next} onChange={e=>setPasswords(x=>({...x,next:e.target.value}))} placeholder="كلمة المرور الجديدة"/><input type="password" value={passwords.confirm} onChange={e=>setPasswords(x=>({...x,confirm:e.target.value}))} placeholder="تأكيد كلمة المرور"/></div><button className="btn outline" disabled={busy} onClick={async()=>{const x=await call(()=>bridge.changePassword(passwords.old,passwords.next,passwords.confirm),'تم تغيير كلمة المرور');if(x)setPasswords({old:'',next:'',confirm:''})}}>حفظ كلمة المرور</button>
            <p className="notice warning"><Icon name="alert" size={17}/>حماية الدخول لا تعني تشفير ملفات القرص؛ استخدم حماية Windows وBitLocker للبيانات الحساسة.</p>
          </section>
        </>}
      </div>
    </main>
    {toast&&<div className={'toast '+toast.type} role="status">{toast.message}</div>}
  </div>
}
function keyFromPhone(phone){
  // Frontend cannot derive the cryptographic local client key; render default text when no user override mapping exists.
  return String(phone)
}
