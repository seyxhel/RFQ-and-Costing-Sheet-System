import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formalQuotationAPI } from '../../services/salesService';
import { toast } from 'sonner';
import { ArrowLeft, Edit, Send, CheckCircle, XCircle, History, ChevronDown, ChevronUp, Trophy } from 'lucide-react';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  SENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  ACCEPTED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  REVISED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  WON: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
};

const MARGIN_LABELS: Record<string, string> = { VERY_LOW: 'Very Low', LOW: 'Low', MEDIUM_LOW: 'Medium-Low', MEDIUM_HIGH: 'Medium-High', HIGH: 'High', VERY_HIGH: 'Very High', CUSTOM: 'Custom' };

interface Revision {
  id: number;
  revision_number: number;
  margin_level_label: string;
  total_amount: number;
  subtotal: number;
  vat_amount: number;
  reason: string;
  snapshot_items: { item_number: number; description: string; quantity: string; unit: string; unit_price: string; amount: string }[];
  changed_by_name: string;
  created_at: string;
}

export default function FormalQuotationDetail() {
  const nav = useNavigate();
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [expandedRev, setExpandedRev] = useState<number | null>(null);

  const load = async () => {
    try {
      const { data } = await formalQuotationAPI.get(Number(id));
      setData(data);
    } catch { toast.error('Failed to load'); }
  };

  const loadRevisions = async () => {
    try {
      const { data } = await formalQuotationAPI.revisions(Number(id));
      setRevisions(data);
    } catch {}
  };

  useEffect(() => { load(); loadRevisions(); }, [id]);

  const action = async (fn: () => Promise<any>, msg: string) => {
    try { await fn(); toast.success(msg); load(); } catch { toast.error('Action failed'); }
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);
  const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (!data) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => nav('/sales/quotations')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{data.quotation_number}</h1>
            <p className="text-sm text-gray-500">{data.project_title}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[data.status] || ''}`}>{data.status}</span>
        </div>
        <div className="flex items-center gap-2">
          {data.status === 'DRAFT' && (
            <>
              <button onClick={() => nav(`/sales/quotations/${id}/edit`)} className="flex items-center gap-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700"><Edit className="w-4 h-4" /> Edit</button>
              <button onClick={() => action(() => formalQuotationAPI.send(Number(id)), 'Quotation sent!')} className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"><Send className="w-4 h-4" /> Send</button>
            </>
          )}
          {(data.status === 'SENT' || data.status === 'REVISED') && (
            <>
              <button onClick={() => action(() => formalQuotationAPI.win(Number(id)), 'Quotation won!')} className="flex items-center gap-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"><Trophy className="w-4 h-4" /> Won</button>
              <button onClick={() => action(() => formalQuotationAPI.reject(Number(id)), 'Rejected')} className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"><XCircle className="w-4 h-4" /> Reject</button>
            </>
          )}
          {data.status === 'REJECTED' && (
            <button onClick={() => nav(`/sales/quotations/${id}/edit`)} className="flex items-center gap-1 px-3 py-2 border border-yellow-500 text-yellow-600 dark:text-yellow-400 rounded-lg text-sm hover:bg-yellow-50 dark:hover:bg-yellow-900/20"><Edit className="w-4 h-4" /> Revise & Resubmit</button>
          )}
        </div>
      </div>

      <div className="flex gap-6">
        {/* LEFT — Revision History */}
        <div className="w-80 flex-shrink-0">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow sticky top-6">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <History className="w-4 h-4 text-[#3BC25B]" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Revision History</h2>
              <span className="ml-auto text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">{revisions.length}</span>
            </div>

            <div className="max-h-[70vh] overflow-y-auto">
              {/* Current version */}
              <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-[#63D44A]/5 to-[#0E8F79]/5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#3BC25B]" />
                  <span className="text-xs font-semibold text-[#3BC25B]">Current</span>
                  {data.margin_level && (
                    <span className="ml-auto text-xs text-gray-500">
                      {MARGIN_LABELS[data.margin_level_label] || ''}
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">{fmt(data.total_amount)}</p>
                <p className="text-xs text-gray-500 mt-0.5">{fmtDate(data.updated_at)}</p>
              </div>

              {revisions.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-xs text-gray-400">No previous revisions.</p>
                  <p className="text-xs text-gray-400 mt-1">Changes to margin level will be tracked here.</p>
                </div>
              ) : (
                revisions.map(rev => {
                  const isExpanded = expandedRev === rev.id;
                  return (
                    <div key={rev.id} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                      <button
                        onClick={() => setExpandedRev(isExpanded ? null : rev.id)}
                        className="w-full text-left px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-500" />
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            Rev {rev.revision_number}
                          </span>
                          <span className="text-xs text-gray-400 ml-auto">
                            {MARGIN_LABELS[rev.margin_level_label] || rev.margin_level_label}
                          </span>
                          {isExpanded ? <ChevronUp className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
                        </div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">{fmt(rev.total_amount)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{fmtDate(rev.created_at)}</p>
                        {rev.changed_by_name && (
                          <p className="text-xs text-gray-400">by {rev.changed_by_name}</p>
                        )}
                        {rev.reason && (
                          <p className="text-xs text-gray-500 italic mt-1 line-clamp-2">"{rev.reason}"</p>
                        )}
                      </button>
                      {isExpanded && rev.snapshot_items?.length > 0 && (
                        <div className="px-5 pb-3">
                          <table className="w-full text-xs">
                            <thead className="text-gray-400">
                              <tr>
                                <th className="text-left py-1">Item</th>
                                <th className="text-right py-1">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="text-gray-600 dark:text-gray-300">
                              {rev.snapshot_items.map((si, i) => (
                                <tr key={i} className="border-t border-gray-50 dark:border-gray-700">
                                  <td className="py-1 pr-2 truncate max-w-[160px]">{si.description}</td>
                                  <td className="py-1 text-right font-mono">{fmt(Number(si.amount))}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="mt-2 pt-1 border-t border-gray-100 dark:border-gray-700 text-xs text-right">
                            <span className="text-gray-400">Subtotal: </span>
                            <span className="font-mono text-gray-700 dark:text-gray-300">{fmt(rev.subtotal)}</span>
                            <span className="text-gray-400 ml-3">VAT: </span>
                            <span className="font-mono text-gray-700 dark:text-gray-300">{fmt(rev.vat_amount)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — Main content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Client & Financials */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Client</h2>
              <div className="space-y-2 text-sm">
                <div><span className="text-gray-500">Name:</span> <span className="text-gray-900 dark:text-white">{data.client_name}</span></div>
                <div><span className="text-gray-500">Email:</span> <span className="text-gray-900 dark:text-white">{data.client_email || '—'}</span></div>
                <div><span className="text-gray-500">Contact:</span> <span className="text-gray-900 dark:text-white">{data.client_contact || '—'}</span></div>
                <div><span className="text-gray-500">Address:</span> <span className="text-gray-900 dark:text-white">{data.client_address || '—'}</span></div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Financials</h2>
              <div className="space-y-2 text-sm">
                <div><span className="text-gray-500">Subtotal:</span> <span className="font-mono text-gray-900 dark:text-white">{fmt(data.subtotal)}</span></div>
                <div><span className="text-gray-500">VAT ({data.vat_rate}%):</span> <span className="font-mono text-gray-900 dark:text-white">{fmt(data.vat_amount)}</span></div>
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700"><span className="text-gray-500 font-semibold">Total:</span> <span className="font-mono font-bold text-gray-900 dark:text-white text-lg">{fmt(data.total_amount)}</span></div>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-x-auto">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Line Items</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-2 text-left w-8">#</th>
                  <th className="px-4 py-2 text-left">Description</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                  <th className="px-4 py-2">Unit</th>
                  <th className="px-4 py-2 text-right">Unit Price</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.items?.map((it: any, i: number) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-gray-400">{it.item_number}</td>
                    <td className="px-4 py-2 text-gray-900 dark:text-white">{it.description}</td>
                    <td className="px-4 py-2 text-right">{it.quantity}</td>
                    <td className="px-4 py-2 text-center">{it.unit}</td>
                    <td className="px-4 py-2 text-right font-mono">{fmt(it.unit_price)}</td>
                    <td className="px-4 py-2 text-right font-mono font-medium">{fmt(it.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Terms */}
          {(data.payment_terms || data.delivery_terms || data.terms_and_conditions) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow space-y-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Terms</h2>
              {data.payment_terms && <div className="text-sm"><span className="font-medium text-gray-500">Payment:</span> <span className="text-gray-900 dark:text-white">{data.payment_terms}</span></div>}
              {data.delivery_terms && <div className="text-sm"><span className="font-medium text-gray-500">Delivery:</span> <span className="text-gray-900 dark:text-white">{data.delivery_terms}</span></div>}
              {data.terms_and_conditions && <div className="text-sm"><span className="font-medium text-gray-500">T&C:</span> <span className="text-gray-900 dark:text-white whitespace-pre-line">{data.terms_and_conditions}</span></div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
