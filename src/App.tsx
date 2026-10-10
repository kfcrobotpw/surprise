import React, { useState, useEffect } from 'react';
import { ParticipantDrawView } from './components/ParticipantDrawView';
import { AdminDashboard } from './components/AdminDashboard';
import { Shield, Sparkles } from 'lucide-react';

export default function App() {
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();
    return (
      path === '/admin' ||
      path.startsWith('/admin/') ||
      hash === '#admin' ||
      search.includes('mode=admin')
    );
  });

  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      setIsAdminRoute(
        path === '/admin' ||
        path.startsWith('/admin/') ||
        hash === '#admin' ||
        search.includes('mode=admin')
      );
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    if (path.includes('admin')) {
      setIsAdminRoute(true);
    } else {
      setIsAdminRoute(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-black">
      {isAdminRoute ? (
        <AdminDashboard />
      ) : (
        <div className="relative min-h-screen flex flex-col justify-between">
          <ParticipantDrawView />

          {/* Discreet admin link for booth staff */}
          <div className="fixed bottom-3 right-3 z-30">
            <button
              onClick={() => navigateTo('/admin')}
              className="p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-slate-500 hover:text-cyan-400 shadow-lg backdrop-blur-md transition-all text-xs flex items-center gap-1.5 group"
              title="관리자 전용 화면 (/admin)"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden group-hover:inline text-[11px] font-semibold">관리자 모드</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
