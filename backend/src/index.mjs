import { createHash, randomBytes, timingSafeEqual, randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, ssl: { rejectUnauthorized: true } });
pool.on('error', (error) => console.error('PrintOK PostgreSQL idle connection error:', error.message));
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'eu-central-1',
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  forcePathStyle: true,
  credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID || '', secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '' }
});
const BUCKET = 'printok-artwork';
const LIMIT_BYTES = 20 * 1024 * 1024;
const PASSWORD_HASH = process.env.PRINTOK_PASSWORD_SHA256 || '';
const hexHash = value => createHash('sha256').update(value).digest('hex');
const token = () => randomBytes(32).toString('base64url');
const clean = (v, max = 255) => String(v ?? '').trim().slice(0, max);
const isUUID = value => /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value);
const allowedMime = new Set(['application/pdf', 'image/png', 'image/jpeg']);
const out = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
const failure = (message, status = 400) => out({ error: message }, status);

const hostCors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
  'Access-Control-Max-Age': '600',
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
};
const finish = response => {
  const headers = new Headers(response.headers);
  Object.entries(hostCors).forEach(([k, v]) => headers.set(k, v));
  return new Response(response.body, { status: response.status, headers });
};
const query = (sql, params = []) => pool.query(sql, params);
const auth = async req => {
  const secret = (req.headers.get('Authorization') || '').match(/^Bearer\s+([\w\-]+)$/)?.[1];
  if (!secret) return null;
  const found = await query("SELECT token_hash FROM printok_sessions WHERE token_hash=$1 AND expires_at>NOW()", [hexHash(secret)]);
  return found.rows.length ? hexHash(secret) : null;
};
const serializeOrder = o => ({
  id: o.id, ref: 'PK-' + o.order_number, client: o.client_name, phone: o.client_phone, product: o.product_name,
  quantity: String(o.quantity), dimensions: o.dimensions, material: o.material, status: o.status, currentVersion: o.current_version,
  createdAt: o.created_at, updatedAt: o.updated_at, fileName: o.file_name || null, versionId: o.version_id || null,
  fileType: o.file_type || null, fileSize: o.file_size || null
});
async function getOrder(id) {
  const { rows } = await query("SELECT o.*,v.id AS version_id,v.file_name,v.file_type,v.file_size FROM printok_orders o LEFT JOIN printok_versions v ON v.order_id=o.id AND v.version_number=o.current_version WHERE o.id=$1", [id]);
  if (!rows.length) return null;
  const order = serializeOrder(rows[0]);
  const versions = await query('SELECT id, version_number, status, file_name, file_type, file_size, review_note, review_decision_at, created_at FROM printok_versions WHERE order_id=$1 ORDER BY version_number DESC', [id]);
  return { ...order, versions: versions.rows.map(v => ({
    id: v.id, number: v.version_number, status: v.status, fileName: v.file_name, fileType: v.file_type,
    fileSize: v.file_size, note: v.review_note, date: v.created_at, decisionAt: v.review_decision_at
  })) };
}
async function requireAuth(req) {
  const session = await auth(req);
  return session ? { session } : { error: failure('تحتاج لتسجيل الدخول', 401) };
}
function inspectFile(file) {
  if (!(file instanceof File) || !file.size || file.size > LIMIT_BYTES) throw Object.assign(new Error('الملف يجب أن يكون PDF أو PNG أو JPG بحجم لا يتجاوز 20MB'), { status: 413 });
  if (!allowedMime.has(file.type)) throw Object.assign(new Error('نوع ملف غير مدعوم'), { status: 415 });
}
async function saveFile(file, orderId, versionNumber) {
  inspectFile(file);
  const bytes = Buffer.from(await file.arrayBuffer());
  const magic = bytes.subarray(0, 12);
  const pdf = magic.subarray(0, 5).toString('ascii') === '%PDF-';
  const png = magic.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpeg = magic[0] === 255 && magic[1] === 216 && magic[2] === 255;
  if (!((pdf && file.type === 'application/pdf') || (png && file.type === 'image/png') || (jpeg && file.type === 'image/jpeg'))) {
    throw Object.assign(new Error('محتوى الملف لا يطابق نوعه'), { status: 415 });
  }
  const extension = pdf ? 'pdf' : png ? 'png' : 'jpg';
  const key = 'orders/' + orderId + '/v' + versionNumber + '/' + randomUUID() + '.' + extension;
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: bytes, ContentType: file.type, ContentDisposition: 'inline', CacheControl: 'private, max-age=0' }));
  return { key, name: clean(file.name, 255), type: file.type, size: file.size };
}
async function deleteFile(key) { try { await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key })); } catch (err) { console.error('Orphan file cleanup failed:', err.message); } }
async function fileUrl(key) { return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 300 }); }
async function logEvent(client, order, version, type, details = {}) {
  await client.query('INSERT INTO printok_events(order_id,version_id,event_type,details) VALUES($1,$2,$3,$4::jsonb)', [order, version, type, JSON.stringify(details)]);
}

