import React, { useState, useEffect, useCallback } from 'react';
import { Sun, Moon, Menu, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NotificationBell, NotificationPanel } from '../NotificationPanel';
import { notificationAPI } from '../../services/notificationService';

interface TopNavProps {
  isDark: boolean;
  onToggleDark: () => void;
  onMenuClick?: () => void;
  onNavigate?: (path: string) => void;
  isSidebarExpanded?: boolean;
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
  MANAGEMENT: 'Management',
  SALES: 'Sales',
  PURCHASING: 'Purchasing',
};

export function TopNav({ isDark, onToggleDark, onMenuClick, onNavigate, isSidebarExpanded = false }: TopNavProps) {
  const { user } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    try {
      const { data } = await notificationAPI.list();
      setUnreadCount(data.unread_count);
    } catch { /* silent */ }
  }, []);

  // Poll unread count every 30 seconds
  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  return (
    <header className={`h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700/60 fixed top-0 right-0 left-0 z-40 px-6 flex items-center justify-between shadow-sm transition-all duration-300 ${isSidebarExpanded ? 'lg:left-64' : 'lg:left-20'}`}>
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

        <div className="relative">
          <NotificationBell onClick={() => setNotifOpen(!notifOpen)} unreadCount={unreadCount} />
          <NotificationPanel
            isOpen={notifOpen}
            onClose={() => { setNotifOpen(false); fetchUnread(); }}
            onNavigate={onNavigate}
          />
        </div>

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
