import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/common/Sidebar';
import { Header } from '../components/common/Header';
import { X } from 'lucide-react';

export const RootLayout: React.FC = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-navy-900 antialiased bg-earth-orbit">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0 h-full">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay & Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-navy-950/70 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Menu */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-navy-950 z-10 shadow-2xl">
            <div className="absolute top-2 right-2 pt-2 pr-2">
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 focus:outline-none focus:ring-2 focus:ring-cyanAccent-400"
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <Sidebar onCloseMobile={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Sticky Header */}
        <Header onToggleMobileSidebar={() => setMobileSidebarOpen(true)} />

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
