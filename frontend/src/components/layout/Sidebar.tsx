import React, { useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  Truck,
  ClipboardList,
  Calculator,
  FlaskConical,
  Users,
  Settings,
  LogOut,
  Package,
  FolderOpen,
  Wallet,
  ShoppingCart,
  BarChart3,
  Send,
  Award,
  FilePieChart,
  ClipboardCheck,
  FileBarChart,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  section?: string;
}

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onExpandChange?: (expanded: boolean) => void;
}

export function Sidebar({ currentPath, onNavigate, onExpandChange }: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { isAdmin, logout } = useAuth();

  const handleMouseEnter = () => { setIsExpanded(true); onExpandChange?.(true); };
  const handleMouseLeave = () => { setIsExpanded(false); onExpandChange?.(false); };

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { id: 'rfq', label: 'RFQ List', icon: FileText, path: '/rfq', section: 'RFQ Module' },
    { id: 'rfq-new', label: 'New RFQ', icon: ClipboardList, path: '/rfq/new' },
    { id: 'suppliers', label: 'Suppliers', icon: Truck, path: '/suppliers' },
    { id: 'quotations', label: 'Quotations', icon: FileText, path: '/quotations' },
    { id: 'products', label: 'Product Catalog', icon: Package, path: '/products', section: 'Products' },
    { id: 'categories', label: 'Categories', icon: FolderOpen, path: '/products/categories' },
    { id: 'costing', label: 'Costing Sheets', icon: Calculator, path: '/costing', section: 'Costing Module' },
    { id: 'costing-new', label: 'New Costing Sheet', icon: FlaskConical, path: '/costing/new' },
    { id: 'sales-quotations', label: 'Formal Quotations', icon: Send, path: '/sales/quotations', section: 'Sales Module' },
    { id: 'sales-orders', label: 'Sales Orders', icon: Award, path: '/sales/orders' },
    { id: 'contract-analysis', label: 'Contract Analysis', icon: FilePieChart, path: '/sales/contract-analyses' },
    { id: 'budgets', label: 'Budgets', icon: Wallet, path: '/budgets', section: 'Budget & Procurement' },
    { id: 'purchase-orders', label: 'Purchase Orders', icon: ShoppingCart, path: '/purchase-orders' },
    { id: 'variance', label: 'Variance Monitor', icon: BarChart3, path: '/variance' },
    { id: 'audit-log', label: 'Audit Log', icon: ClipboardCheck, path: '/audit-log', section: 'Reports' },
    { id: 'project-report', label: 'Project Report', icon: FileBarChart, path: '/reports/project' },
    ...(isAdmin() ? [
      { id: 'users', label: 'Manage Users', icon: Users, path: '/users', section: 'Admin' },
      { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
    ] : []),
  ];

  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/';
    // Exact match first
    if (currentPath === path) return true;
    // For parent paths like /rfq or /costing, don't match their /new sub-routes
    // Only match sub-paths that aren't claimed by another nav item
    const childPaths = navItems.map((n) => n.path).filter((p) => p !== path && p.startsWith(path + '/'));
    // If currentPath exactly matches a child nav item, don't highlight the parent
    if (childPaths.some((cp) => currentPath === cp || currentPath.startsWith(cp + '/'))) return false;
    return currentPath.startsWith(path + '/');
  };

  let lastSection = '';

  return (
    <aside
      className={`bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white flex flex-col h-screen fixed left-0 top-0 z-50 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ${isExpanded ? 'w-64' : 'w-20'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Logo */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex flex-col items-center">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#63D44A] to-[#0E8F79] flex items-center justify-center text-white font-bold text-lg">
          B
        </div>
        {isExpanded && (
          <span className="text-xs text-gray-500 dark:text-gray-400 text-center tracking-wide font-medium leading-tight mt-2">
            Business System
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          const showSection = item.section && item.section !== lastSection;
          if (item.section) lastSection = item.section;

          return (
            <React.Fragment key={item.id}>
              {showSection && isExpanded && (
                <div className="text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest px-4 pt-4 pb-1">
                  {item.section}
                </div>
              )}
              <button
                onClick={() => onNavigate(item.path)}
                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group ${isExpanded ? '' : 'justify-center'} ${active
                  ? 'bg-gradient-to-r from-[#63D44A] to-[#0E8F79] text-white shadow-lg shadow-[#3BC25B]/20'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                }`}
                title={!isExpanded ? item.label : undefined}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isExpanded ? 'mr-3' : ''} ${active ? 'text-white' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white'}`} />
                {isExpanded && item.label}
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={logout}
          className={`w-full flex items-center px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 transition-colors ${isExpanded ? '' : 'justify-center'}`}
          title={!isExpanded ? 'Sign Out' : undefined}
        >
          <LogOut className={`w-5 h-5 flex-shrink-0 ${isExpanded ? 'mr-3' : ''}`} />
          {isExpanded && 'Sign Out'}
        </button>
      </div>
    </aside>
  );
}
