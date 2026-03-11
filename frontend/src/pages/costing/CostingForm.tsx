import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { GreenButton } from '../../components/ui/GreenButton';
import { costingAPI, costCategoryAPI } from '../../services/costingService';
import { rfqAPI } from '../../services/rfqService';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

const MARGIN_LABELS = ['VERY_LOW', 'LOW', 'MEDIUM_LOW', 'MEDIUM_HIGH', 'HIGH', 'VERY_HIGH'] as const;
const MARGIN_DISPLAY: Record<string, string> = { VERY_LOW: 'Very Low', LOW: 'Low', MEDIUM_LOW: 'Medium-Low', MEDIUM_HIGH: 'Medium-High', HIGH: 'High', VERY_HIGH: 'Very High', CUSTOM: 'Custom' };

const DEFAULT_MARGIN = (label: string) => ({
  label,
  facilitation_percent: '10.00',
  desired_margin_percent:
    label === 'VERY_LOW' ? '10.00'
    : label === 'LOW' ? '20.00'
    : label === 'MEDIUM_LOW' ? '30.00'
    : label === 'MEDIUM_HIGH' ? '40.00'
    : label === 'HIGH' ? '50.00'
    : label === 'VERY_HIGH' ? '60.00'
    : '35.00',
  jv_cost_percent: '0.00',
  cost_of_money_percent: '1.00',
  municipal_tax_percent: '1.00',
  others_1_percent: '0.00', others_1_label: 'Others 1',
  others_2_percent: '0.00', others_2_label: 'Others 2',
  commission_percent: '10.00',
  withholding_tax_percent: '2.00',
  creditable_tax_percent: '5.00',
  warranty_security_percent: '5.00',
});

const EMPTY_ITEM = { category: '', description: '', amount: '0', notes: '' };

