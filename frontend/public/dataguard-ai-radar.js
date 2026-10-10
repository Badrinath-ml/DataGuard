(() => {
'use strict';
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const base=(window.DATAGUARD_API_URL||'').replace(/\/$/,'');
const token=()=>{try{return JSON.parse(localStorage.getItem('dataguard-auth')||'{}').token||''}catch(_){return''}};
let lastResult=null,lastMode='find',lastPrompt='',findVisibleCount=9;
const style=document.createElement('style');
style.textContent='#out .d18-tools-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin:22px 0;text-align:left}#out .d18-tool{min-width:0;overflow-wrap:anywhere;border:1px solid #a18aff77;border-radius:18px;padding:17px;background:linear-gradient(145deg,#8b6dff24,#ffffff07);backdrop-filter:blur(18px);transition:transform .18s,border-color .18s}#out .d18-tool:hover{transform:translateY(-3px);border-color:#b8a5ff}#out .d18-tool-head{display:flex;align-items:center;gap:10px;margin-bottom:10px}#out .d18-tool-icon{display:grid;place-items:center;flex:none;width:38px;height:38px;border-radius:12px;background:#8b6dff2d;font-size:19px}#out .d18-tool h3{font-size:15px;line-height:1.4;margin:0;overflow-wrap:anywhere}#out .d18-tool p{font-size:12.5px;line-height:1.65;color:var(--mu);margin:8px 0}#out .d18-price{display:inline-block;margin-top:8px;padding:5px 10px;border:1px solid #a18aff66;border-radius:999px;font-size:11px;font-weight:750;color:#c4b5fd;background:#8b6dff12}#out .d18-price[data-kind=\"FREE_ONLY\"]{color:#86efac;border-color:#86efac66}#out .d18-price[data-kind=\"PAID_SUBSCRIPTION\"],#out .d18-price[data-kind=\"PAID_USAGE\"]{color:#fca5a5;border-color:#fca5a566}#out .d18-link{display:inline-block;margin-top:10px;font-size:12px;color:#c4b5fd;text-decoration:underline}#out .d18-heading{margin:22px 0 8px;font-size:14px;letter-spacing:.06em;text-transform:uppercase;color:var(--mu);text-align:center}#out .d18-summary{max-width:850px;margin:0 auto 18px;text-align:center;color:var(--mu);font-size:13px;line-height:1.7}#out .d18-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px;margin:20px 0;position:relative}#out .d18-step{min-width:0;padding:16px;border:1px solid #a18aff88;border-radius:17px;background:linear-gradient(140deg,#8b6dff30,#ffffff08);backdrop-filter:blur(18px);overflow-wrap:anywhere}#out .d18-step-number{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:linear-gradient(120deg,#7058f6,#a78bfa);font-weight:800;color:white;margin-bottom:10px}#out .d18-step h3{font-size:14px;line-height:1.45;margin:0 0 9px}#out .d18-step p{font-size:12px;line-height:1.65;color:var(--mu);margin:7px 0}#out .d18-step-tools{border-top:1px solid #a18aff33;margin-top:12px;padding-top:9px}#out .d18-step-tools b{display:block;font-size:11px;margin-bottom:5px;color:#c4b5fd}#out .d18-step-tools span{display:inline-block;margin:3px 4px 0 0;border:1px solid #a18aff55;border-radius:999px;padding:4px 8px;font-size:10px;color:#ddd6fe}#out .d18-loading,#out .d18-error{margin:24px auto;padding:24px;border:1px dashed #a18aff55;border-radius:16px;color:#a5a9ce;text-align:center;line-height:1.7}@media(max-width:950px){#out .d18-tools-grid,#out .d18-steps{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){#out .d18-tools-grid,#out .d18-steps{grid-template-columns:1fr}}';
style.textContent += "#out .d18-find-heading{font-size:18px;font-weight:750;text-align:left;margin:25px 0 16px;color:#f5f3ff}\n#out .d18-find-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin:0 0 18px;text-align:left}\n#out .d18-find-card{display:flex;flex-direction:column;min-width:0;overflow:hidden;border:1px solid #52678a;border-radius:16px;background:#1c2b43;box-shadow:0 8px 20px #05081622;transition:transform .18s,border-color .18s}\n#out .d18-find-card:hover{transform:translateY(-3px);border-color:#8eaaff}\n#out .d18-find-card::before{content:\"\";display:block;height:6px;background:#8baaff}\n#out .d18-find-card[data-status=\"free\"]::before{background:#45d3a1}\n#out .d18-find-card[data-status=\"paid\"]::before{background:#d69af5}\n#out .d18-find-card[data-status=\"trial\"]::before{background:#f5c36b}\n#out .d18-find-main{padding:19px 18px 16px;flex:1}\n#out .d18-find-title{display:flex;align-items:center;gap:12px;margin-bottom:14px}\n#out .d18-brand-logo{width:48px;height:48px;flex:0 0 48px;border:2px solid #8eafff;border-radius:50%;display:grid;place-items:center;overflow:hidden;background:#15243b;color:#b9d0ff;font-size:14px;font-weight:800}\n#out .d18-find-card[data-status=\"free\"] .d18-brand-logo{border-color:#45d3a1;color:#45d3a1}\n#out .d18-find-card[data-status=\"paid\"] .d18-brand-logo{border-color:#d69af5;color:#e7b8ff}\n#out .d18-brand-logo img{width:27px;height:27px;object-fit:contain}\n#out .d18-find-title h3{margin:0;font-size:19px;line-height:1.35;color:#f8fafc;overflow-wrap:anywhere}\n#out .d18-find-description{margin:0;color:#b9c8de;font-size:14px;line-height:1.65}\n#out .d18-find-best{margin:10px 0 0;color:#91a9c8;font-size:12px;line-height:1.5}\n#out .d18-find-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 17px;border-top:1px dashed #5a6b843d;background:#18263b;min-height:65px}\n#out .d18-find-tags{display:flex;align-items:center;gap:7px;flex-wrap:wrap}\n#out .d18-find-tag{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:7px 12px;font-size:12px;font-weight:750;white-space:nowrap}\n#out .d18-find-tag::before{content:\"\";width:7px;height:7px;border-radius:50%;background:currentColor;display:inline-block}\n#out .d18-find-tag[data-kind=\"free\"]{color:#61e6b1;background:#063c32}\n#out .d18-find-tag[data-kind=\"plans\"]{color:#8bb2ff;background:#20355f}\n#out .d18-find-tag[data-kind=\"paid\"]{color:#e7b1ff;background:#40234f}\n#out .d18-find-tag[data-kind=\"trial\"]{color:#f9d38a;background:#49391d}\n#out .d18-find-tag[data-kind=\"unknown\"]{color:#c0cbe0;background:#344257}\n#out .d18-visit{display:inline-flex;align-items:center;gap:6px;flex-shrink:0;color:#f8fafc;font-size:13px;font-weight:750;text-decoration:none;padding:8px 0 8px 8px}\n#out .d18-visit:hover{color:#a8c3ff;text-decoration:underline}\n#out .d18-find-price-note{padding:0 18px 14px;color:#93a5bf;font-size:11px;line-height:1.5}\n#out .d18-find-empty{padding:28px 18px;text-align:center;color:#b6c2d6;border:1px dashed #687a96;border-radius:15px;background:#18243a}\n#out .d18-more-wrap{display:flex;justify-content:center;margin:20px 0 34px}\n#out .d18-more-button{border:1px solid #8f7aff;border-radius:999px;padding:12px 24px;background:linear-gradient(110deg,#725af5,#9a7bff);color:white;font-weight:800;cursor:pointer;box-shadow:0 7px 20px #765af544}\n#out .d18-more-button:hover{filter:brightness(1.08);transform:translateY(-1px)}\n@media(max-width:950px){#out .d18-find-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}\n@media(max-width:600px){#out .d18-find-grid{grid-template-columns:1fr}#out .d18-find-footer{align-items:flex-start;flex-direction:column}#out .d18-find-title h3{font-size:17px}}";
document.head.append(style);
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined&&text!==null)n.textContent=String(text);if(cls)n.className=cls;return n}
function parseJson(v){
 if(v&&typeof v==='object'&&!Array.isArray(v))return v;
 let raw=String(v||'').trim(),f=String.fromCharCode(96).repeat(3);
 if(raw.startsWith(f)){const i=raw.indexOf('\n');if(i>=0)raw=raw.slice(i+1);if(raw.endsWith(f))raw=raw.slice(0,-f.length).trim()}
 try{return JSON.parse(raw)}catch(_){}
 const a=raw.indexOf('{'),b=raw.lastIndexOf('}');
 if(a>=0&&b>a){try{return JSON.parse(raw.slice(a,b+1))}catch(_){}}
 const c=raw.indexOf('['),d=raw.lastIndexOf(']');
 if(c>=0&&d>c){try{return JSON.parse(raw.slice(c,d+1))}catch(_){}}
 return null
}
function pricing(t){
 const kind=String(t.pricingType||t.accessType||t.pricing||'').toUpperCase().replace(/[\s-]+/g,'_');
 const details=String(t.pricingDetails||t.price||t.pricing||'');
 if(kind.includes('FREE_ONLY')||/COMPLETELY_FREE|FREE_FOREVER/.test(kind))return{kind:'FREE_ONLY',label:'Free only',details:details||'Verify current terms.'};
 if(kind.includes('FREE_WITH_LIMITS')||kind.includes('LIMITED_FREE'))return{kind:'FREE_WITH_LIMITS',label:'Free with limits / credits',details:details||'Free usage may be limited.'};
 if(kind.includes('FREE_TRIAL')||kind.includes('TRIAL_THEN_PAID'))return{kind:'FREE_TRIAL_THEN_PAID',label:'Free trial, then paid',details:details||'A paid plan may be required after the trial.'};
 if(kind.includes('FREEMIUM')||kind.includes('LIMITED')||kind.includes('FREE_TIER'))return{kind:'FREEMIUM',label:'Free + paid plans',details:details||'A limited free plan and paid upgrades may be available.'};
 if(kind.includes('PAID_USAGE')||kind.includes('USAGE_BASED')||kind.includes('PAY_AS_YOU_GO'))return{kind:'PAID_USAGE',label:'Paid by usage',details:details||'Verify current usage rates.'};
 if(kind.includes('PAID_SUBSCRIPTION')||kind.includes('SUBSCRIPTION'))return{kind:'PAID_SUBSCRIPTION',label:'Paid subscription',details:details||'Verify current billing.'};
 if(/\bfree only\b|\bcompletely free\b|\bfree forever\b/i.test(details))return{kind:'FREE_ONLY',label:'Free only',details};
 if(/\bfree trial\b/i.test(details))return{kind:'FREE_TRIAL_THEN_PAID',label:'Free trial, then paid',details};
 if(/\bfreemium\b|\bfree plan\b|\bfree tier\b|\bcredits\b|\blimited free\b/i.test(details))return{kind:'FREEMIUM',label:'Free + paid plans',details};
 if(/\bpaid\b|\bsubscription\b|\bper month\b|\bmonthly\b/i.test(details))return{kind:'PAID_SUBSCRIPTION',label:'Paid / pricing varies',details};
 return{kind:'UNKNOWN',label:'Verify current pricing',details:details||'Check the official plan and credit limits before use.'}
}
function normTool(x,category){
 if(typeof x==='string')return{name:x,purpose:'Suggested tool for this task.',bestFor:'One part of the requested goal.',howToUse:'',pricingType:'',pricingDetails:'',hasFreePlan:null,monthlyPriceUsd:null,category:category||'Recommended tool',url:''};
 x=x||{};
 return{name:String(x.name||x.tool||x.title||'Recommended tool'),purpose:String(x.purpose||x.description||x.primaryUse||x.use||x.summary||'A useful tool for this task.'),bestFor:String(x.bestFor||x.why||''),howToUse:String(x.howToUse||''),pricingType:String(x.pricingType||x.accessType||x.pricing||''),pricingDetails:String(x.pricingDetails||x.price||x.pricing||''),hasFreePlan:typeof x.hasFreePlan==='boolean'?x.hasFreePlan:null,monthlyPriceUsd:typeof x.monthlyPriceUsd==='number'&&Number.isFinite(x.monthlyPriceUsd)?x.monthlyPriceUsd:null,category:String(x.category||category||''),url:String(x.url||x.website||x.officialUrl||x.link||'')}
}
function collectTools(data,mode){
 let arr=mode==='workflow'?(Array.isArray(data.recommendedTools)?data.recommendedTools:[]):(Array.isArray(data.tools)?data.tools:[]);
 if(!arr.length&&mode==='workflow'&&Array.isArray(data.steps)){
  arr=[];data.steps.forEach(s=>{if(Array.isArray(s.tools))arr.push(...s.tools);if(s.tool)arr.push(...String(s.tool).split(/[,;]\s*/))})
 }
 const seen=new Set();
 return arr.map(x=>normTool(x,data.category)).filter(t=>mode==='workflow'||/^https?:\/\//i.test(t.url)||Boolean(domainForTool(t))).filter(t=>{const k=t.name.trim().toLowerCase();if(!k||seen.has(k))return false;seen.add(k);return true}).slice(0,mode==='workflow'?15:24)
}
function budget(){const b=$('.opts .ch[data-g="b"].on');return b?b.textContent.trim().toLowerCase():'any price'}
function visibleTools(arr){
 const b=budget();
 if(b.includes('free only')){const a=arr.filter(t=>pricing(t).kind==='FREE_ONLY');return a.length?a:arr}
 if(b.includes('under $20')){const a=arr.filter(t=>['FREE_ONLY','FREE_WITH_LIMITS','FREE_TRIAL_THEN_PAID','FREEMIUM'].includes(pricing(t).kind)||/\$\s?(?:0|[1-9]|1\d)(?:\.\d+)?\s*(?:\/|per month|monthly)/i.test(pricing(t).details));return a.length?a:arr}
 return arr
}
function toolGrid(out,items,title){
 out.append(el('h3',title||('AI RADAR RESULTS · '+items.length+' TOOLS'),'d18-heading'));
 const list=visibleTools(items);
 if(!list.length){out.append(el('div','The AI provider returned no usable tools. Try a more specific goal.','d18-error'));return}
 const grid=el('div',null,'d18-tools-grid');
 list.forEach(t=>{
  const card=el('article',null,'d18-tool'),head=el('div',null,'d18-tool-head');
  head.append(el('div','✦','d18-tool-icon'),el('h3',t.name));card.append(head);
  if(t.category)card.append(el('span',t.category,'tg'));
  card.append(el('p',t.purpose));
  if(t.bestFor)card.append(el('p','Best for: '+t.bestFor));
  if(t.howToUse)card.append(el('p','How to use it: '+t.howToUse));
  const p=pricing(t),badge=el('span',p.label,'d18-price');badge.dataset.kind=p.kind;card.append(badge);
  if(p.details)card.append(el('p',p.details));
  if(/^https?:\/\//i.test(t.url)){const a=el('a','Official website ↗','d18-link');a.href=t.url;a.target='_blank';a.rel='noopener noreferrer';card.append(a)}
  grid.append(card)
 });
 out.append(grid);
 if(budget().includes('free only')&&!items.some(t=>pricing(t).kind==='FREE_ONLY'))out.append(el('p','No tools were confidently identified as completely free, so the closest matches are shown. Verify plans before signing up.','d18-summary'))
}
function findPricing(tool){
 const kind=String(tool.pricingType||'').toUpperCase().replace(/[\s-]+/g,'_'),details=String(tool.pricingDetails||'');
 let hasFree=tool.hasFreePlan;
 if(hasFree===null){
  if(kind==='FREE_ONLY'||kind==='FREE_WITH_LIMITS'||kind==='FREEMIUM'||kind.includes('FREE_TIER'))hasFree=true;
  else if(kind==='PAID_SUBSCRIPTION'||kind==='PAID_USAGE'||kind==='FREE_TRIAL_THEN_PAID')hasFree=false;
  else if(/\bfree plan\b|\bfree tier\b|\bfreemium\b|\bfree with limits\b|\blimited free\b/i.test(details))hasFree=true;
  else if(/\bpaid only\b|\bno free plan\b|\bsubscription required\b/i.test(details))hasFree=false;
 }
 let status='unknown',label='Pricing varies',plans=false;
 if(hasFree===true){status='free';label='Free';plans=kind!=='FREE_ONLY'&&(kind==='FREEMIUM'||kind==='FREE_WITH_LIMITS'||/\bpaid plans?\b|\bplans available\b|\bupgrade\b|\bpremium\b/i.test(details))}
 else if(kind==='FREE_TRIAL_THEN_PAID'){status='trial';label='Free trial';plans=true}
 else if(hasFree===false||kind.startsWith('PAID_')){status='paid';label='Paid'}
 else if(kind==='FREE_ONLY'){status='free';label='Free'}
 return{status:status,label:label,plans:plans,hasFree:hasFree,monthly:tool.monthlyPriceUsd,details:details};
}
function findMatchesBudget(tool){
 const selected=budget(),price=findPricing(tool);
 if(selected.includes('free only'))return price.hasFree===true;
 if(selected.includes('under $20'))return price.hasFree===true||(typeof price.monthly==='number'&&price.monthly>=0&&price.monthly<20);
 return true;
}
const brandDomains={'capcut':'capcut.com','davinci resolve':'blackmagicdesign.com','blackmagic design':'blackmagicdesign.com','adobe premiere pro':'adobe.com','premiere pro':'adobe.com','adobe photoshop':'adobe.com','canva':'canva.com','gimp':'gimp.org','final cut pro':'apple.com','descript':'descript.com','audacity':'audacityteam.org','shotcut':'shotcut.org','clipchamp':'clipchamp.com','veed':'veed.io','grammarly':'grammarly.com','chatgpt':'chatgpt.com','github copilot':'github.com','runway':'runwayml.com','invideo':'invideo.io','filmora':'filmora.wondershare.com','obs studio':'obsproject.com','kdenlive':'kdenlive.org','figma':'figma.com','notion':'notion.so','openai':'openai.com','gemini':'gemini.google.com','claude':'claude.ai','vegas pro':'vegascreativesoftware.com'};
function domainForTool(tool){
 const name=tool.name.toLowerCase().trim();
 for(const key of Object.keys(brandDomains))if(name===key||name.startsWith(key+' '))return brandDomains[key];
 try{const u=new URL(tool.url);if(u.protocol==='https:'||u.protocol==='http:')return u.hostname.replace(/^www\./,'')}catch(_){}
 return '';
}
function initials(name){return name.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'AI'}
function createBrandLogo(tool,domain){
 const wrap=document.createElement('span');wrap.className='d18-brand-logo';const fallback=initials(tool.name);wrap.textContent=fallback;
 if(domain){const img=document.createElement('img');img.alt=tool.name+' logo';img.loading='lazy';img.referrerPolicy='no-referrer';img.src='https://www.google.com/s2/favicons?domain='+encodeURIComponent(domain)+'&sz=128';img.addEventListener('load',()=>{if(img.naturalWidth>0)wrap.replaceChildren(img)});img.addEventListener('error',()=>{wrap.textContent=fallback},{once:true})}
 return wrap;
}
function makeFindCard(tool){
 const price=findPricing(tool),domain=domainForTool(tool),card=el('article',null,'d18-find-card');card.dataset.status=price.status;
 const main=el('div',null,'d18-find-main'),title=el('div',null,'d18-find-title');title.append(createBrandLogo(tool,domain),el('h3',tool.name));main.append(title,el('p',tool.purpose,'d18-find-description'));
 if(tool.bestFor)main.append(el('p','Best for: '+tool.bestFor,'d18-find-best'));
 card.append(main);
 const footer=el('div',null,'d18-find-footer'),tags=el('div',null,'d18-find-tags'),status=el('span',price.label,'d18-find-tag');status.dataset.kind=price.status;tags.append(status);
 if(price.plans){const plans=el('span','Plans available','d18-find-tag');plans.dataset.kind='plans';tags.append(plans)}
 footer.append(tags);
 const officialUrl=/^https?:\/\//i.test(tool.url)?tool.url:(domain?'https://'+domain:'');
 if(officialUrl){const link=el('a','Visit site ↗','d18-visit');link.href=officialUrl;link.target='_blank';link.rel='noopener noreferrer';footer.append(link)}
 card.append(footer);
 if(typeof price.monthly==='number'&&price.monthly>0)card.append(el('div','Starting price: USD '+price.monthly.toFixed(2).replace(/\.00$/,'')+' per month','d18-find-price-note'));
 else if(price.details&&!/verify current plan|verify current pricing/i.test(price.details))card.append(el('div',price.details,'d18-find-price-note'));
 return card;
}
function renderTools(data,resetPage=false){
 const out=document.querySelector('#out');if(resetPage)findVisibleCount=9;out.replaceChildren();
 const all=collectTools(data,'find'),filtered=all.filter(findMatchesBudget);
 out.append(el('h3','Recommended AI tools','d18-find-heading'));
 if(!filtered.length){
  const selected=budget();
  const msg=selected.includes('free only')?'No tools with a confirmed free plan matched this request. Choose Any price to see all recommendations.':selected.includes('under $20')?'No tools with a confirmed free plan or a known monthly price under 20 USD matched this request. Choose Any price to see all recommendations.':'No relevant tools were returned. Try a more specific request.';
  out.append(el('div',msg,'d18-find-empty'));return;
 }
 const shown=filtered.slice(0,findVisibleCount),grid=el('div',null,'d18-find-grid');shown.forEach(tool=>grid.append(makeFindCard(tool)));out.append(grid);
 if(filtered.length>9){const wrap=el('div',null,'d18-more-wrap'),more=shown.length<filtered.length,button=el('button',more?'View more tools ('+(filtered.length-shown.length)+' more)':'Show fewer tools','d18-more-button');button.type='button';button.dataset.radarMore=more?'more':'less';wrap.append(button);out.append(wrap)}
}
function renderWorkflow(data){
 const out=$('#out');out.replaceChildren();
 out.append(el('h3',data.title||'Your step-by-step workflow','d18-heading'));
 if(data.summary)out.append(el('p',data.summary,'d18-summary'));
 const steps=Array.isArray(data.steps)?data.steps.slice(0,10):(Array.isArray(data.workflow)?data.workflow.slice(0,10):[]);
 if(!steps.length){out.append(el('div','The AI provider did not return workflow steps. Please retry.','d18-error'));return}
 const grid=el('div',null,'d18-steps');
 steps.forEach((s,i)=>{
  const card=el('article',null,'d18-step');card.append(el('div',String(i+1),'d18-step-number'));card.append(el('h3',s.title||('Step '+(i+1))));
  card.append(el('p',s.action||s.description||s.details||'Complete this step and verify the outcome before moving on.'));
  if(s.deliverable)card.append(el('p','Outcome: '+s.deliverable));
  const items=Array.isArray(s.tools)?s.tools:(s.tool?[s.tool]:[]);
  if(items.length){const box=el('div',null,'d18-step-tools');box.append(el('b','TOOLS FOR THIS STEP'));items.slice(0,3).forEach(t=>box.append(el('span',normTool(t).name)));card.append(box)}
  grid.append(card)
 });
 out.append(grid);
 const tools=collectTools(data,'workflow');
 toolGrid(out,tools,'RECOMMENDED AI TOOLS FOR THIS WORKFLOW');
}
function fallback(reply,mode){
 const raw=String(reply||'').trim();if(!raw)return null;
 if(mode==='workflow'){
  const steps=raw.split(/\r?\n/).map(x=>x.trim()).filter(x=>/^(\d+[\).]|step\s+\d+|[-*•])\s*/i.test(x)).slice(0,10).map((x,i)=>({title:'Step '+(i+1),action:x.replace(/^(\d+[\).]|step\s+\d+|[-*•])\s*/i,''),tools:[]}));
  return steps.length?{title:'Your step-by-step workflow',summary:'The provider response was converted into readable steps.',steps:steps,recommendedTools:[]}:null
 }
 const tools=[],seen=new Set();
 raw.split(/\r?\n/).forEach(line=>{const x=line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/,'').replace(/\*\*/g,'').trim(),m=x.match(/^([^:|—–-]{2,60})\s*(?::|—|–|-|\|)\s*(.{8,})$/);if(!m||seen.has(m[1].toLowerCase()))return;seen.add(m[1].toLowerCase());tools.push({name:m[1].trim(),purpose:m[2].trim(),pricingDetails:'Verify current plan/pricing.',category:'Recommended tool'})});
 return tools.length?{tools:tools}:null
}
async function run(mode,prompt,sessionId){
 prompt=String(prompt||'').trim();if(!prompt){const f=mode==='workflow'?$('#wq'):$('#fq');if(f)f.focus();return}
 if(!token()){window.pending='radar';if(window.go)window.go('auth');return}
 lastMode=mode;lastPrompt=prompt;
 if(mode==='find')findVisibleCount=9;
 const out=$('#out');out.replaceChildren(el('div',mode==='workflow'?'Building your workflow and choosing useful tools…':'Finding relevant AI tools…','d18-loading'));
 const category=$('#cats .on'),budgetNode=$('.opts .ch[data-g="b"].on');
 try{
  const response=await fetch(base+'/api/ai/radar',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token()},body:JSON.stringify({prompt:prompt,mode:mode,category:category?category.textContent.trim():'',budget:budgetNode?budgetNode.textContent.trim():'Any price',sessionId:sessionId||null})});
  const raw=await response.text();let payload={};try{payload=raw?JSON.parse(raw):{}}catch(_){payload={reply:raw}}
  if(!response.ok)throw Error(payload.message||payload.error||('AI Radar request failed ('+response.status+').'));
  let data=parseJson(payload.data||payload.reply||payload.response||payload);
  if(!data)data=fallback(payload.reply||payload.response||'',mode);
  if(!data)throw Error('The AI provider returned an empty or invalid result. Please retry.');
  if(mode==='workflow'&&!Array.isArray(data.steps)&&Array.isArray(data.workflow))data.steps=data.workflow;
  lastResult=data;
  if(mode==='workflow')renderWorkflow(data);else renderTools(data,true);
  document.dispatchEvent(new Event('dataguard:radar-history-updated'));
 }catch(error){out.replaceChildren(el(error.message||'AI Radar could not complete this request.','d18-error'));document.dispatchEvent(new Event('dataguard:radar-history-updated'))}
}
async function openHistory(id){
 if(!id||!token())return;
 const out=$('#out');out.replaceChildren(el('div','Restoring your saved AI Radar session…','d18-loading'));
 try{
  const r=await fetch(base+'/api/ai/chat/history?sessionId='+encodeURIComponent(id),{headers:{Authorization:'Bearer '+token()}});
  const data=await r.json();if(!r.ok)throw Error(data.message||'Could not load this saved session.');
  const messages=Array.isArray(data.messages)?data.messages:[],u=[...messages].reverse().find(m=>m.role==='user'),a=[...messages].reverse().find(m=>m.role==='assistant');
  if(!a)throw Error('This session has no completed AI response.');
  const saved=parseJson(a.content);if(!saved)throw Error('The saved response is not structured. Generate a new Radar result.');
  lastPrompt=u?String(u.content||''):'';lastResult=saved;
  const mode=Array.isArray(saved.steps)||Array.isArray(saved.workflow)?'workflow':'find';lastMode=mode;
  if(mode==='workflow'){if(!Array.isArray(saved.steps)&&Array.isArray(saved.workflow))saved.steps=saved.workflow;renderWorkflow(saved);if($('#wq'))$('#wq').value=lastPrompt}
  else{renderTools(saved,true);if($('#fq'))$('#fq').value=lastPrompt}
  if($('#pf'))$('#pf').hidden=mode!=='find';if($('#pw'))$('#pw').hidden=mode!=='workflow';
  $$('.seg button[data-m]').forEach(b=>b.classList.toggle('on',b.dataset.m===mode||(mode==='workflow'&&b.dataset.m==='flow')))
 }catch(error){out.replaceChildren(el(error.message||'Could not restore this session.','d18-error'))}
}
function handleClick(event){
 const t=event.target instanceof Element?event.target:null;if(!t)return;
 const find=t.closest('#ff'),workflow=t.closest('#wf'),quick=t.closest('.pl2 button'),budgetButton=t.closest('.opts .ch[data-g="b"]');
 if(t.closest('[data-radar-more]')){event.preventDefault();event.stopImmediatePropagation();const button=t.closest('[data-radar-more]');findVisibleCount=button.dataset.radarMore==='more'?findVisibleCount+9:9;if(lastResult)renderTools(lastResult);return}
 if(find){event.preventDefault();event.stopImmediatePropagation();const c=$('#cats .on');run('find',($('#fq')&&$('#fq').value.trim())||(c?c.textContent.trim()+' tools':''));return}
 if(workflow){event.preventDefault();event.stopImmediatePropagation();run('workflow',$('#wq')?$('#wq').value.trim():'');return}
 if(quick){event.preventDefault();event.stopImmediatePropagation();const wf=$('#pw')&&!$('#pw').hidden,s=quick.dataset.x||quick.textContent.trim();run(wf?'workflow':'find',wf?s:(($('#fq')&&$('#fq').value.trim())?$('#fq').value.trim()+' '+s:s));return}
 if(budgetButton){event.preventDefault();event.stopImmediatePropagation();$$('.opts .ch[data-g="b"]').forEach(b=>b.classList.toggle('on',b===budgetButton));if(lastResult){if(lastMode==='workflow')renderWorkflow(lastResult);else renderTools(lastResult,true)}}
}
function handleKey(event){
 const t=event.target;if(!t||!['fq','wq'].includes(t.id)||event.key!=='Enter'||(t.id==='fq'&&event.shiftKey))return;
 event.preventDefault();event.stopImmediatePropagation();run(t.id==='wq'?'workflow':'find',t.value)
}
document.addEventListener('click',handleClick,true);
document.addEventListener('keydown',handleKey,true);
document.addEventListener('dataguard:open-radar-session',event=>{event.stopImmediatePropagation();openHistory(event.detail&&event.detail.sessionId)},true);
})();