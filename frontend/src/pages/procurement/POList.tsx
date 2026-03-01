import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { GreenButton } from '../../components/ui/GreenButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { StatCard } from '../../components/ui/StatCard';
import { Search, Eye, Pencil, Trash2, MoreHorizontal, ChevronLeft, ChevronRight, Plus, ShoppingCart, TrendingUp, AlertTriangle } from 'lucide-react';
import { purchaseOrderAPI } from '../../services/procurementService';
import { toast } from 'sonner';

const ITEMS_PER_PAGE = 8;

export default function POList() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const btnRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  useEffect(() => {
    purchaseOrderAPI.list().then((r) => { setOrders(r.data.results || r.data); setLoading(false); }).catch(() => { toast.error('Failed to load POs'); setLoading(false); });
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
    purchaseOrderAPI.delete(id).then(() => { setOrders((p) => p.filter((o) => o.id !== id)); toast.success('PO deleted'); }).catch(() => toast.error('Failed to delete'));
    setOpenMenuId(null);
  };

  const totalEstimated = orders.reduce((s, o) => s + Number(o.estimated_total || 0), 0);
  const totalActual = orders.reduce((s, o) => s + Number(o.actual_total || 0), 0);
  const overBudgetCount = orders.filter((o) => Number(o.actual_total) > Number(o.estimated_total) && Number(o.actual_total) > 0).length;

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    const matchSearch = !search || o.title?.toLowerCase().includes(q) || o.po_number?.toLowerCase().includes(q);
    const matchStatus = !filterStatus || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paged = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Purchase Orders</h1>
          <p className="text-gray-500 dark:text-gray-400">Track procurement and actual costs</p>
        </div>
        <GreenButton onClick={() => navigate('/purchase-orders/new')}><Plus className="w-4 h-4 mr-2" /> New Purchase Order</GreenButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Estimated Total" value={`₱${totalEstimated.toLocaleString()}`} icon={ShoppingCart} color="blue" />
        <StatCard title="Actual Total" value={`₱${totalActual.toLocaleString()}`} icon={TrendingUp} color="green" />
        <StatCard title="Over Budget" value={String(overBudgetCount)} icon={AlertTriangle} color="red" subtext="POs exceeding estimate" />
      </div>

      <Card accent>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} type="text" placeholder="Search by title or PO number..." className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3BC25B]" />
          </div>
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }} className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#3BC25B]">
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="ISSUED">Issued</option>
            <option value="PARTIALLY_RECEIVED">Partially Received</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div className="overflow-x-auto overflow-y-visible relative">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 font-semibold">PO Number</th>
                <th className="px-6 py-4 font-semibold">Title</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Estimated</th>
                <th className="px-6 py-4 font-semibold text-right">Actual</th>
                <th className="px-6 py-4 font-semibold text-right">Variance</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">No purchase orders found.</td></tr>
              ) : paged.map((o) => {
                const variance = Number(o.actual_total || 0) - Number(o.estimated_total || 0);
                const hasActual = Number(o.actual_total) > 0;
                return (
                  <tr key={o.id} onClick={() => navigate(`/purchase-orders/${o.id}`)} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors cursor-pointer">
                    <td className="px-6 py-4"><span className="font-bold text-[#0E8F79] dark:text-green-400 text-xs">{o.po_number}</span></td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{o.title}</td>
                    <td className="px-6 py-4"><StatusBadge status={o.status} /></td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-white">₱{Number(o.estimated_total).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-gray-500 dark:text-gray-400">{hasActual ? `₱${Number(o.actual_total).toLocaleString()}` : '—'}</td>
                    <td className="px-6 py-4 text-right">
                      {hasActual ? (
                        <span className={`text-xs font-semibold ${variance > 0 ? 'text-red-500' : variance < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                          {variance > 0 ? '+' : ''}{variance.toLocaleString()}
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button ref={(el) => { btnRefs.current[o.id] = el; }} onClick={(e) => { e.stopPropagation(); openMenu(o.id); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
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
          <button onClick={() => { navigate(`/purchase-orders/${openMenuId}`); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"><Eye className="w-4 h-4" /> View</button>
          <button onClick={() => { navigate(`/purchase-orders/${openMenuId}/edit`); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"><Pencil className="w-4 h-4" /> Edit</button>
          <button onClick={() => handleDelete(openMenuId)} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4" /> Delete</button>
        </div>,
        document.body,
      )}
    </div>
  );
}
