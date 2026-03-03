import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { contractAnalysisAPI, salesOrderAPI } from '../../services/salesService';
import { toast } from 'sonner';
import { Search, Plus, Save, X, RefreshCw } from 'lucide-react';

export default function ContractAnalysisList() {
  const nav = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    sales_order: '', name: '', contract_price: 0,
    warranty_security: 0, ewt_amount: 0, lgu_amount: 0,
    facilitation: 0, cogs: 0, implementation: 0, net_benefit: 0, notes: '',
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [{ data: ca }, { data: so }] = await Promise.all([
        contractAnalysisAPI.list(),
        salesOrderAPI.list(),
      ]);
      setItems(ca.results ?? ca);
      setSalesOrders(so.results ?? so);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const fmt = (n: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);

  const setField = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await contractAnalysisAPI.create({
        ...form,
        sales_order: Number(form.sales_order),
      });
      toast.success('Contract analysis created');
      setShowForm(false);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Save failed');
    } finally { setSaving(false); }
  };

  const recalc = async (id: number) => {
    try {
      await contractAnalysisAPI.recalculate(id);
      toast.success('Recalculated');
      load();
    } catch { toast.error('Recalculate failed'); }
  };

  const inp = "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contract Analysis</h1>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#63D44A] to-[#0E8F79] text-white rounded-lg hover:opacity-90 transition">
          <Plus className="w-4 h-4" /> New Analysis
        </button>
      </div>

      {/* Inline Create Form */}
      {showForm && (
        <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Contract Analysis</h2>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Sales Order *</label>
              <select value={form.sales_order} onChange={e => setField('sales_order', e.target.value)} className={inp} required>
                <option value="">Select...</option>
                {salesOrders.map((so: any) => <option key={so.id} value={so.id}>{so.so_number} — {so.project_title}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Perspective Name *</label><input value={form.name} onChange={e => setField('name', e.target.value)} className={inp} placeholder="e.g. Direct to End-User" required /></div>
            <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Contract Price</label><input type="number" value={form.contract_price} onChange={e => setField('contract_price', +e.target.value)} className={inp} step="0.01" /></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Warranty Security</label><input type="number" value={form.warranty_security} onChange={e => setField('warranty_security', +e.target.value)} className={inp} step="0.01" /></div>
            <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">EWT (5%)</label><input type="number" value={form.ewt_amount} onChange={e => setField('ewt_amount', +e.target.value)} className={inp} step="0.01" /></div>
            <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">LGU (2%)</label><input type="number" value={form.lgu_amount} onChange={e => setField('lgu_amount', +e.target.value)} className={inp} step="0.01" /></div>
            <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Facilitation</label><input type="number" value={form.facilitation} onChange={e => setField('facilitation', +e.target.value)} className={inp} step="0.01" /></div>
            <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">COGS</label><input type="number" value={form.cogs} onChange={e => setField('cogs', +e.target.value)} className={inp} step="0.01" /></div>
            <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Implementation</label><input type="number" value={form.implementation} onChange={e => setField('implementation', +e.target.value)} className={inp} step="0.01" /></div>
          </div>
          <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label><textarea value={form.notes} onChange={e => setField('notes', e.target.value)} className={inp} rows={2} /></div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#63D44A] to-[#0E8F79] text-white rounded-lg text-sm disabled:opacity-50">
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3 text-left">Sales Order</th>
                <th className="px-4 py-3 text-left">Perspective</th>
                <th className="px-4 py-3 text-right">Contract Price</th>
                <th className="px-4 py-3 text-right">Total Deductions</th>
                <th className="px-4 py-3 text-right">Net Cash Flow</th>
                <th className="px-4 py-3 text-right">%</th>
                <th className="px-4 py-3 text-right">VAT Payable</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {items.map((ca: any) => (
                <tr key={ca.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">SO-{ca.sales_order}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{ca.name}</td>
                  <td className="px-4 py-3 text-right font-mono">{fmt(ca.contract_price)}</td>
                  <td className="px-4 py-3 text-right font-mono text-red-500">{fmt(ca.total_deductions)}</td>
                  <td className="px-4 py-3 text-right font-mono text-green-600 font-bold">{fmt(ca.net_cash_flow)}</td>
                  <td className="px-4 py-3 text-right font-mono">{ca.net_cash_flow_percent}%</td>
                  <td className="px-4 py-3 text-right font-mono">{fmt(ca.vat_payable)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => recalc(ca.id)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" title="Recalculate"><RefreshCw className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">No contract analyses yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
