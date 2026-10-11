import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const htmlPath = fileURLToPath(new URL('../public/dataguard-navy-violet.html', import.meta.url));
const html = readFileSync(htmlPath, 'utf8');
const inlineScripts = [...html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
  .map((match, index) => ({ index, code: match[1] }))
  .filter((item) => item.code.trim());

for (const item of inlineScripts) {
  try {
    // Compile each inline classic script without executing DOM-dependent code.
    new Function(item.code);
  } catch (error) {
    throw new Error('Inline script #' + item.index + ' failed syntax validation: ' + error.message);
  }
}

if (!html.includes("$$('.thm').forEach(b=>b.onclick=mode)")) {
  throw new Error('Theme buttons must use the multi-element selector; otherwise page initialization can stop.');
}
if (/(?<!\$)\$\(['"]\.thm['"]\)\.forEach/.test(html)) {
  throw new Error('Found a single-element selector incorrectly used with forEach for theme buttons.');
}
if (!html.includes('window.parent.DATAGUARD_API_URL')) {
  throw new Error('The standalone page must read the configured API base from its same-origin React shell.');
}
if (!html.includes("document.querySelectorAll('.fc.si [data-login]')")) {
  throw new Error('The real email/password login handler is missing.');
}
if (!html.includes("document.querySelectorAll('.fc.su [data-login]')")) {
  throw new Error('The real email/password registration handler is missing.');
}
if (!html.includes("if(navReg){navReg.textContent") || !html.includes("if(usrE)usrE.textContent")) {
  throw new Error('Auth/profile UI updates must guard optional DOM elements before writing textContent.');
}
if (html.split('\\n').some((line) => line.trim() === 'run();')) {
  throw new Error('The legacy demo scan must not run automatically on page load.');
}

const radar = readFileSync(fileURLToPath(new URL('../public/dataguard-ai-radar.js', import.meta.url)), 'utf8');
const legacyRadarScripts = [
  '../public/dataguard-functional-fixes.js',
  '../public/dataguard-followup-fixes.js',
  '../public/dataguard-pr17-fixes.js',
].map((path) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8'));
const radarWithoutMultiSelector = radar.replaceAll("$('.seg button[data-m]').forEach", '');
if (radarWithoutMultiSelector.includes("$('.seg button[data-m]').forEach")) {
  throw new Error('Radar history restoration must use the multi-element selector for segment buttons.');
}
if (legacyRadarScripts.some((script) => /wireUpload\(\);wireRadar\(\)/.test(script))) {
  throw new Error('Legacy scripts must not attach competing AI Radar handlers.');
}
const workspace = readFileSync(fileURLToPath(new URL('../public/dataguard-chat-workspace.js', import.meta.url)), 'utf8');
if (!workspace.includes("Promise.allSettled([api('/api/ai/chat/sessions'),api('/api/projects/reviews')])")) {
  throw new Error('Session history must load independently from review history.');
}

console.log('Validated ' + inlineScripts.length + ' inline scripts, auth wiring, single Radar controller, and independent history loading.');
