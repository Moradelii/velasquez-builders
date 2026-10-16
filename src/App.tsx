import React, { useState, useEffect } from 'react';
import NativeCmsCrmPanel from './components/NativeCmsCrmPanel';
import { useCRM } from './hooks/useCMSandCRM';

export default function App() {
  const { leads } = useCRM();
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInPageDrawer, setShowInPageDrawer] = useState(false);

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

  // 1. MODO PANTALLA COMPLETA INMERSIVA (100% Viewport Width & Height)
  if (isStandalone) {
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
