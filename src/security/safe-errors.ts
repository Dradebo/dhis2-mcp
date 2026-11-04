/**
 * Structured, minimised errors (mission BASE-02, RT-09).
 *
 * Raw HTTP-client errors carry request configuration (including Authorization
 * headers) and response bodies (which can contain clinical data). They must never
 * be serialised into tool results, audit entries or stderr. Convert them to a
 * SafeError at the transport boundary and pass every other message through
 * redactSecrets() before it leaves the process.
 */

const MAX_MESSAGE = 300;
const knownSecrets = new Set<string>();

/** Register a secret value (e.g. a resolved password/token) so it is redacted from any message. */
export function registerSecret(value: string | undefined): void {
  if (value && value.length >= 4) knownSecrets.add(value);
}

/** Test helper: forget registered secrets. */
export function clearRegisteredSecrets(): void {
  knownSecrets.clear();
}

const PATTERNS: Array<[RegExp, string]> = [
  [/\b(Basic|Bearer|ApiToken)\s+[A-Za-z0-9+/=._~-]{4,}/gi, '$1 [REDACTED]'],
  [/\bd2pat_[A-Za-z0-9]+/g, '[REDACTED_TOKEN]'],
  [/("?(?:password|passwd|pwd|token|secret|api[_-]?key|authorization|cookie|jsessionid)"?\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,;&}]+)/gi, '$1[REDACTED]'],
  [/(https?:\/\/)[^\s/@:]+:[^\s/@]+@/gi, '$1[REDACTED]@'],
];

export function redactSecrets(input: string): string {
  let out = input;
  for (const secret of knownSecrets) {
    if (out.includes(secret)) out = out.split(secret).join('[REDACTED]');
    const b64 = Buffer.from(secret).toString('base64');
    if (out.includes(b64)) out = out.split(b64).join('[REDACTED]');
  }
  for (const [re, rep] of PATTERNS) out = out.replace(re, rep);
  return out.length > MAX_MESSAGE ? `${out.slice(0, MAX_MESSAGE)}…` : out;
}

export class SafeError extends Error {
  readonly code: string;
  readonly httpStatus: number | undefined;
  constructor(code: string, message: string, httpStatus?: number) {
    super(redactSecrets(message));
    this.name = 'SafeError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
  override toString(): string {
    return this.message;
  }
}

interface AxiosLikeError {
  isAxiosError?: boolean;
  code?: string;
  response?: { status?: number; data?: unknown };
  config?: { method?: string; url?: string };
}

function isAxiosLike(e: unknown): e is AxiosLikeError {
  return typeof e === 'object' && e !== null && (e as AxiosLikeError).isAxiosError === true;
}

/** Path without query string, so filters/values in query parameters are not echoed. */
function safePath(url: string | undefined): string {
  if (!url) return '';
  const path = url.split('?')[0] ?? '';
  return path.replace(/[^A-Za-z0-9/_.-]/g, '').slice(0, 80);
}

/** Convert an HTTP-client error into a SafeError without config, headers or bodies. */
export function toSafeHttpError(e: unknown): SafeError {
  if (!isAxiosLike(e)) return new SafeError('internal_error', toSafeErrorMessage(e));
  const status = e.response?.status;
  const method = (e.config?.method ?? '').toUpperCase().slice(0, 7);
  const path = safePath(e.config?.url);
  const where = method || path ? ` (${[method, path].filter(Boolean).join(' ')})` : '';
  if (status) {
    let dhis2Code = '';
    const data = e.response?.data as { errorCode?: unknown } | undefined;
    if (data && typeof data === 'object' && typeof data.errorCode === 'string' && /^E\d{3,5}$/.test(data.errorCode)) {
      dhis2Code = ` ${data.errorCode}`;
    }
    return new SafeError('http_error', `DHIS2 request failed: HTTP ${status}${dhis2Code}${where}`, status);
  }
  const netCode = typeof e.code === 'string' && /^[A-Z_]{2,40}$/.test(e.code) ? e.code : 'NETWORK_ERROR';
  return new SafeError('network_error', `DHIS2 request failed: ${netCode}${where}`);
}

/** The only function that may turn an unknown error into model- or log-visible text. */
export function toSafeErrorMessage(e: unknown): string {
  if (e instanceof SafeError) return e.message;
  if (isAxiosLike(e)) return toSafeHttpError(e).message;
  if (e instanceof Error) return redactSecrets(e.message);
  return 'Unexpected error';
}
