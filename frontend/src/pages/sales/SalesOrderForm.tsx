import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { salesOrderAPI, formalQuotationAPI } from '../../services/salesService';
import { toast } from 'sonner';
import { Save, ArrowLeft, FileText } from 'lucide-react';

interface WonQuotation {
  id: number;
  quotation_number: string;
  client_name: string;
  project_title: string;
  total_amount: number;
  vat_rate: number;
  costing_sheet: number | null;
  rfq: number | null;
}

export default function SalesOrderForm() {
  const nav = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    client_name: '', project_title: '', description: '',
    date: new Date().toISOString().slice(0, 10),
    contract_amount: 0, vat_rate: 12,
    formal_quotation: null as number | null,
    rfq: null as number | null,
    costing_sheet: null as number | null,
    awarded_date: '',
  });
  const [saving, setSaving] = useState(false);
  const [wonQuotations, setWonQuotations] = useState<WonQuotation[]>([]);

  // Fetch won quotations
  useEffect(() => {
    formalQuotationAPI.list({ status: 'WON' }).then(({ data }) => {
      setWonQuotations(data.results || data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (isEdit) {
      salesOrderAPI.get(Number(id)).then(({ data }) => {
        setForm({
          client_name: data.client_name, project_title: data.project_title,
          description: data.description, date: data.date,
          contract_amount: data.contract_amount, vat_rate: data.vat_rate,
          formal_quotation: data.formal_quotation, rfq: data.rfq,
          costing_sheet: data.costing_sheet, awarded_date: data.awarded_date || '',
        });
      }).catch(() => toast.error('Failed to load'));
    }
  }, [id]);

  const setField = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const handleQuotationSelect = (fqId: number | null) => {
    setField('formal_quotation', fqId);
    if (fqId) {
      const q = wonQuotations.find(w => w.id === fqId);
      if (q) {
        setForm(prev => ({
          ...prev,
          formal_quotation: fqId,
          client_name: q.client_name,
          project_title: q.project_title,
          contract_amount: q.total_amount,
          vat_rate: q.vat_rate,
          costing_sheet: q.costing_sheet,
          rfq: q.rfq,
        }));
      }
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await salesOrderAPI.update(Number(id), form);
        toast.success('Sales order updated');
      } else {
        const { data } = await salesOrderAPI.create(form);
        toast.success('Sales order created');
        nav(`/sales/orders/${data.id}`);
        return;
      }
      nav('/sales/orders');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Save failed');
    } finally { setSaving(false); }
  };

  const inp = "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm";
  const fmt = (n: number) => n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <button onClick={() => nav(-1)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit' : 'New'} Sales Order</h1>
      </div>

      <form onSubmit={submit} className="space-y-6">
        {/* Linked Won Quotation */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Linked Formal Quotation</h2>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Won Quotation</label>
            <select
              value={form.formal_quotation ?? ''}
              onChange={e => handleQuotationSelect(e.target.value ? Number(e.target.value) : null)}
              className={inp}
            >
              <option value="">-- Select a Won Quotation (optional) --</option>
              {wonQuotations.map(q => (
                <option key={q.id} value={q.id}>{q.quotation_number} — {q.client_name} — {q.project_title} (₱{fmt(q.total_amount)})</option>
              ))}
            </select>
            {wonQuotations.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">No won quotations available. Mark a quotation as "Won" first.</p>
            )}
          </div>
        </div>

        {/* Order Details */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Order Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Client Name *</label><input value={form.client_name} onChange={e => setField('client_name', e.target.value)} className={inp} required /></div>
            <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Project Title *</label><input value={form.project_title} onChange={e => setField('project_title', e.target.value)} className={inp} required /></div>
            <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date</label><input type="date" value={form.date} onChange={e => setField('date', e.target.value)} className={inp} /></div>
            <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Awarded Date</label><input type="date" value={form.awarded_date} onChange={e => setField('awarded_date', e.target.value)} className={inp} /></div>
            <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Contract Amount</label><input type="number" value={form.contract_amount} onChange={e => setField('contract_amount', +e.target.value)} className={inp} step="0.01" /></div>
            <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">VAT Rate (%)</label><input type="number" value={form.vat_rate} onChange={e => setField('vat_rate', +e.target.value)} className={inp} step="0.01" /></div>
          </div>
          <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label><textarea value={form.description} onChange={e => setField('description', e.target.value)} className={inp} rows={3} /></div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => nav(-1)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#63D44A] to-[#0E8F79] text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition">
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
