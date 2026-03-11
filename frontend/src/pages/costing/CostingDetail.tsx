import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { GreenButton } from '../../components/ui/GreenButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { costingAPI } from '../../services/costingService';
import { toast } from 'sonner';
import { ArrowLeft, Pencil, RefreshCw, Camera, History, ChevronDown, ChevronUp, CheckCircle, Send, FlaskConical, Download } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const CATEGORY_COLORS = ['#3BC25B', '#3B82F6', '#A855F7', '#F59E0B', '#EF4444', '#06B6D4', '#F97316'];
const MARGIN_DISPLAY: Record<string, string> = { VERY_LOW: 'Very Low', LOW: 'Low', MEDIUM_LOW: 'Medium-Low', MEDIUM_HIGH: 'Medium-High', HIGH: 'High', VERY_HIGH: 'Very High', CUSTOM: 'Custom' };
const fmt = (v: any) => `₱${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

export default function CostingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [versions, setVersions] = useState<any[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);
  const [activeMargin, setActiveMargin] = useState<string>('LOW');

  const load = () => {
    costingAPI.get(Number(id)).then((r) => { setSheet(r.data); setLoading(false); }).catch(() => { toast.error('Failed to load'); navigate('/costing'); });
  };
  const loadVersions = () => {
    costingAPI.versions(Number(id)).then((r) => setVersions(r.data.results || r.data || [])).catch(() => {});
  };

  useEffect(load, [id, navigate]);
  useEffect(loadVersions, [id]);

  const handleRecalc = () => {
    costingAPI.recalculate(Number(id)).then((r) => { setSheet(r.data); toast.success('Recalculated'); }).catch(() => toast.error('Recalculation failed'));
  };
  const handleSubmit = () => {
    costingAPI.submit(Number(id)).then((r) => { setSheet(r.data); toast.success('Submitted for review'); }).catch(() => toast.error('Submit failed'));
  };
  const handleApprove = () => {
    costingAPI.approve(Number(id)).then((r) => { setSheet(r.data); toast.success('Approved'); }).catch(() => toast.error('Approve failed'));
  };
  const handleSnapshot = () => {
    costingAPI.snapshot(Number(id)).then((r) => {
      toast.success(`Snapshot v${r.data?.version_number || ''} saved`);
      loadVersions(); load();
    }).catch(() => toast.error('Snapshot failed'));
  };

  /* ======== Export to CSV ======== */
  const exportCSV = () => {
    if (!sheet) return;
    const esc = (v: any) => { const s = String(v ?? '').replace(/"/g, '""'); return `"${s}"`; };
    const fmtN = (v: any) => Number(v || 0).toFixed(2);
    const rows: string[] = [];
    const items_ = sheet.line_items || [];
    const marginLevels_ = sheet.margin_levels || [];

    // --- Section 1: Sheet Info ---
    rows.push('COSTING SHEET REPORT');
    rows.push('');
    rows.push(`Sheet Number,${esc(sheet.sheet_number)}`);
    rows.push(`Title,${esc(sheet.title)}`);
    rows.push(`Project,${esc(sheet.project_title)}`);
    rows.push(`Client,${esc(sheet.client_name)}`);
    rows.push(`Status,${esc(sheet.status)}`);
    rows.push(`Version,v${sheet.version || 1}`);
    rows.push(`Date,${esc(sheet.date || '')}`);
    rows.push(`Warranty,${esc(sheet.warranty || '')}`);
    rows.push(`Created By,${esc(sheet.created_by_name || '')}`);
    rows.push('');

    // --- Section 2: Summary ---
    rows.push('COST SUMMARY');
    rows.push(`Total Cost,${fmtN(sheet.total_cost)}`);
    rows.push(`Contingency %,${sheet.contingency_percent}%`);
    rows.push(`Contingency Amount,${fmtN(sheet.contingency_amount)}`);
    rows.push(`Total Project Cost,${fmtN(sheet.total_project_cost)}`);
    rows.push(`VAT Rate,${sheet.vat_rate}%`);
    rows.push('');

    // --- Section 3: Line Items ---
    rows.push('COST BREAKDOWN (LINE ITEMS)');
    rows.push(['#', 'Category', 'Description', 'Input VAT', 'Amount'].map(esc).join(','));
    items_.forEach((it: any, idx: number) => {
      rows.push([idx + 1, it.category_name || '', it.description || '', it.has_input_vat ? 'Yes' : 'No', fmtN(it.total_cost)].map(esc).join(','));
    });
    rows.push(['', '', 'Total Cost', '', fmtN(sheet.total_cost)].map(esc).join(','));
    rows.push(['', '', `Contingency (${sheet.contingency_percent}%)`, '', fmtN(sheet.contingency_amount)].map(esc).join(','));
    rows.push(['', '', 'Total Project Cost', '', fmtN(sheet.total_project_cost)].map(esc).join(','));
    rows.push('');

    // --- Section 4: Margin Levels ---
    marginLevels_.forEach((ml_: any) => {
      const label = MARGIN_DISPLAY[ml_.label] || ml_.label;
      rows.push(`MARGIN LEVEL: ${label.toUpperCase()}`);
      rows.push('');

      // Selling Price Build-Up
      rows.push('Selling Price Build-Up');
      rows.push(['Component', 'Rate', 'Amount'].map(esc).join(','));
      rows.push(['Total Project Cost', '', fmtN(sheet.total_project_cost)].map(esc).join(','));
      rows.push(['Facilitation', `${ml_.facilitation_percent}%`, fmtN(ml_.facilitation_amount)].map(esc).join(','));
      rows.push(['Desired Margin', `${ml_.desired_margin_percent}%`, fmtN(ml_.desired_margin_amount)].map(esc).join(','));
      rows.push(['JV Cost', `${ml_.jv_cost_percent}%`, fmtN(ml_.jv_cost_amount)].map(esc).join(','));
      rows.push(['Cost of Money', `${ml_.cost_of_money_percent}%`, fmtN(ml_.cost_of_money_amount)].map(esc).join(','));
      rows.push(['Municipal Tax', `${ml_.municipal_tax_percent}%`, fmtN(ml_.municipal_tax_amount)].map(esc).join(','));
      if (Number(ml_.others_1_percent) > 0) rows.push([ml_.others_1_label || 'Others 1', `${ml_.others_1_percent}%`, fmtN(ml_.others_1_amount)].map(esc).join(','));
      if (Number(ml_.others_2_percent) > 0) rows.push([ml_.others_2_label || 'Others 2', `${ml_.others_2_percent}%`, fmtN(ml_.others_2_amount)].map(esc).join(','));
      rows.push(['Gross Selling (VAT Ex)', '', fmtN(ml_.gross_selling_vat_ex)].map(esc).join(','));
      rows.push([`VAT (${sheet.vat_rate}%)`, '', fmtN(ml_.vat_amount)].map(esc).join(','));
      rows.push(['Net Selling (VAT Inc)', '', fmtN(ml_.net_selling_vat_inc)].map(esc).join(','));
      rows.push('');

      // Government Deductions
      rows.push('Government Deductions');
      rows.push(['Deduction', 'Rate', 'Amount'].map(esc).join(','));
      rows.push(['Withholding Tax', `${ml_.withholding_tax_percent}%`, fmtN(ml_.withholding_tax_amount)].map(esc).join(','));
      rows.push(['Creditable Tax', `${ml_.creditable_tax_percent}%`, fmtN(ml_.creditable_tax_amount)].map(esc).join(','));
      rows.push(['Warranty Security', `${ml_.warranty_security_percent}%`, fmtN(ml_.warranty_security_amount)].map(esc).join(','));
      rows.push(['Total Govt Deductions', '', fmtN(ml_.total_govt_deduction)].map(esc).join(','));
      rows.push(['Net Amount Due', '', fmtN(ml_.net_amount_due)].map(esc).join(','));
      rows.push('');

      // Profitability
      rows.push('Profitability Analysis');
      rows.push(['Metric', 'Value'].map(esc).join(','));
      rows.push(['Net Take Home', fmtN(ml_.net_take_home)].map(esc).join(','));
      rows.push(['Earning Before VAT', fmtN(ml_.earning_before_vat)].map(esc).join(','));
      rows.push(['Output VAT', fmtN(ml_.output_vat)].map(esc).join(','));
      rows.push(['Input VAT', fmtN(ml_.input_vat)].map(esc).join(','));
      rows.push(['VAT Payable', fmtN(ml_.vat_payable)].map(esc).join(','));
      rows.push(['Earning After VAT', fmtN(ml_.earning_after_vat)].map(esc).join(','));
      rows.push([`Commission (${ml_.commission_percent}%)`, fmtN(ml_.commission_amount)].map(esc).join(','));
      rows.push(['Net Profit', fmtN(ml_.net_profit)].map(esc).join(','));
      rows.push(['Actual Margin %', `${Number(ml_.actual_margin_percent || 0).toFixed(2)}%`].map(esc).join(','));
      rows.push('');

      // Commission Splits
      if (ml_.commission_splits?.length > 0) {
        rows.push('Commission Splits');
        rows.push(['Role', 'Share %', 'Amount'].map(esc).join(','));
        ml_.commission_splits.forEach((cs: any) => {
          rows.push([cs.role_name, `${cs.percent}%`, fmtN(cs.amount)].map(esc).join(','));
        });
        rows.push(['Total', `${ml_.commission_splits.reduce((s: number, cs: any) => s + Number(cs.percent || 0), 0).toFixed(2)}%`, fmtN(ml_.commission_amount)].map(esc).join(','));
        rows.push('');
      }
    });

    // Download
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sheet.sheet_number || 'Costing'}_Report.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Costing sheet exported to CSV');
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-[#3BC25B] border-t-transparent rounded-full animate-spin" /></div>;
  if (!sheet) return null;

  const items = sheet.line_items || [];
  const marginLevels = sheet.margin_levels || [];
  const ml = marginLevels.find((m: any) => m.label === activeMargin) || marginLevels[0];

  // Pie chart by category
  const catTotals: Record<string, number> = {};
  items.forEach((it: any) => {
    const name = it.category_name || 'Other';
    catTotals[name] = (catTotals[name] || 0) + Number(it.total_cost || 0);
  });
  const pieData = Object.entries(catTotals).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{sheet.title}</h1>
            <StatusBadge status={sheet.status || 'draft'} />
          </div>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{sheet.sheet_number} — {sheet.project_title || 'No project'} — {sheet.client_name || 'No client'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <GreenButton variant="outline" onClick={() => navigate('/costing')}><ArrowLeft className="w-4 h-4 mr-2" /> Back</GreenButton>
          <GreenButton variant="outline" onClick={() => navigate(`/costing/${id}/edit`)}><Pencil className="w-4 h-4 mr-2" /> Edit</GreenButton>
          <GreenButton variant="outline" onClick={() => navigate(`/costing/${id}/scenarios`)}><FlaskConical className="w-4 h-4 mr-2" /> Scenarios</GreenButton>
          <GreenButton onClick={exportCSV}><Download className="w-4 h-4 mr-2" /> Export CSV</GreenButton>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Cost', value: fmt(sheet.total_cost), color: 'text-gray-900 dark:text-white' },
          { label: 'Contingency', value: `${sheet.contingency_percent}%  (${fmt(sheet.contingency_amount)})`, color: 'text-gray-600 dark:text-gray-400' },
          { label: 'Total Project Cost', value: fmt(sheet.total_project_cost), color: 'text-[#0E8F79]' },
          { label: 'VAT Rate', value: `${sheet.vat_rate}%`, color: 'text-gray-900 dark:text-white' },
          { label: 'Margin Levels', value: `${marginLevels.length}`, color: 'text-gray-900 dark:text-white' },
        ].map((s, i) => (
          <Card key={i}>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">{s.label}</p>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line items table */}
        <div className="lg:col-span-2">
          <Card accent title="Cost Breakdown">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Description</th>
                    <th className="px-4 py-3 font-semibold text-center">Input VAT</th>
                    <th className="px-4 py-3 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {items.map((it: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }} />
                          {it.category_name || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{it.description || '—'}</td>
                      <td className="px-4 py-3 text-center">{it.has_input_vat ? <span className="text-[#3BC25B] text-xs font-medium">Yes</span> : <span className="text-gray-400 text-xs">No</span>}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{fmt(it.total_cost)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-gray-200 dark:border-gray-600 font-bold">
                  <tr><td colSpan={3} className="px-4 py-3 text-gray-900 dark:text-white">Total Cost</td><td className="px-4 py-3 text-right text-gray-900 dark:text-white">{fmt(sheet.total_cost)}</td></tr>
                  <tr><td colSpan={3} className="px-4 py-2 text-gray-500 text-xs font-normal">Contingency ({sheet.contingency_percent}%)</td><td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400 text-xs">{fmt(sheet.contingency_amount)}</td></tr>
                  <tr><td colSpan={3} className="px-4 py-3 text-[#0E8F79]">Total Project Cost</td><td className="px-4 py-3 text-right text-[#0E8F79]">{fmt(sheet.total_project_cost)}</td></tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </div>

        {/* Right side: Pie chart + actions + details */}
        <div className="space-y-6">
          {pieData.length > 0 && (
            <Card title="Cost Distribution">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                    {pieData.map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          )}

          <Card title="Actions">
            <div className="space-y-2">
              <GreenButton fullWidth onClick={handleRecalc}><RefreshCw className="w-4 h-4 mr-2" /> Recalculate</GreenButton>
              {sheet.status === 'DRAFT' && <GreenButton fullWidth variant="outline" onClick={handleSubmit}><Send className="w-4 h-4 mr-2" /> Submit for Review</GreenButton>}
              {sheet.status === 'IN_REVIEW' && <GreenButton fullWidth variant="outline" onClick={handleApprove}><CheckCircle className="w-4 h-4 mr-2" /> Approve</GreenButton>}
              <GreenButton fullWidth variant="outline" onClick={handleSnapshot}><Camera className="w-4 h-4 mr-2" /> Save Snapshot</GreenButton>
            </div>
          </Card>

          <Card title="Details">
            <div className="space-y-3 text-sm">
              {[
                { l: 'Sheet #', v: sheet.sheet_number || '—' },
                { l: 'Version', v: `v${sheet.version || 1}` },
                { l: 'Warranty', v: sheet.warranty || '—' },
                { l: 'Date', v: sheet.date || '—' },
                { l: 'Created', v: sheet.created_at ? new Date(sheet.created_at).toLocaleDateString() : '—' },
                { l: 'Created By', v: sheet.created_by_name || '—' },
              ].map((item, i) => (
                <div key={i} className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">{item.l}</span><span className="font-medium text-gray-900 dark:text-white">{item.v}</span></div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ---- Margin Levels Detail ---- */}
      {marginLevels.length > 0 && (
        <Card accent title="Margin Level Analysis">
          {/* Tabs */}
          <div className="flex flex-wrap border-b border-gray-200 dark:border-gray-700 mb-6">
            {marginLevels.map((m: any) => {
              const isCustom = m.label === 'CUSTOM';
              return (
              <button key={m.label} onClick={() => setActiveMargin(m.label)}
                className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${activeMargin === m.label
                  ? isCustom ? 'border-purple-500 text-purple-600 dark:text-purple-400' : 'border-[#3BC25B] text-[#0E8F79] dark:text-[#3BC25B]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                {MARGIN_DISPLAY[m.label] || m.label}
                <span className="ml-1 text-xs opacity-70">{fmt(m.net_selling_vat_inc)}</span>
              </button>
              );
            })}
          </div>

          {ml && (
            <div className="space-y-6">
              {/* Selling Price Build-Up */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Selling Price Build-Up</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-4 py-2 text-left">Component</th>
                        <th className="px-4 py-2 text-right">Rate</th>
                        <th className="px-4 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      <tr><td className="px-4 py-2">Total Project Cost</td><td className="px-4 py-2 text-right">—</td><td className="px-4 py-2 text-right font-semibold">{fmt(sheet.total_project_cost)}</td></tr>
                      <tr><td className="px-4 py-2">Facilitation</td><td className="px-4 py-2 text-right">{ml.facilitation_percent}%</td><td className="px-4 py-2 text-right">{fmt(ml.facilitation_amount)}</td></tr>
                      <tr><td className="px-4 py-2">Desired Margin</td><td className="px-4 py-2 text-right">{ml.desired_margin_percent}%</td><td className="px-4 py-2 text-right">{fmt(ml.desired_margin_amount)}</td></tr>
                      <tr><td className="px-4 py-2">JV Cost</td><td className="px-4 py-2 text-right">{ml.jv_cost_percent}%</td><td className="px-4 py-2 text-right">{fmt(ml.jv_cost_amount)}</td></tr>
                      <tr><td className="px-4 py-2">Cost of Money</td><td className="px-4 py-2 text-right">{ml.cost_of_money_percent}%</td><td className="px-4 py-2 text-right">{fmt(ml.cost_of_money_amount)}</td></tr>
                      <tr><td className="px-4 py-2">Municipal Tax</td><td className="px-4 py-2 text-right">{ml.municipal_tax_percent}%</td><td className="px-4 py-2 text-right">{fmt(ml.municipal_tax_amount)}</td></tr>
                      {Number(ml.others_1_percent) > 0 && <tr><td className="px-4 py-2">{ml.others_1_label || 'Others 1'}</td><td className="px-4 py-2 text-right">{ml.others_1_percent}%</td><td className="px-4 py-2 text-right">{fmt(ml.others_1_amount)}</td></tr>}
                      {Number(ml.others_2_percent) > 0 && <tr><td className="px-4 py-2">{ml.others_2_label || 'Others 2'}</td><td className="px-4 py-2 text-right">{ml.others_2_percent}%</td><td className="px-4 py-2 text-right">{fmt(ml.others_2_amount)}</td></tr>}
                    </tbody>
                    <tfoot className="border-t-2 border-gray-200 dark:border-gray-600 font-bold">
                      <tr className="bg-gray-50 dark:bg-gray-700/30"><td className="px-4 py-3">Gross Selling (VAT Ex)</td><td className="px-4 py-3 text-right">—</td><td className="px-4 py-3 text-right">{fmt(ml.gross_selling_vat_ex)}</td></tr>
                      <tr><td className="px-4 py-2 text-gray-600 dark:text-gray-400">VAT ({sheet.vat_rate}%)</td><td className="px-4 py-2 text-right">—</td><td className="px-4 py-2 text-right">{fmt(ml.vat_amount)}</td></tr>
                      <tr className="bg-[#0E8F79]/5 dark:bg-[#0E8F79]/10"><td className="px-4 py-3 text-[#0E8F79] font-bold">Net Selling (VAT Inc)</td><td className="px-4 py-3 text-right">—</td><td className="px-4 py-3 text-right text-[#0E8F79] font-bold text-base">{fmt(ml.net_selling_vat_inc)}</td></tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Government Deductions */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Government Deductions</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      <tr><td className="px-4 py-2">Withholding Tax</td><td className="px-4 py-2 text-right">{ml.withholding_tax_percent}%</td><td className="px-4 py-2 text-right text-red-600">({fmt(ml.withholding_tax_amount)})</td></tr>
                      <tr><td className="px-4 py-2">Creditable Tax</td><td className="px-4 py-2 text-right">{ml.creditable_tax_percent}%</td><td className="px-4 py-2 text-right text-red-600">({fmt(ml.creditable_tax_amount)})</td></tr>
                      <tr><td className="px-4 py-2">Warranty Security</td><td className="px-4 py-2 text-right">{ml.warranty_security_percent}%</td><td className="px-4 py-2 text-right text-red-600">({fmt(ml.warranty_security_amount)})</td></tr>
                    </tbody>
                    <tfoot className="border-t-2 border-gray-200 dark:border-gray-600 font-bold">
                      <tr><td className="px-4 py-3">Total Govt Deductions</td><td className="px-4 py-3 text-right">—</td><td className="px-4 py-3 text-right text-red-600">({fmt(ml.total_govt_deduction)})</td></tr>
                      <tr className="bg-gray-50 dark:bg-gray-700/30"><td className="px-4 py-3">Net Amount Due</td><td className="px-4 py-3 text-right">—</td><td className="px-4 py-3 text-right font-bold">{fmt(ml.net_amount_due)}</td></tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Profitability Analysis */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Profitability Analysis</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { l: 'Net Take Home', v: fmt(ml.net_take_home), c: '' },
                    { l: 'Earning Before VAT', v: fmt(ml.earning_before_vat), c: Number(ml.earning_before_vat) >= 0 ? 'text-[#3BC25B]' : 'text-red-500' },
                    { l: 'Output VAT', v: fmt(ml.output_vat), c: '' },
                    { l: 'Input VAT', v: fmt(ml.input_vat), c: '' },
                    { l: 'VAT Payable', v: fmt(ml.vat_payable), c: 'text-red-500' },
                    { l: 'Earning After VAT', v: fmt(ml.earning_after_vat), c: Number(ml.earning_after_vat) >= 0 ? 'text-[#3BC25B]' : 'text-red-500' },
                    { l: `Commission (${ml.commission_percent}%)`, v: fmt(ml.commission_amount), c: '' },
                    { l: 'Net Profit', v: fmt(ml.net_profit), c: Number(ml.net_profit) >= 0 ? 'text-[#3BC25B] font-bold' : 'text-red-500 font-bold' },
                  ].map((item, i) => (
                    <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                      <p className="text-[10px] text-gray-500 uppercase">{item.l}</p>
                      <p className={`text-sm font-bold ${item.c || 'text-gray-900 dark:text-white'}`}>{item.v}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-4 bg-gradient-to-r from-[#0E8F79]/10 to-[#3BC25B]/10 rounded-lg text-center">
                  <p className="text-xs text-gray-500 uppercase mb-1">Actual Margin %</p>
                  <p className={`text-3xl font-bold ${Number(ml.actual_margin_percent) >= 0 ? 'text-[#0E8F79]' : 'text-red-500'}`}>{Number(ml.actual_margin_percent || 0).toFixed(2)}%</p>
                </div>
              </div>

              {/* Commission Splits */}
              {ml.commission_splits?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Commission Splits</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                          <th className="px-4 py-2 text-left">Role</th>
                          <th className="px-4 py-2 text-right">Share %</th>
                          <th className="px-4 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {ml.commission_splits.map((cs: any, i: number) => (
                          <tr key={i}>
                            <td className="px-4 py-2">{cs.role_name}</td>
                            <td className="px-4 py-2 text-right">{cs.percent}%</td>
                            <td className="px-4 py-2 text-right font-semibold">{fmt(cs.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t font-bold">
                        <tr>
                          <td className="px-4 py-2">Total</td>
                          <td className="px-4 py-2 text-right">{ml.commission_splits.reduce((s: number, cs: any) => s + Number(cs.percent || 0), 0).toFixed(2)}%</td>
                          <td className="px-4 py-2 text-right">{fmt(ml.commission_amount)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Side-by-side comparison */}
              {marginLevels.length > 1 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Margin Level Comparison</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                          <th className="px-4 py-2 text-left">Metric</th>
                          {marginLevels.map((m: any) => <th key={m.label} className="px-4 py-2 text-right">{MARGIN_DISPLAY[m.label]}</th>)}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {[
                          { l: 'Gross Selling (VAT Ex)', f: 'gross_selling_vat_ex' },
                          { l: 'Net Selling (VAT Inc)', f: 'net_selling_vat_inc' },
                          { l: 'Net Amount Due', f: 'net_amount_due' },
                          { l: 'Net Profit', f: 'net_profit' },
                          { l: 'Actual Margin %', f: 'actual_margin_percent', pct: true },
                        ].map((row) => (
                          <tr key={row.f}>
                            <td className="px-4 py-2 font-medium">{row.l}</td>
                            {marginLevels.map((m: any) => (
                              <td key={m.label} className="px-4 py-2 text-right font-semibold">
                                {row.pct ? `${Number(m[row.f] || 0).toFixed(2)}%` : fmt(m[row.f])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Version History */}
      <Card title="Version History">
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setShowVersions(!showVersions)} className="flex items-center gap-2 text-sm font-medium text-[#0E8F79] hover:text-[#3BC25B] transition-colors">
              <History className="w-4 h-4" />
              {versions.length} snapshot{versions.length !== 1 ? 's' : ''} saved
              {showVersions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
          {showVersions && (
            versions.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No snapshots yet. Click "Save Snapshot" to create one.</p>
            ) : (
              <div className="space-y-2">
                {versions.map((v: any) => (
                  <div key={v.id} className="border border-gray-100 dark:border-gray-700 rounded-lg">
                    <button
                      onClick={() => setExpandedVersion(expandedVersion === v.id ? null : v.id)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#63D44A] to-[#0E8F79] flex items-center justify-center text-white text-xs font-bold">v{v.version_number}</div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Version {v.version_number}</p>
                          <p className="text-xs text-gray-500">{v.created_at ? new Date(v.created_at).toLocaleString() : '—'} {v.created_by_name ? `by ${v.created_by_name}` : ''}</p>
                        </div>
                      </div>
                      {expandedVersion === v.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </button>
                    {expandedVersion === v.id && v.snapshot_data && (
                      <div className="px-4 pb-4 space-y-3">
                        {v.change_summary && <p className="text-sm text-gray-600 dark:text-gray-400 italic">"{v.change_summary}"</p>}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            { l: 'Total Cost', v: fmt(v.snapshot_data.total_cost) },
                            { l: 'Total Project Cost', v: fmt(v.snapshot_data.total_project_cost) },
                            { l: 'Line Items', v: v.snapshot_data.line_items?.length || 0 },
                            { l: 'Version', v: `v${v.version_number}` },
                          ].map((item, i) => (
                            <div key={i} className="p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                              <p className="text-[10px] text-gray-500 uppercase">{item.l}</p>
                              <p className="text-sm font-bold text-gray-900 dark:text-white">{item.v}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </Card>
    </div>
  );
}
