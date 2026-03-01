import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { GreenButton } from '../../components/ui/GreenButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { StatCard } from '../../components/ui/StatCard';
import { Search, Eye, Pencil, Trash2, MoreHorizontal, ChevronLeft, ChevronRight, Plus, Wallet, CheckCircle, Clock, XCircle } from 'lucide-react';
import { budgetAPI } from '../../services/budgetService';
import { toast } from 'sonner';

const ITEMS_PER_PAGE = 8;

export default function BudgetList() {
  const navigate = useNavigate();
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const btnRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  useEffect(() => {
    budgetAPI.list().then((r) => { setBudgets(r.data.results || r.data); setLoading(false); }).catch(() => { toast.error('Failed to load budgets'); setLoading(false); });
  }, []);

  useEffect(() => {
    const handler = () => setOpenMenuId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const openMenu = useCallback((id: number) => {
    const btn = btnRefs.current[id];
    if (btn) {
      const rect = btn.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.right - 160 });
    }
    setOpenMenuId((prev) => (prev === id ? null : id));
  }, []);

  const handleDelete = (id: number) => {
    budgetAPI.delete(id).then(() => { setBudgets((p) => p.filter((b) => b.id !== id)); toast.success('Budget deleted'); }).catch(() => toast.error('Failed to delete'));
    setOpenMenuId(null);
  };

  const totalAllocated = budgets.reduce((s, b) => s + Number(b.allocated_amount || 0), 0);
  const totalSpent = budgets.reduce((s, b) => s + Number(b.spent_amount || 0), 0);
  const approvedCount = budgets.filter((b) => b.status === 'APPROVED').length;
  const pendingCount = budgets.filter((b) => b.status === 'PENDING').length;

  const filtered = budgets.filter((b) => {
    const q = search.toLowerCase();
    const matchSearch = !search || b.title?.toLowerCase().includes(q) || b.budget_number?.toLowerCase().includes(q);
    const matchStatus = !filterStatus || b.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paged = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Budget Management</h1>
          <p className="text-gray-500 dark:text-gray-400">Allocate, approve, and monitor budgets</p>
        </div>
        <GreenButton onClick={() => navigate('/budgets/new')}><Plus className="w-4 h-4 mr-2" /> New Budget</GreenButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Allocated" value={`₱${totalAllocated.toLocaleString()}`} icon={Wallet} color="blue" />
        <StatCard title="Total Spent" value={`₱${totalSpent.toLocaleString()}`} icon={Wallet} color="orange" />
        <StatCard title="Approved" value={String(approvedCount)} icon={CheckCircle} color="green" />
        <StatCard title="Pending" value={String(pendingCount)} icon={Clock} color="purple" />
      </div>

      <Card accent>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} type="text" placeholder="Search by title or budget number..." className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3BC25B]" />
          </div>
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }} className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#3BC25B]">
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>

        <div className="overflow-x-auto overflow-y-visible relative">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 font-semibold">Budget #</th>
                <th className="px-6 py-4 font-semibold">Title</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Allocated</th>
                <th className="px-6 py-4 font-semibold text-right">Spent</th>
                <th className="px-6 py-4 font-semibold text-right">Utilization</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">No budgets found.</td></tr>
              ) : paged.map((b) => {
                const util = b.utilization_percent ?? (b.allocated_amount > 0 ? ((b.spent_amount / b.allocated_amount) * 100).toFixed(1) : 0);
                const utilNum = Number(util);
                return (
                  <tr key={b.id} onClick={() => navigate(`/budgets/${b.id}`)} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors cursor-pointer">
                    <td className="px-6 py-4"><span className="font-bold text-[#0E8F79] dark:text-green-400 text-xs">{b.budget_number}</span></td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{b.title}</td>
                    <td className="px-6 py-4"><StatusBadge status={b.status} /></td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-white">₱{Number(b.allocated_amount).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-gray-500 dark:text-gray-400">₱{Number(b.spent_amount).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${utilNum > 90 ? 'bg-red-500' : utilNum > 70 ? 'bg-yellow-500' : 'bg-[#3BC25B]'}`} style={{ width: `${Math.min(100, utilNum)}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right">{utilNum}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button ref={(el) => { btnRefs.current[b.id] = el; }} onClick={(e) => { e.stopPropagation(); openMenu(b.id); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
            <span className="text-sm text-gray-500 dark:text-gray-400">Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-[#3BC25B] hover:text-white text-gray-600 dark:text-gray-400 disabled:opacity-40 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page ? 'bg-[#3BC25B] text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{page}</button>
              ))}
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-[#3BC25B] hover:text-white text-gray-600 dark:text-gray-400 disabled:opacity-40 transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </Card>

      {/* Context Menu Portal */}
      {openMenuId !== null && ReactDOM.createPortal(
        <div style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999 }} className="w-40 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => { navigate(`/budgets/${openMenuId}`); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"><Eye className="w-4 h-4" /> View</button>
          <button onClick={() => { navigate(`/budgets/${openMenuId}/edit`); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"><Pencil className="w-4 h-4" /> Edit</button>
          <button onClick={() => handleDelete(openMenuId)} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4" /> Delete</button>
        </div>,
        document.body,
      )}
    </div>
  );
}
