import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Wifi, WifiOff } from 'lucide-react';
import Login from './pages/Login';
import POS from './pages/POS';

const API_URL = 'http://localhost:3005/api';

export default function App() {
  const [isOnline, setIsOnline] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/status`);
        const data = await res.json();
        setIsOnline(data.online);
      } catch (e) {
        setIsOnline(false);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-slate-900 text-white font-sans overflow-hidden flex flex-col">
        {/* Connectivity Banner */}
        <div className={`py-1.5 px-4 flex items-center justify-center gap-2 text-xs font-semibold tracking-wider uppercase transition-colors duration-500 ${isOnline ? 'bg-emerald-600/90 text-emerald-50' : 'bg-amber-500/90 text-amber-950'}`}>
          {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
          {isOnline ? 'Conectado a Vuttik Cloud' : 'Modo Offline - Guardando localmente'}
        </div>

        <div className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/login" element={<Login setSession={setSession} isOnline={isOnline} />} />
            <Route path="/pos" element={
              session ? <POS session={session} isOnline={isOnline} /> : <Navigate to="/login" />
            } />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}
