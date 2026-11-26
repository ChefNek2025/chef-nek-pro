// Chef Nek Pro — New request alerts (email + WhatsApp)
// Vercel Serverless Function: POST /api/notify
// Secrets live ONLY in Vercel Environment Variables:
//   NOTIFY_EMAIL, RESEND_API_KEY, NOTIFY_FROM (optional),
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, WHATSAPP_TO

const hits = new Map();

const clean = (v, n = 200) => String(v == null ? '' : v).replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, n);
const esc = v => v.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const origin = req.headers.origin || '';
  if (origin && !/chefnekpro\.com$|\.vercel\.app$|localhost(:\d+)?$/.test(origin.replace(/^https?:\/\//, ''))) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 10 * 60 * 1000);
  if (recent.length >= 6) return res.status(429).json({ error: 'Too many requests' });
  recent.push(now); hits.set(ip, recent);

  const b = req.body && typeof req.body === 'object' ? req.body : {};
  const kind = b.kind === 'worker-application' ? 'worker-application' : b.kind === 'restaurant-request' ? 'restaurant-request' : null;
  if (!kind) return res.status(400).json({ error: 'Bad request' });

  const f = {
    name: clean(b.name, 80), phone: clean(b.phone, 40), email: clean(b.email, 120),
    restaurant: clean(b.restaurant, 120), position: clean(b.position, 80),
    count: clean(b.count, 40), when: clean(b.when, 60), notes: clean(b.notes, 400),
    training: clean(b.training, 40), source: clean(b.source, 40)
  };
  if (!f.name || !f.phone) return res.status(400).json({ error: 'Missing fields' });

  const isReq = kind === 'restaurant-request';
  const title = isReq ? '🍳 New restaurant request' : '👨‍🍳 New worker application';
  const lines = isReq
    ? [['Restaurant', f.restaurant], ['Contact', f.name], ['Phone', f.phone], ['Email', f.email], ['Position', f.position], ['Workers', f.count], ['Start', f.when], ['Notes', f.notes]]
    : [['Name', f.name], ['Phone', f.phone], ['Email', f.email], ['Position', f.position], ['Training', f.training]];
  const rows = lines.filter(([, v]) => v);

  const text = title + '\n' + rows.map(([k, v]) => `${k}: ${v}`).join('\n') + '\n\nOpen: https://chefnekpro.com/app';
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px"><h2 style="color:#0F6E56;margin:0 0 12px">${title}</h2>
    <table style="border-collapse:collapse;width:100%">${rows.map(([k, v]) => `<tr><td style="padding:6px 10px;color:#666;border-bottom:1px solid #eee;width:110px">${esc(k)}</td><td style="padding:6px 10px;border-bottom:1px solid #eee"><b>${esc(v)}</b></td></tr>`).join('')}</table>
    <p style="margin-top:16px"><a href="https://chefnekpro.com/app" style="background:#1D9E75;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Open Pipeline</a></p></div>`;

  const E = process.env;
  const jobs = [];

  if (E.RESEND_API_KEY && E.NOTIFY_EMAIL) {
    jobs.push(fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${E.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: E.NOTIFY_FROM || 'Chef Nek Pro <onboarding@resend.dev>',
        to: [E.NOTIFY_EMAIL],
        subject: `${title}: ${isReq ? f.restaurant || f.name : f.name}`,
        html, text,
        ...(f.email ? { reply_to: f.email } : {})
      })
    }).then(r => ({ email: r.ok })).catch(() => ({ email: false })));
  }

  if (E.TWILIO_ACCOUNT_SID && E.TWILIO_AUTH_TOKEN && E.TWILIO_WHATSAPP_FROM && E.WHATSAPP_TO) {
    const body = new URLSearchParams({ From: E.TWILIO_WHATSAPP_FROM, To: E.WHATSAPP_TO, Body: text });
    jobs.push(fetch(`https://api.twilio.com/2010-04-01/Accounts/${E.TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${E.TWILIO_ACCOUNT_SID}:${E.TWILIO_AUTH_TOKEN}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    }).then(r => ({ whatsapp: r.ok })).catch(() => ({ whatsapp: false })));
  }

  const out = Object.assign({}, ...(await Promise.all(jobs)));
  return res.status(200).json({ ok: true, sent: out });
}// Chef Nek Pro — New request alerts (email + WhatsApp)
// Vercel Serverless Function: POST /api/notify
// Secrets live ONLY in Vercel Environment Variables:
//   NOTIFY_EMAIL, RESEND_API_KEY, NOTIFY_FROM (optional),
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, WHATSAPP_TO

const hits = new Map();

const clean = (v, n = 200) => String(v == null ? '' : v).replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, n);
const esc = v => v.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const origin = req.headers.origin || '';
  if (origin && !/chefnekpro\.com$|\.vercel\.app$|localhost(:\d+)?$/.test(origin.replace(/^https?:\/\//, ''))) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 10 * 60 * 1000);
  if (recent.length >= 6) return res.status(429).json({ error: 'Too many requests' });
  recent.push(now); hits.set(ip, recent);

  const b = req.body && typeof req.body === 'object' ? req.body : {};
  const kind = b.kind === 'worker-application' ? 'worker-application' : b.kind === 'restaurant-request' ? 'restaurant-request' : null;
  if (!kind) return res.status(400).json({ error: 'Bad request' });

  const f = {
    name: clean(b.name, 80), phone: clean(b.phone, 40), email: clean(b.email, 120),
    restaurant: clean(b.restaurant, 120), position: clean(b.position, 80),
    count: clean(b.count, 40), when: clean(b.when, 60), notes: clean(b.notes, 400),
    training: clean(b.training, 40), source: clean(b.source, 40)
  };
  if (!f.name || !f.phone) return res.status(400).json({ error: 'Missing fields' });

  const isReq = kind === 'restaurant-request';
  const title = isReq ? '🍳 New restaurant request' : '👨‍🍳 New worker application';
  const lines = isReq
    ? [['Restaurant', f.restaurant], ['Contact', f.name], ['Phone', f.phone], ['Email', f.email], ['Position', f.position], ['Workers', f.count], ['Start', f.when], ['Notes', f.notes]]
    : [['Name', f.name], ['Phone', f.phone], ['Email', f.email], ['Position', f.position], ['Training', f.training]];
  const rows = lines.filter(([, v]) => v);

  const text = title + '\n' + rows.map(([k, v]) => `${k}: ${v}`).join('\n') + '\n\nOpen: https://chefnekpro.com/app';
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px"><h2 style="color:#0F6E56;margin:0 0 12px">${title}</h2>
    <table style="border-collapse:collapse;width:100%">${rows.map(([k, v]) => `<tr><td style="padding:6px 10px;color:#666;border-bottom:1px solid #eee;width:110px">${esc(k)}</td><td style="padding:6px 10px;border-bottom:1px solid #eee"><b>${esc(v)}</b></td></tr>`).join('')}</table>
    <p style="margin-top:16px"><a href="https://chefnekpro.com/app" style="background:#1D9E75;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Open Pipeline</a></p></div>`;

  const E = process.env;
  const jobs = [];

  if (E.RESEND_API_KEY && E.NOTIFY_EMAIL) {
    jobs.push(fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${E.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: E.NOTIFY_FROM || 'Chef Nek Pro <onboarding@resend.dev>',
        to: [E.NOTIFY_EMAIL],
        subject: `${title}: ${isReq ? f.restaurant || f.name : f.name}`,
        html, text,
        ...(f.email ? { reply_to: f.email } : {})
      })
    }).then(r => ({ email: r.ok })).catch(() => ({ email: false })));
  }

  if (E.TWILIO_ACCOUNT_SID && E.TWILIO_AUTH_TOKEN && E.TWILIO_WHATSAPP_FROM && E.WHATSAPP_TO) {
    const body = new URLSearchParams({ From: E.TWILIO_WHATSAPP_FROM, To: E.WHATSAPP_TO, Body: text });
    jobs.push(fetch(`https://api.twilio.com/2010-04-01/Accounts/${E.TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${E.TWILIO_ACCOUNT_SID}:${E.TWILIO_AUTH_TOKEN}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    }).then(r => ({ whatsapp: r.ok })).catch(() => ({ whatsapp: false })));
  }

  const out = Object.assign({}, ...(await Promise.all(jobs)));
  return res.status(200).json({ ok: true, sent: out });
}