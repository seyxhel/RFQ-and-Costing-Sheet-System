import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { GreenButton } from '../../components/ui/GreenButton';
import { budgetAPI } from '../../services/budgetService';
import { rfqAPI } from '../../services/rfqService';
import { costingAPI } from '../../services/costingService';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

export default function BudgetForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '', description: '', allocated_amount: '', rfq: '' as string | number,
    costing_sheet: '' as string | number, notes: '',
  });
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [costings, setCostings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      rfqAPI.list().catch(() => ({ data: [] })),
      costingAPI.list().catch(() => ({ data: [] })),
    ]).then(([rRes, cRes]) => {
      setRfqs(rRes.data.results || rRes.data || []);
      setCostings(cRes.data.results || cRes.data || []);
    });

    if (isEdit) {
      setLoading(true);
      budgetAPI.get(Number(id)).then((r) => {
        const d = r.data;
        setForm({
          title: d.title || '', description: d.description || '',
          allocated_amount: d.allocated_amount || '', rfq: d.rfq || '',
          costing_sheet: d.costing_sheet || '', notes: d.notes || '',
        });
        setLoading(false);
      }).catch(() => { toast.error('Failed to load budget'); navigate('/budgets'); });
    }
  }, [id, isEdit, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        allocated_amount: form.allocated_amount || 0,
        rfq: form.rfq ? Number(form.rfq) : null,
        costing_sheet: form.costing_sheet ? Number(form.costing_sheet) : null,
      };
      if (isEdit) {
        await budgetAPI.update(Number(id), payload);
        toast.success('Budget updated');
      } else {
        await budgetAPI.create(payload);
        toast.success('Budget created');
      }
      navigate('/budgets');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save budget');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-400 p-8">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit Budget' : 'Create New Budget'}</h1>
          <p className="text-gray-500 dark:text-gray-400">Define budget allocation and link to RFQ / Costing</p>
        </div>
        <GreenButton variant="outline" onClick={() => navigate('/budgets')}><ArrowLeft className="w-4 h-4 mr-2" /> Back</GreenButton>
      </div>

      <form onSubmit={handleSubmit}>
        <Card accent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Title <span className="text-red-500">*</span></label>
              <input name="title" value={form.title} onChange={handleChange} required className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Allocated Amount (₱) <span className="text-red-500">*</span></label>
              <input name="allocated_amount" type="number" step="0.01" min="0" value={form.allocated_amount} onChange={handleChange} required className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Linked RFQ</label>
              <select name="rfq" value={form.rfq} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none">
                <option value="">— None —</option>
                {rfqs.map((r: any) => <option key={r.id} value={r.id}>{r.rfq_number} — {r.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Linked Costing Sheet</label>
              <select name="costing_sheet" value={form.costing_sheet} onChange={handleChange} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none">
                <option value="">— None —</option>
                {costings.map((c: any) => <option key={c.id} value={c.id}>{c.sheet_number || `Sheet #${c.id}`} — {c.title}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={3} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none resize-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none resize-none" />
            </div>
          </div>
        </Card>

        <div className="flex gap-3 mt-6">
          <GreenButton type="submit" isLoading={saving}>{isEdit ? 'Update Budget' : 'Create Budget'}</GreenButton>
          <GreenButton type="button" variant="outline" onClick={() => navigate('/budgets')}>Cancel</GreenButton>
        </div>
      </form>
    </div>
  );
}