export default function CostingForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '', description: '', project_title: '', client_name: '',
    date: new Date().toISOString().split('T')[0], warranty: '',
    contingency_percent: '5.00', vat_rate: '12.00', commission_rate: '10.00', status: 'DRAFT',
    rfq: '' as string | number,
  });
  const [rfqList, setRfqList] = useState<any[]>([]);
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [margins, setMargins] = useState(MARGIN_LABELS.map((l) => DEFAULT_MARGIN(l)));
  const [activeTab, setActiveTab] = useState<string>('VERY_LOW');
  const [hasCustomMargin, setHasCustomMargin] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  // Load cost categories and RFQ list
  useEffect(() => {
    costCategoryAPI.list().then((r) => setCategories(r.data.results || r.data || [])).catch(() => {});
    rfqAPI.list().then((r) => setRfqList(r.data.results || r.data || [])).catch(() => {});
  }, []);

  // Load existing sheet in edit mode
  useEffect(() => {
    if (isEdit) {
      costingAPI.get(Number(id)).then((r) => {
        const d = r.data;
        setForm({
          title: d.title || '', description: d.description || '',
          project_title: d.project_title || '', client_name: d.client_name || '',
          date: d.date || new Date().toISOString().split('T')[0],
          warranty: d.warranty || '', contingency_percent: d.contingency_percent || '5.00',
          vat_rate: d.vat_rate || '12.00', commission_rate: d.commission_rate || '10.00', status: d.status || 'DRAFT',
          rfq: d.rfq || '',
        });
        if (d.line_items?.length) {
          setItems(d.line_items.map((li: any) => ({
            category: li.category || '', description: li.description || '',
            amount: li.amount || '0', notes: li.notes || '',
          })));
        }
        if (d.margin_levels?.length) {
          const loadedMargins = d.margin_levels.map((ml: any) => ({
            label: ml.label,
            facilitation_percent: ml.facilitation_percent || '10.00',
            desired_margin_percent: ml.desired_margin_percent || '20.00',
            jv_cost_percent: ml.jv_cost_percent || '0.00',
            cost_of_money_percent: ml.cost_of_money_percent || '1.00',
            municipal_tax_percent: ml.municipal_tax_percent || '1.00',
            others_1_percent: ml.others_1_percent || '0.00',
            others_1_label: ml.others_1_label || 'Others 1',
            others_2_percent: ml.others_2_percent || '0.00',
            others_2_label: ml.others_2_label || 'Others 2',
            commission_percent: ml.commission_percent || '10.00',
            withholding_tax_percent: ml.withholding_tax_percent || '2.00',
            creditable_tax_percent: ml.creditable_tax_percent || '5.00',
            warranty_security_percent: ml.warranty_security_percent || '5.00',
          }));
          setMargins(loadedMargins);
          if (loadedMargins.some((m: any) => m.label === 'CUSTOM')) {
            setHasCustomMargin(true);
          }
        }
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

  const handleMarginChange = (label: string, field: string, val: string) => {
    setMargins((p) => p.map((m) => m.label === label ? { ...m, [field]: val } : m));
  };

  const totalCost = items.reduce((sum, it) => sum + Number(it.amount || 0), 0);
  const contingencyAmt = totalCost * Number(form.contingency_percent || 0) / 100;
  const totalProjectCost = totalCost + contingencyAmt;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, rfq: form.rfq || null, line_items: items, margin_levels: margins };
      if (isEdit) {
        await costingAPI.update(Number(id), payload);
        toast.success('Costing sheet updated');
      } else {
        await costingAPI.create(payload);
        toast.success('Costing sheet created');
      }
      navigate('/costing');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none';
  const labelCls = 'block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5';
  const smallLabelCls = 'block text-xs font-medium text-gray-500 mb-1';

  const allMarginLabels = hasCustomMargin ? [...MARGIN_LABELS, 'CUSTOM' as const] : [...MARGIN_LABELS];
  const activeMargin = margins.find((m) => m.label === activeTab) || margins[0];

  const toggleCustomMargin = () => {
    if (hasCustomMargin) {
      setMargins(prev => prev.filter(m => m.label !== 'CUSTOM'));
      if (activeTab === 'CUSTOM') setActiveTab('VERY_LOW');
      setHasCustomMargin(false);
    } else {
      setMargins(prev => [...prev, DEFAULT_MARGIN('CUSTOM')]);
      setHasCustomMargin(true);
      setActiveTab('CUSTOM');
    }
  };

  // Client-side preview of gross selling for each margin tab
  const previewGrossSelling = (m: typeof activeMargin) => {
    const totalPct = [m.facilitation_percent, m.desired_margin_percent, m.jv_cost_percent, m.cost_of_money_percent, m.municipal_tax_percent, m.others_1_percent, m.others_2_percent]
      .reduce((s, v) => s + Number(v || 0), 0);
    const divisor = 1 - totalPct / 100;
    return divisor > 0 ? totalProjectCost / divisor : totalProjectCost;
  };

  const previewNetSelling = (m: typeof activeMargin) => {
    const gs = previewGrossSelling(m);
    return gs * (1 + Number(form.vat_rate || 0) / 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit Costing Sheet' : 'New Costing Sheet'}</h1>
          <p className="text-gray-500 dark:text-gray-400">PH-tax-aware cost breakdown with 6-margin model</p>
        </div>
        <GreenButton variant="outline" onClick={() => navigate('/costing')}><ArrowLeft className="w-4 h-4 mr-2" /> Back</GreenButton>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ---- Sheet Details ---- */}
        <Card accent title="Sheet Details">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className={labelCls}>Title <span className="text-red-500">*</span></label>
              <input name="title" value={form.title} onChange={handleChange} required className={inputCls} placeholder="Sheet title" />
            </div>
            <div>
              <label className={labelCls}>Project Title</label>
              <input name="project_title" value={form.project_title} onChange={handleChange} className={inputCls} placeholder="e.g. IT Infrastructure Upgrade" />
            </div>
            <div>
              <label className={labelCls}>Client Name</label>
              <input name="client_name" value={form.client_name} onChange={handleChange} className={inputCls} placeholder="e.g. ABC Corporation" />
            </div>
            <div>
              <label className={labelCls}>Date</label>
              <input name="date" type="date" value={form.date} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Warranty</label>
              <input name="warranty" value={form.warranty} onChange={handleChange} className={inputCls} placeholder="e.g. 1 Year Parts & Labor" />
            </div>
            <div>
              <label className={labelCls}>Linked RFQ</label>
              <select name="rfq" value={form.rfq} onChange={handleChange} className={inputCls}>
                <option value="">— None —</option>
                {rfqList.map((r: any) => (
                  <option key={r.id} value={r.id}>{r.rfq_number} — {r.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select name="status" value={form.status} onChange={handleChange} className={inputCls}>
                <option value="DRAFT">Draft</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="APPROVED">Approved</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Contingency %</label>
              <input name="contingency_percent" type="number" step="0.01" min="0" max="100" value={form.contingency_percent} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>VAT Rate %</label>
              <input name="vat_rate" type="number" step="0.01" min="0" max="100" value={form.vat_rate} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Commission Rate %</label>
              <input name="commission_rate" type="number" step="0.01" min="0" max="100" value={form.commission_rate} onChange={handleChange} className={inputCls} />
            </div>
            <div className="md:col-span-3">
              <label className={labelCls}>Description</label>
              <textarea name="description" value={form.description} onChange={handleChange} rows={2} className={inputCls + ' resize-none'} placeholder="Optional notes..." />
            </div>
          </div>
        </Card>

        {/* ---- Cost Line Items ---- */}
        <Card accent title="Cost Line Items">
          <div className="space-y-3">
            {items.map((it, idx) => (
              <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="w-44">
                    <label className={smallLabelCls}>Category <span className="text-red-500">*</span></label>
                    <select value={it.category} onChange={(e) => handleItemChange(idx, 'category', e.target.value)} required className={inputCls}>
                      <option value="">Select...</option>
                      {categories.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}{c.has_input_vat ? ' (VAT)' : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <label className={smallLabelCls}>Description</label>
                    <input value={it.description} onChange={(e) => handleItemChange(idx, 'description', e.target.value)} className={inputCls} placeholder="Line item description" />
                  </div>
                  <div className="w-36">
                    <label className={smallLabelCls}>Amount (PHP)</label>
                    <input type="number" step="0.01" min="0" value={it.amount} onChange={(e) => handleItemChange(idx, 'amount', e.target.value)} className={inputCls} />
                  </div>
                  <div className="w-36">
                    <label className={smallLabelCls}>Notes</label>
                    <input value={it.notes} onChange={(e) => handleItemChange(idx, 'notes', e.target.value)} className={inputCls} placeholder="Optional" />
                  </div>
                  <button type="button" onClick={() => removeItem(idx)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between mt-3">
              <button type="button" onClick={addItem} className="flex items-center gap-2 text-sm text-[#0E8F79] hover:text-[#3BC25B] font-medium"><Plus className="w-4 h-4" /> Add Line Item</button>
              <div className="text-right space-y-1">
                <div><span className="text-xs text-gray-500 mr-2">Total Cost:</span><span className="text-sm font-bold text-gray-900 dark:text-white">₱{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                <div><span className="text-xs text-gray-500 mr-2">Contingency ({form.contingency_percent}%):</span><span className="text-sm font-semibold text-gray-700 dark:text-gray-300">₱{contingencyAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                <div><span className="text-xs text-gray-500 mr-2">Total Project Cost:</span><span className="text-lg font-bold text-[#0E8F79]">₱{totalProjectCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
              </div>
            </div>
          </div>
        </Card>

        {/* ---- Margin Levels (Tabs) ---- */}
        <Card accent title="Margin Levels">
          <div className="mb-4">
            <div className="flex flex-wrap items-center border-b border-gray-200 dark:border-gray-700">
              {allMarginLabels.map((label) => {
                const m = margins.find((m) => m.label === label);
                if (!m) return null;
                const gs = previewGrossSelling(m);
                const isCustom = label === 'CUSTOM';
                return (
                  <button key={label} type="button" onClick={() => setActiveTab(label)}
                    className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === label
                      ? isCustom ? 'border-purple-500 text-purple-600 dark:text-purple-400' : 'border-[#3BC25B] text-[#0E8F79] dark:text-[#3BC25B]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                    {MARGIN_DISPLAY[label]}
                    <span className="ml-1 text-xs opacity-70">₱{gs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                  </button>
                );
              })}
              <button type="button" onClick={toggleCustomMargin}
                className={`ml-auto px-3 py-2 text-xs font-medium rounded-lg transition ${hasCustomMargin
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 hover:bg-purple-200'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200'}`}>
                {hasCustomMargin ? '✕ Remove Custom' : '+ Add Custom Margin'}
              </button>
            </div>
          </div>

          {/* Active margin level inputs */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Selling Price Build-Up Percentages</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { field: 'facilitation_percent', label: 'Facilitation %' },
                { field: 'desired_margin_percent', label: 'Desired Margin %' },
                { field: 'jv_cost_percent', label: 'JV Cost %' },
                { field: 'cost_of_money_percent', label: 'Cost of Money %' },
                { field: 'municipal_tax_percent', label: 'Municipal Tax %' },
                { field: 'commission_percent', label: 'Commission %' },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label className={smallLabelCls}>{label}</label>
                  <input type="number" step="0.01" min="0" max="100"
                    value={(activeMargin as any)[field]}
                    onChange={(e) => handleMarginChange(activeTab, field, e.target.value)}
                    className={inputCls} />
                </div>
              ))}
            </div>

            {/* Others 1 & 2 with custom labels */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={smallLabelCls}>Others 1 Label</label>
                <input value={activeMargin.others_1_label} onChange={(e) => handleMarginChange(activeTab, 'others_1_label', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={smallLabelCls}>Others 1 %</label>
                <input type="number" step="0.01" min="0" max="100" value={activeMargin.others_1_percent} onChange={(e) => handleMarginChange(activeTab, 'others_1_percent', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={smallLabelCls}>Others 2 Label</label>
                <input value={activeMargin.others_2_label} onChange={(e) => handleMarginChange(activeTab, 'others_2_label', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={smallLabelCls}>Others 2 %</label>
                <input type="number" step="0.01" min="0" max="100" value={activeMargin.others_2_percent} onChange={(e) => handleMarginChange(activeTab, 'others_2_percent', e.target.value)} className={inputCls} />
              </div>
            </div>

            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-4">Government Deduction Rates</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className={smallLabelCls}>Withholding Tax %</label>
                <input type="number" step="0.01" min="0" max="100" value={activeMargin.withholding_tax_percent} onChange={(e) => handleMarginChange(activeTab, 'withholding_tax_percent', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={smallLabelCls}>Creditable Tax %</label>
                <input type="number" step="0.01" min="0" max="100" value={activeMargin.creditable_tax_percent} onChange={(e) => handleMarginChange(activeTab, 'creditable_tax_percent', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={smallLabelCls}>Warranty Security %</label>
                <input type="number" step="0.01" min="0" max="100" value={activeMargin.warranty_security_percent} onChange={(e) => handleMarginChange(activeTab, 'warranty_security_percent', e.target.value)} className={inputCls} />
              </div>
            </div>

            {/* Live preview */}
            <div className="mt-4 p-4 bg-gradient-to-r from-[#0E8F79]/5 to-[#3BC25B]/5 dark:from-[#0E8F79]/10 dark:to-[#3BC25B]/10 rounded-lg border border-[#3BC25B]/20">
              <h4 className="text-sm font-semibold text-[#0E8F79] mb-3">Live Preview — {MARGIN_DISPLAY[activeTab] || activeTab}</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Gross Selling (VAT Ex)</p>
                  <p className="font-bold text-gray-900 dark:text-white">₱{previewGrossSelling(activeMargin).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">VAT ({form.vat_rate}%)</p>
                  <p className="font-bold text-gray-900 dark:text-white">₱{(previewGrossSelling(activeMargin) * Number(form.vat_rate || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Net Selling (VAT Inc)</p>
                  <p className="font-bold text-[#0E8F79]">₱{previewNetSelling(activeMargin).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Project Cost</p>
                  <p className="font-bold text-gray-900 dark:text-white">₱{totalProjectCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ---- Submit ---- */}
        <div className="flex gap-3">
          <GreenButton type="submit" isLoading={saving}>{isEdit ? 'Update Sheet' : 'Create Sheet'}</GreenButton>
          <GreenButton type="button" variant="outline" onClick={() => navigate('/costing')}>Cancel</GreenButton>
        </div>
      </form>
    </div>
  );
}
