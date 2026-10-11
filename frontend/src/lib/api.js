const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
function authData() { try { return JSON.parse(localStorage.getItem('dataguard-auth') || '{}'); } catch { return {}; } }
export function getToken() { const token = authData().token; if (!token) throw new Error('Your session has expired. Please sign in again.'); return token; }
async function request(path, options = {}) {
 const token = options.auth === false ? '' : (options.token || getToken());
 const headers = { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(options.headers || {}) };
 const response = await fetch(API_URL + path, { ...options, headers });
 const type = response.headers.get('content-type') || '';
 const body = type.includes('application/json') ? await response.json() : await response.text();
 if (!response.ok) {
   const detail = typeof body === 'string' ? body.trim() : body?.message || body?.error || body?.detail;
   throw new Error(detail || `Request failed (${response.status} ${response.statusText || ''}).`.trim());
  }
 return body;
}
export function authenticate(path, payload) { if (!['/api/auth/register','/api/auth/login'].includes(path)) throw new Error('Unsupported authentication request.'); return request(path,{method:'POST',body:JSON.stringify(payload),auth:false}); }
export function getReviews() { return request('/api/projects/reviews'); }
export function uploadProject(name,file) { const form = new FormData(); form.append('name',name); form.append('file',file); return request('/api/projects/upload',{method:'POST',body:form}); }
export function generateFix(reviewId,findingId) { return request('/api/projects/reviews/'+reviewId+'/findings/'+findingId+'/fix',{method:'POST'}); }
export function applyFix(reviewId,findingId) { return request('/api/projects/reviews/'+reviewId+'/findings/'+findingId+'/apply',{method:'POST'}); }
export async function downloadReviewedProject(reviewId,name) {
 const response = await fetch(API_URL+'/api/projects/reviews/'+reviewId+'/download',{headers:{Authorization:'Bearer '+getToken()}});
 if (!response.ok) throw new Error('Could not download the reviewed project. The source may no longer be stored on the server.');
 const url = URL.createObjectURL(await response.blob()); const a = document.createElement('a'); a.href=url; a.download=(name||'dataguard-project')+'-reviewed.zip'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function getChatSessions() { return request('/api/ai/chat/sessions'); }
export function createChatSession(title,reviewId=null) { return request('/api/ai/chat/sessions',{method:'POST',body:JSON.stringify({title,reviewId})}); }
export function getChatHistory(id) { return request('/api/ai/chat/history?sessionId='+encodeURIComponent(id)); }
export function sendChatMessage(message,sessionId) { return request('/api/ai/chat',{method:'POST',body:JSON.stringify({message,sessionId})}); }
export function sendRadarPrompt(prompt,mode,category,budget,sessionId=null) { return request('/api/ai/radar',{method:'POST',body:JSON.stringify({prompt,mode,category,budget,sessionId})}); }