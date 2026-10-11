import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import NavyVioletPrototype from './pages/NavyVioletPrototype';
import CodeCheck from './pages/CodeCheck';
import AIRadar from './pages/AIRadar';
import Diagnostics from './pages/Diagnostics';

function signedIn() {
  try { return Boolean(JSON.parse(localStorage.getItem('dataguard-auth') || '{}').token); }
  catch { return false; }
}
function Protected({ children }) {
  return signedIn() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return <BrowserRouter><Routes>
    <Route path="/" element={<NavyVioletPrototype initialPage="home" />} />
    <Route path="/login" element={<NavyVioletPrototype initialPage="login" />} />
    <Route path="/register" element={<NavyVioletPrototype initialPage="register" />} />
    <Route path="/dashboard" element={<Protected><CodeCheck /></Protected>} />
    <Route path="/code-check" element={<Protected><CodeCheck /></Protected>} />
    <Route path="/ai-radar" element={<Protected><AIRadar /></Protected>} />
    <Route path="/diagnostics" element={<Diagnostics />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></BrowserRouter>;
}
