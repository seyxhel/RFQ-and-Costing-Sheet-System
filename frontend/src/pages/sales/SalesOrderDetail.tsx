import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { salesOrderAPI, contractAnalysisAPI } from '../../services/salesService';
import { toast } from 'sonner';
import { ArrowLeft, Edit, Play, CheckCircle, Plus } from 'lucide-react';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  CONFIRMED: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

export default function SalesOrderDetail() {
  const nav = useNavigate();
  const { id } = useParams();
  const [data, setData] = useState<any>(null);

  const load = async () => {
    try {
      const { data } = await salesOrderAPI.get(Number(id));
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
          <button onClick={() => nav('/sales/orders')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{data.so_number}</h1>
            <p className="text-sm text-gray-500">{data.project_title}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[data.status] || ''}`}>{data.status}</span>
        </div>
        <div className="flex items-center gap-2">
          {data.status === 'DRAFT' && (
            <>
              <button onClick={() => nav(`/sales/orders/${id}/edit`)} className="flex items-center gap-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700"><Edit className="w-4 h-4" /> Edit</button>
              <button onClick={() => action(() => salesOrderAPI.confirm(Number(id)), 'Order confirmed!')} className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"><CheckCircle className="w-4 h-4" /> Confirm</button>
            </>
          )}
          {data.status === 'CONFIRMED' && (
            <button onClick={() => action(() => salesOrderAPI.start(Number(id)), 'In progress!')} className="flex items-center gap-1 px-3 py-2 bg-yellow-500 text-white rounded-lg text-sm hover:bg-yellow-600"><Play className="w-4 h-4" /> Start</button>
          )}
          {data.status === 'IN_PROGRESS' && (
            <button onClick={() => action(() => salesOrderAPI.complete(Number(id)), 'Completed!')} className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"><CheckCircle className="w-4 h-4" /> Complete</button>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
          <div className="text-sm text-gray-500 mb-1">Contract Amount</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{fmt(data.contract_amount)}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
          <div className="text-sm text-gray-500 mb-1">Client</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">{data.client_name}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
          <div className="text-sm text-gray-500 mb-1">Awarded Date</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">{data.awarded_date || '—'}</div>
        </div>
      </div>

      {/* Contract Analyses */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Contract Analyses</h2>
        </div>
        {data.contract_analyses?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-2 text-left">Perspective</th>
                  <th className="px-4 py-2 text-right">Contract Price</th>
                  <th className="px-4 py-2 text-right">Total Deductions</th>
                  <th className="px-4 py-2 text-right">Net Cash Flow</th>
                  <th className="px-4 py-2 text-right">VAT Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {data.contract_analyses.map((ca: any) => (
                  <tr key={ca.id}>
                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">{ca.name}</td>
                    <td className="px-4 py-2 text-right font-mono">{fmt(ca.contract_price)}</td>
                    <td className="px-4 py-2 text-right font-mono text-red-500">{fmt(ca.total_deductions)}</td>
                    <td className="px-4 py-2 text-right font-mono text-green-600 font-bold">{fmt(ca.net_cash_flow)} ({ca.net_cash_flow_percent}%)</td>
                    <td className="px-4 py-2 text-right font-mono">{fmt(ca.vat_payable)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-400">No contract analyses yet.</div>
        )}
      </div>

      {data.description && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Description</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">{data.description}</p>
        </div>
      )}
    </div>
  );
}
