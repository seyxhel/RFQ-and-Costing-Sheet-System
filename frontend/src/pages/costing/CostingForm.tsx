import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { GreenButton } from '../../components/ui/GreenButton';
import { costingAPI, lineItemAPI } from '../../services/costingService';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

const EMPTY_ITEM = { cost_type: 'MATERIAL', description: '', quantity: '1', unit: 'pcs', unit_cost: '0', notes: '' };
const CATEGORIES = [
  { value: 'MATERIAL', label: 'Material' },
  { value: 'LABOR', label: 'Labor' },
  { value: 'OVERHEAD', label: 'Overhead' },
  { value: 'LOGISTICS', label: 'Logistics' },
  { value: 'OTHER', label: 'Other' },
];

export default function CostingForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({ title: '', description: '', target_margin_percent: '20.00', status: 'DRAFT' });
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      costingAPI.get(Number(id)).then((r) => {
        const d = r.data;
        setForm({ title: d.title || '', description: d.description || '', target_margin_percent: d.target_margin_percent || '20.00', status: d.status || 'DRAFT' });
        if (d.line_items?.length) setItems(d.line_items.map((li: any) => ({
          id: li.id, cost_type: li.cost_type || 'MATERIAL', description: li.description, quantity: li.quantity, unit: li.unit, unit_cost: li.unit_cost, notes: li.notes || ''
        })));
      }).catch(() => { toast.error('Failed to load'); navigate('/costing'); });
    }
  }, [id, isEdit, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleItemChange = (idx: number, field: string, val: string) => {
    setItems((p) => p.map((it, i) => i === idx ? { ...it, [field]: val } : it));
  };

  const addItem = () => setItems((p) => [...p, { ...EMPTY_ITEM }]);
  const removeItem = (idx: number) => setItems((p) => p.length > 1 ? p.filter((_, i) => i !== idx) : p);

  const totalCost = items.reduce((sum, it) => sum + Number(it.quantity || 0) * Number(it.unit_cost || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, line_items: items };
      if (isEdit) { await costingAPI.update(Number(id), payload); toast.success('Costing sheet updated'); }
      else { await costingAPI.create(payload); toast.success('Costing sheet created'); }
      navigate('/costing');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const inputCls = 'w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit Costing Sheet' : 'New Costing Sheet'}</h1>
          <p className="text-gray-500 dark:text-gray-400">Define product cost breakdown</p>
        </div>
        <GreenButton variant="outline" onClick={() => navigate('/costing')}><ArrowLeft className="w-4 h-4 mr-2" /> Back</GreenButton>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card accent title="Sheet Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Title <span className="text-red-500">*</span></label>
              <input name="title" value={form.title} onChange={handleChange} required className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Target Margin %</label>
              <input name="target_margin_percent" type="number" min="0" max="100" step="0.01" value={form.target_margin_percent} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
              <select name="status" value={form.status} onChange={handleChange} className={inputCls}>
                <option value="DRAFT">Draft</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="APPROVED">Approved</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={2} className={inputCls + ' resize-none'} />
            </div>
          </div>
        </Card>

        <Card accent title="Cost Line Items">
          <div className="space-y-3">
            {items.map((it, idx) => (
              <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="w-36">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                    <select value={it.cost_type} onChange={(e) => handleItemChange(idx, 'cost_type', e.target.value)} className={inputCls}>
                      {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                    <input value={it.description} onChange={(e) => handleItemChange(idx, 'description', e.target.value)} className={inputCls} />
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Qty</label>
                    <input type="number" min="0" value={it.quantity} onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)} className={inputCls} />
                  </div>
                  <div className="w-24">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Unit</label>
                    <input value={it.unit} onChange={(e) => handleItemChange(idx, 'unit', e.target.value)} className={inputCls} />
                  </div>
                  <div className="w-28">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Unit Cost</label>
                    <input type="number" step="0.01" min="0" value={it.unit_cost} onChange={(e) => handleItemChange(idx, 'unit_cost', e.target.value)} className={inputCls} />
                  </div>
                  <div className="w-24 text-right">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Subtotal</label>
                    <p className="py-2.5 text-sm font-semibold text-gray-900 dark:text-white">${(Number(it.quantity || 0) * Number(it.unit_cost || 0)).toFixed(2)}</p>
                  </div>
                  <button type="button" onClick={() => removeItem(idx)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between mt-3">
              <button type="button" onClick={addItem} className="flex items-center gap-2 text-sm text-[#0E8F79] hover:text-[#3BC25B] font-medium"><Plus className="w-4 h-4" /> Add Line Item</button>
              <div className="text-right">
                <span className="text-sm text-gray-500 mr-3">Total Cost:</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">${totalCost.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex gap-3">
          <GreenButton type="submit" isLoading={saving}>{isEdit ? 'Update Sheet' : 'Create Sheet'}</GreenButton>
          <GreenButton type="button" variant="outline" onClick={() => navigate('/costing')}>Cancel</GreenButton>
        </div>
      </form>
    </div>
  );
}
