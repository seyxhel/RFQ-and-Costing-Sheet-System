import React, { useEffect, useState, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { salesOrderAPI } from '../../services/salesService';
import { toast } from 'sonner';
import { Plus, Search, Eye, Pencil, Trash2, MoreHorizontal } from 'lucide-react';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  CONFIRMED: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

export default function SalesOrderList() {
  const nav = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const btnRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  const load = async () => {
    try {
      const { data } = await salesOrderAPI.list({ search: search || undefined });
      setItems(data.results ?? data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search]);

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
    setOpenMenuId(prev => (prev === id ? null : id));
  }, []);

  const handleDelete = async (id: number) => {
    setOpenMenuId(null);
    if (!window.confirm('Delete this sales order?')) return;
    try {
      await salesOrderAPI.delete(id);
      setItems(p => p.filter(r => r.id !== id));
      toast.success('Sales order deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales Orders</h1>
        <button onClick={() => nav('/sales/orders/new')} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#63D44A] to-[#0E8F79] text-white rounded-lg hover:opacity-90 transition">
          <Plus className="w-4 h-4" /> New Sales Order
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3 text-left">SO Number</th>
                <th className="px-4 py-3 text-left">Client</th>
                <th className="px-4 py-3 text-left">Project</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Contract Amount</th>
                <th className="px-4 py-3 text-left">Awarded</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {items.map((so: any) => (
                <tr key={so.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{so.so_number}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{so.client_name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{so.project_title}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[so.status] || ''}`}>{so.status}</span></td>
                  <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-white">{fmt(so.contract_amount)}</td>
                  <td className="px-4 py-3 text-gray-500">{so.awarded_date || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button ref={el => { btnRefs.current[so.id] = el; }} onClick={e => { e.stopPropagation(); openMenu(so.id); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No sales orders yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {openMenuId !== null && ReactDOM.createPortal(
        <div style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 9999 }} className="w-36 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1" onClick={e => e.stopPropagation()}>
          <button onClick={() => { nav(`/sales/orders/${openMenuId}`); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            <Eye className="w-4 h-4" /> View
          </button>
          <button onClick={() => { nav(`/sales/orders/${openMenuId}/edit`); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            <Pencil className="w-4 h-4" /> Edit
          </button>
          <button onClick={() => handleDelete(openMenuId)} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
}
