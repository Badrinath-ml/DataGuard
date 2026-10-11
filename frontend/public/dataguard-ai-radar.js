(() => {
'use strict';
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const base=(window.DATAGUARD_API_URL||'').replace(/\/$/,'');
const token=()=>{try{return JSON.parse(localStorage.getItem('dataguard-auth')||'{}').token||''}catch(_){return''}};
let lastResult=null,lastMode='find',lastPrompt='',findVisibleCount=9,activeRadarSessionId=null,activeRadarTranscript=[];
const style=document.createElement('style');
style.textContent='#out .d18-tools-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin:22px 0;text-align:left}#out .d18-tool{min-width:0;overflow-wrap:anywhere;border:1px solid #a18aff77;border-radius:18px;padding:17px;background:linear-gradient(145deg,#8b6dff24,#ffffff07);backdrop-filter:blur(18px);transition:transform .18s,border-color .18s}#out .d18-tool:hover{transform:translateY(-3px);border-color:#b8a5ff}#out .d18-tool-head{display:flex;align-items:center;gap:10px;margin-bottom:10px}#out .d18-tool-icon{display:grid;place-items:center;flex:none;width:38px;height:38px;border-radius:12px;background:#8b6dff2d;font-size:19px}#out .d18-tool h3{font-size:15px;line-height:1.4;margin:0;overflow-wrap:anywhere}#out .d18-tool p{font-size:12.5px;line-height:1.65;color:var(--mu);margin:8px 0}#out .d18-price{display:inline-block;margin-top:8px;padding:5px 10px;border:1px solid #a18aff66;border-radius:999px;font-size:11px;font-weight:750;color:#c4b5fd;background:#8b6dff12}#out .d18-price[data-kind=\"FREE_ONLY\"]{color:#86efac;border-color:#86efac66}#out .d18-price[data-kind=\"PAID_SUBSCRIPTION\"],#out .d18-price[data-kind=\"PAID_USAGE\"]{color:#fca5a5;border-color:#fca5a566}#out .d18-link{display:inline-block;margin-top:10px;font-size:12px;color:#c4b5fd;text-decoration:underline}#out .d18-heading{margin:22px 0 8px;font-size:14px;letter-spacing:.06em;text-transform:uppercase;color:var(--mu);text-align:center}#out .d18-summary{max-width:850px;margin:0 auto 18px;text-align:center;color:var(--mu);font-size:13px;line-height:1.7}#out .d18-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px;margin:20px 0;position:relative}#out .d18-step{min-width:0;padding:16px;border:1px solid #a18aff88;border-radius:17px;background:linear-gradient(140deg,#8b6dff30,#ffffff08);backdrop-filter:blur(18px);overflow-wrap:anywhere}#out .d18-step-number{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:linear-gradient(120deg,#7058f6,#a78bfa);font-weight:800;color:white;margin-bottom:10px}#out .d18-step h3{font-size:14px;line-height:1.45;margin:0 0 9px}#out .d18-step p{font-size:12px;line-height:1.65;color:var(--mu);margin:7px 0}#out .d18-step-tools{border-top:1px solid #a18aff33;margin-top:12px;padding-top:9px}#out .d18-step-tools b{display:block;font-size:11px;margin-bottom:5px;color:#c4b5fd}#out .d18-step-tools span{display:inline-block;margin:3px 4px 0 0;border:1px solid #a18aff55;border-radius:999px;padding:4px 8px;font-size:10px;color:#ddd6fe}#out .d18-loading,#out .d18-error{margin:24px auto;padding:24px;border:1px dashed #a18aff55;border-radius:16px;color:#a5a9ce;text-align:center;line-height:1.7}@media(max-width:950px){#out .d18-tools-grid,#out .d18-steps{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){#out .d18-tools-grid,#out .d18-steps{grid-template-columns:1fr}}';
style.textContent += "#out .d18-find-heading{font-size:18px;font-weight:750;text-align:left;margin:25px 0 16px;color:#f5f3ff}\n#out .d18-find-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin:0 0 18px;text-align:left}\n#out .d18-find-card{display:flex;flex-direction:column;min-width:0;overflow:hidden;border:1px solid #52678a;border-radius:16px;background:#1c2b43;box-shadow:0 8px 20px #05081622;transition:transform .18s,border-color .18s}\n#out .d18-find-card:hover{transform:translateY(-3px);border-color:#8eaaff}\n#out .d18-find-card::before{content:\"\";display:block;height:6px;background:#8baaff}\n#out .d18-find-card[data-status=\"free\"]::before{background:#45d3a1}\n#out .d18-find-card[data-status=\"paid\"]::before{background:#d69af5}\n#out .d18-find-card[data-status=\"trial\"]::before{background:#f5c36b}\n#out .d18-find-main{padding:19px 18px 16px;flex:1}\n#out .d18-find-title{display:flex;align-items:center;gap:12px;margin-bottom:14px}\n#out .d18-brand-logo{width:48px;height:48px;flex:0 0 48px;border:2px solid #8eafff;border-radius:50%;display:grid;place-items:center;overflow:hidden;background:#15243b;color:#b9d0ff;font-size:14px;font-weight:800}\n#out .d18-find-card[data-status=\"free\"] .d18-brand-logo{border-color:#45d3a1;color:#45d3a1}\n#out .d18-find-card[data-status=\"paid\"] .d18-brand-logo{border-color:#d69af5;color:#e7b8ff}\n#out .d18-brand-logo img{width:27px;height:27px;object-fit:contain}\n#out .d18-find-title h3{margin:0;font-size:19px;line-height:1.35;color:#f8fafc;overflow-wrap:anywhere}\n#out .d18-find-description{margin:0;color:#b9c8de;font-size:14px;line-height:1.65}\n#out .d18-find-best{margin:10px 0 0;color:#91a9c8;font-size:12px;line-height:1.5}\n#out .d18-find-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 17px;border-top:1px dashed #5a6b843d;background:#18263b;min-height:65px}\n#out .d18-find-tags{display:flex;align-items:center;gap:7px;flex-wrap:wrap}\n#out .d18-find-tag{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:7px 12px;font-size:12px;font-weight:750;white-space:nowrap}\n#out .d18-find-tag::before{content:\"\";width:7px;height:7px;border-radius:50%;background:currentColor;display:inline-block}\n#out .d18-find-tag[data-kind=\"free\"]{color:#61e6b1;background:#063c32}\n#out .d18-find-tag[data-kind=\"plans\"]{color:#8bb2ff;background:#20355f}\n#out .d18-find-tag[data-kind=\"paid\"]{color:#e7b1ff;background:#40234f}\n#out .d18-find-tag[data-kind=\"trial\"]{color:#f9d38a;background:#49391d}\n#out .d18-find-tag[data-kind=\"unknown\"]{color:#c0cbe0;background:#344257}\n#out .d18-visit{display:inline-flex;align-items:center;gap:6px;flex-shrink:0;color:#f8fafc;font-size:13px;font-weight:750;text-decoration:none;padding:8px 0 8px 8px}\n#out .d18-visit:hover{color:#a8c3ff;text-decoration:underline}\n#out .d18-find-price-note{padding:0 18px 14px;color:#93a5bf;font-size:11px;line-height:1.5}\n#out .d18-find-empty{padding:28px 18px;text-align:center;color:#b6c2d6;border:1px dashed #687a96;border-radius:15px;background:#18243a}\n#out .d18-more-wrap{display:flex;justify-content:center;margin:20px 0 34px}\n#out .d18-more-button{border:1px solid #8f7aff;border-radius:999px;padding:12px 24px;background:linear-gradient(110deg,#725af5,#9a7bff);color:white;font-weight:800;cursor:pointer;box-shadow:0 7px 20px #765af544}\n#out .d18-more-button:hover{filter:brightness(1.08);transform:translateY(-1px)}\n@media(max-width:950px){#out .d18-find-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}\n@media(max-width:600px){#out .d18-find-grid{grid-template-columns:1fr}#out .d18-find-footer{align-items:flex-start;flex-direction:column}#out .d18-find-title h3{font-size:17px}}";
style.textContent += "#out .d18-flow-map{position:relative;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:46px 26px;padding:36px 16px 42px;margin:20px 0 32px;isolation:isolate;overflow:hidden;border:1px solid #7565de30;border-radius:22px;background:radial-gradient(circle at 50% 0%,#7c6aff14,transparent 62%),radial-gradient(#8b7cff22 1px,transparent 1px);background-size:auto,22px 22px}#out .d18-flow-links{position:absolute;inset:0;width:100%;height:100%;overflow:visible;z-index:0;pointer-events:none}#out .d18-flow-edge{fill:none;stroke:#a18aff;stroke-width:2.5;stroke-dasharray:3 8;stroke-linecap:round;filter:drop-shadow(0 0 5px #8b6dffb3);animation:d18-flow-dash 18s linear infinite}#out .d18-flow-node{position:relative;z-index:1;min-width:0;min-height:190px;padding:20px 18px 18px;border:1px solid #a18aff85;border-radius:20px;background:linear-gradient(145deg,#26224fef,#13152cf2);box-shadow:0 12px 30px #05081645,0 0 20px #8b6dff1c;backdrop-filter:blur(16px);animation:d18-float 5.4s ease-in-out infinite;overflow-wrap:anywhere}#out .d18-flow-node:nth-of-type(odd){animation-delay:-2.3s}#out .d18-flow-node-head{display:flex;align-items:center;gap:12px;margin-bottom:14px}#out .d18-flow-orb{display:grid;place-items:center;flex:0 0 48px;width:48px;height:48px;border:2px solid #55c9f1;border-radius:50%;color:#72d9ff;background:#153c57;box-shadow:0 0 20px #55c9f155;font-size:21px;font-weight:800}#out .d18-flow-node[data-step-index='1'] .d18-flow-orb,#out .d18-flow-node[data-step-index='4'] .d18-flow-orb{border-color:#f472b6;color:#f9a8d4;background:#492348;box-shadow:0 0 20px #f472b655}#out .d18-flow-node[data-step-index='2'] .d18-flow-orb,#out .d18-flow-node[data-step-index='5'] .d18-flow-orb{border-color:#a3e635;color:#bef264;background:#293e28;box-shadow:0 0 20px #a3e63555}#out .d18-flow-node h3{margin:0;color:#f5f3ff;font-size:17px;line-height:1.35;overflow-wrap:anywhere}#out .d18-flow-kicker{display:block;margin-bottom:5px;color:#aaa2e8;font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}#out .d18-flow-node p{margin:8px 0;color:#c4c7e7;font-size:12.5px;line-height:1.65}#out .d18-flow-deliverable{padding-top:9px;border-top:1px solid #a18aff28;color:#a7f3d0!important}#out .d18-flow-time{display:inline-block;margin:2px 0 8px;color:#b9b4ff;font-size:11px;font-weight:700}#out .d18-flow-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}#out .d18-flow-chip{padding:5px 9px;border:1px solid #8b7cff75;border-radius:999px;color:#e3ddff;background:#342b655e;font-size:10px;font-weight:650}#out .d18-workflow-tools-intro{margin:-4px 0 16px;color:var(--mu);font-size:13px;text-align:left}@keyframes d18-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}@keyframes d18-flow-dash{to{stroke-dashoffset:-180}}@media(max-width:850px){#out .d18-flow-map{gap:30px 14px;padding:24px 10px}#out .d18-flow-node{padding:15px 13px;min-height:180px}#out .d18-flow-node h3{font-size:14px}#out .d18-flow-orb{width:39px;height:39px;flex-basis:39px}}@media(max-width:600px){#out .d18-flow-map{grid-template-columns:1fr;padding:22px 14px;gap:18px}#out .d18-flow-node{min-height:0}#out .d18-flow-links{display:none}}";
style.textContent += "#out .d18-flow-goal{grid-column:auto;justify-self:stretch;width:auto;min-height:0;text-align:left;border-color:#a3e63588;background:linear-gradient(145deg,#253f38f2,#171a31f5)}#out .d18-flow-start .d18-flow-orb{border-color:#a78bfa;color:#c4b5fd;background:#30275b;box-shadow:0 0 20px #a78bfa55}#out .d18-flow-goal .d18-flow-orb{border-color:#a3e635;color:#bef264;background:#293e28}";
style.textContent+="#out .d18-history-thread{margin:0 0 22px;padding:16px;border:1px solid #a18aff44;border-radius:16px;background:#1113298c}#out .d18-history-thread h3{margin:0 0 12px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--mu)}#out .d18-history-turn{padding:10px 12px;margin:8px 0;border-radius:12px;background:#ffffff08;border:1px solid #ffffff0b}#out .d18-history-turn[data-role=user]{margin-left:8%;background:#332b664d;border-color:#a18aff2b}#out .d18-history-turn b{display:block;margin-bottom:5px;color:#c4b5fd;font-size:11px}#out .d18-history-turn p{margin:0;color:var(--mu);font-size:12px;line-height:1.6;overflow-wrap:anywhere}body[data-mode=light] #out .d18-find-card{background:#fff;border-color:#d2d9e8;box-shadow:0 8px 20px #20234410}body[data-mode=light] #out .d18-find-title h3{color:#17203b}body[data-mode=light] #out .d18-find-description{color:#465675}body[data-mode=light] #out .d18-find-best,body[data-mode=light] #out .d18-find-price-note{color:#65718a}body[data-mode=light] #out .d18-find-footer{background:#f1f4fa;border-color:#d9e0ec}body[data-mode=light] #out .d18-find-empty{background:#fff;color:#465675;border-color:#c7d0e3}body[data-mode=light] #out .d18-flow-map{background-color:#f7f8ff;border-color:#d5d9f4}body[data-mode=light] #out .d18-flow-node{background:linear-gradient(145deg,#ffffffef,#f0effff5);border-color:#c9c3f5;box-shadow:0 12px 30px #20234410}body[data-mode=light] #out .d18-flow-node h3{color:#202344}body[data-mode=light] #out .d18-flow-node p{color:#465675}body[data-mode=light] #out .d18-flow-kicker,body[data-mode=light] #out .d18-flow-time{color:#6d5ef5}body[data-mode=light] #out .d18-flow-chip{color:#473b99;background:#f0edff;border-color:#c9c0ff}body[data-mode=light] #out .d18-summary,body[data-mode=light] #out .d18-workflow-tools-intro{color:#5b6682}body[data-mode=light] #out .d18-history-thread{background:#ffffffbd;border-color:#d9dcef}body[data-mode=light] #out .d18-history-turn{background:#f6f7fc;border-color:#e0e3ef}body[data-mode=light] #out .d18-history-turn[data-role=user]{background:#efedff;border-color:#ddd7ff}body[data-mode=light] #out .d18-history-turn b{color:#5545b9}body[data-mode=light] #out .d18-history-turn p{color:#465675}";
document.head.append(style);
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined&&text!==null)n.textContent=String(text);if(cls)n.className=cls;return n}
function parseJson(v){
 if(Array.isArray(v))return{tools:v};
 if(v&&typeof v==='object')return v;
 let raw=String(v||'').trim(),f=String.fromCharCode(96).repeat(3);
 if(raw.startsWith(f)){const i=raw.indexOf('\n');if(i>=0)raw=raw.slice(i+1);if(raw.endsWith(f))raw=raw.slice(0,-f.length).trim()}
 const normalize=value=>Array.isArray(value)?{tools:value}:value;
 try{return normalize(JSON.parse(raw))}catch(_){}
 const a=raw.indexOf('{'),b=raw.lastIndexOf('}');
 if(a>=0&&b>a){try{return normalize(JSON.parse(raw.slice(a,b+1)))}catch(_){}}
 const c=raw.indexOf('['),d=raw.lastIndexOf(']');
 if(c>=0&&d>c){try{return normalize(JSON.parse(raw.slice(c,d+1)))}catch(_){}}
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
 if(Array.isArray(data))data={tools:data};
 data=data&&typeof data==='object'?data:{};
 const candidates=mode==='workflow'
  ?[data.recommendedTools,data.tools,data.results,data.recommendations]
  :[data.tools,data.recommendedTools,data.results,data.recommendations,data.items,data.aiTools,data.toolRecommendations,data.products];
 let arr=candidates.find(Array.isArray)||[];
 if(!arr.length&&data.data&&typeof data.data==='object'){
  const nested=data.data;
  arr=[nested.tools,nested.recommendedTools,nested.results,nested.recommendations,nested.items].find(Array.isArray)||[];
 }
 if(!arr.length&&mode==='workflow'&&Array.isArray(data.steps)){
  arr=[];data.steps.forEach(step=>{if(Array.isArray(step.tools))arr.push(...step.tools);if(step.tool)arr.push(...String(step.tool).split(/[,;]\\s*/))})
 }
 const seen=new Set();
 return arr.map(x=>normTool(x,data.category)).filter(t=>t.name&&t.name.trim()&&looksLikeProductName(t.name)).filter(t=>{
  const k=t.name.trim().toLowerCase();if(seen.has(k))return false;seen.add(k);return true
 }).slice(0,mode==='workflow'?15:24)
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
 out.append(el('p','Each card represents one real AI tool, with its logo, description, pricing, and official website when available.','d18-workflow-tools-intro'));
 const list=items.filter(findMatchesBudget);
 if(!list.length){const selected=budget();const msg=selected.includes('free only')?'No workflow tools with a confirmed free plan were returned. Choose Any price to see all recommended tools.':'The AI response did not include a usable list of named products. Retry the workflow; if it repeats, check the backend AI provider response.';out.append(el('div',msg,'d18-find-empty'));return}
 const grid=el('div',null,'d18-find-grid');
 list.forEach(t=>grid.append(makeFindCard(t)));
 out.append(grid)
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
const brandDomains={'runway':'runwayml.com','runway ai':'runwayml.com','pika':'pika.art','pika labs':'pika.art','kling ai':'klingai.com','kling':'klingai.com','luma ai':'lumalabs.ai','luma dream machine':'lumalabs.ai','synthesia':'synthesia.io','heygen':'heygen.com','invideo ai':'invideo.io','kaiber':'kaiber.ai','pictory':'pictory.ai','lumen5':'lumen5.com','hailuo ai':'hailuoai.video','pixverse':'pixverse.ai','leonardo ai':'leonardo.ai','adobe firefly':'adobe.com','sora':'openai.com','veo':'deepmind.google','midjourney':'midjourney.com','capcut':'capcut.com','davinci resolve':'blackmagicdesign.com','blackmagic design':'blackmagicdesign.com','adobe premiere pro':'adobe.com','premiere pro':'adobe.com','adobe photoshop':'adobe.com','canva':'canva.com','gimp':'gimp.org','final cut pro':'apple.com','descript':'descript.com','audacity':'audacityteam.org','shotcut':'shotcut.org','clipchamp':'clipchamp.com','veed':'veed.io','grammarly':'grammarly.com','chatgpt':'chatgpt.com','github copilot':'github.com','runway':'runwayml.com','invideo':'invideo.io','filmora':'filmora.wondershare.com','obs studio':'obsproject.com','kdenlive':'kdenlive.org','figma':'figma.com','notion':'notion.so','openai':'openai.com','gemini':'gemini.google.com','claude':'claude.ai','vegas pro':'vegascreativesoftware.com'};
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
  const msg=selected.includes('free only')?'The AI returned no tools with a confirmed free plan. Choose Any price to inspect the recommendations, or try again.':selected.includes('under $20')?'No returned tools have a confirmed free plan or a known monthly price under USD 20. Choose Any price to inspect all recommendations.':'The AI response did not contain a recognizable list of tools. This is a response-format issue, not a price-filter match. Try again; if it repeats, check the backend AI provider logs.';
  out.append(el('div',msg,'d18-find-empty'));return;
 }
 const shown=filtered.slice(0,findVisibleCount),grid=el('div',null,'d18-find-grid');shown.forEach(tool=>grid.append(makeFindCard(tool)));out.append(grid);
 if(filtered.length>9){const wrap=el('div',null,'d18-more-wrap'),more=shown.length<filtered.length,button=el('button',more?'View more tools ('+(filtered.length-shown.length)+' more)':'Show fewer tools','d18-more-button');button.type='button';button.dataset.radarMore=more?'more':'less';wrap.append(button);out.append(wrap)}
}
function plainText(value){return String(value||'').replace(/\*\*/g,'').replace(/__(.*?)__/g,'$1').replace(/^\s*(?:[-*•]|\d+[.)])\s*/,'').replace(/\s+/g,' ').trim()}
function stepIcon(index){return ['◎','⌕','✎','◇','⚑','↗','✓','✦'][index%8]}
function drawWorkflowEdges(map){
 const svg=map.querySelector('.d18-flow-links');if(!svg)return;
 const nodes=Array.from(map.querySelectorAll('.d18-flow-node')),width=map.clientWidth,height=map.clientHeight;
 svg.setAttribute('viewBox','0 0 '+width+' '+height);svg.replaceChildren();
 if(window.matchMedia('(max-width: 600px)').matches)return;
 const ns='http://www.w3.org/2000/svg',rect=map.getBoundingClientRect();
 nodes.forEach((node,index)=>{if(index>=nodes.length-1)return;const a=node.getBoundingClientRect(),b=nodes[index+1].getBoundingClientRect();const x1=a.left+a.width/2-rect.left,y1=a.top+a.height/2-rect.top,x2=b.left+b.width/2-rect.left,y2=b.top+b.height/2-rect.top,mid=(y1+y2)/2,dx=x2-x1;const p=document.createElementNS(ns,'path');p.setAttribute('class','d18-flow-edge');p.setAttribute('d',Math.abs(y2-y1)<8?'M '+x1+' '+y1+' C '+(x1+dx*.35)+' '+(y1-22)+', '+(x1+dx*.65)+' '+(y2-22)+', '+x2+' '+y2:'M '+x1+' '+y1+' C '+(x1+dx*.16)+' '+mid+', '+(x2-dx*.16)+' '+mid+', '+x2+' '+y2);svg.append(p)})
}
function renderWorkflow(data){
 const out=$('#out');out.replaceChildren();out.append(el('h3',plainText(data.title)||'Your connected workflow','d18-heading'));
 if(data.summary)out.append(el('p',plainText(data.summary),'d18-summary'));
 const raw=Array.isArray(data.steps)?data.steps:(Array.isArray(data.workflow)?data.workflow:[]);
 const steps=raw.map((s,i)=>{if(typeof s==='string')s={action:s};s=s&&typeof s==='object'?s:{};let action=plainText(s.action||s.description||s.details||s.instruction||s.purpose||''),title=plainText(s.title||s.name||'');if(!title||/^step\s*\d+$/i.test(title)){const first=action.split(/[:.!?]/)[0].trim(),words=first.split(/\s+/);title=words.slice(0,Math.min(6,words.length)).join(' ').replace(/[,;]+$/,'')||('Step '+(i+1))}if(!action&&s.deliverable)action=plainText(s.deliverable);return Object.assign({},s,{title:title,action:action})}).filter(x=>x.action.length>=12&&!/^[-—–_*]+$/.test(x.action));
 if(!steps.length){out.append(el('div','The AI provider did not return complete workflow steps. Please retry.','d18-error'));return}
 const map=el('div',null,'d18-flow-map'),svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','d18-flow-links');svg.setAttribute('aria-hidden','true');map.append(svg);
 const goalText=plainText(data.goal||data.outcome||(steps.length&&steps[steps.length-1].deliverable)||data.summary||'Complete the goal and review the results.');
 const flowItems=[{kind:'start',title:'Start',action:plainText(lastPrompt||data.goal||'Your goal')},...steps.map(step=>Object.assign({kind:'step'},step)),{kind:'goal',title:'Goal',action:goalText}];
 flowItems.forEach((step,i)=>{
  const row=Math.floor(i/3),pos=i%3,col=row%2===0?pos:2-pos,node=el('article',null,'d18-flow-node');node.dataset.stepIndex=String(i);node.style.gridColumn=String(col+1);
  if(step.kind==='start')node.classList.add('d18-flow-start');if(step.kind==='goal')node.classList.add('d18-flow-goal');
  const head=el('div',null,'d18-flow-node-head'),orb=el('div',step.kind==='start'?'◎':step.kind==='goal'?'⚑':stepIcon(i),'d18-flow-orb'),title=el('div',null,'d18-flow-title-box');
  const kicker=step.kind==='start'?'START':step.kind==='goal'?'FINISH':'PHASE '+String(i).padStart(2,'0');title.append(el('span',kicker,'d18-flow-kicker'),el('h3',step.title||('Step '+i)));head.append(orb,title);node.append(head,el('p',step.action));
  if(step.timeEstimate)node.append(el('span',plainText(step.timeEstimate),'d18-flow-time'));
  if(step.kind==='step'&&step.deliverable)node.append(el('p','Outcome: '+plainText(step.deliverable),'d18-flow-deliverable'));
  const tools=Array.isArray(step.tools)?step.tools:(step.tool?[step.tool]:[]);if(step.kind==='step'&&tools.length){const chips=el('div',null,'d18-flow-chips');tools.slice(0,3).forEach(t=>chips.append(el('span',normTool(t).name,'d18-flow-chip')));node.append(chips)}
  map.append(node)
 }); out.append(map);toolGrid(out,collectTools(data,'workflow'),'Recommended AI tools for this workflow');
 const redraw=()=>drawWorkflowEdges(map);if(typeof requestAnimationFrame==='function')requestAnimationFrame(redraw);else redraw();if(!map.dataset.resizeBound){map.dataset.resizeBound='1';window.addEventListener('resize',redraw,{passive:true})}
}
function looksLikeProductName(value){
 const name=String(value||'').trim();if(name.length<2||name.length>64)return false;
 if(/^(purpose|features?|pros? and cons?|workflow|step\\s*\\d+|tools?|ai tools?|recommended tools?|recommended ai tools|tool recommendations?|conclusion|summary|research|pricing|comparison|product recommendations?)$/i.test(name))return false;
 if(/^(?:ai )?tools? for .+$/i.test(name))return false;
 if(/\\b(vs\\.?|versus|compare|comparison|length\\s*(?:&|and)\\s*style|human[- ]like presenters?|narrated(?:/| or )presenter[- ]style videos?|presenter[- ]style videos?|automation\\s*(?:&|and|vs\\.?|versus)\\s*manual control|project management software|document editors?|whiteboarding tools?|pricing comparison|top tools|best tools|tool categories|bulk personalization|commercial licensing|data privacy|gpu requirements?|full control|resolution\\s*(?:&|and)\\s*export limits?|turn existing text|subscription|workflow phase)\\b/i.test(name))return false;
 if(name.split(/\\s+/).length>7)return false;
 return true
}
function fallback(reply,mode){
 const raw=String(reply||'').trim();if(!raw)return null;
 if(mode==='workflow'){
  const lines=raw.split(/\r?\n/).map(x=>plainText(x)).filter(Boolean);
  const candidates=lines.filter(x=>/^(\d+[\).]|step\s+\d+|[-*•])\s*/i.test(x)).map(x=>x.replace(/^(\d+[\).]|step\s+\d+|[-*•])\s*/i,'').trim()).filter(x=>x.length>=12&&!/^[-—–_*]+$/.test(x));
  const steps=candidates.slice(0,8).map((action,i)=>{const m=action.match(/^([^:.!?]{4,55})[:.!?]?\s+(.*)$/);const split=m&&m[2]&&m[1].split(/\s+/).length<=7;return{title:split?m[1].trim():'Step '+(i+1),action:split?m[2].trim():action,tools:[]}});
  return steps.length?{title:'Your connected workflow',summary:'A structured workflow was recovered from the provider response. Review each step before proceeding.',steps:steps,recommendedTools:[]}:null
 }
 const tools=[],seen=new Set();
 raw.split(/\r?\n/).forEach(line=>{const x=plainText(line),m=x.match(/^([^:|—–-]{2,60})\s*(?::|—|–|-|\|)\s*(.{8,})$/);if(!m||seen.has(m[1].toLowerCase())||!looksLikeProductName(m[1]))return;seen.add(m[1].toLowerCase());tools.push({name:m[1].trim(),purpose:m[2].trim(),pricingDetails:'Verify current plan/pricing.',category:'Recommended tool'})});
 return tools.length?{tools:tools}:null
}
function hasRadarContent(data,mode){if(!data||typeof data!=='object')return false;if(mode==='workflow')return Array.isArray(data.steps)||Array.isArray(data.workflow);return ['tools','recommendedTools','results','recommendations','items','aiTools','toolRecommendations','products'].some(k=>Array.isArray(data[k]))}
function unwrapRadarData(value,mode,depth){
 if(depth>4||value==null)return null;
 const parsed=typeof value==='string'?parseJson(value):value;if(!parsed)return null;
 if(Array.isArray(parsed))return mode==='workflow'?null:{tools:parsed};
 if(typeof parsed!=='object')return null;
 if(hasRadarContent(parsed,mode))return parsed;
 for(const key of ['data','result','output','response','structured','content','payload']){if(parsed[key]!=null){const found=unwrapRadarData(parsed[key],mode,depth+1);if(found)return found}}
 return null
}
function setActiveRadarSession(id){activeRadarSessionId=id||null}
function historySummary(content){
 const saved=parseJson(content);if(!saved)return plainText(content).slice(0,420);
 if(saved.error)return String(saved.message||'The AI provider did not complete this request.');
 const mode=saved.radarMode||(Array.isArray(saved.steps)||Array.isArray(saved.workflow)?'workflow':'find');
 if(mode==='workflow'){const steps=Array.isArray(saved.steps)?saved.steps:(Array.isArray(saved.workflow)?saved.workflow:[]);return plainText(saved.title||'Workflow')+(steps.length?': '+steps.slice(0,5).map(s=>plainText(typeof s==='string'?s:(s.title||s.action||s.description||''))).filter(Boolean).join(' → '):'')}
 const tools=collectTools(saved,'find');return tools.length?'Recommended tools: '+tools.slice(0,8).map(t=>t.name).join(', '):'No structured tool list was saved for this response.';
}
function prependConversationHistory(out,messages){
 const prior=(messages||[]).slice(0,Math.max(0,(messages||[]).length-2));if(!prior.length)return;
 const thread=el('section',null,'d18-history-thread');thread.append(el('h3','Earlier messages in this Radar session'));
 prior.forEach(message=>{const row=el('div',null,'d18-history-turn');row.dataset.role=message.role==='user'?'user':'assistant';row.append(el('b',message.role==='user'?'YOU':'AI RADAR'));row.append(el('p',message.role==='user'?String(message.content||''):historySummary(message.content)));thread.append(row)});
 out.prepend(thread)
}
async function loadActiveRadarHistory(){
 if(!activeRadarSessionId||!token())return;
 try{const r=await fetch(base+'/api/ai/chat/history?sessionId='+encodeURIComponent(activeRadarSessionId),{headers:{Authorization:'Bearer '+token()}});const data=await r.json();if(r.ok&&Array.isArray(data.messages))activeRadarTranscript=data.messages}catch(_){}
}
async function run(mode,prompt,sessionId){
 prompt=String(prompt||'').trim();if(!prompt){const f=mode==='workflow'?$('#wq'):$('#fq');if(f)f.focus();return}
 if(!token()){window.pending='radar';if(window.go)window.go('auth');return}
 lastMode=mode;lastPrompt=prompt;
 if(mode==='find')findVisibleCount=9;
 const out=$('#out');out.replaceChildren(el('div',mode==='workflow'?'Building your workflow and choosing useful tools…':'Finding relevant AI tools…','d18-loading'));
 const category=$('#cats .on'),budgetNode=$('.opts .ch[data-g="b"].on');let responseSessionId=null;
 try{
  const response=await fetch(base+'/api/ai/radar',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token()},body:JSON.stringify({prompt:prompt,mode:mode,category:category?category.textContent.trim():'',budget:budgetNode?budgetNode.textContent.trim():'Any price',sessionId:sessionId||activeRadarSessionId||null})});
  const raw=await response.text();let payload={};try{payload=raw?JSON.parse(raw):{}}catch(_){payload={message:raw}};
  responseSessionId=payload.sessionId||null;if(responseSessionId)setActiveRadarSession(responseSessionId);
  if(!response.ok){document.dispatchEvent(new Event('dataguard:radar-history-updated'));throw Error(payload.message||payload.error||('AI Radar request failed ('+response.status+').'))}
  let data=unwrapRadarData(payload.data,mode,0)||unwrapRadarData(payload.reply,mode,0)||unwrapRadarData(payload.response,mode,0)||unwrapRadarData(payload.output,mode,0)||unwrapRadarData(payload,mode,0);
  if(!data)data=fallback(payload.reply||payload.response||'',mode);
  if(!data)throw Error('The AI provider returned an empty or invalid result. Please retry.');
  if(mode==='workflow'&&!Array.isArray(data.steps)&&Array.isArray(data.workflow))data.steps=data.workflow;
  data.radarMode=mode;lastResult=data;
  activeRadarTranscript.push({role:'user',content:prompt},{role:'assistant',content:payload.reply||JSON.stringify(data)});
  if(mode==='workflow')renderWorkflow(data);else renderTools(data,true);
  prependConversationHistory(out,activeRadarTranscript);
  document.dispatchEvent(new Event('dataguard:radar-history-updated'));
 }catch(error){
  if(responseSessionId)setActiveRadarSession(responseSessionId);
  await loadActiveRadarHistory();
  out.replaceChildren(el(error.message||'AI Radar could not complete this request.','d18-error'));
  if(activeRadarTranscript.length>2)prependConversationHistory(out,activeRadarTranscript);
  document.dispatchEvent(new Event('dataguard:radar-history-updated'))
 }
}
async function openHistory(id){
 if(!id||!token())return;
 const out=$('#out');out.replaceChildren(el('div','Restoring your saved AI Radar session…','d18-loading'));
 try{
  const r=await fetch(base+'/api/ai/chat/history?sessionId='+encodeURIComponent(id),{headers:{Authorization:'Bearer '+token()}});
  const data=await r.json();if(!r.ok)throw Error(data.message||'Could not load this saved session.');
  const messages=Array.isArray(data.messages)?data.messages:[];if(!messages.length)throw Error('This Radar session has no saved messages.');
  setActiveRadarSession(id);activeRadarTranscript=messages;
  const u=[...messages].reverse().find(m=>m.role==='user'),a=[...messages].reverse().find(m=>m.role==='assistant');
  lastPrompt=u?String(u.content||''):'';if($('#fq'))$('#fq').value=lastPrompt;if($('#wq'))$('#wq').value=lastPrompt;
  const saved=a?parseJson(a.content):null;
  if(saved&&saved.error){out.replaceChildren(el(saved.message||'This Radar request did not complete. You can retry it using the prompt above.','d18-error'));prependConversationHistory(out,messages);return}
  if(!saved)throw Error('The saved AI response is not structured. Start a new request to regenerate it.');
  const mode=saved.radarMode||((Array.isArray(saved.steps)||Array.isArray(saved.workflow))?'workflow':'find');lastMode=mode;lastResult=saved;
  if(mode==='workflow'){if(!Array.isArray(saved.steps)&&Array.isArray(saved.workflow))saved.steps=saved.workflow;renderWorkflow(saved)}else renderTools(saved,true);
  prependConversationHistory(out,messages);
  if($('#pf'))$('#pf').hidden=mode!=='find';if($('#pw'))$('#pw').hidden=mode!=='workflow';
  $$('.seg button[data-m]').forEach(b=>b.classList.toggle('on',b.dataset.m===mode||(mode==='workflow'&&b.dataset.m==='flow')))
 }catch(error){out.replaceChildren(el(error.message||'Could not restore this session.','d18-error'))}
}
function handleClick(event){
 const t=event.target instanceof Element?event.target:null;if(!t)return;
 const find=t.closest('#ff'),workflow=t.closest('#wf'),quick=t.closest('.pl2 button'),workflowQuick=t.closest('#sgs .ch'),budgetButton=t.closest('.opts .ch[data-g="b"]');
 if(t.closest('[data-radar-more]')){event.preventDefault();event.stopImmediatePropagation();const button=t.closest('[data-radar-more]');findVisibleCount=button.dataset.radarMore==='more'?findVisibleCount+9:9;if(lastResult)renderTools(lastResult);return}
 if(find){event.preventDefault();event.stopImmediatePropagation();const c=$('#cats .on');run('find',($('#fq')&&$('#fq').value.trim())||(c?c.textContent.trim()+' tools':''));return}
 if(workflow){event.preventDefault();event.stopImmediatePropagation();run('workflow',$('#wq')?$('#wq').value.trim():'');return}
 if(workflowQuick){event.preventDefault();event.stopImmediatePropagation();const prompt=workflowQuick.textContent.trim();if($('#wq'))$('#wq').value=prompt;run('workflow',prompt);return}
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
document.addEventListener('dataguard:radar-new-session',()=>{setActiveRadarSession(null);activeRadarTranscript=[];lastResult=null;lastPrompt='';lastMode='find';if($('#fq'))$('#fq').value='';if($('#wq'))$('#wq').value='';if($('#out'))$('#out').replaceChildren();if($('#fq'))$('#fq').focus();document.dispatchEvent(new Event('dataguard:radar-history-updated'))});
document.addEventListener('dataguard:radar-signed-out',()=>{setActiveRadarSession(null);activeRadarTranscript=[];lastResult=null;lastPrompt='';if($('#out'))$('#out').replaceChildren()});
})();