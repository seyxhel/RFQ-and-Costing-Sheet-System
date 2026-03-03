import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formalQuotationAPI } from '../../services/salesService';
import { toast } from 'sonner';
import { ArrowLeft, Edit, Send, CheckCircle, XCircle } from 'lucide-react';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  SENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  ACCEPTED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  REVISED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
};

export default function FormalQuotationDetail() {
  const nav = useNavigate();
  const { id } = useParams();
  const [data, setData] = useState<any>(null);

  const load = async () => {
    try {
      const { data } = await formalQuotationAPI.get(Number(id));
      setData(data);
    } catch { toast.error('Failed to load'); }
  };

  useEffect(() => { load(); }, [id]);

  const action = async (fn: () => Promise<any>, msg: string) => {
    try { await fn(); toast.success(msg); load(); } catch { toast.error('Action failed'); }
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);

  if (!data) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6 max-w-5xl">
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
          {data.status === 'SENT' && (
            <>
              <button onClick={() => action(() => formalQuotationAPI.accept(Number(id)), 'Accepted!')} className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"><CheckCircle className="w-4 h-4" /> Accept</button>
              <button onClick={() => action(() => formalQuotationAPI.reject(Number(id)), 'Rejected')} className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"><XCircle className="w-4 h-4" /> Reject</button>
            </>
          )}
        </div>
      </div>

      {/* Client & Project */}
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
              <th className="px-4 py-2 text-left">Brand</th>
              <th className="px-4 py-2 text-left">Model</th>
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
                <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{it.brand || '—'}</td>
                <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{it.model_number || '—'}</td>
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
  );
}
