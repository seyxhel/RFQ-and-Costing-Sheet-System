import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const handleToggleDark = () => {
    setIsDark((d) => {
      document.documentElement.classList.toggle('dark', !d);
      return !d;
    });
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-gray-950 transition-colors duration-200">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <div className={`fixed inset-y-0 left-0 z-50 transform lg:transform-none lg:block transition-transform duration-200 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <Sidebar currentPath={location.pathname} onNavigate={handleNavigate} onExpandChange={setIsSidebarExpanded} />
      </div>

      <div className={`flex flex-col min-h-screen transition-all duration-300 ${isSidebarExpanded ? 'lg:pl-64' : 'lg:pl-20'}`}>
        <TopNav isDark={isDark} onToggleDark={handleToggleDark} onMenuClick={() => setIsSidebarOpen(true)} onNavigate={handleNavigate} />
        <main className="flex-1 p-6 mt-16 overflow-x-hidden">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
