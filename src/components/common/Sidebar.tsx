import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquareCode,
  LineChart,
  MapPin,
  Settings,
  ShieldCheck,
  ChevronRight,
  Database,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { APP_CONFIG } from '../../utils/constants';

interface SidebarProps {
  onCloseMobile?: () => void;
}

interface NavItemConfig {
  name: string;
  to: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: 'cyan' | 'brand' | 'amber';
}

const NAV_ITEMS: NavItemConfig[] = [
  {
    name: 'Overview Dashboard',
    to: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'ClimateSphere AI Chat',
    to: '/chat',
    icon: MessageSquareCode,
    badge: 'AI Core',
    badgeColor: 'cyan',
  },
  {
    name: 'Climate Research',
    to: '/research',
    icon: LineChart,
  },
  {
    name: 'Monitoring Stations',
    to: '/stations',
    icon: MapPin,
  },
  {
    name: 'System & Integrations',
    to: '/settings',
    icon: Settings,
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  return (
    <aside className="w-64 h-full bg-navy-950 text-slate-300 flex flex-col justify-between border-r border-navy-800/80 select-none">
      {/* Top Branding Header */}
      <div>
        <div className="h-16 px-5 flex items-center gap-3 border-b border-navy-800/80">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyanAccent-500 to-brand-600 p-1.5 flex items-center justify-center shadow-cyanGlow">
            <img src="/src/assets/logo.svg" alt="ClimateSphere AI Logo" className="h-full w-full object-contain" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-white">
                ClimateSphere
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyanAccent-500/20 text-cyanAccent-300 font-semibold border border-cyanAccent-500/30">
                AI
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono tracking-wider">
              GLOBAL RESEARCH
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="px-3 py-4">
          <div className="px-3 pb-2 text-[10px] font-mono font-semibold tracking-wider text-slate-500 uppercase">
            Platform Modules
          </div>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150',
                      isActive
                        ? 'bg-navy-800 text-white shadow-inner border border-navy-700/60 font-semibold'
                        : 'text-slate-300 hover:bg-navy-900/80 hover:text-white'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3">
                        <Icon
                          className={cn(
                            'h-4 w-4 transition-colors',
                            isActive
                              ? 'text-cyanAccent-400'
                              : 'text-slate-400 group-hover:text-slate-200'
                          )}
                        />
                        <span>{item.name}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {item.badge && (
                          <span
                            className={cn(
                              'text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded',
                              isActive
                                ? 'bg-cyanAccent-400/20 text-cyanAccent-300 border border-cyanAccent-400/40'
                                : 'bg-navy-900 text-slate-400 border border-navy-800'
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                        {isActive && (
                          <ChevronRight className="h-3 w-3 text-cyanAccent-400" />
                        )}
                      </div>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer System Telemetry Status Box */}
      <div className="p-4 border-t border-navy-800/80 space-y-3">
        <div className="p-3 rounded-lg bg-navy-900/90 border border-navy-800 text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-cyanAccent-400" />
              API Gateway
            </span>
            <span className="h-2 w-2 rounded-full bg-cyanAccent-400 animate-pulse" />
          </div>
          <p className="text-[11px] text-slate-400 font-mono leading-tight">
            Status: Standby (Clean Placeholders Ready)
          </p>
          <div className="mt-2 pt-2 border-t border-navy-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Core v{APP_CONFIG.version}</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Secure
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
