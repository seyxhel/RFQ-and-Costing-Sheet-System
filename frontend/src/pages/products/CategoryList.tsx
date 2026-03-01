import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { GreenButton } from '../../components/ui/GreenButton';
import { Search, Pencil, Trash2, MoreHorizontal, Plus, FolderOpen } from 'lucide-react';
import { categoryAPI } from '../../services/productService';
import { toast } from 'sonner';

export default function CategoryList() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    categoryAPI.list().then((r) => { setCategories(r.data.results || r.data); setLoading(false); }).catch(() => { toast.error('Failed to load categories'); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => { setShowForm(false); setEditId(null); setFormName(''); setFormDesc(''); };

  const startEdit = (cat: any) => {
    setEditId(cat.id);
    setFormName(cat.name);
    setFormDesc(cat.description || '');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      if (editId) {
        await categoryAPI.update(editId, { name: formName, description: formDesc });
        toast.success('Category updated');
      } else {
        await categoryAPI.create({ name: formName, description: formDesc });
        toast.success('Category created');
      }
      resetForm();
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.name?.[0] || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: number) => {
    categoryAPI.delete(id).then(() => {
      setCategories((p) => p.filter((c) => c.id !== id));
      toast.success('Category deleted');
    }).catch(() => toast.error('Failed to delete— it may have products linked'));
  };

  const filtered = categories.filter((c) => !search || c.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Product Categories</h1>
          <p className="text-gray-500 dark:text-gray-400">Organize products into categories</p>
        </div>
        <div className="flex gap-3">
          <GreenButton variant="outline" onClick={() => navigate('/products')}>← Products</GreenButton>
          <GreenButton onClick={() => { resetForm(); setShowForm(true); }}><Plus className="w-4 h-4 mr-2" /> New Category</GreenButton>
        </div>
      </div>

      {showForm && (
        <Card accent>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{editId ? 'Edit Category' : 'New Category'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Name <span className="text-red-500">*</span></label>
              <input value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
              <input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <GreenButton onClick={handleSave} isLoading={saving}>{editId ? 'Update' : 'Create'}</GreenButton>
            <GreenButton variant="outline" onClick={resetForm}>Cancel</GreenButton>
          </div>
        </Card>
      )}

      <Card accent>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} type="text" placeholder="Search categories..." className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3BC25B]" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 font-semibold">Name</th>
                <th className="px-6 py-4 font-semibold">Description</th>
                <th className="px-6 py-4 font-semibold">Products</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                  <FolderOpen className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  No categories found.
                </td></tr>
              ) : filtered.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{cat.name}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs">{cat.description || '—'}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                      {cat.product_count ?? 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => startEdit(cat)} className="p-1.5 text-gray-400 hover:text-[#0E8F79] dark:hover:text-green-400 transition-colors"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(cat.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
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
