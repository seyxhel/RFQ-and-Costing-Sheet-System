import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { GreenButton } from '../../components/ui/GreenButton';
import { contractAnalysisAPI, salesOrderAPI } from '../../services/salesService';
import { toast } from 'sonner';
import { Search, Plus, Save, X, RefreshCw, Pencil, Trash2 } from 'lucide-react';

export default function ContractAnalysisList() {
  const nav = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    sales_order: '', name: '', contract_price: 0,
    warranty_security: 0, ewt_amount: 0, lgu_amount: 0,
    facilitation: 0, cogs: 0, implementation: 0, net_benefit: 0, notes: '',
  });
  const [saving, setSaving] = useState(false);

  const defaultForm = {
    sales_order: '', name: '', contract_price: 0,
    warranty_security: 0, ewt_amount: 0, lgu_amount: 0,
    facilitation: 0, cogs: 0, implementation: 0, net_benefit: 0, notes: '',
  };

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

  const fmt = (n: number) => `₱${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const setField = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const startEdit = (ca: any) => {
    setEditingId(ca.id);
    setForm({
      sales_order: String(ca.sales_order),
      name: ca.name || '',
      contract_price: ca.contract_price || 0,
      warranty_security: ca.warranty_security || 0,
      ewt_amount: ca.ewt_amount || 0,
      lgu_amount: ca.lgu_amount || 0,
      facilitation: ca.facilitation || 0,
      cogs: ca.cogs || 0,
      implementation: ca.implementation || 0,
      net_benefit: ca.net_benefit || 0,
      notes: ca.notes || '',
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(defaultForm);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, sales_order: Number(form.sales_order) };
      if (editingId) {
        await contractAnalysisAPI.update(editingId, payload);
        toast.success('Contract analysis updated');
      } else {
        await contractAnalysisAPI.create(payload);
        toast.success('Contract analysis created');
      }
      cancelForm();
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this contract analysis?')) return;
    try {
      await contractAnalysisAPI.delete(id);
      setItems(p => p.filter(r => r.id !== id));
      toast.success('Contract analysis deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const recalc = async (id: number) => {
    try {
      await contractAnalysisAPI.recalculate(id);
      toast.success('Recalculated');
      load();
    } catch { toast.error('Recalculate failed'); }
  };

  const inp = "w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contract Analysis</h1>
          <p className="text-gray-500 dark:text-gray-400">Financial breakdown from different perspectives</p>
        </div>
        <GreenButton onClick={() => { cancelForm(); setShowForm(true); }}><Plus className="w-4 h-4 mr-2" /> New Analysis</GreenButton>
      </div>

      {/* Inline Create/Edit Form */}
      {showForm && (
        <Card accent>
          <form onSubmit={submit}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{editingId ? 'Edit Contract Analysis' : 'New Contract Analysis'}</h3>
              <button type="button" onClick={cancelForm} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Sales Order <span className="text-red-500">*</span></label>
                <select value={form.sales_order} onChange={e => setField('sales_order', e.target.value)} className={inp} required>
                  <option value="">Select...</option>
                  {salesOrders.map((so: any) => <option key={so.id} value={so.id}>{so.so_number} — {so.project_title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Perspective Name <span className="text-red-500">*</span></label>
                <input value={form.name} onChange={e => setField('name', e.target.value)} className={inp} placeholder="e.g. Direct to End-User" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Contract Price</label>
                <input type="number" value={form.contract_price} onChange={e => setField('contract_price', +e.target.value)} className={inp} step="0.01" />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
              <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Warranty Security</label><input type="number" value={form.warranty_security} onChange={e => setField('warranty_security', +e.target.value)} className={inp} step="0.01" /></div>
              <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">EWT (5%)</label><input type="number" value={form.ewt_amount} onChange={e => setField('ewt_amount', +e.target.value)} className={inp} step="0.01" /></div>
              <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">LGU (2%)</label><input type="number" value={form.lgu_amount} onChange={e => setField('lgu_amount', +e.target.value)} className={inp} step="0.01" /></div>
              <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Facilitation</label><input type="number" value={form.facilitation} onChange={e => setField('facilitation', +e.target.value)} className={inp} step="0.01" /></div>
              <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">COGS</label><input type="number" value={form.cogs} onChange={e => setField('cogs', +e.target.value)} className={inp} step="0.01" /></div>
              <div><label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Implementation</label><input type="number" value={form.implementation} onChange={e => setField('implementation', +e.target.value)} className={inp} step="0.01" /></div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
              <textarea value={form.notes} onChange={e => setField('notes', e.target.value)} className={inp} rows={2} />
            </div>
            <div className="flex gap-3 mt-4">
              <GreenButton type="submit" isLoading={saving}><Save className="w-4 h-4 mr-2" /> {editingId ? 'Update' : 'Save'}</GreenButton>
              <GreenButton variant="outline" type="button" onClick={cancelForm}>Cancel</GreenButton>
            </div>
          </form>
        </Card>
      )}

      <Card accent>
        <div className="overflow-x-auto overflow-y-visible relative">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 font-semibold">Sales Order</th>
                <th className="px-6 py-4 font-semibold">Perspective</th>
                <th className="px-6 py-4 font-semibold text-right">Contract Price</th>
                <th className="px-6 py-4 font-semibold text-right">Total Deductions</th>
                <th className="px-6 py-4 font-semibold text-right">Net Cash Flow</th>
                <th className="px-6 py-4 font-semibold text-right">%</th>
                <th className="px-6 py-4 font-semibold text-right">VAT Payable</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-400">No contract analyses yet.</td></tr>
              ) : items.map((ca) => (
                <tr key={ca.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-bold text-[#0E8F79] dark:text-green-400 text-xs">SO-{ca.sales_order}</span>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{ca.name}</td>
                  <td className="px-6 py-4 text-right font-mono text-gray-900 dark:text-white">{fmt(ca.contract_price)}</td>
                  <td className="px-6 py-4 text-right font-mono text-red-500">{fmt(ca.total_deductions)}</td>
                  <td className="px-6 py-4 text-right font-mono text-green-600 dark:text-green-400 font-bold">{fmt(ca.net_cash_flow)}</td>
                  <td className="px-6 py-4 text-right font-mono text-gray-600 dark:text-gray-300">{ca.net_cash_flow_percent}%</td>
                  <td className="px-6 py-4 text-right font-mono text-gray-600 dark:text-gray-300">{fmt(ca.vat_payable)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => startEdit(ca)} className="p-1.5 text-gray-400 hover:text-[#0E8F79] dark:hover:text-green-400 transition-colors" title="Edit"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => recalc(ca.id)} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors" title="Recalculate"><RefreshCw className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(ca.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
