import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { GreenButton } from '../../components/ui/GreenButton';
import { purchaseOrderAPI } from '../../services/procurementService';
import { rfqAPI, supplierAPI } from '../../services/rfqService';
import { budgetAPI } from '../../services/budgetService';
import { productAPI } from '../../services/productService';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Search } from 'lucide-react';

export default function POForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '', description: '', supplier: '' as string | number,
    rfq: '' as string | number, budget: '' as string | number,
    expected_delivery_date: '', notes: '',
  });
  const [lineItems, setLineItems] = useState<any[]>([
    { product: '', description: '', quantity: 1, unit_cost: '' },
  ]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      supplierAPI.list().catch(() => ({ data: [] })),
      rfqAPI.list().catch(() => ({ data: [] })),
      budgetAPI.list().catch(() => ({ data: [] })),
      productAPI.list().catch(() => ({ data: [] })),
    ]).then(([sRes, rRes, bRes, pRes]) => {
      setSuppliers(sRes.data.results || sRes.data || []);
      setRfqs(rRes.data.results || rRes.data || []);
      setBudgets(bRes.data.results || bRes.data || []);
      setProducts(pRes.data.results || pRes.data || []);
    });

    if (isEdit) {
      setLoading(true);
      purchaseOrderAPI.get(Number(id)).then((r) => {
        const d = r.data;
        setForm({
          title: d.title || '', description: d.description || '',
          supplier: d.supplier || '', rfq: d.rfq || '',
          budget: d.budget || '', expected_delivery_date: d.expected_delivery_date || '',
          notes: d.notes || '',
        });
        if (d.line_items?.length) {
          setLineItems(d.line_items.map((li: any) => ({
            id: li.id, product: li.product || '', description: li.description || '',
            quantity: li.quantity || 1, unit_cost: li.unit_cost || '',
          })));
        }
        setLoading(false);
      }).catch(() => { toast.error('Failed to load PO'); navigate('/purchase-orders'); });
    }
  }, [id, isEdit, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleLineChange = (idx: number, field: string, value: any) => {
    setLineItems((prev) => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      // Auto-fill from product
      if (field === 'product' && value) {
        const prod = products.find((p) => p.id === Number(value));
        if (prod) {
          updated.description = prod.name + (prod.specifications ? ` — ${prod.specifications}` : '');
          if (prod.estimated_unit_cost) updated.unit_cost = prod.estimated_unit_cost;
        }
      }
      return updated;
    }));
  };

  const addLine = () => setLineItems((p) => [...p, { product: '', description: '', quantity: 1, unit_cost: '' }]);
  const removeLine = (idx: number) => setLineItems((p) => p.filter((_, i) => i !== idx));

  const estimatedTotal = lineItems.reduce((s, li) => s + (Number(li.quantity) * Number(li.unit_cost || 0)), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        supplier: form.supplier ? Number(form.supplier) : null,
        rfq: form.rfq ? Number(form.rfq) : null,
        budget: form.budget ? Number(form.budget) : null,
        expected_delivery_date: form.expected_delivery_date || null,
        line_items: lineItems.map((li) => ({
          ...(li.id ? { id: li.id } : {}),
          product: li.product ? Number(li.product) : null,
          description: li.description, quantity: li.quantity,
          unit_cost: li.unit_cost || 0,
        })),
      };
      if (isEdit) {
        await purchaseOrderAPI.update(Number(id), payload);
        toast.success('Purchase Order updated');
      } else {
        await purchaseOrderAPI.create(payload);
        toast.success('Purchase Order created');
      }
      navigate('/purchase-orders');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save PO');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-400 p-8">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit Purchase Order' : 'Create Purchase Order'}</h1>
          <p className="text-gray-500 dark:text-gray-400">Define PO details and line items</p>
        </div>
        <GreenButton variant="outline" onClick={() => navigate('/purchase-orders')}><ArrowLeft className="w-4 h-4 mr-2" /> Back</GreenButton>
      </div>

      <form onSubmit={handleSubmit}>
        <Card accent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Title <span className="text-red-500">*</span></label>
              <input name="title" value={form.title} onChange={handleChange} required className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Supplier</label>
              <select name="supplier" value={form.supplier} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none">
                <option value="">— Select Supplier —</option>
                {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Linked RFQ</label>
              <select name="rfq" value={form.rfq} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none">
                <option value="">— None —</option>
                {rfqs.map((r: any) => <option key={r.id} value={r.id}>{r.rfq_number} — {r.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Budget</label>
              <select name="budget" value={form.budget} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none">
                <option value="">— None —</option>
                {budgets.filter((b) => b.status === 'APPROVED').map((b: any) => <option key={b.id} value={b.id}>{b.budget_number} — {b.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Expected Delivery</label>
              <input name="expected_delivery_date" type="date" value={form.expected_delivery_date} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Estimated Total</label>
              <p className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white font-bold">₱{estimatedTotal.toLocaleString()}</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={2} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none resize-none" />
            </div>
          </div>
        </Card>

        <Card accent className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Line Items</h3>
            <GreenButton type="button" variant="outline" onClick={addLine}><Plus className="w-4 h-4 mr-1" /> Add Item</GreenButton>
          </div>
          <div className="space-y-4">
            {lineItems.map((li, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-3 items-end p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Product</label>
                  <select value={li.product} onChange={(e) => handleLineChange(idx, 'product', e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none">
                    <option value="">— Select —</option>
                    {products.filter((p) => p.is_active).map((p: any) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
                  </select>
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
                  <input value={li.description} onChange={(e) => handleLineChange(idx, 'description', e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Qty</label>
                  <input type="number" min={1} value={li.quantity} onChange={(e) => handleLineChange(idx, 'quantity', Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Unit Cost (₱)</label>
                  <input type="number" step="0.01" min={0} value={li.unit_cost} onChange={(e) => handleLineChange(idx, 'unit_cost', e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none" />
                </div>
                <div className="col-span-1 text-right text-sm font-semibold text-gray-900 dark:text-white self-center">
                  ₱{(Number(li.quantity) * Number(li.unit_cost || 0)).toLocaleString()}
                </div>
                <div className="col-span-1 flex justify-end">
                  {lineItems.length > 1 && (
                    <button type="button" onClick={() => removeLine(idx)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex gap-3 mt-6">
          <GreenButton type="submit" isLoading={saving}>{isEdit ? 'Update PO' : 'Create PO'}</GreenButton>
          <GreenButton type="button" variant="outline" onClick={() => navigate('/purchase-orders')}>Cancel</GreenButton>
        </div>
      </form>
    </div>
  );
}
