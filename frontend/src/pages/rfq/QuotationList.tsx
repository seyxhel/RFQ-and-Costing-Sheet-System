import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { GreenButton } from '../../components/ui/GreenButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Search, Plus, MoreHorizontal, Eye, Pencil, Trash2, ClipboardList, CheckCircle, XCircle } from 'lucide-react';
import { quotationAPI } from '../../services/rfqService';
import { toast } from 'sonner';

export default function QuotationList() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 8;

  const loadQuotations = () => {
    setLoading(true);
    quotationAPI.list().then((r) => { setQuotations(r.data.results || r.data); setLoading(false); }).catch(() => { toast.error('Failed to load quotations'); setLoading(false); });
  };

  useEffect(() => { loadQuotations(); }, []);

  useEffect(() => { const h = () => setOpenMenuId(null); document.addEventListener('click', h); return () => document.removeEventListener('click', h); }, []);

  const handleDelete = (id: number) => {
    quotationAPI.delete(id).then(() => { setQuotations((p) => p.filter((q) => q.id !== id)); toast.success('Quotation deleted'); }).catch(() => toast.error('Delete failed'));
    setOpenMenuId(null);
  };

  const handleAccept = (id: number) => {
    quotationAPI.accept(id).then(() => { toast.success('Quotation accepted!'); loadQuotations(); }).catch(() => toast.error('Failed to accept'));
    setOpenMenuId(null);
  };

  const handleReject = (id: number) => {
    quotationAPI.reject(id).then(() => { toast.success('Quotation rejected'); loadQuotations(); }).catch(() => toast.error('Failed to reject'));
    setOpenMenuId(null);
  };

  const filtered = quotations.filter((q) =>
    !search || q.supplier_name?.toLowerCase().includes(search.toLowerCase()) || String(q.rfq)?.includes(search)
  );
  const totalPages = Math.ceil(filtered.length / perPage);
  const pageData = filtered.slice((page - 1) * perPage, page * perPage);

  const statusColor = (s: string) => {
    if (s === 'ACCEPTED') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    if (s === 'REJECTED') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quotations</h1>
          <p className="text-gray-500 dark:text-gray-400">Supplier quotes for RFQs</p>
        </div>
        <GreenButton onClick={() => navigate('/quotations/new')}><Plus className="w-4 h-4 mr-2" /> New Quotation</GreenButton>
      </div>

      <Card accent>
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} type="text" placeholder="Search by supplier or RFQ..." className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3BC25B]" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 font-semibold">ID</th>
                <th className="px-6 py-4 font-semibold">RFQ</th>
                <th className="px-6 py-4 font-semibold">Supplier</th>
                <th className="px-6 py-4 font-semibold">Total Amount</th>
                <th className="px-6 py-4 font-semibold">Delivery</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Submitted</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
              ) : pageData.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center"><div className="flex flex-col items-center gap-2 text-gray-400"><ClipboardList className="w-8 h-8" /><p>No quotations found</p></div></td></tr>
              ) : pageData.map((q) => (
                <tr key={q.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">#{q.id}</td>
                  <td className="px-6 py-4"><span className="text-[#0E8F79] font-medium cursor-pointer hover:underline" onClick={() => navigate(`/rfq/${q.rfq}`)}>RFQ-{q.rfq}</span></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#63D44A] to-[#0E8F79] flex items-center justify-center text-white text-[10px] font-bold">{q.supplier_name?.charAt(0) || '?'}</div>
                      <span className="text-gray-800 dark:text-gray-200">{q.supplier_name || 'Supplier #' + q.supplier}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">₱{Number(q.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{q.delivery_days ? `${q.delivery_days} days` : '—'}</td>
                  <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColor(q.status)}`}>{q.status}</span></td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{q.submitted_at ? new Date(q.submitted_at).toLocaleDateString() : '—'}</td>
                  <td className="px-6 py-4 text-right relative">
                    <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === q.id ? null : q.id); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><MoreHorizontal className="w-5 h-5" /></button>
                    {openMenuId === q.id && (
                      <div onClick={(e) => e.stopPropagation()} className="absolute right-6 top-12 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 min-w-[160px]">
                        <button onClick={() => { setOpenMenuId(null); navigate(`/quotations/${q.id}/edit`); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"><Pencil className="w-4 h-4" /> Edit</button>
                        {q.status === 'PENDING' && (
                          <>
                            <button onClick={() => handleAccept(q.id)} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"><CheckCircle className="w-4 h-4" /> Accept</button>
                            <button onClick={() => handleReject(q.id)} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"><XCircle className="w-4 h-4" /> Reject</button>
                          </>
                        )}
                        <button onClick={() => handleDelete(q.id)} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4" /> Delete</button>
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
