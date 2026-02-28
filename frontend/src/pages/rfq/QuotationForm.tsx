import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { GreenButton } from '../../components/ui/GreenButton';
import { quotationAPI, supplierAPI, rfqAPI } from '../../services/rfqService';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

const EMPTY_ITEM = { rfq_item: '', unit_price: '', quantity: '', notes: '' };

export default function QuotationForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({ rfq: '', supplier: '', delivery_days: '', payment_terms: '', validity_days: '', notes: '' });
  const [lineItems, setLineItems] = useState([{ ...EMPTY_ITEM }]);
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [rfqLineItems, setRfqLineItems] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    rfqAPI.list().then((r) => setRfqs(r.data.results || r.data)).catch(() => {});
    supplierAPI.list().then((r) => setSuppliers(r.data.results || r.data)).catch(() => {});
    if (isEdit) {
      quotationAPI.get(Number(id)).then((r) => {
        const d = r.data;
        setForm({ rfq: d.rfq, supplier: d.supplier, delivery_days: d.delivery_days || '', payment_terms: d.payment_terms || '', validity_days: d.validity_days || '', notes: d.notes || '' });
        if (d.items?.length) setLineItems(d.items.map((li: any) => ({ rfq_item: li.rfq_item, unit_price: li.unit_price, quantity: li.quantity, notes: li.notes || '' })));
        // Load RFQ line items for the selected RFQ
        if (d.rfq) {
          rfqAPI.get(d.rfq).then((r2) => setRfqLineItems(r2.data.items || [])).catch(() => {});
        }
      }).catch(() => { toast.error('Failed to load'); navigate('/quotations'); });
    }
  }, [id, isEdit, navigate]);

  // When RFQ changes, load its line items
  const handleRfqChange = (rfqId: string) => {
    setForm((p) => ({ ...p, rfq: rfqId }));
    if (rfqId) {
      rfqAPI.get(Number(rfqId)).then((r) => {
        const items = r.data.items || [];
        setRfqLineItems(items);
        // Auto-populate line items from the RFQ
        if (!isEdit && items.length > 0) {
          setLineItems(items.map((it: any) => ({
            rfq_item: it.id,
            unit_price: '',
            quantity: it.quantity || '',
            notes: '',
          })));
        }
      }).catch(() => setRfqLineItems([]));
    } else {
      setRfqLineItems([]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleItemChange = (idx: number, field: string, val: string) => {
    setLineItems((p) => p.map((it, i) => i === idx ? { ...it, [field]: val } : it));
  };

  const addItem = () => setLineItems((p) => [...p, { ...EMPTY_ITEM }]);
  const removeItem = (idx: number) => setLineItems((p) => p.length > 1 ? p.filter((_, i) => i !== idx) : p);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, items: lineItems };
      if (isEdit) { await quotationAPI.update(Number(id), payload); toast.success('Quotation updated'); }
      else { await quotationAPI.create(payload); toast.success('Quotation created'); }
      navigate('/quotations');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const inputCls = 'w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit Quotation' : 'New Quotation'}</h1>
          <p className="text-gray-500 dark:text-gray-400">Supplier response to RFQ</p>
        </div>
        <GreenButton variant="outline" onClick={() => navigate('/quotations')}><ArrowLeft className="w-4 h-4 mr-2" /> Back</GreenButton>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card accent title="Quotation Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">RFQ <span className="text-red-500">*</span></label>
              <select name="rfq" value={form.rfq} onChange={(e) => handleRfqChange(e.target.value)} required className={inputCls}>
                <option value="">Select RFQ</option>
                {rfqs.map((r) => <option key={r.id} value={r.id}>{r.title} ({r.rfq_number || `RFQ-${r.id}`})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Supplier <span className="text-red-500">*</span></label>
              <select name="supplier" value={form.supplier} onChange={handleChange} required className={inputCls}>
                <option value="">Select Supplier</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Delivery Days</label>
              <input name="delivery_days" type="number" value={form.delivery_days} onChange={handleChange} placeholder="e.g. 14" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Payment Terms</label>
              <input name="payment_terms" value={form.payment_terms} onChange={handleChange} placeholder="e.g. Net 30" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Validity (days)</label>
              <input name="validity_days" type="number" value={form.validity_days} onChange={handleChange} placeholder="e.g. 30" className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className={inputCls + ' resize-none'} />
            </div>
          </div>
        </Card>

        <Card accent title="Line Items">
          {rfqLineItems.length === 0 && form.rfq && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">No line items found in this RFQ. Add items manually below.</p>
          )}
          <div className="space-y-3">
            {lineItems.map((it, idx) => (
              <div key={idx} className="flex flex-wrap items-end gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                <div className="flex-[2] min-w-[180px]">
                  <label className="block text-xs font-medium text-gray-500 mb-1">RFQ Line Item</label>
                  {rfqLineItems.length > 0 ? (
                    <select value={it.rfq_item} onChange={(e) => handleItemChange(idx, 'rfq_item', e.target.value)} className={inputCls}>
                      <option value="">Select item</option>
                      {rfqLineItems.map((ri) => <option key={ri.id} value={ri.id}>{ri.item_name} (x{ri.quantity} {ri.unit})</option>)}
                    </select>
                  ) : (
                    <input value={it.rfq_item} onChange={(e) => handleItemChange(idx, 'rfq_item', e.target.value)} placeholder="RFQ item ID" className={inputCls} />
                  )}
                </div>
                <div className="flex-1 min-w-[100px]"><label className="block text-xs font-medium text-gray-500 mb-1">Unit Price</label><input type="number" step="0.01" value={it.unit_price} onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)} placeholder="0.00" className={inputCls} /></div>
                <div className="flex-1 min-w-[80px]"><label className="block text-xs font-medium text-gray-500 mb-1">Quantity</label><input type="number" value={it.quantity} onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)} placeholder="0" className={inputCls} /></div>
                <div className="flex-1 min-w-[120px]"><label className="block text-xs font-medium text-gray-500 mb-1">Notes</label><input value={it.notes} onChange={(e) => handleItemChange(idx, 'notes', e.target.value)} className={inputCls} /></div>
                <button type="button" onClick={() => removeItem(idx)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            <button type="button" onClick={addItem} className="flex items-center gap-2 text-sm text-[#0E8F79] hover:text-[#3BC25B] font-medium mt-2"><Plus className="w-4 h-4" /> Add Line Item</button>
          </div>
        </Card>

        <div className="flex gap-3">
          <GreenButton type="submit" isLoading={saving}>{isEdit ? 'Update Quotation' : 'Create Quotation'}</GreenButton>
          <GreenButton type="button" variant="outline" onClick={() => navigate('/quotations')}>Cancel</GreenButton>
        </div>
      </form>
    </div>
  );
}