async function login(req) {
  if (!/^[a-f0-9]{64}$/i.test(PASSWORD_HASH)) return failure('تسجيل الدخول غير مهيأ على الخادم', 503);
  const origin = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const ip = hexHash(origin);
  const attempts = await query("SELECT count(*)::int AS count FROM printok_login_attempts WHERE created_at>NOW()-INTERVAL '15 minutes' AND success=false AND ip_hash=$1", [ip]);
  const globalAttempts = await query("SELECT count(*)::int AS count FROM printok_login_attempts WHERE created_at>NOW()-INTERVAL '15 minutes' AND success=false");
  if (attempts.rows[0].count >= 5 || globalAttempts.rows[0].count >= 70) return failure('محاولات كثيرة، حاول لاحقاً', 429);
  const body = await req.json().catch(() => ({}));
  const typed = hexHash(String(body.password || ''));
  const good = timingSafeEqual(Buffer.from(typed, 'hex'), Buffer.from(PASSWORD_HASH, 'hex'));
  await query('INSERT INTO printok_login_attempts(ip_hash,success) VALUES($1,$2)', [ip, good]);
  if (!good) return failure('كلمة المرور غير صحيحة', 401);
  const sessionToken = token();
  const expiresAt = new Date(Date.now() + 12 * 3600 * 1000);
  await query('INSERT INTO printok_sessions(token_hash,expires_at) VALUES($1,$2)', [hexHash(sessionToken), expiresAt]);
  return out({ token: sessionToken, expiresAt, authenticated: true });
}

async function createOrder(req) {
  const data = await req.formData();
  const clientName = clean(data.get('client'), 160);
  const phone = clean(data.get('phone'), 32);
  const product = clean(data.get('product'), 240);
  const quantity = Number(data.get('quantity'));
  const dimensions = clean(data.get('dimensions'), 120);
  const material = clean(data.get('material'), 120);
  const draft = data.get('draft') === 'true';
  const file = data.get('file');
  if (!clientName || phone.length < 7 || !product || !Number.isInteger(quantity) || quantity < 1 || quantity > 100000000) return failure('يرجى إدخال بيانات الطلب المطلوبة بشكل صحيح', 422);
  if (!draft && !(file instanceof File)) return failure('ملف التصميم مطلوب للإرسال', 422);
  const orderId = randomUUID();
  let stored;
  if (!draft) stored = await saveFile(file, orderId, 1);
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const inserted = await db.query("INSERT INTO printok_orders(id,client_name,client_phone,product_name,quantity,dimensions,material,status,current_version) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING order_number", [orderId, clientName, phone, product, quantity, dimensions, material, draft ? 'draft' : 'pending', draft ? 0 : 1]);
    let versionId = null;
    if (stored) {
      const version = await db.query('INSERT INTO printok_versions(order_id,version_number,file_key,file_name,file_type,file_size) VALUES($1,1,$2,$3,$4,$5) RETURNING id', [orderId, stored.key, stored.name, stored.type, stored.size]);
      versionId = version.rows[0].id;
    }
    await logEvent(db, orderId, versionId, draft ? 'order_drafted' : 'order_created', { fileName: stored?.name || null });
    await db.query('COMMIT');
    return out({ id: orderId, ref: 'PK-' + inserted.rows[0].order_number, status: draft ? 'draft' : 'pending' }, 201);
  } catch (error) {
    await db.query('ROLLBACK');
    if (stored) await deleteFile(stored.key);
    throw error;
  } finally { db.release(); }
}

async function addVersion(req, orderId) {
  const data = await req.formData();
  const file = data.get('file');
  if (!(file instanceof File)) return failure('اختر ملف التصميم الجديد', 422);
  const db = await pool.connect();
  let stored;
  try {
    await db.query('BEGIN');
    const { rows } = await db.query('SELECT id,current_version FROM printok_orders WHERE id=$1 FOR UPDATE', [orderId]);
    if (!rows.length) { await db.query('ROLLBACK'); return failure('الطلب غير موجود', 404); }
    const versionNo = rows[0].current_version + 1;
    stored = await saveFile(file, orderId, versionNo);
    const { rows: vr } = await db.query("INSERT INTO printok_versions(order_id,version_number,file_key,file_name,file_type,file_size,status) VALUES($1,$2,$3,$4,$5,$6,'pending') RETURNING id", [orderId, versionNo, stored.key, stored.name, stored.type, stored.size]);
    await db.query("UPDATE printok_orders SET current_version=$2,status='pending',updated_at=NOW() WHERE id=$1", [orderId, versionNo]);
    await logEvent(db, orderId, vr[0].id, 'version_uploaded', { version: versionNo, fileName: stored.name });
    await db.query('COMMIT');
    return out({ version: versionNo, status: 'pending' }, 201);
  } catch (error) {
    await db.query('ROLLBACK');
    if (stored) await deleteFile(stored.key);
    throw error;
  } finally { db.release(); }
}

