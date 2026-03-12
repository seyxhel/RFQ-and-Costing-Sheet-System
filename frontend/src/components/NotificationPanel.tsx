import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  FileText,
  CheckCircle,
  DollarSign,
  ShoppingCart,
  Send,
  Award,
  XCircle,
  ClipboardList,
  ThumbsUp,
  ThumbsDown,
  Info,
  Trash2,
  MailOpen,
  BellOff,
} from 'lucide-react';
import { notificationAPI, type Notification } from '../services/notificationService';

/* ── Icon mapping ───────────────────────────────────── */
function getIcon(type: string) {
  switch (type) {
    case 'rfq_created':
    case 'rfq_updated':
      return FileText;
    case 'costing_created':
    case 'costing_updated':
      return DollarSign;
    case 'quotation_sent':
      return Send;
    case 'quotation_won':
      return Award;
    case 'quotation_rejected':
      return XCircle;
    case 'sales_order':
      return ClipboardList;
    case 'budget_created':
      return ShoppingCart;
    case 'budget_approved':
      return ThumbsUp;
    case 'budget_rejected':
      return ThumbsDown;
    case 'procurement':
      return ShoppingCart;
    default:
      return Info;
  }
}

/* ── Time ago ───────────────────────────────────────── */
function formatTimeAgo(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString();
}

type FilterTab = 'all' | 'unread';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (path: string) => void;
}

export function NotificationPanel({ isOpen, onClose, onNavigate }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await notificationAPI.list();
      setNotifications(data.results);
      setUnreadCount(data.unread_count);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen, fetchNotifications]);

  const displayed = activeTab === 'unread'
    ? notifications.filter((n) => !n.is_read)
    : notifications;

  const handleClick = async (item: Notification) => {
    if (!item.is_read) {
      await notificationAPI.markRead([item.id]);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    onClose();
    if (item.reference_url && onNavigate) {
      onNavigate(item.reference_url);
    }
  };

  const handleMarkRead = async (e: React.MouseEvent, item: Notification) => {
    e.stopPropagation();
    await notificationAPI.markRead([item.id]);
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await notificationAPI.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    await notificationAPI.delete(id);
    setNotifications((prev) => {
      const removed = prev.find((n) => n.id === id);
      if (removed && !removed.is_read) setUnreadCount((c) => Math.max(0, c - 1));
      return prev.filter((n) => n.id !== id);
    });
  };

  const handleClearAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await notificationAPI.clearAll();
    setNotifications([]);
    setUnreadCount(0);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />

      {/* Dropdown panel */}
      <div
        className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl flex flex-col max-h-[70vh] overflow-hidden z-50"
        role="dialog"
        aria-label="Notifications"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#0E8F79]" />
              Notifications
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-semibold">
                  {unreadCount}
                </span>
              )}
            </h2>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-[#0E8F79] hover:underline font-medium"
                  title="Mark all as read"
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-xs text-red-500 hover:underline font-medium"
                  title="Clear all notifications"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex px-4 gap-1 pb-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-[#0E8F79] text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeTab === 'unread'
                  ? 'bg-[#0E8F79] text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-[#0E8F79] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <BellOff className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {activeTab === 'unread' ? 'No unread notifications' : 'No notifications'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {activeTab === 'unread'
                  ? "You're all caught up!"
                  : "When you get notifications, they'll show up here."}
              </p>
            </div>
          ) : (
            displayed.map((item) => {
              const Icon = getIcon(item.notification_type);
              return (
                <div
                  key={item.id}
                  className={`group relative flex items-start gap-3 px-4 py-3 text-left transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0 cursor-pointer ${
                    item.is_read
                      ? 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      : 'bg-red-50/40 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20'
                  }`}
                  onClick={() => handleClick(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleClick(item);
                    }
                  }}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#0E8F79]/10 dark:bg-[#0E8F79]/20 flex items-center justify-center mt-0.5">
                    <Icon className="w-4 h-4 text-[#0E8F79]" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm leading-tight ${
                        item.is_read
                          ? 'font-normal text-gray-600 dark:text-gray-300'
                          : 'font-semibold text-gray-900 dark:text-white'
                      }`}
                    >
                      {item.title}
                    </p>
                    {item.message && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                        {item.message}
                      </p>
                    )}
                    {item.reference_id && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-mono truncate">
                        {item.reference_id}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {formatTimeAgo(item.created_at)}
                      </p>
                      {item.sender_name && item.sender_name !== 'System' && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          · from {item.sender_name}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Hover actions */}
                  <div className="flex-shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!item.is_read && (
                      <button
                        onClick={(e) => handleMarkRead(e, item)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-[#0E8F79] hover:bg-[#0E8F79]/10 transition-colors"
                        title="Mark as read"
                      >
                        <MailOpen className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDelete(e, item.id)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Delete notification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Read/Unread dot */}
                  <div className="flex-shrink-0 mt-2 group-hover:hidden">
                    {item.is_read ? (
                      <span
                        className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 inline-block"
                        title="Read"
                      />
                    ) : (
                      <span
                        className="w-2 h-2 rounded-full bg-red-500 inline-block animate-pulse"
                        title="Unread"
                      />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

/* ── Bell button with badge (for TopNav) ──────────── */
interface NotificationBellProps {
  onClick: () => void;
  unreadCount: number;
}

export function NotificationBell({ onClick, unreadCount }: NotificationBellProps) {
  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      title="Notifications"
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 ring-2 ring-white dark:ring-gray-900">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
