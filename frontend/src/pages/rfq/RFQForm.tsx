import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { GreenButton } from '../../components/ui/GreenButton';
import { rfqAPI } from '../../services/rfqService';
import { supplierAPI } from '../../services/rfqService';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

export default function RFQForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({ title: '', description: '', deadline: '', suppliers: [] as number[] });
  const [items, setItems] = useState<any[]>([{ item_name: '', quantity: 1, unit: 'pcs', specifications: '' }]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supplierAPI.list().then((r) => setSuppliers(r.data.results || r.data)).catch(() => {});
    if (isEdit) {
      setLoading(true);
      rfqAPI.get(Number(id)).then((r) => {
        const d = r.data;
        setForm({ title: d.title, description: d.description || '', deadline: d.deadline || '', suppliers: d.suppliers || [] });
        if (d.items?.length) setItems(d.items.map((it: any) => ({ item_name: it.item_name || '', quantity: it.quantity || 1, unit: it.unit || 'pcs', specifications: it.specifications || '' })));
        setLoading(false);
      }).catch(() => { toast.error('Failed to load RFQ'); navigate('/rfq'); });
    }
  }, [id, isEdit, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleItemChange = (idx: number, field: string, value: any) => {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const addItem = () => setItems((p) => [...p, { item_name: '', quantity: 1, unit: 'pcs', specifications: '' }]);
  const removeItem = (idx: number) => setItems((p) => p.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, items };
      if (isEdit) {
        await rfqAPI.update(Number(id), payload);
        toast.success('RFQ updated');
      } else {
        await rfqAPI.create(payload);
        toast.success('RFQ created');
      }
      navigate('/rfq');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-400 p-8">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit RFQ' : 'Create New RFQ'}</h1>
          <p className="text-gray-500 dark:text-gray-400">Fill in the details below</p>
        </div>
        <GreenButton variant="outline" onClick={() => navigate('/rfq')}><ArrowLeft className="w-4 h-4 mr-2" /> Back</GreenButton>
      </div>

      <form onSubmit={handleSubmit}>
        <Card accent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Title <span className="text-red-500">*</span></label>
              <input name="title" value={form.title} onChange={handleChange} required className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Deadline</label>
              <input name="deadline" type="date" value={form.deadline} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={3} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none resize-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Invited Suppliers</label>
              <select multiple value={form.suppliers.map(String)} onChange={(e) => setForm((p) => ({ ...p, suppliers: Array.from(e.target.selectedOptions, (o) => Number(o.value)) }))} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none min-h-[80px]">
                {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <p className="text-xs text-gray-400 mt-1">Hold Ctrl/Cmd to select multiple</p>
            </div>
          </div>
        </Card>

        <Card accent className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Line Items</h3>
            <GreenButton type="button" variant="outline" onClick={addItem}><Plus className="w-4 h-4 mr-1" /> Add Item</GreenButton>
          </div>
          <div className="space-y-4">
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-3 items-end p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                <div className="col-span-4">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Item Name</label>
                  <input value={item.item_name} onChange={(e) => handleItemChange(idx, 'item_name', e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Qty</label>
                  <input type="number" min={1} value={item.quantity} onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Unit</label>
                  <input value={item.unit} onChange={(e) => handleItemChange(idx, 'unit', e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none" />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Specifications</label>
                  <input value={item.specifications} onChange={(e) => handleItemChange(idx, 'specifications', e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none" />
                </div>
                <div className="col-span-1 flex justify-end">
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex gap-3 mt-6">
          <GreenButton type="submit" isLoading={saving}>{isEdit ? 'Update RFQ' : 'Create RFQ'}</GreenButton>
          <GreenButton type="button" variant="outline" onClick={() => navigate('/rfq')}>Cancel</GreenButton>
        </div>
      </form>
    </div>
  );
}