async function reviewLink(orderId) {
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const { rows } = await db.query('SELECT current_version,status FROM printok_orders WHERE id=$1 FOR UPDATE', [orderId]);
    if (!rows.length) { await db.query('ROLLBACK'); return failure('الطلب غير موجود', 404); }
    if (rows[0].status !== 'pending' || !rows[0].current_version) { await db.query('ROLLBACK'); return failure('المراجعة متاحة للنسخة المعلّقة فقط', 409); }
    const reviewToken = token();
    await db.query("UPDATE printok_versions SET review_token_hash=$3,review_expires_at=NOW()+INTERVAL '14 days' WHERE order_id=$1 AND version_number=$2", [orderId, rows[0].current_version, hexHash(reviewToken)]);
    await db.query('COMMIT');
    return out({ token: reviewToken, orderId, version: rows[0].current_version, expiresInDays: 14 });
  } catch (err) { await db.query('ROLLBACK'); throw err; }
  finally { db.release(); }
}
async function publicReview(reviewToken) {
  if (!reviewToken || reviewToken.length < 24 || reviewToken.length > 100) return null;
  const { rows } = await query(
    "SELECT o.id AS order_id,o.order_number,o.client_name,o.product_name,o.quantity,o.dimensions,o.material,o.current_version,o.status AS order_status,v.id AS version_id,v.version_number,v.status,v.file_name,v.file_type,v.file_key,v.review_note,v.review_expires_at FROM printok_versions v JOIN printok_orders o ON o.id=v.order_id WHERE v.review_token_hash=$1 AND v.review_expires_at>NOW() AND o.current_version=v.version_number",
    [hexHash(reviewToken)]
  );
  return rows[0] || null;
}
async function decide(reviewToken, req) {
  const body = await req.json().catch(() => ({}));
  const decision = body.decision;
  const note = clean(body.note, 3000);
  if (!['approved', 'changes'].includes(decision)) return failure('قرار مراجعة غير صالح', 422);
  if (decision === 'changes' && !note) return failure('أضف ملاحظة التعديل المطلوبة', 422);
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const { rows } = await db.query(
      "SELECT o.id AS order_id,o.current_version,o.status AS order_status,v.id AS version_id,v.version_number,v.status AS version_status FROM printok_versions v JOIN printok_orders o ON o.id=v.order_id WHERE v.review_token_hash=$1 AND v.review_expires_at>NOW() AND o.current_version=v.version_number FOR UPDATE OF o,v",
      [hexHash(reviewToken)]
    );
    if (!rows.length) { await db.query('ROLLBACK'); return failure('رابط المراجعة غير صالح أو انتهت صلاحيته', 404); }
    const r = rows[0];
    if (r.order_status !== 'pending' || r.version_status !== 'pending') { await db.query('ROLLBACK'); return failure('تم اتخاذ قرار مسبق لهذه النسخة', 409); }
    await db.query('UPDATE printok_versions SET status=$2,review_note=$3,review_decision_at=NOW() WHERE id=$1', [r.version_id, decision, note || null]);
    await db.query('UPDATE printok_orders SET status=$2,updated_at=NOW() WHERE id=$1', [r.order_id, decision]);
    await logEvent(db, r.order_id, r.version_id, decision === 'approved' ? 'version_approved' : 'changes_requested', { version: r.current_version, note });
    await db.query('COMMIT');
    return out({ status: decision, version: r.current_version });
  } catch (e) { await db.query('ROLLBACK'); throw e; }
  finally { db.release(); }
}

