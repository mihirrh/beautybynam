/**
 * Protects everything under /studio (the private quote builder).
 *
 * HTTP Basic Auth, checked on the server before any HTML is returned.
 * Secrets (Cloudflare Pages → Settings → Variables and Secrets, type "Secret"):
 *   STUDIO_USER      username
 *   STUDIO_PASSWORD  a long, unique password (use a password manager)
 *
 * Fails closed: if either secret is missing, the studio is unavailable rather
 * than open. Cloudflare Access (free for up to 50 users) is a stronger
 * alternative; see the README.
 */

interface Env {
  STUDIO_USER?: string;
  STUDIO_PASSWORD?: string;
}

interface Context {
  request: Request;
  env: Env;
  next: () => Promise<Response>;
}

const encoder = new TextEncoder();

/** Constant-time comparison of two strings via their SHA-256 digests. */
async function safeEqual(a: string, b: string): Promise<boolean> {
  const [da, db] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b)),
  ]);
  const x = new Uint8Array(da);
  const y = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

const baseHeaders = {
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Cache-Control': 'private, no-store',
};

const deny = (status: number, challenge: boolean, body: string) =>
  new Response(body, {
    status,
    headers: {
      ...baseHeaders,
      'Content-Type': 'text/plain; charset=utf-8',
      ...(challenge ? { 'WWW-Authenticate': 'Basic realm="Beauty by Nam studio", charset="UTF-8"' } : {}),
    },
  });

export const onRequest = async ({ request, env, next }: Context): Promise<Response> => {
  if (!env.STUDIO_USER || !env.STUDIO_PASSWORD) {
    console.error('studio: STUDIO_USER / STUDIO_PASSWORD are not configured');
    return deny(503, false, 'Unavailable.');
  }

  const header = request.headers.get('Authorization') ?? '';
  const [scheme, encoded] = header.split(' ');
  if (scheme?.toLowerCase() === 'basic' && encoded) {
    try {
      const decoded = new TextDecoder().decode(Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0)));
      const sep = decoded.indexOf(':');
      if (sep > -1) {
        const [userOk, passOk] = await Promise.all([
          safeEqual(decoded.slice(0, sep), env.STUDIO_USER),
          safeEqual(decoded.slice(sep + 1), env.STUDIO_PASSWORD),
        ]);
        if (userOk && passOk) {
          const response = await next();
          const out = new Response(response.body, response);
          for (const [k, v] of Object.entries(baseHeaders)) out.headers.set(k, v);
          return out;
        }
      }
    } catch {
      /* malformed header: fall through to the challenge */
    }
  }
  return deny(401, true, 'Authentication required.');
};
