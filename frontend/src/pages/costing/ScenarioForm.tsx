import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { GreenButton } from '../../components/ui/GreenButton';
import { scenarioAPI, costingAPI } from '../../services/costingService';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

const EMPTY_ADJ = { line_item: '', adjustment_type: 'percentage', adjustment_value: '0' };

export default function ScenarioForm() {
  const { sheetId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', description: '' });
  const [adjustments, setAdjustments] = useState([{ ...EMPTY_ADJ }]);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    costingAPI.get(Number(sheetId)).then((r) => { if (r.data.line_items) setLineItems(r.data.line_items); }).catch(() => {});
  }, [sheetId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleAdjChange = (idx: number, field: string, val: string) => {
    setAdjustments((p) => p.map((a, i) => i === idx ? { ...a, [field]: val } : a));
  };

  const addAdj = () => setAdjustments((p) => [...p, { ...EMPTY_ADJ }]);
  const removeAdj = (idx: number) => setAdjustments((p) => p.length > 1 ? p.filter((_, i) => i !== idx) : p);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Convert user-friendly adjustments into backend overrides format
      // Backend expects: { "line_item_id": { "unit_cost": new_value, "quantity": new_value } }
      const overrides: Record<string, Record<string, number>> = {};
      for (const adj of adjustments) {
        const targetItems = adj.line_item
          ? lineItems.filter((li: any) => String(li.id) === adj.line_item)
          : lineItems;
        
        for (const li of targetItems) {
          const key = String(li.id);
          const baseUnitCost = Number(li.unit_cost || 0);
          let newUnitCost = baseUnitCost;

          if (adj.adjustment_type === 'percentage') {
            newUnitCost = baseUnitCost * (1 + Number(adj.adjustment_value) / 100);
          } else if (adj.adjustment_type === 'fixed') {
            newUnitCost = baseUnitCost + Number(adj.adjustment_value);
          } else if (adj.adjustment_type === 'override') {
            newUnitCost = Number(adj.adjustment_value);
          }

          overrides[key] = { ...(overrides[key] || {}), unit_cost: Math.round(newUnitCost * 100) / 100 };
        }
      }

      const resp = await scenarioAPI.create(Number(sheetId), { ...form, overrides });
      // Auto-calculate projections after creation
      const scenarioId = resp.data?.id;
      if (scenarioId) {
        await scenarioAPI.calculate(scenarioId);
      }
      toast.success('Scenario created & calculated');
      navigate(`/costing/${sheetId}/scenarios`);
    } catch { toast.error('Failed to create scenario'); }
    finally { setSaving(false); }
  };

  const inputCls = 'w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Scenario</h1>
          <p className="text-gray-500 dark:text-gray-400">Define cost adjustments for Costing Sheet #{sheetId}</p>
        </div>
        <GreenButton variant="outline" onClick={() => navigate(`/costing/${sheetId}/scenarios`)}><ArrowLeft className="w-4 h-4 mr-2" /> Back</GreenButton>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card accent title="Scenario Details">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Scenario Name <span className="text-red-500">*</span></label>
              <input name="name" value={form.name} onChange={handleChange} required placeholder="e.g., 10% Material Cost Increase" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={2} placeholder="Describe the scenario..." className={inputCls + ' resize-none'} />
            </div>
          </div>
        </Card>

        <Card accent title="Cost Adjustments">
          <div className="space-y-3">
            {adjustments.map((adj, idx) => (
              <div key={idx} className="flex flex-wrap items-end gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Line Item</label>
                  <select value={adj.line_item} onChange={(e) => handleAdjChange(idx, 'line_item', e.target.value)} className={inputCls}>
                    <option value="">All Items</option>
                    {lineItems.map((li: any) => <option key={li.id} value={li.id}>{li.description} ({li.cost_type})</option>)}
                  </select>
                </div>
                <div className="w-40">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Adjustment Type</label>
                  <select value={adj.adjustment_type} onChange={(e) => handleAdjChange(idx, 'adjustment_type', e.target.value)} className={inputCls}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount ($)</option>
                    <option value="override">Override ($)</option>
                  </select>
                </div>
                <div className="w-32">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Value</label>
                  <input type="number" step="0.01" value={adj.adjustment_value} onChange={(e) => handleAdjChange(idx, 'adjustment_value', e.target.value)} className={inputCls} />
                </div>
                <button type="button" onClick={() => removeAdj(idx)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            <button type="button" onClick={addAdj} className="flex items-center gap-2 text-sm text-[#0E8F79] hover:text-[#3BC25B] font-medium mt-2"><Plus className="w-4 h-4" /> Add Adjustment</button>
          </div>
        </Card>

        <div className="flex gap-3">
          <GreenButton type="submit" isLoading={saving}>Create Scenario</GreenButton>
          <GreenButton type="button" variant="outline" onClick={() => navigate(`/costing/${sheetId}/scenarios`)}>Cancel</GreenButton>
        </div>
      </form>
    </div>
  );
}
