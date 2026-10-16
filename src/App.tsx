import React, { useState, useEffect } from 'react';
import NativeCmsCrmPanel from './components/NativeCmsCrmPanel';
import { useCRM } from './hooks/useCMSandCRM';

export default function App() {
  const { leads } = useCRM();
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInPageDrawer, setShowInPageDrawer] = useState(false);

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return typeof window !== 'undefined' && localStorage.getItem('vb_admin_session') === 'true';
  });
  const [enteredPass, setEnteredPass] = useState('');
  const [errorMsg, setErrorMsg] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasPanelQuery = params.get('panel') === 'cms' || params.get('admin') === 'true';
    const hasHash = window.location.hash === '#admin-panel' || window.location.hash === '#cms';
    const isPathAdmin = window.location.pathname === '/admin' || window.location.pathname === '/admin.html';

    if (hasPanelQuery || hasHash || isPathAdmin) {
      setIsStandalone(true);
      document.title = "Native Real-Time CMS / CRM Engine | Velasquez Builders";
    }
  }, []);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPass.trim() === 'velasquez2026') {
      localStorage.setItem('vb_admin_session', 'true');
      setIsAuthenticated(true);
      setErrorMsg(false);
    } else {
      setErrorMsg(true);
    }
  };

  // 1. MODO PANTALLA COMPLETA INMERSIVA (100% Viewport Width & Height)
  if (isStandalone) {
    if (!isAuthenticated) {
      return (
        <div className="fixed inset-0 w-screen h-screen z-50 overflow-y-auto bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold font-serif text-white mb-2">Acceso de Administrador</h2>
            <p className="text-sm text-slate-400 mb-6">Ingresa la contraseña maestra para abrir el System Dashboard</p>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <input
                type="password"
                placeholder="Contraseña"
                value={enteredPass}
                onChange={(e) => { setEnteredPass(e.target.value); setErrorMsg(false); }}
                autoFocus
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
              />
              {errorMsg && (
                <p className="text-xs text-rose-400 font-semibold">Contraseña incorrecta. Inténtalo de nuevo.</p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { window.location.href = '/'; }}
                  className="w-1/2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
                >
                  Regresar al Sitio
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all shadow-md"
                >
                  Entrar →
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 w-screen h-screen z-50 overflow-y-auto bg-slate-950 text-slate-100 flex flex-col">
        <NativeCmsCrmPanel
          isFullScreen={true}
          onClose={() => {
            window.location.href = '/';
          }}
        />
      </div>
    );
  }

  // 2. MODO SITIO WEB REGULAR (Sin botones flotantes por requerimiento)
  return null;
}
