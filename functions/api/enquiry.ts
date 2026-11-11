/**
 * POST /api/enquiry
 *
 * Receives the booking enquiry, validates it on the server and emails it to
 * Nam through the Resend HTTPS API. Nothing is stored. If the email cannot be
 * sent the visitor is told, so an enquiry is never silently lost.
 *
 * Secrets (Cloudflare Pages → Settings → Variables and Secrets):
 *   RESEND_API_KEY      required. API key from resend.com (free tier).
 *   ENQUIRY_TO_EMAIL    required. Where enquiries are delivered.
 *   ENQUIRY_FROM_EMAIL  optional. Defaults to "Beauty by Nam <onboarding@resend.dev>",
 *                       which can only deliver to the Resend account owner's own
 *                       address. Verify a domain in Resend to use your own sender.
 */

interface Env {
  RESEND_API_KEY?: string;
  ENQUIRY_TO_EMAIL?: string;
  ENQUIRY_FROM_EMAIL?: string;
}

interface Context {
  request: Request;
  env: Env;
}

const SERVICES = ['Bridal makeup', 'Bridal hair styling', 'Party & occasion makeup', 'Destination wedding'];

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

const clean = (value: unknown, max: number) =>
  typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max) : '';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function parse(raw: Record<string, unknown>) {
  const services = (Array.isArray(raw.services) ? raw.services : [raw.services])
    .map((s) => clean(s, 60))
    .filter((s) => SERVICES.includes(s));
  return {
    name: clean(raw.name, 120),
    email: clean(raw.email, 200),
    phone: clean(raw.phone, 30),
    date: clean(raw.date, 10),
    venue: clean(raw.venue, 200),
    services,
    people: Number(raw.people),
    message: clean(raw.message, 3000),
    website: clean(raw.website, 100),
  };
}

function validate(d: ReturnType<typeof parse>) {
  if (!d.name) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return false;
  if (d.phone.replace(/\D/g, '').length < 7) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date) || Number.isNaN(Date.parse(d.date))) return false;
  if (!d.venue) return false;
  if (d.services.length === 0) return false;
  if (!Number.isInteger(d.people) || d.people < 1 || d.people > 30) return false;
  return true;
}

export const onRequestPost = async (ctx: Context): Promise<Response> => {
  const res = await handle(ctx);
  // Plain (non-JavaScript) form posts get a redirect back to the page instead of JSON.
  if (res.status >= 400 && !(ctx.request.headers.get('content-type') ?? '').includes('application/json')) {
    return Response.redirect(new URL('/contact#form-error', ctx.request.url).toString(), 303);
  }
  return res;
};

async function handle({ request, env }: Context): Promise<Response> {
  let raw: Record<string, unknown>;
  try {
    if ((request.headers.get('content-type') ?? '').includes('application/json')) {
      raw = (await request.json()) as Record<string, unknown>;
    } else {
      const form = await request.formData();
      raw = Object.fromEntries(form.entries());
      raw.services = form.getAll('services');
    }
  } catch {
    return json({ ok: false, error: 'invalid_request' }, 400);
  }

  const d = parse(raw ?? {});

  // Honeypot: pretend success so bots learn nothing.
  if (d.website) return json({ ok: true });

  if (!validate(d)) return json({ ok: false, error: 'invalid_request' }, 400);

  if (!env.RESEND_API_KEY || !env.ENQUIRY_TO_EMAIL) {
    console.error('enquiry: email service is not configured');
    return json({ ok: false, error: 'unavailable' }, 503);
  }

  const dateLabel = new Date(`${d.date}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
  const rows: [string, string][] = [
    ['Name', d.name], ['Email', d.email], ['Phone', d.phone], ['Wedding date', dateLabel],
    ['Venue / location', d.venue], ['Services', d.services.join(', ')], ['People', String(d.people)],
    ['Additional information', d.message || 'None given'],
  ];

  const html = `<h2>New booking enquiry</h2><table cellpadding="8" style="border-collapse:collapse">${rows
    .map(([k, v]) => `<tr><td style="vertical-align:top"><strong>${esc(k)}</strong></td><td style="white-space:pre-wrap">${esc(v)}</td></tr>`)
    .join('')}</table>`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        from: env.ENQUIRY_FROM_EMAIL || 'Beauty by Nam <onboarding@resend.dev>',
        to: [env.ENQUIRY_TO_EMAIL],
        reply_to: d.email,
        subject: `Booking enquiry: ${d.name}, ${dateLabel}`,
        html,
        text,
      }),
    });
    if (!res.ok) {
      console.error('enquiry: email provider rejected the request', { status: res.status });
      return json({ ok: false, error: 'send_failed' }, 502);
    }
  } catch {
    console.error('enquiry: email provider unreachable');
    return json({ ok: false, error: 'send_failed' }, 502);
  }

  // Plain form post (no JavaScript): send the visitor back with a flag.
  if (!(request.headers.get('content-type') ?? '').includes('application/json')) {
    return Response.redirect(new URL('/contact#form-success', request.url).toString(), 303);
  }
  return json({ ok: true });
}

// Anything other than POST is not allowed (method-specific handlers win over this).
export const onRequest = async (): Promise<Response> => json({ ok: false, error: 'method_not_allowed' }, 405);
