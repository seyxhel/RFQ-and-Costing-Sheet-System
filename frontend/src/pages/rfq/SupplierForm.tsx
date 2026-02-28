import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { GreenButton } from '../../components/ui/GreenButton';
import { supplierAPI } from '../../services/rfqService';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

const EMPTY = { name: '', contact_person: '', email: '', phone: '', address: '', rating: '3.00', on_time_delivery_rate: '90.00', is_active: true };

export default function SupplierForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit) {
      supplierAPI.get(Number(id)).then((r) => setForm({ ...EMPTY, ...r.data })).catch(() => { toast.error('Failed to load'); navigate('/suppliers'); });
    }
  }, [id, isEdit, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) { await supplierAPI.update(Number(id), form); toast.success('Supplier updated'); }
      else { await supplierAPI.create(form); toast.success('Supplier created'); }
      navigate('/suppliers');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit Supplier' : 'Add Supplier'}</h1>
          <p className="text-gray-500 dark:text-gray-400">Supplier contact information</p>
        </div>
        <GreenButton variant="outline" onClick={() => navigate('/suppliers')}><ArrowLeft className="w-4 h-4 mr-2" /> Back</GreenButton>
      </div>

      <Card accent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Company Name <span className="text-red-500">*</span></label>
              <input name="name" value={form.name} onChange={handleChange} required className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Contact Person</label>
              <input name="contact_person" value={form.contact_person} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Email <span className="text-red-500">*</span></label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Phone</label>
              <input name="phone" value={form.phone} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Rating (1-5)</label>
              <input name="rating" type="number" min="0" max="5" step="0.01" value={form.rating} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">On-Time Delivery %</label>
              <input name="on_time_delivery_rate" type="number" min="0" max="100" step="0.01" value={form.on_time_delivery_rate} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Address</label>
              <textarea name="address" value={form.address} onChange={handleChange} rows={2} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none resize-none" />
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="is_active" checked={form.is_active as any} onChange={handleChange} className="w-4 h-4 rounded border-gray-300 text-[#3BC25B] focus:ring-[#3BC25B]" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Active supplier</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <GreenButton type="submit" isLoading={saving}>{isEdit ? 'Update Supplier' : 'Create Supplier'}</GreenButton>
            <GreenButton type="button" variant="outline" onClick={() => navigate('/suppliers')}>Cancel</GreenButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
