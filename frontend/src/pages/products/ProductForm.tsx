import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { GreenButton } from '../../components/ui/GreenButton';
import { productAPI, categoryAPI } from '../../services/productService';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '', description: '', category: '' as string | number, unit: 'pcs',
    specifications: '', estimated_unit_cost: '', is_active: true, sku: '',
  });
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    categoryAPI.list().then((r) => setCategories(r.data.results || r.data)).catch(() => {});
    if (isEdit) {
      setLoading(true);
      productAPI.get(Number(id)).then((r) => {
        const d = r.data;
        setForm({
          name: d.name || '', description: d.description || '',
          category: d.category || '', unit: d.unit || 'pcs',
          specifications: d.specifications || '', estimated_unit_cost: d.estimated_unit_cost || '',
          is_active: d.is_active ?? true, sku: d.sku || '',
        });
        setLoading(false);
      }).catch(() => { toast.error('Failed to load product'); navigate('/products'); });
    }
  }, [id, isEdit, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        category: form.category ? Number(form.category) : null,
        estimated_unit_cost: form.estimated_unit_cost || null,
        sku: form.sku || undefined,  // let backend auto-generate if empty
      };
      if (isEdit) {
        await productAPI.update(Number(id), payload);
        toast.success('Product updated');
      } else {
        await productAPI.create(payload);
        toast.success('Product created');
      }
      navigate('/products');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-400 p-8">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit Product' : 'Add New Product'}</h1>
          <p className="text-gray-500 dark:text-gray-400">Fill in the product details below</p>
        </div>
        <GreenButton variant="outline" onClick={() => navigate('/products')}><ArrowLeft className="w-4 h-4 mr-2" /> Back</GreenButton>
      </div>

      <form onSubmit={handleSubmit}>
        <Card accent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Product Name <span className="text-red-500">*</span></label>
              <input name="name" value={form.name} onChange={handleChange} required className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">SKU</label>
              <input name="sku" value={form.sku} onChange={handleChange} placeholder="Auto-generated if left empty" className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
              <select name="category" value={form.category} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none">
                <option value="">— No Category —</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Unit</label>
              <input name="unit" value={form.unit} onChange={handleChange} placeholder="pcs, kg, m, etc." className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Estimated Unit Cost (₱)</label>
              <input name="estimated_unit_cost" type="number" step="0.01" min="0" value={form.estimated_unit_cost} onChange={handleChange} placeholder="0.00" className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={3} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none resize-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Specifications</label>
              <textarea name="specifications" value={form.specifications} onChange={handleChange} rows={3} placeholder="Technical specifications, dimensions, material, etc." className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none resize-none" />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} className="w-4 h-4 rounded border-gray-300 text-[#3BC25B] focus:ring-[#3BC25B]" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Active (visible in product picker)</span>
              </label>
            </div>
          </div>
        </Card>

        <div className="flex gap-3 mt-6">
          <GreenButton type="submit" isLoading={saving}>{isEdit ? 'Update Product' : 'Create Product'}</GreenButton>
          <GreenButton type="button" variant="outline" onClick={() => navigate('/products')}>Cancel</GreenButton>
        </div>
      </form>
    </div>
  );
}
