export type Status = 'draft' | 'pending' | 'approved' | 'changes';
export type Order = {
  id: string; ref: string; client: string; phone: string; product: string; quantity: string;
  dimensions: string; material: string; status: Status; currentVersion: number;
  fileName: string | null; fileType: string | null; versionId: string | null;
  createdAt: string; updatedAt: string; versions?: Version[];
};
export type Version = {
  id: string; number: number; status: Status; fileName: string; fileType: string; fileSize: number;
  note: string | null; date: string; decisionAt: string | null;
};
export type Activity = { id: string; type: string; details: Record<string, unknown>; date: string; ref: string; client: string };
export type Review = {
  id: string; ref: string; client: string; product: string; quantity: number;
  dimensions: string; material: string; version: number; status: Status;
  fileName: string; fileType: string; note: string | null;
};

const DEFAULT_API = 'https://br-cold-wind-baoi51hy-printokapi.compute.c-8.eu-central-1.aws.neon.tech';
export const API_BASE = (import.meta.env.VITE_PRINTOK_API_URL || DEFAULT_API).replace(/\/+$/, '');
export const SESSION_KEY = 'printok_staff_session';

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); this.name = 'ApiError'; }
}

export async function api<T>(path: string, options: { method?: string; body?: FormData | object; token?: string; signal?: AbortSignal } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.token) headers.Authorization = 'Bearer ' + options.token;
  let body: BodyInit | undefined;
  if (options.body instanceof FormData) body = options.body;
  else if (options.body !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(options.body); }
  let response: Response;
  try {
    response = await fetch(API_BASE + path, { method: options.method || 'GET', headers, body, signal: options.signal, cache: 'no-store', referrerPolicy: 'no-referrer' });
  } catch { throw new ApiError('تعذر الاتصال بالخادم. تحقق من اتصال الإنترنت أو نشر Neon Function.', 0); }
  const data = await response.json().catch(() => null) as (T & { error?: string }) | null;
  if (!response.ok) throw new ApiError(data?.error || 'فشلت العملية. حاول مرة أخرى.', response.status);
  return data as T;
}
export function getSession(): string { try { return sessionStorage.getItem(SESSION_KEY) || ''; } catch { return ''; } }
export function setSession(value: string): void { try { if (value) sessionStorage.setItem(SESSION_KEY, value); else sessionStorage.removeItem(SESSION_KEY); } catch { /* Private mode. */ } }
