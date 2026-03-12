import React, { useEffect, useState, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { GreenButton } from '../../components/ui/GreenButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Search, Eye, Pencil, Trash2, MoreHorizontal, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { salesOrderAPI } from '../../services/salesService';
import { toast } from 'sonner';

const ITEMS_PER_PAGE = 8;

export default function SalesOrderList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const btnRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  useEffect(() => {
    salesOrderAPI.list().then((res) => {
      setItems(res.data.results || res.data);
      setLoading(false);
    }).catch(() => { toast.error('Failed to load sales orders'); setLoading(false); });
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
      setMenuPos({ top: rect.bottom + 4, left: rect.right - 140 });
    }
    setOpenMenuId((prev) => (prev === id ? null : id));
  }, []);

  const handleDelete = async (id: number) => {
    setOpenMenuId(null);
    if (!window.confirm('Delete this sales order?')) return;
    try {
      await salesOrderAPI.delete(id);
      setItems((p) => p.filter((r) => r.id !== id));
      toast.success('Sales order deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const filtered = items.filter((so) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return so.so_number?.toLowerCase().includes(s) || so.client_name?.toLowerCase().includes(s) || so.project_title?.toLowerCase().includes(s);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paged = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const fmt = (n: number) => `₱${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales Orders</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage and track all sales orders</p>
        </div>
        <GreenButton onClick={() => navigate('/sales/orders/new')}><Plus className="w-4 h-4 mr-2" /> New Sales Order</GreenButton>
      </div>

      <Card accent>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} type="text" placeholder="Search by SO number, client, or project..." className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3BC25B]" />
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-visible relative">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 font-semibold">SO Number</th>
                <th className="px-6 py-4 font-semibold">Client</th>
                <th className="px-6 py-4 font-semibold">Project</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Contract Amount</th>
                <th className="px-6 py-4 font-semibold">Awarded</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">No sales orders found.</td></tr>
              ) : paged.map((so) => (
                <tr key={so.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-bold text-[#0E8F79] dark:text-green-400 text-xs">{so.so_number}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{so.client_name}</td>
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{so.project_title}</td>
                  <td className="px-6 py-4"><StatusBadge status={so.status} /></td>
                  <td className="px-6 py-4 text-right font-mono text-gray-900 dark:text-white">{fmt(so.contract_amount)}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs">{so.awarded_date || '—'}</td>
                  <td className="px-6 py-4 text-right">
                    <button ref={(el) => { btnRefs.current[so.id] = el; }} onClick={(e) => { e.stopPropagation(); openMenu(so.id); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
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

        {openMenuId !== null && ReactDOM.createPortal(
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999 }} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 min-w-[140px]">
            <button onClick={() => { setOpenMenuId(null); navigate(`/sales/orders/${openMenuId}`); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"><Eye className="w-4 h-4" /> View</button>
            <button onClick={() => { setOpenMenuId(null); navigate(`/sales/orders/${openMenuId}/edit`); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"><Pencil className="w-4 h-4" /> Edit</button>
            <button onClick={() => { handleDelete(openMenuId); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4" /> Delete</button>
          </div>,
          document.body
        )}
      </Card>
    </div>
  );
}
