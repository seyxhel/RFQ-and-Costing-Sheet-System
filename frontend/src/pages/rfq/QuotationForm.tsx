import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { GreenButton } from '../../components/ui/GreenButton';
import { quotationAPI, supplierAPI, rfqAPI } from '../../services/rfqService';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const EMPTY_ITEM = {
  rfq_item: '', offer_type: 'SAME', brand: '', model_number: '', description: '',
  quantity: '', unit: 'pcs', unit_price: '0', vat_type: 'VAT_INC', vat_rate: '12.00',
  availability: '', availability_detail: '', warranty_period: '', warranty_detail: '',
  price_validity: '', tax_type: '', remarks: '', reference: '', delivery_days: '0', notes: '',
};

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
  const [expandedItem, setExpandedItem] = useState<number>(0);

  useEffect(() => {
    rfqAPI.list().then((r) => setRfqs(r.data.results || r.data)).catch(() => {});
    supplierAPI.list().then((r) => setSuppliers(r.data.results || r.data)).catch(() => {});
    if (isEdit) {
      quotationAPI.get(Number(id)).then((r) => {
        const d = r.data;
        setForm({ rfq: d.rfq, supplier: d.supplier, delivery_days: d.delivery_days || '', payment_terms: d.payment_terms || '', validity_days: d.validity_days || '', notes: d.notes || '' });
        if (d.items?.length) setLineItems(d.items.map((li: any) => ({
          rfq_item: li.rfq_item || '', offer_type: li.offer_type || 'SAME',
          brand: li.brand || '', model_number: li.model_number || '', description: li.description || '',
          quantity: li.quantity || '', unit: li.unit || 'pcs', unit_price: li.unit_price || '0',
          vat_type: li.vat_type || 'VAT_INC', vat_rate: li.vat_rate || '12.00',
          availability: li.availability || '', availability_detail: li.availability_detail || '',
          warranty_period: li.warranty_period || '', warranty_detail: li.warranty_detail || '',
          price_validity: li.price_validity || '', tax_type: li.tax_type || '',
          remarks: li.remarks || '', reference: li.reference || '',
          delivery_days: li.delivery_days || '0', notes: li.notes || '',
        })));
        if (d.rfq) rfqAPI.get(d.rfq).then((r2) => setRfqLineItems(r2.data.items || [])).catch(() => {});
      }).catch(() => { toast.error('Failed to load'); navigate('/quotations'); });
    }
  }, [id, isEdit, navigate]);

  const handleRfqChange = (rfqId: string) => {
    setForm((p) => ({ ...p, rfq: rfqId }));
    if (rfqId) {
      rfqAPI.get(Number(rfqId)).then((r) => {
        const items = r.data.items || [];
        setRfqLineItems(items);
        if (!isEdit && items.length > 0) {
          setLineItems(items.map((it: any) => ({
            ...EMPTY_ITEM,
            rfq_item: it.id, quantity: it.quantity || '', unit: it.unit || 'pcs',
            brand: it.brand || '', model_number: it.model_number || '',
            description: it.description || '',
          })));
        }
      }).catch(() => setRfqLineItems([]));
    } else { setRfqLineItems([]); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleItemChange = (idx: number, field: string, val: string) => {
    setLineItems((p) => p.map((it, i) => i === idx ? { ...it, [field]: val } : it));
  };

  const addItem = () => { setLineItems((p) => [...p, { ...EMPTY_ITEM }]); setExpandedItem(lineItems.length); };
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
  const smallLabel = 'block text-xs font-medium text-gray-500 mb-1';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit Quotation' : 'New Quotation'}</h1>
          <p className="text-gray-500 dark:text-gray-400">Supplier response with canvass matrix fields</p>
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

        <Card accent title="Quotation Items (Canvass Matrix)">
          {rfqLineItems.length === 0 && form.rfq && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">No line items found in this RFQ. Add items manually below.</p>
          )}
          <div className="space-y-3">
            {lineItems.map((it, idx) => {
              const isExpanded = expandedItem === idx;
              const rfqItem = rfqLineItems.find((ri: any) => String(ri.id) === String(it.rfq_item));
              const subtotal = Number(it.quantity || 0) * Number(it.unit_price || 0);
              return (
                <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  {/* Collapsed header */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 cursor-pointer" onClick={() => setExpandedItem(isExpanded ? -1 : idx)}>
                    <span className="text-xs font-bold text-gray-400 w-6">#{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {rfqItem ? rfqItem.item_name : it.brand || it.description || 'New Item'}
                        {it.model_number && <span className="text-gray-500 ml-1">({it.model_number})</span>}
                      </p>
                      <p className="text-xs text-gray-500">
                        {it.offer_type === 'COUNTER' ? 'Counter-offer' : 'Same as req'} • {it.vat_type === 'VAT_INC' ? 'VAT Inc' : it.vat_type === 'VAT_EX' ? 'VAT Ex' : 'Exempt'} • ₱{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <button type="button" onClick={(e) => { e.stopPropagation(); removeItem(idx); }} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><Trash2 className="w-4 h-4" /></button>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>

                  {/* Expanded fields */}
                  {isExpanded && (
                    <div className="p-4 space-y-4">
                      {/* Row 1: RFQ Item + Offer Type */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="col-span-2">
                          <label className={smallLabel}>RFQ Line Item <span className="text-red-500">*</span></label>
                          {rfqLineItems.length > 0 ? (
                            <select value={it.rfq_item} onChange={(e) => handleItemChange(idx, 'rfq_item', e.target.value)} className={inputCls}>
                              <option value="">Select item</option>
                              {rfqLineItems.map((ri: any) => <option key={ri.id} value={ri.id}>{ri.item_name} (x{ri.quantity} {ri.unit})</option>)}
                            </select>
                          ) : <input value={it.rfq_item} onChange={(e) => handleItemChange(idx, 'rfq_item', e.target.value)} placeholder="RFQ item ID" className={inputCls} />}
                        </div>
                        <div>
                          <label className={smallLabel}>Offer Type</label>
                          <select value={it.offer_type} onChange={(e) => handleItemChange(idx, 'offer_type', e.target.value)} className={inputCls}>
                            <option value="SAME">Same as per requirement</option>
                            <option value="COUNTER">Counter-offer</option>
                          </select>
                        </div>
                        <div>
                          <label className={smallLabel}>Description</label>
                          <input value={it.description} onChange={(e) => handleItemChange(idx, 'description', e.target.value)} className={inputCls} placeholder="Item description" />
                        </div>
                      </div>

                      {/* Row 2: Brand, Model, Qty, Unit, Price */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div>
                          <label className={smallLabel}>Brand</label>
                          <input value={it.brand} onChange={(e) => handleItemChange(idx, 'brand', e.target.value)} className={inputCls} placeholder="e.g. Cisco" />
                        </div>
                        <div>
                          <label className={smallLabel}>Model Number</label>
                          <input value={it.model_number} onChange={(e) => handleItemChange(idx, 'model_number', e.target.value)} className={inputCls} placeholder="e.g. C9200L" />
                        </div>
                        <div>
                          <label className={smallLabel}>Quantity</label>
                          <input type="number" step="0.01" value={it.quantity} onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)} className={inputCls} />
                        </div>
                        <div>
                          <label className={smallLabel}>Unit</label>
                          <input value={it.unit} onChange={(e) => handleItemChange(idx, 'unit', e.target.value)} className={inputCls} />
                        </div>
                        <div>
                          <label className={smallLabel}>Unit Price (PHP)</label>
                          <input type="number" step="0.01" value={it.unit_price} onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)} className={inputCls} />
                        </div>
                      </div>

                      {/* Row 3: VAT */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className={smallLabel}>VAT Type</label>
                          <select value={it.vat_type} onChange={(e) => handleItemChange(idx, 'vat_type', e.target.value)} className={inputCls}>
                            <option value="VAT_INC">VAT Inclusive</option>
                            <option value="VAT_EX">VAT Exclusive</option>
                            <option value="VAT_EXEMPT">VAT Exempt</option>
                          </select>
                        </div>
                        <div>
                          <label className={smallLabel}>VAT Rate %</label>
                          <input type="number" step="0.01" value={it.vat_rate} onChange={(e) => handleItemChange(idx, 'vat_rate', e.target.value)} className={inputCls} />
                        </div>
                        <div>
                          <label className={smallLabel}>Tax Type</label>
                          <input value={it.tax_type} onChange={(e) => handleItemChange(idx, 'tax_type', e.target.value)} className={inputCls} placeholder="e.g. Inclusive of All Taxes" />
                        </div>
                        <div>
                          <label className={smallLabel}>Subtotal</label>
                          <p className="py-2.5 text-sm font-bold text-[#0E8F79]">₱{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>

                      {/* Row 4: Availability & Warranty */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className={smallLabel}>Availability</label>
                          <select value={it.availability} onChange={(e) => handleItemChange(idx, 'availability', e.target.value)} className={inputCls}>
                            <option value="">—</option>
                            <option value="ON_STOCK">On-Stock</option>
                            <option value="ORDER_BASIS">Order Basis</option>
                          </select>
                        </div>
                        <div>
                          <label className={smallLabel}>Avail. Detail</label>
                          <input value={it.availability_detail} onChange={(e) => handleItemChange(idx, 'availability_detail', e.target.value)} className={inputCls} placeholder="e.g. 30 to 45 Days" />
                        </div>
                        <div>
                          <label className={smallLabel}>Warranty Period</label>
                          <select value={it.warranty_period} onChange={(e) => handleItemChange(idx, 'warranty_period', e.target.value)} className={inputCls}>
                            <option value="">—</option>
                            <option value="6MOS">6 Months</option>
                            <option value="1YR">1 Year</option>
                            <option value="3YRS">3 Years</option>
                            <option value="5YRS">5 Years</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className={smallLabel}>Warranty Detail</label>
                          <input value={it.warranty_detail} onChange={(e) => handleItemChange(idx, 'warranty_detail', e.target.value)} className={inputCls} placeholder="e.g. Parts & Labor" />
                        </div>
                      </div>

                      {/* Row 5: Price Validity, Reference, Remarks */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                          <label className={smallLabel}>Price Validity</label>
                          <input value={it.price_validity} onChange={(e) => handleItemChange(idx, 'price_validity', e.target.value)} className={inputCls} placeholder="e.g. 15 days" />
                        </div>
                        <div>
                          <label className={smallLabel}>Reference</label>
                          <input value={it.reference} onChange={(e) => handleItemChange(idx, 'reference', e.target.value)} className={inputCls} placeholder="Supplier ref #" />
                        </div>
                        <div>
                          <label className={smallLabel}>Delivery Days</label>
                          <input type="number" value={it.delivery_days} onChange={(e) => handleItemChange(idx, 'delivery_days', e.target.value)} className={inputCls} />
                        </div>
                      </div>
                      <div>
                        <label className={smallLabel}>Remarks</label>
                        <textarea value={it.remarks} onChange={(e) => handleItemChange(idx, 'remarks', e.target.value)} rows={2} className={inputCls + ' resize-none'} placeholder="e.g. VAT Inclusive, free shipping..." />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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
