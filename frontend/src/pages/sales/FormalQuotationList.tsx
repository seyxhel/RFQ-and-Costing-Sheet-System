import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formalQuotationAPI } from '../../services/salesService';
import { toast } from 'sonner';
import { Plus, Search, Send, Eye } from 'lucide-react';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  SENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  ACCEPTED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  REVISED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
};

export default function FormalQuotationList() {
  const nav = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await formalQuotationAPI.list({ search: search || undefined });
      setItems(data.results ?? data);
    } catch { toast.error('Failed to load quotations'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search]);

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Formal Quotations</h1>
        <button onClick={() => nav('/sales/quotations/new')} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#63D44A] to-[#0E8F79] text-white rounded-lg hover:opacity-90 transition">
          <Plus className="w-4 h-4" /> New Quotation
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search quotations..." className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3 text-left">Number</th>
                <th className="px-4 py-3 text-left">Client</th>
                <th className="px-4 py-3 text-left">Project</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {items.map((q: any) => (
                <tr key={q.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{q.quotation_number}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{q.client_name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{q.project_title}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[q.status] || ''}`}>{q.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-white">{fmt(q.total_amount)}</td>
                  <td className="px-4 py-3 text-gray-500">{q.date}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => nav(`/sales/quotations/${q.id}`)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><Eye className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No formal quotations yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
