import React, { useState } from 'react';
import { Bell, Sun, Moon, Menu, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface TopNavProps {
  isDark: boolean;
  onToggleDark: () => void;
  onMenuClick?: () => void;
  onNavigate?: (path: string) => void;
}

function getInitials(user: any): string {
  const f = (user?.first_name || '')[0];
  const l = (user?.last_name || '')[0];
  if (f && l) return (f + l).toUpperCase();
  return (user?.username || 'U')[0].toUpperCase();
}

function getDisplayName(user: any): string {
  const full = [user?.first_name, user?.last_name].filter(Boolean).join(' ');
  return full || user?.username || 'User';
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrator',
  MANAGER: 'Manager',
  PROCUREMENT: 'Procurement Officer',
  FINANCE: 'Finance Officer',
  VIEWER: 'Viewer',
};

export function TopNav({ isDark, onToggleDark, onMenuClick, onNavigate }: TopNavProps) {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700/60 fixed top-0 right-0 left-0 lg:left-20 z-40 px-6 flex items-center justify-between shadow-sm transition-colors duration-200">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="lg:hidden p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors">
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white hidden md:block">
          RFQ & Costing Management
        </h2>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onToggleDark}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {isDark ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5" />}
        </button>

        <button className="relative p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <Bell className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 pl-3 border-l border-gray-200 dark:border-gray-700 ml-1">
          <div className="text-right hidden md:block">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
              {getDisplayName(user)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
              {ROLE_LABELS[user?.role || ''] || user?.role}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#63D44A] to-[#0E8F79] flex items-center justify-center text-white text-xs font-bold">
              {getInitials(user)}
            </div>
            <button
              onClick={() => onNavigate?.('/settings')}
              className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
