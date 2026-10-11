import { useState } from 'react';

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const readAuth = () => { try { return JSON.parse(localStorage.getItem('dataguard-auth') || '{}'); } catch { return {}; } };
function claims(token) {
  try {
    const p = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(p + '='.repeat((4 - (p.length % 4)) % 4)));
  } catch { return null; }
}
async function probe(path, token) {
  try {
    const r = await fetch(API_URL + path, { headers: token ? { Authorization: 'Bearer ' + token } : {} });
    const text = await r.text();
    const html = /^\s*<(!doctype|html)/i.test(text);
    return { path, status: r.status, html, body: html ? '(HTML web page, not API data)' : text.slice(0, 160) || '(empty body)' };
  } catch (e) { return { path, status: 0, body: 'Network/CORS failure: the browser could not complete the request.' }; }
}
function verdict(h, a) {
  if (h.status === 0) return 'The backend is unreachable from the browser. Check VITE_API_URL, that the backend is running, and that CORS_ALLOWED_ORIGINS contains this exact site address (no trailing path).';
  if (h.html) return 'Requests are returning your website instead of the backend. Set VITE_API_URL to the backend URL on Netlify and redeploy.';
  if (h.status !== 200) return 'The backend answered /api/health with ' + h.status + '. It is up but unhealthy (database or configuration). Check the backend logs.';
  if (!a) return 'The backend is healthy. Sign in, then run this check again to test authenticated calls.';
  if (a.status === 200) return 'Everything is connected: health and authenticated calls both succeed.';
  if (a.status === 401) return 'The backend rejected your login token (401). Sign out and in again. If it repeats immediately, JWT_SECRET or JWT_EXPIRATION_MS on the backend is wrong or changes between deploys.';
  if (a.status === 403) return 'An empty 403 means a layer other than the updated backend refused the call: either the backend has not been redeployed with the latest main, or a proxy/firewall is blocking authenticated calls. Redeploy the backend from main, then re-run.';
  return 'Authenticated call returned ' + a.status + '. See the response body above and the backend logs.';
}

export default function Diagnostics() {
  const [out, setOut] = useState(null), [busy, setBusy] = useState(false);
  const auth = readAuth(), c = auth.token ? claims(auth.token) : null;
  async function run() {
    setBusy(true);
    const token = readAuth().token;
    const health = await probe('/api/health');
    const authed = token ? [await probe('/api/projects/reviews', token), await probe('/api/ai/chat/sessions', token)] : [];
    setOut({ health, authed, at: new Date().toLocaleTimeString() });
    setBusy(false);
  }
  const now = Date.now(), exp = c?.exp ? c.exp * 1000 : null;
  const row = (k, v, bad) => <tr key={k}><td style={{ padding: '6px 14px 6px 0', opacity: .7 }}>{k}</td><td style={{ color: bad ? '#d33' : 'inherit', wordBreak: 'break-word' }}>{v}</td></tr>;
  return <main style={{ colorScheme: 'light dark', fontFamily: 'system-ui,sans-serif', maxWidth: 760, margin: '0 auto', padding: 24, lineHeight: 1.5 }}>
    <h1 style={{ fontSize: 24 }}>DataGuard connection check</h1>
    <p style={{ opacity: .75 }}>Tests the browser → backend → login chain. Nothing secret is shown or sent anywhere except your own backend.</p>
    <table><tbody>
      {row('Site address', window.location.origin)}
      {row('Backend URL (VITE_API_URL)', API_URL || '(empty: using same-origin /api)', !API_URL && window.location.hostname !== 'localhost')}
      {row('Signed in as', auth.email || 'not signed in', !auth.token)}
      {row('Login token', !auth.token ? 'missing' : !c ? 'unreadable' : exp && exp < now ? 'EXPIRED ' + new Date(exp).toLocaleString() : 'valid until ' + (exp ? new Date(exp).toLocaleString() : 'unknown'), !c || (exp && exp < now))}
      {c?.iat && c?.exp && row('Token lifetime', Math.round((c.exp - c.iat) / 60) + ' minutes' + ((c.exp - c.iat) < 600 ? ' (very short: check JWT_EXPIRATION_MS on the backend)' : ''), (c.exp - c.iat) < 600)}
    </tbody></table>
    <button onClick={run} disabled={busy} style={{ margin: '18px 0', padding: '11px 20px', borderRadius: 10, border: 0, background: '#7a5cf5', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>{busy ? 'Checking…' : 'Run connection check'}</button>
    {out && <section>
      <table><tbody>{[out.health, ...out.authed].map(r => row(r.path, r.status + ' · ' + r.body, r.status !== 200))}</tbody></table>
      <p style={{ marginTop: 16, padding: 14, borderRadius: 12, background: 'rgba(122,92,245,.14)' }}><b>Result ({out.at}):</b> {verdict(out.health, out.authed[1] || out.authed[0])}</p>
    </section>}
    <p><a href="/">← Back to DataGuard</a></p>
  </main>;
}
