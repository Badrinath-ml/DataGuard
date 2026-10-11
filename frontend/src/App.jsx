import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import CodeCheck from './pages/CodeCheck';
import AIRadar from './pages/AIRadar';
function signedIn() { try { return Boolean(JSON.parse(localStorage.getItem('dataguard-auth') || '{}').token); } catch { return false; } }
function Protected({ children }) { return signedIn() ? children : <Navigate to="/login" replace />; }
export default function App() {
 return <BrowserRouter><Routes>
  <Route path="/" element={<Landing />} /><Route path="/login" element={<Login />} /><Route path="/register" element={<Register />} />
  <Route path="/dashboard" element={<Protected><CodeCheck /></Protected>} /><Route path="/code-check" element={<Protected><CodeCheck /></Protected>} />
  <Route path="/ai-radar" element={<Protected><AIRadar /></Protected>} /><Route path="*" element={<Navigate to="/" replace />} />
 </Routes></BrowserRouter>;
}