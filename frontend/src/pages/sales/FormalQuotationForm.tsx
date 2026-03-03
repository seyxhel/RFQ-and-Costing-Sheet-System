import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formalQuotationAPI } from '../../services/salesService';
import { toast } from 'sonner';
import { Save, ArrowLeft, Plus, Trash2 } from 'lucide-react';

interface LineItem {
  id?: number;
  item_number: number;
  description: string;
  brand: string;
  model_number: string;
  quantity: number;
  unit: string;
  unit_price: number;
}

export default function FormalQuotationForm() {
  const nav = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    client_name: '', client_address: '', client_contact: '', client_email: '',
    project_title: '', description: '', warranty: '',
    date: new Date().toISOString().slice(0, 10),
    vat_rate: 12, payment_terms: '', delivery_terms: '', validity_days: 30,
    terms_and_conditions: '', notes: '',
    rfq: null as number | null,
    costing_sheet: null as number | null,
    margin_level: null as number | null,
  });
  const [items, setItems] = useState<LineItem[]>([
    { item_number: 1, description: '', brand: '', model_number: '', quantity: 1, unit: 'pcs', unit_price: 0 },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      formalQuotationAPI.get(Number(id)).then(({ data }) => {
        setForm({
          client_name: data.client_name, client_address: data.client_address,
          client_contact: data.client_contact, client_email: data.client_email,
          project_title: data.project_title, description: data.description,
          warranty: data.warranty, date: data.date, vat_rate: data.vat_rate,
          payment_terms: data.payment_terms, delivery_terms: data.delivery_terms,
          validity_days: data.validity_days, terms_and_conditions: data.terms_and_conditions,
          notes: data.notes, rfq: data.rfq, costing_sheet: data.costing_sheet,
          margin_level: data.margin_level,
        });
        if (data.items?.length) setItems(data.items);
      }).catch(() => toast.error('Failed to load quotation'));
    }
  }, [id]);

  const setField = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));
  const setItem = (i: number, k: string, v: any) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [k]: v } : it));

  const addItem = () => setItems(prev => [...prev, {
    item_number: prev.length + 1, description: '', brand: '', model_number: '',
    quantity: 1, unit: 'pcs', unit_price: 0,
  }]);

  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i).map((it, idx) => ({ ...it, item_number: idx + 1 })));

  const subtotal = items.reduce((s, it) => s + it.quantity * it.unit_price, 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, items };
      if (isEdit) {
        await formalQuotationAPI.update(Number(id), payload);
        toast.success('Quotation updated');
      } else {
        const { data } = await formalQuotationAPI.create(payload);
        toast.success('Quotation created');
        nav(`/sales/quotations/${data.id}`);
        return;
      }
      nav('/sales/quotations');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Save failed');
    } finally { setSaving(false); }
  };

  const inp = "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm";

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <button onClick={() => nav(-1)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit' : 'New'} Formal Quotation</h1>
      </div>

      <form onSubmit={submit} className="space-y-6">
        {/* Client Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Client Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Client Name *</label><input value={form.client_name} onChange={e => setField('client_name', e.target.value)} className={inp} required /></div>
            <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Contact Person</label><input value={form.client_contact} onChange={e => setField('client_contact', e.target.value)} className={inp} /></div>
            <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email</label><input type="email" value={form.client_email} onChange={e => setField('client_email', e.target.value)} className={inp} /></div>
            <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date</label><input type="date" value={form.date} onChange={e => setField('date', e.target.value)} className={inp} /></div>
          </div>
          <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Address</label><textarea value={form.client_address} onChange={e => setField('client_address', e.target.value)} className={inp} rows={2} /></div>
        </div>

        {/* Project */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Project Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Project Title *</label><input value={form.project_title} onChange={e => setField('project_title', e.target.value)} className={inp} required /></div>
            <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Warranty</label><input value={form.warranty} onChange={e => setField('warranty', e.target.value)} className={inp} /></div>
          </div>
          <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label><textarea value={form.description} onChange={e => setField('description', e.target.value)} className={inp} rows={2} /></div>
        </div>

        {/* Line Items */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Line Items</h2>
            <button type="button" onClick={addItem} className="flex items-center gap-1 text-sm text-[#3BC25B] hover:underline"><Plus className="w-4 h-4" /> Add Item</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-gray-500 dark:text-gray-400 text-xs">
                <tr>
                  <th className="px-2 py-1 text-left w-8">#</th>
                  <th className="px-2 py-1 text-left">Description</th>
                  <th className="px-2 py-1 text-left w-28">Brand</th>
                  <th className="px-2 py-1 text-left w-28">Model</th>
                  <th className="px-2 py-1 text-right w-20">Qty</th>
                  <th className="px-2 py-1 text-left w-16">Unit</th>
                  <th className="px-2 py-1 text-right w-28">Unit Price</th>
                  <th className="px-2 py-1 text-right w-28">Amount</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="px-2 py-1 text-gray-400">{i + 1}</td>
                    <td className="px-2 py-1"><input value={it.description} onChange={e => setItem(i, 'description', e.target.value)} className={inp} placeholder="Description" /></td>
                    <td className="px-2 py-1"><input value={it.brand} onChange={e => setItem(i, 'brand', e.target.value)} className={inp} /></td>
                    <td className="px-2 py-1"><input value={it.model_number} onChange={e => setItem(i, 'model_number', e.target.value)} className={inp} /></td>
                    <td className="px-2 py-1"><input type="number" value={it.quantity} onChange={e => setItem(i, 'quantity', +e.target.value)} className={inp + ' text-right'} min={0} /></td>
                    <td className="px-2 py-1"><input value={it.unit} onChange={e => setItem(i, 'unit', e.target.value)} className={inp} /></td>
                    <td className="px-2 py-1"><input type="number" value={it.unit_price} onChange={e => setItem(i, 'unit_price', +e.target.value)} className={inp + ' text-right'} min={0} step="0.01" /></td>
                    <td className="px-2 py-1 text-right font-mono text-gray-900 dark:text-white">{(it.quantity * it.unit_price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                    <td className="px-2 py-1"><button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end text-sm space-x-8 pt-2 border-t border-gray-100 dark:border-gray-700">
            <span className="text-gray-500">Subtotal: <strong className="text-gray-900 dark:text-white">₱{subtotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></span>
            <span className="text-gray-500">VAT ({form.vat_rate}%): <strong className="text-gray-900 dark:text-white">₱{(subtotal * form.vat_rate / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></span>
            <span className="text-gray-500">Total: <strong className="text-gray-900 dark:text-white">₱{(subtotal * (1 + form.vat_rate / 100)).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</strong></span>
          </div>
        </div>

        {/* Terms */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Terms</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">VAT Rate (%)</label><input type="number" value={form.vat_rate} onChange={e => setField('vat_rate', +e.target.value)} className={inp} step="0.01" /></div>
            <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Validity (days)</label><input type="number" value={form.validity_days} onChange={e => setField('validity_days', +e.target.value)} className={inp} /></div>
          </div>
          <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Payment Terms</label><textarea value={form.payment_terms} onChange={e => setField('payment_terms', e.target.value)} className={inp} rows={2} /></div>
          <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Delivery Terms</label><textarea value={form.delivery_terms} onChange={e => setField('delivery_terms', e.target.value)} className={inp} rows={2} /></div>
          <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Terms & Conditions</label><textarea value={form.terms_and_conditions} onChange={e => setField('terms_and_conditions', e.target.value)} className={inp} rows={3} /></div>
          <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label><textarea value={form.notes} onChange={e => setField('notes', e.target.value)} className={inp} rows={2} /></div>
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
