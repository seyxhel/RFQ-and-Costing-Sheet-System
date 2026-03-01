import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { GreenButton } from '../../components/ui/GreenButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Search, Plus, MoreHorizontal, Eye, Pencil, Trash2, Calculator, Download, FlaskConical } from 'lucide-react';
import { costingAPI } from '../../services/costingService';
import { toast } from 'sonner';

export default function CostingList() {
  const navigate = useNavigate();
  const [sheets, setSheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 8;

  useEffect(() => {
    costingAPI.list().then((r) => { setSheets(r.data.results || r.data); setLoading(false); }).catch(() => { toast.error('Failed to load costing sheets'); setLoading(false); });
  }, []);

  useEffect(() => { const h = () => setOpenMenuId(null); document.addEventListener('click', h); return () => document.removeEventListener('click', h); }, []);

  const handleDelete = (id: number) => {
    costingAPI.delete(id).then(() => { setSheets((p) => p.filter((s) => s.id !== id)); toast.success('Costing sheet deleted'); }).catch(() => toast.error('Delete failed'));
    setOpenMenuId(null);
  };

  const handleExport = (id: number, format: 'csv' | 'json') => {
    const fn = format === 'csv' ? costingAPI.exportCSV : costingAPI.exportJSON;
    fn(id).then((r) => {
      const blob = new Blob([format === 'csv' ? r.data : JSON.stringify(r.data, null, 2)], { type: format === 'csv' ? 'text/csv' : 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `costing-${id}.${format}`; a.click(); URL.revokeObjectURL(url);
      toast.success(`Exported as ${format.toUpperCase()}`);
    }).catch(() => toast.error('Export failed'));
    setOpenMenuId(null);
  };

  const filtered = sheets.filter((s) => !search || s.title?.toLowerCase().includes(search.toLowerCase()) || s.status?.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(filtered.length / perPage);
  const pageData = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Costing Sheets</h1>
          <p className="text-gray-500 dark:text-gray-400">Product cost breakdowns and analysis</p>
        </div>
        <GreenButton onClick={() => navigate('/costing/new')}><Plus className="w-4 h-4 mr-2" /> New Costing Sheet</GreenButton>
      </div>

      <Card accent>
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} type="text" placeholder="Search costing sheets..." className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3BC25B]" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 font-semibold">ID</th>
                <th className="px-6 py-4 font-semibold">Title</th>
                <th className="px-6 py-4 font-semibold">Product</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Total Cost</th>
                <th className="px-6 py-4 font-semibold">Margin</th>
                <th className="px-6 py-4 font-semibold">Sell Price</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
              ) : pageData.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center"><div className="flex flex-col items-center gap-2 text-gray-400"><Calculator className="w-8 h-8" /><p>No costing sheets found</p></div></td></tr>
              ) : pageData.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors cursor-pointer" onClick={() => navigate(`/costing/${s.id}`)}>
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">#{s.id}</td>
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{s.title}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{s.product_name || '—'}</td>
                  <td className="px-6 py-4"><StatusBadge status={s.status || 'draft'} /></td>
                  <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">₱{Number(s.total_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-[#0E8F79] font-medium">{s.margin_percentage ? `${s.margin_percentage}%` : '—'}</td>
                  <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">₱{Number(s.selling_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-right relative" onClick={(e) => e.stopPropagation()}>
                    <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === s.id ? null : s.id); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><MoreHorizontal className="w-5 h-5" /></button>
                    {openMenuId === s.id && (
                      <div onClick={(e) => e.stopPropagation()} className="absolute right-6 top-12 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 min-w-[160px]">
                        <button onClick={() => { setOpenMenuId(null); navigate(`/costing/${s.id}`); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"><Eye className="w-4 h-4" /> View</button>
                        <button onClick={() => { setOpenMenuId(null); navigate(`/costing/${s.id}/edit`); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"><Pencil className="w-4 h-4" /> Edit</button>
                        <button onClick={() => { setOpenMenuId(null); navigate(`/costing/${s.id}/scenarios`); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"><FlaskConical className="w-4 h-4" /> Scenarios</button>
                        <button onClick={() => handleExport(s.id, 'csv')} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"><Download className="w-4 h-4" /> Export CSV</button>
                        <hr className="my-1 border-gray-100 dark:border-gray-700" />
                        <button onClick={() => handleDelete(s.id)} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4" /> Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100 dark:border-gray-700">
            <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {totalPages} ({filtered.length} results)</span>
            <div className="flex gap-2">
              <GreenButton variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</GreenButton>
              <GreenButton variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</GreenButton>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
