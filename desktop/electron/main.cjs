'use strict'
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const fs = require('node:fs')
const fsp = fs.promises
const path = require('node:path')
const crypto = require('node:crypto')

const RELEASES = 'https://api.github.com/repos/eltawalbeh/PrintOKChanges/releases?per_page=20'
const MAX_BYTES = 25 * 1024 * 1024
const MIME = { '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' }
const staged = new Map()
const defaultDB = () => ({ schema: 1, shopName: 'مطبعة المدى', sequence: 0, orders: [], clientFolders: {}, activity: [] })
let win
let config
let unlocked = false
let failCount = 0
let blockedUntil = 0
let writeQueue = Promise.resolve()
const now = () => new Date().toISOString()
const newId = () => crypto.randomUUID()
const hash = s => crypto.createHash('sha256').update(s).digest('hex')
const dataDir = () => app.getPath('userData')
const configFile = () => path.join(dataDir(), 'desktop-config.json')
const dbPath = () => path.join(config.root, 'printok-db.json')
const inside = (p, dir) => { const rel = path.relative(path.resolve(dir),path.resolve(p)); return rel === '' || (!rel.startsWith('..'+path.sep) && rel !== '..' && !path.isAbsolute(rel)) }
const safe = (s, max = 58) => {
  const name = String(s || '').normalize('NFC').replace(/[<>:"/\\|?*\x00-\x1f]/g,'-').replace(/[. ]+$/g,'').trim().slice(0,max)
  return !name || /^(CON|PRN|AUX|NUL|COM\d|LPT\d)$/i.test(name) ? 'file' : name
}
const normalPhone = value => String(value || '').replace(/[٠-٩۰-۹]/g,c => {
  const a = '٠١٢٣٤٥٦٧٨٩'.indexOf(c)
  return String(a>=0 ? a : '۰۱۲۳۴۵۶۷۸۹'.indexOf(c))
}).replace(/[^0-9]/g,'')
const keyFor = phone => hash(normalPhone(phone)).slice(0,16)
function sanitizedData(data) {
  return {
    schema: 1, shopName: String(data.shopName || 'مطبعة المدى'), sequence: Number(data.sequence) || 0,
    orders: Array.isArray(data.orders) ? data.orders : [],
    clientFolders: data.clientFolders && typeof data.clientFolders === 'object' ? data.clientFolders : {},
    activity: Array.isArray(data.activity) ? data.activity : []
  }
}
async function atomic(file, text) {
  await fsp.mkdir(path.dirname(file),{recursive:true})
  const temp = file+'.'+newId()+'.tmp'
  await fsp.writeFile(temp,text,'utf8')
  await fsp.rename(temp,file)
}
async function readData() {
  await fsp.mkdir(config.root,{recursive:true})
  try { return sanitizedData(JSON.parse(await fsp.readFile(dbPath(),'utf8'))) }
  catch (e) {
    if (e.code !== 'ENOENT') throw new Error('تعذر قراءة ملف البيانات. لم تتم إعادة كتابته حفاظاً على بياناتك: '+e.message)
    const db = defaultDB()
    await atomic(dbPath(),JSON.stringify(db,null,2))
    return db
  }
}
async function writeData(db) { await atomic(dbPath(),JSON.stringify(db,null,2)) }
function mutate(fn) {
  const next = writeQueue.then(async () => { const db = await readData(); const value = await fn(db); await writeData(db); return value })
  writeQueue = next.catch(() => {})
  return next
}
async function loadConfig() {
  await fsp.mkdir(dataDir(),{recursive:true})
  try {
    const read=JSON.parse(await fsp.readFile(configFile(),'utf8'))
    if (!read.root || !path.isAbsolute(read.root)) throw new Error('Invalid root')
    config=read
  } catch(e) {
    if(e.code!=='ENOENT') throw new Error('ملف إعدادات التطبيق تالف: '+e.message)
    config={root:path.join(app.getPath('documents'),'PrintOK Data')}
    await atomic(configFile(),JSON.stringify(config,null,2))
  }
  await readData()
}
const needLogin = () => { if(!unlocked) throw new Error('يجب تسجيل الدخول أولاً') }
const allow = action => async (_event,...args) => { needLogin(); return action(...args) }
const audit = (db,type,ref,detail='') => {
  db.activity.unshift({id:newId(),type,ref,detail,time:now()})
  db.activity=db.activity.slice(0,800)
}
function verifyPassword(value) {
  if(!config.passwordHash || !config.passwordSalt) return false
  const derived = crypto.pbkdf2Sync(String(value||''),Buffer.from(config.passwordSalt,'hex'),180000,32,'sha256')
  const stored = Buffer.from(config.passwordHash,'hex')
  return stored.length===derived.length && crypto.timingSafeEqual(derived,stored)
}
async function recordPassword(value) {
  const salt=crypto.randomBytes(16)
  const derived=crypto.pbkdf2Sync(value,salt,180000,32,'sha256')
  config.passwordSalt=salt.toString('hex');config.passwordHash=derived.toString('hex')
  await atomic(configFile(),JSON.stringify(config,null,2))
}
const validatePass = p => typeof p==='string' && p.length>=8 && p.length<=128
const filed = pathOrRef => pathOrRef && typeof pathOrRef==='object' ? pathOrRef : null
const findOrder = (db,id) => {
  const item=db.orders.find(o=>o.id===id)
  if(!item) throw new Error('الطلب غير موجود')
  return item
}
function currentFolder(db, order) {
  const key=keyFor(order.phone)
  return db.clientFolders[key] || path.join(config.root,'clients',safe(order.client)+'-'+key)
}
async function checkFile(p) {
  if(typeof p!=='string' || !path.isAbsolute(p)) throw new Error('مسار الملف غير صالح')
  const stat=await fsp.stat(p)
  const ext=path.extname(p).toLowerCase()
  if(!stat.isFile() || !MIME[ext]) throw new Error('يسمح فقط بملفات PDF أو PNG أو JPG')
  if(stat.size < 1 || stat.size>MAX_BYTES) throw new Error('حجم الملف يجب أن يكون بين 1 بايت و25MB')
  const fd=await fsp.open(p,'r')
  let bytes
  try {bytes=Buffer.alloc(12);await fd.read(bytes,0,12,0)} finally {await fd.close()}
  const valid=(ext==='.pdf'&&bytes.subarray(0,5).toString()==='%PDF-')
    ||(ext==='.png'&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))
    ||((ext==='.jpg'||ext==='.jpeg')&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)
  if(!valid) throw new Error('صيغة الملف لا تطابق محتواه')
  return {name:path.basename(p),size:stat.size,type:MIME[ext],path:p}
}
async function stage(p) {
  const file=await checkFile(p)
  const token=newId()
  staged.set(token,{file,until:Date.now()+1800000})
  return {token,name:file.name,size:file.size,type:file.type}
}
function stagedItem(token) {
  const v=staged.get(token)
  if(!v||v.until<Date.now()) throw new Error('انتهت صلاحية اختيار الملف؛ اختره مجدداً')
  return v.file
}
async function saveAttachment(db,order,version,token,kind='design') {
  const file=stagedItem(token)
  await checkFile(file.path)
  const base=path.join(currentFolder(db,order),'orders',safe(order.ref),'V'+version)
  await fsp.mkdir(base,{recursive:true})
  const target=path.join(base,kind+'-'+Date.now()+'-'+safe(file.name,96))
  await fsp.copyFile(file.path,target,fs.constants.COPYFILE_EXCL)
  staged.delete(token)
  return {name:file.name,size:file.size,type:file.type,path:target}
}
const orderSummary = o => ({...o,versions:undefined})
async function chooseRoot() {
  const result=await dialog.showOpenDialog(win,{title:'اختر موقع تخزين بيانات PrintOK',properties:['openDirectory','createDirectory']})
  if(result.canceled||!result.filePaths[0]) return null
  const next=path.resolve(result.filePaths[0]),previous=path.resolve(config.root)
  if(next===previous) return {root:previous,moved:false}
  if(inside(next,previous)||inside(previous,next)) throw new Error('لا يمكن اختيار مجلد داخل مجلد التخزين الحالي أو العكس')
  const existing=await fsp.readdir(next)
  if(existing.length) throw new Error('اختر مجلداً فارغاً حفاظاً على الملفات الموجودة فيه')
  await writeQueue
  const data=await readData()
  for(const entry of await fsp.readdir(previous)) await fsp.cp(path.join(previous,entry),path.join(next,entry),{recursive:true,force:false,errorOnExist:true})
  const relocate = file => {
    if(file?.path && inside(file.path,previous)) file.path=path.join(next,path.relative(previous,file.path))
  }
  for(const o of data.orders) for(const v of o.versions){relocate(v.file);relocate(v.referenceFile)}
  for(const [key,dir] of Object.entries(data.clientFolders)) if(inside(dir,previous)) data.clientFolders[key]=path.join(next,path.relative(previous,dir))
  await atomic(path.join(next,'printok-db.json'),JSON.stringify(data,null,2))
  config.root=next
  await atomic(configFile(),JSON.stringify(config,null,2))
  return {root:next,moved:true,oldLocation:previous}
}
function selectFile(order,version,kind) {
  const v=order.versions.find(item=>item.number===version)
  if(!v) throw new Error('الإصدار غير موجود')
  return filed(kind==='reference'?v.referenceFile:v.file)
}
async function openStored({orderId,version,kind='design',showInFolder=false}) {
  const db=await readData(),order=findOrder(db,orderId)
  const file=selectFile(order,Number(version),kind)
  if(!file) throw new Error('لم يتم حفظ ملف لهذا الإصدار')
  await fsp.access(file.path)
  if(showInFolder) {shell.showItemInFolder(file.path);return true}
  const error=await shell.openPath(file.path)
  if(error) throw new Error('تعذر فتح الملف: '+error)
  return true
}
async function previewStored({orderId,version,kind='design'}) {
  const db=await readData(),order=findOrder(db,orderId)
  const file=selectFile(order,Number(version),kind)
  if(!file||!file.type.startsWith('image/')) return null
  const stat=await fsp.stat(file.path)
  if(stat.size>8*1024*1024) return null
  const raw=await fsp.readFile(file.path)
  return 'data:'+file.type+';base64,'+raw.toString('base64')
}
async function updateCheck() {
  try {
    const response=await fetch(RELEASES,{headers:{'User-Agent':'PrintOK-Desktop','Accept':'application/vnd.github+json'},signal:AbortSignal.timeout(8000)})
    if(!response.ok) throw new Error('GitHub returned '+response.status)
    const list=await response.json()
    const items=list.filter(r=>!r.draft && /^desktop-v\d+\.\d+\.\d+$/.test(r.tag_name))
    items.sort((a,b)=>compareVersion(b.tag_name.slice(9),a.tag_name.slice(9)))
    const release=items[0]
    if(!release) return {online:true,hasUpdate:false,currentVersion:app.getVersion(),message:'لا يوجد إصدار Desktop منشور بعد'}
    const latest=release.tag_name.slice(9)
    return {online:true,hasUpdate:compareVersion(latest,app.getVersion())>0,latestVersion:latest,currentVersion:app.getVersion(),releaseUrl:release.html_url,publishedAt:release.published_at,message:'تم فحص الإصدارات'}
  }catch(error) {return {online:false,hasUpdate:false,currentVersion:app.getVersion(),message:'تعذر الاتصال بخدمة التحديثات: '+error.message}}
}
function compareVersion(a,b) {
  const x=String(a).split('.').map(Number),y=String(b).split('.').map(Number)
  for(let i=0;i<3;i++) if((x[i]||0)!==(y[i]||0)) return (x[i]||0)-(y[i]||0)
  return 0
}
function createWindow() {
  win=new BrowserWindow({
    width:1380,height:870,minWidth:900,minHeight:620,backgroundColor:'#f7f9fb',
    autoHideMenuBar:true,show:false,
    webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}
  })
  win.once('ready-to-show',()=>win.show())
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}))
  win.webContents.on('will-navigate',e=>e.preventDefault())
  if(!app.isPackaged && process.env.PRINTOK_DEV_URL) win.loadURL(process.env.PRINTOK_DEV_URL)
  else win.loadFile(path.join(__dirname,'..','dist','index.html'))
}
function ipc() {
  ipcMain.handle('auth:status',async()=>({firstRun:!Boolean(config.passwordHash),unlocked,version:app.getVersion()}))
  ipcMain.handle('auth:setup',async(_,{password,confirm})=>{
    if(config.passwordHash) throw new Error('تم إعداد كلمة مرور مسبقاً')
    if(!validatePass(password)||password!==confirm) throw new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل ومتطابقة')
    await recordPassword(password);unlocked=true;return true
  })
  ipcMain.handle('auth:login',async(_,{password})=>{
    if(Date.now()<blockedUntil) throw new Error('محاولات كثيرة. أعد المحاولة بعد قليل')
    if(!verifyPassword(password)) {
      failCount++
      if(failCount>=5){blockedUntil=Date.now()+30000;failCount=0}
      throw new Error('كلمة المرور غير صحيحة')
    }
    unlocked=true;failCount=0;return true
  })
  ipcMain.handle('auth:logout',async()=>{unlocked=false;return true})
  ipcMain.handle('auth:change',allow(async({oldPassword,newPassword,confirm})=>{
    if(!verifyPassword(oldPassword)) throw new Error('كلمة المرور الحالية غير صحيحة')
    if(!validatePass(newPassword)||newPassword!==confirm) throw new Error('كلمة المرور الجديدة غير صالحة')
    await recordPassword(newPassword);return true
  }))
  ipcMain.handle('data:load',allow(async()=>{
    const db=await readData()
    const clientDirectories={};for(const o of db.orders) clientDirectories[normalPhone(o.phone)]=db.clientFolders[keyFor(o.phone)]||null
    return {...db,clientDirectories,root:config.root,version:app.getVersion()}
  }))
  ipcMain.handle('file:choose',allow(async()=>{
    const r=await dialog.showOpenDialog(win,{title:'اختر ملف طباعة',properties:['openFile'],filters:[{name:'PDF and images',extensions:['pdf','png','jpg','jpeg']}]})
    return r.canceled?null:stage(r.filePaths[0])
  }))
  ipcMain.handle('file:stagePath',allow(async({path:file})=>stage(file)))
  ipcMain.handle('order:create',allow(async({fields,fileToken,draft})=>mutate(async db=>{
    const client=String(fields?.client||'').trim().slice(0,160),phone=String(fields?.phone||'').trim().slice(0,32)
    const product=String(fields?.product||'').trim().slice(0,200),quantity=Number(fields?.quantity)
    if(!client||normalPhone(phone).length<7||!product||!Number.isInteger(quantity)||quantity<=0) throw new Error('أدخل اسم العميل ورقم هاتف صحيحاً والمنتج والكمية')
    if(!draft&&!fileToken) throw new Error('يجب إرفاق ملف قبل إرسال الطلب')
    const id=newId(),sequence=db.sequence+1,ref='PK-'+String(sequence).padStart(6,'0')
    const order={id,ref,client,phone,product,quantity,dimensions:String(fields?.dimensions||'').slice(0,100),material:String(fields?.material||'').slice(0,100),
      createdAt:now(),updatedAt:now(),status:draft?'draft':'pending',versions:[]}
    if(fileToken) {const file=await saveAttachment(db,order,1,fileToken);order.versions.push({number:1,status:draft?'draft':'pending',createdAt:now(),file,note:'',referenceFile:null})}
    db.sequence=sequence;db.orders.unshift(order);audit(db,'order_created',ref,draft?'مسودة':'بانتظار الموافقة')
    return {id,ref}
  })))
  ipcMain.handle('order:addVersion',allow(async({orderId,fileToken})=>mutate(async db=>{
    const order=findOrder(db,orderId)
    const number=(order.versions.at(-1)?.number||0)+1
    if(!fileToken) throw new Error('اختر ملف التصميم الجديد')
    const file=await saveAttachment(db,order,number,fileToken)
    order.versions.push({number,status:'pending',createdAt:now(),file,note:'',referenceFile:null})
    order.status='pending';order.updatedAt=now()
    audit(db,'version_uploaded',order.ref,'V'+number)
    return {number}
  })))
  ipcMain.handle('order:decide',allow(async({orderId,decision,note='',fileToken})=>mutate(async db=>{
    const order=findOrder(db,orderId),version=order.versions.at(-1)
    if(!version||order.status!=='pending') throw new Error('النسخة ليست بانتظار المراجعة')
    if(!['approved','changes'].includes(decision)) throw new Error('قرار غير صالح')
    if(decision==='changes'&&!String(note).trim()&&!fileToken) throw new Error('أدخل ملاحظة أو أرفق ملفاً مرجعياً')
    if(decision==='changes'&&fileToken) version.referenceFile=await saveAttachment(db,order,version.number,fileToken,'reference')
    version.status=decision;version.note=String(note||'').slice(0,3000);version.decidedAt=now()
    order.status=decision;order.updatedAt=now()
    audit(db,decision==='approved'?'version_approved':'changes_requested',order.ref,'V'+version.number)
    return {status:decision}
  })))
  ipcMain.handle('file:open',allow(openStored))
  ipcMain.handle('file:preview',allow(previewStored))
  ipcMain.handle('settings:shop',allow(async({name})=>mutate(async db=>{
    const clean=String(name||'').trim().slice(0,120)
    if(!clean) throw new Error('أدخل اسم المطبعة')
    db.shopName=clean;return clean
  })))
  ipcMain.handle('settings:chooseRoot',allow(chooseRoot))
  ipcMain.handle('settings:openRoot',allow(async()=>{await fsp.mkdir(config.root,{recursive:true});const e=await shell.openPath(config.root);if(e) throw new Error(e);return true}))
  ipcMain.handle('settings:chooseClientFolder',allow(async({phone})=>{
    const id=keyFor(phone)
    const r=await dialog.showOpenDialog(win,{title:'اختر مجلد تخزين هذا العميل',properties:['openDirectory','createDirectory']})
    if(r.canceled||!r.filePaths[0]) return null
    const folder=path.resolve(r.filePaths[0])
    return mutate(async db=>{db.clientFolders[id]=folder;return {key:id,folder}})
  }))
  ipcMain.handle('settings:resetClientFolder',allow(async({phone})=>mutate(async db=>{
    delete db.clientFolders[keyFor(phone)];return true
  })))
  ipcMain.handle('settings:openClientFolder',allow(async({orderId,phone,client})=>{
    const db=await readData()
    const order=orderId ? findOrder(db,orderId) : {phone,client}
    const folder=currentFolder(db,order)
    await fsp.mkdir(folder,{recursive:true})
    const e=await shell.openPath(folder)
    if(e) throw new Error(e)
    return folder
  }))
  ipcMain.handle('updates:check',allow(updateCheck))
  ipcMain.handle('updates:open',allow(async({url})=>{
    const candidate=new URL(url)
    if(candidate.protocol!=='https:'||candidate.hostname!=='github.com'||!candidate.pathname.startsWith('/eltawalbeh/PrintOKChanges/releases/'))throw new Error('رابط تحديث غير موثوق')
    await shell.openExternal(candidate.toString());return true
  }))
  ipcMain.handle('settings:backup',allow(async()=>{
    const r=await dialog.showOpenDialog(win,{title:'اختر وجهة النسخة الاحتياطية',properties:['openDirectory','createDirectory']})
    if(r.canceled||!r.filePaths[0]) return null
    const destRoot=path.resolve(r.filePaths[0])
    if(inside(destRoot,config.root)||inside(config.root,destRoot)) throw new Error('اختر مكاناً خارج مجلد بيانات PrintOK للنسخة الاحتياطية')
    const db=await readData()
    const backup=path.join(destRoot,'PrintOK-Backup-'+new Date().toISOString().replace(/[:.]/g,'-'))
    await fsp.mkdir(backup,{recursive:false})
    await fsp.cp(config.root,path.join(backup,'storage'),{recursive:true})
    const external=new Set()
    for(const o of db.orders) for(const v of o.versions) for(const f of [v.file,v.referenceFile]) if(f?.path&&!inside(f.path,config.root)) external.add(f.path)
    const manifest=[]
    let n=0
    for(const original of external) {
      try {
        const copy='extra/'+String(++n).padStart(4,'0')+'-'+safe(path.basename(original),80)
        await fsp.mkdir(path.dirname(path.join(backup,copy)),{recursive:true})
        await fsp.copyFile(original,path.join(backup,copy))
        manifest.push({source:original,backup:copy})
      } catch(e) {manifest.push({source:original,error:e.message})}
    }
    await atomic(path.join(backup,'external-file-manifest.json'),JSON.stringify({created:now(),files:manifest,note:'External file paths need mapping when restoring'},null,2))
    return {location:backup,external:manifest.length}
  }))
}
const hasLock=app.requestSingleInstanceLock()
if(!hasLock) app.quit()
else {
  app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.focus()}})
  app.whenReady().then(async()=>{
    await loadConfig()
    ipc()
    createWindow()
    app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()})
  }).catch(e=>{dialog.showErrorBox('PrintOK Desktop',e.message);app.quit()})
  app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()})
}