async function handler(request) {
  const u = new URL(request.url);
  const path = u.pathname.replace(/^\/api(?=\/|$)/, '') || '/';
  const method = request.method;
  if (method === 'OPTIONS') return new Response(null, { status: 204 });
  if (method === 'GET' && path === '/health') {
    const r = await query('SELECT 1 AS ok');
    return out({ ok: r.rows[0].ok === 1, service: 'PrintOK API', database: 'connected', objectStorage: Boolean(process.env.AWS_ENDPOINT_URL_S3) });
  }
  if (method === 'POST' && path === '/auth/login') return login(request);
  if (method === 'GET' && /^\/review\/[^/]+$/.test(path)) {
    const current = await publicReview(path.split('/')[2]);
    return current ? out({
      id: current.order_id, ref: 'PK-' + current.order_number, client: current.client_name, product: current.product_name,
      quantity: current.quantity, dimensions: current.dimensions, material: current.material, version: current.version_number,
      status: current.status, fileName: current.file_name, fileType: current.file_type, note: current.review_note
    }) : failure('رابط المراجعة غير صالح أو منتهي', 404);
  }
  if (method === 'GET' && /^\/review\/[^/]+\/file$/.test(path)) {
    const current = await publicReview(path.split('/')[2]);
    return current ? out({ url: await fileUrl(current.file_key), fileType: current.file_type }) : failure('رابط المراجعة غير صالح', 404);
  }
  if (method === 'POST' && /^\/review\/[^/]+\/decision$/.test(path)) return decide(path.split('/')[2], request);
  const who = await requireAuth(request);
  if (who.error) return who.error;
  if (method === 'GET' && path === '/auth/session') return out({ authenticated: true });
  if (method === 'POST' && path === '/auth/logout') {
    await query('DELETE FROM printok_sessions WHERE token_hash=$1', [who.session]);
    return out({ ok: true });
  }
  if (method === 'GET' && path === '/settings') {
    const { rows } = await query('SELECT shop_name FROM printok_settings WHERE id=1');
    return out({ shopName: rows[0]?.shop_name || 'المطبعة' });
  }
  if (method === 'PATCH' && path === '/settings') {
    const body = await request.json().catch(() => ({}));
    const name = clean(body.shopName, 120);
    if (!name) return failure('أدخل اسم المطبعة', 422);
    await query('UPDATE printok_settings SET shop_name=$1,updated_at=NOW() WHERE id=1', [name]);
    return out({ shopName: name });
  }
  if (method === 'GET' && path === '/orders') {
    const { rows } = await query(
      'SELECT o.*,v.id AS version_id,v.file_name,v.file_type,v.file_size FROM printok_orders o LEFT JOIN printok_versions v ON v.order_id=o.id AND v.version_number=o.current_version ORDER BY o.created_at DESC LIMIT 300'
    );
    return out({ orders: rows.map(serializeOrder) });
  }
  if (method === 'POST' && path === '/orders') return createOrder(request);
  if (method === 'GET' && path === '/events') {
    const { rows } = await query("SELECT e.id,e.event_type,e.details,e.created_at,o.order_number,o.client_name FROM printok_events e LEFT JOIN printok_orders o ON o.id=e.order_id ORDER BY e.created_at DESC LIMIT 100");
    return out({ events: rows.map(e => ({ id:e.id,type:e.event_type,details:e.details,date:e.created_at,ref:e.order_number ? 'PK-'+e.order_number : '',client:e.client_name })) });
  }
  const orderGet = path.match(/^\/orders\/([0-9a-f-]+)$/i);
  if (method === 'GET' && orderGet && isUUID(orderGet[1])) {
    const result = await getOrder(orderGet[1]);
    return result ? out({ order: result }) : failure('الطلب غير موجود', 404);
  }
  const orderNewVer = path.match(/^\/orders\/([0-9a-f-]+)\/versions$/i);
  if (method === 'POST' && orderNewVer && isUUID(orderNewVer[1])) return addVersion(request, orderNewVer[1]);
  const reviewGet = path.match(/^\/orders\/([0-9a-f-]+)\/review-link$/i);
  if (method === 'POST' && reviewGet && isUUID(reviewGet[1])) return reviewLink(reviewGet[1]);
  const fileGet = path.match(/^\/orders\/([0-9a-f-]+)\/files\/([0-9a-f-]+)$/i);
  if (method === 'GET' && fileGet && isUUID(fileGet[1]) && isUUID(fileGet[2])) {
    const { rows } = await query('SELECT v.file_key,v.file_type FROM printok_versions v WHERE v.order_id=$1 AND v.id=$2', [fileGet[1], fileGet[2]]);
    return rows.length ? out({ url: await fileUrl(rows[0].file_key), fileType: rows[0].file_type }) : failure('الملف غير موجود', 404);
  }
  return failure('المسار غير موجود', 404);
}

export default {
  async fetch(request) {
    try {
      if (request.headers.has('content-length') && Number(request.headers.get('content-length')) > 22 * 1024 * 1024) return finish(failure('حجم الطلب أكبر من المسموح', 413));
      return finish(await handler(request));
    } catch (error) {
      console.error('PrintOK API:', error);
      return finish(failure(error.status ? error.message : 'حدث خطأ بالخادم، حاول مرة أخرى', error.status || 500));
    }
  }
};
