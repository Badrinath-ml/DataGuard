import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bot, Clock3, FileUp, LayoutDashboard, MessageSquare, Plus, Radar, Send, ShieldCheck, Trash2 } from 'lucide-react';
import { createChatSession, deleteChatSession, getChatHistory, getChatSessions, sendChatMessage } from '../lib/api';
import MarkdownMessage from '../components/MarkdownMessage.jsx';
import '../assistant-overhaul.css';

export default function AIAssistant() {
  const navigate = useNavigate();
  const [sessions,setSessions] = useState([]);
  const [active,setActive] = useState(null);
  const [messages,setMessages] = useState([]);
  const [input,setInput] = useState('');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [attachment,setAttachment] = useState(null);
  const [attachmentText,setAttachmentText] = useState('');
  const fileRef = useRef(null);
  const endRef = useRef(null);
  const refresh = async () => { try { const data=await getChatSessions(); setSessions(Array.isArray(data)?data:(data?.sessions||[])); } catch(e){setError(e.message||'Could not load chat history.');} };
  useEffect(()=>{refresh();},[]);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth',block:'end'});},[messages,busy]);
  async function openSession(s) { setActive(s); setError(''); try {const data=await getChatHistory(s.sessionId);setMessages(Array.isArray(data)?data:(data?.messages||[]));}catch(e){setError(e.message||'Could not load this conversation.');} }
  async function newChat(){setActive(null);setMessages([]);setInput('');setError('');}
  async function removeSession(s,e){e.stopPropagation();if(!window.confirm('Delete this conversation permanently?'))return;try{await deleteChatSession(s.sessionId);if(active?.sessionId===s.sessionId){setActive(null);setMessages([]);}await refresh();}catch(err){setError(err.message||'Could not delete conversation.');}}
  async function send(e){e.preventDefault();const text=input.trim();if((!text&&!attachmentText)||busy)return;const prompt=text||'Please review the attached file.';const outgoing=attachmentText?prompt+'\\n\\nAttached file: '+attachment.name+'\\n```\\n'+attachmentText+'\\n```':prompt;setInput('');setError('');setMessages(prev=>[...prev,{role:'user',content:attachment?prompt+' [Attached: '+attachment.name+']':prompt}]);setBusy(true);
    try{let session=active;if(!session){session=await createChatSession(text.slice(0,72)||'New conversation');setActive(session);}
      const result=await sendChatMessage(outgoing,session.sessionId);const answer=result?.reply||result?.answer||result?.response||result?.content||result?.message||'I could not generate a response. Please try again.';
      setMessages(prev=>[...prev,{role:'assistant',content:answer}]);setAttachment(null);setAttachmentText('');if(fileRef.current)fileRef.current.value='';await refresh();
    }catch(err){setError(err.message||'Message failed. Please try again.');}
    finally{setBusy(false);}
  }
  const userMessages=messages.filter(m=>m.role==='user').length;
  return <div className="dg-ai-page">
    <header className="dg-ai-page-header"><nav className="dg-ai-nav"><button onClick={()=>navigate('/dashboard')}><LayoutDashboard size={15}/> Dashboard</button><button className="selected" onClick={()=>navigate('/ai-assistant')}><Bot size={15}/> AI Assistant</button><button onClick={()=>navigate('/ai-radar')}><Radar size={15}/> AI Radar</button></nav><div className="dg-ai-brand"><span><Bot size={21}/></span><div><strong>DataGuard Assistant</strong><small>Your security and development copilot</small></div></div><button className="dg-ai-new" onClick={newChat}><Plus size={16}/> New chat</button></header>
    <section className="dg-ai-metrics"><article><span><MessageSquare size={17}/></span><div><small>Saved conversations</small><strong>{sessions.length}</strong></div></article><article><span><Clock3 size={17}/></span><div><small>Messages in this chat</small><strong>{messages.length}</strong></div></article><article><span><ShieldCheck size={17}/></span><div><small>Workspace</small><strong>Private chats</strong></div></article></section>
    <div className="dg-ai-layout"><aside className="dg-ai-sidebar"><div className="dg-ai-sidebar-title"><strong>Recent chats</strong><span>{sessions.length}</span></div>{sessions.length===0?<p className="dg-ai-empty-history">Your conversations will appear here.</p>:sessions.map(s=><div key={s.sessionId} className={'dg-ai-session '+(active?.sessionId===s.sessionId?'active':'')}><button onClick={()=>openSession(s)}><span>{s.title||'New conversation'}</span><small>{s.updatedAt?new Date(s.updatedAt).toLocaleDateString():''}</small></button><button className="dg-ai-delete" title="Delete conversation" aria-label={'Delete '+(s.title||'conversation')} onClick={e=>removeSession(s,e)}><Trash2 size={14}/></button></div>)}</aside>
      <main className="dg-ai-chat"><div className="dg-ai-chat-scroll">{messages.length===0?<div className="dg-ai-welcome"><span><Bot size={28}/></span><h1>What are we working on?</h1><p>Ask about a scan, understand a vulnerability, or get help improving your code.</p><div>{['Explain a security finding','Help me harden my API','Review a code snippet'].map(t=><button key={t} onClick={()=>setInput(t)}>{t}</button>)}</div></div>:messages.map((m,i)=><article key={i} className={'dg-ai-message '+(m.role==='user'?'user':'assistant')}><span className="dg-ai-message-avatar">{m.role==='user'?'You':<Bot size={16}/>}</span><div><small>{m.role==='user'?'You':'DataGuard Assistant'}</small><MarkdownMessage content={m.content}/></div></article>)}{busy&&<div className="dg-ai-thinking"><span/> Thinking through your question…</div>}<div ref={endRef}/></div>
      {error&&<div className="dg-ai-error" role="alert">{error}</div>}<form className="dg-ai-composer" onSubmit={send}><input ref={fileRef} type="file" accept=".txt,.md,.py,.js,.jsx,.ts,.tsx,.java,.json,.csv,.pdf" hidden onChange={async e=>{const file=e.target.files?.[0]||null;setAttachment(file);setAttachmentText('');if(!file)return;if(file.size>120000){setError('Please attach a text/code file smaller than 120 KB.');setAttachment(null);e.target.value='';return;}if(file.type==='application/pdf'||/\\.pdf$/i.test(file.name)){setError('PDF attachments are not supported yet. Attach a text or source-code file.');setAttachment(null);e.target.value='';return;}try{const text=await file.text();setAttachmentText(text);setError('');}catch{setError('Could not read this file. Try a plain-text or source-code file.');setAttachment(null);}}}/>{attachment&&<div className="dg-ai-attachment">{attachment.name}<button type="button" onClick={()=>{setAttachment(null);if(fileRef.current)fileRef.current.value='';}}>Remove</button></div>}<button type="button" className="dg-ai-attach" title="Attach a file" aria-label="Attach a file" onClick={()=>fileRef.current?.click()}><FileUp size={17}/></button><textarea value={input} onChange={e=>setInput(e.target.value)} rows={1} maxLength={6000} placeholder={attachment?"Ask about "+attachment.name+" (file attachment selected)":"Message DataGuard Assistant…"} aria-label="Message DataGuard Assistant" onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.currentTarget.form?.requestSubmit();}}}/><button type="submit" disabled={(!input.trim()&&!attachmentText)||busy} aria-label="Send message"><Send size={17}/></button><small>Enter to send · Shift + Enter for a new line</small></form></main></div>
  </div>;
}