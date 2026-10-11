import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export default function NavyVioletPrototype({ initialPage = 'home' }) {
  const frame = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'DataGuard AI';
    if (typeof window !== 'undefined') window.DATAGUARD_API_URL = API_BASE;
    return () => { document.title = 'DataGuard AI'; };
  }, []);

  const handleLoad = useCallback(() => {
    const child = frame.current?.contentWindow;
    if (!child || typeof child.go !== 'function') return;
    const originalGo = child.go.bind(child);
    child.go = (page) => {
      if (page === 'check') { navigate('/code-check'); return; }
      if (page === 'radar') { navigate('/ai-radar'); return; }
      originalGo(page);
    };
    if (initialPage === 'login' || initialPage === 'register') {
      originalGo('auth');
      if (initialPage === 'register') child.document.getElementById('box')?.classList.add('act');
    } else {
      originalGo('home');
    }
  }, [initialPage, navigate]);

  return <main style={{ position: 'fixed', inset: 0, background: '#050816' }}>
    <iframe
      ref={frame}
      title="DataGuard AI original navy and violet website"
      src={`/dataguard-navy-violet.html?apiBase=${encodeURIComponent(API_BASE)}`}
      onLoad={handleLoad}
      style={{ display: 'block', width: '100%', height: '100%', border: 0 }}
      allow="clipboard-read; clipboard-write"
    />
  </main>;
}
