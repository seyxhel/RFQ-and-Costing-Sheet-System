import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { GreenButton } from '../../components/ui/GreenButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { costingAPI } from '../../services/costingService';
import { toast } from 'sonner';
import { ArrowLeft, Pencil, Download, FlaskConical, RefreshCw, Camera, History, ChevronDown, ChevronUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const CATEGORY_COLORS: Record<string, string> = { MATERIAL: '#3BC25B', LABOR: '#3B82F6', OVERHEAD: '#A855F7', LOGISTICS: '#F59E0B', OTHER: '#6B7280' };

export default function CostingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [versions, setVersions] = useState<any[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);

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
  const handleSnapshot = () => {
    costingAPI.snapshot(Number(id)).then((r) => {
      toast.success(`Snapshot v${r.data?.version_number || ''} saved`);
      loadVersions();
      load();
    }).catch(() => toast.error('Snapshot failed'));
  };
  const handleExport = (format: 'csv' | 'json') => {
    const fn = format === 'csv' ? costingAPI.exportCSV : costingAPI.exportJSON;
    fn(Number(id)).then((r) => {
      const blob = format === 'csv'
        ? r.data  // already a Blob via responseType: 'blob'
        : new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `costing-${id}.${format}`; a.click(); URL.revokeObjectURL(url);
    }).catch(() => toast.error('Export failed'));
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-[#3BC25B] border-t-transparent rounded-full animate-spin" /></div>;
  if (!sheet) return null;

  const items = sheet.line_items || [];
  // Aggregate by cost_type for pie chart
  const catTotals: Record<string, number> = {};
  items.forEach((it: any) => { catTotals[it.cost_type] = (catTotals[it.cost_type] || 0) + Number(it.total_cost || 0); });
  const pieData = Object.entries(catTotals).map(([name, value]) => ({ name, value }));
  const COST_TYPE_LABELS: Record<string, string> = { MATERIAL: 'Material', LABOR: 'Labor', OVERHEAD: 'Overhead', LOGISTICS: 'Logistics', OTHER: 'Other' };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{sheet.title}</h1>
            <StatusBadge status={sheet.status || 'draft'} />
          </div>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{sheet.description || 'No description'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <GreenButton variant="outline" onClick={() => navigate('/costing')}><ArrowLeft className="w-4 h-4 mr-2" /> Back</GreenButton>
          <GreenButton variant="outline" onClick={() => navigate(`/costing/${id}/edit`)}><Pencil className="w-4 h-4 mr-2" /> Edit</GreenButton>
          <GreenButton variant="outline" onClick={() => navigate(`/costing/${id}/scenarios`)}><FlaskConical className="w-4 h-4 mr-2" /> Scenarios</GreenButton>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ label: 'Total Cost', value: `$${Number(sheet.total_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: 'text-gray-900 dark:text-white' },
          { label: 'Target Margin', value: `${sheet.target_margin_percent || 0}%`, color: 'text-[#0E8F79]' },
          { label: 'Selling Price', value: `$${Number(sheet.selling_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: 'text-gray-900 dark:text-white' },
          { label: 'Line Items', value: `${items.length}`, color: 'text-gray-900 dark:text-white' }].map((s, i) => (
          <Card key={i}>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
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
                    <th className="px-4 py-3 font-semibold text-right">Qty</th>
                    <th className="px-4 py-3 font-semibold">Unit</th>
                    <th className="px-4 py-3 font-semibold text-right">Unit Cost</th>
                    <th className="px-4 py-3 font-semibold text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {items.map((it: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[it.cost_type] || '#6B7280' }} />
                          {COST_TYPE_LABELS[it.cost_type] || it.cost_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{it.description}</td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{it.quantity}</td>
                      <td className="px-4 py-3 text-gray-500">{it.unit}</td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">₱{Number(it.unit_cost).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">₱{(Number(it.quantity) * Number(it.unit_cost)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-gray-200 dark:border-gray-600 font-bold">
                  <tr><td colSpan={5} className="px-4 py-3 text-gray-900 dark:text-white">Total</td><td className="px-4 py-3 text-right text-gray-900 dark:text-white">₱{Number(sheet.total_cost || 0).toFixed(2)}</td></tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </div>

        {/* Right side: Pie chart + actions */}
        <div className="space-y-6">
          {pieData.length > 0 && (
            <Card title="Cost Distribution">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" label={({ name, percent }) => `${COST_TYPE_LABELS[name] || name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                    {pieData.map((entry, i) => <Cell key={i} fill={CATEGORY_COLORS[entry.name] || '#6B7280'} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `₱${v.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          )}

          <Card title="Actions">
            <div className="space-y-2">
              <GreenButton fullWidth onClick={handleRecalc}><RefreshCw className="w-4 h-4 mr-2" /> Recalculate</GreenButton>
              <GreenButton fullWidth variant="outline" onClick={handleSnapshot}><Camera className="w-4 h-4 mr-2" /> Save Snapshot</GreenButton>
              <GreenButton fullWidth variant="outline" onClick={() => handleExport('csv')}><Download className="w-4 h-4 mr-2" /> Export CSV</GreenButton>
              <GreenButton fullWidth variant="outline" onClick={() => handleExport('json')}><Download className="w-4 h-4 mr-2" /> Export JSON</GreenButton>
            </div>
          </Card>

          <Card title="Details">
            <div className="space-y-3 text-sm">
              {[{ l: 'Sheet #', v: sheet.sheet_number || '—' },
                { l: 'Version', v: `v${sheet.version || 1}` },
                { l: 'Created', v: sheet.created_at ? new Date(sheet.created_at).toLocaleDateString() : '—' },
                { l: 'Updated', v: sheet.updated_at ? new Date(sheet.updated_at).toLocaleDateString() : '—' },
                { l: 'Created By', v: sheet.created_by_name || '—' }].map((item, i) => (
                <div key={i} className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">{item.l}</span><span className="font-medium text-gray-900 dark:text-white">{item.v}</span></div>
              ))}
            </div>
          </Card>
        </div>
      </div>

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
                          <div className="p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                            <p className="text-[10px] text-gray-500 uppercase">Total Cost</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">₱{Number(v.snapshot_data.total_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                          </div>
                          <div className="p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                            <p className="text-[10px] text-gray-500 uppercase">Selling Price</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">₱{Number(v.snapshot_data.selling_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                          </div>
                          <div className="p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                            <p className="text-[10px] text-gray-500 uppercase">Margin</p>
                            <p className="text-sm font-bold text-[#0E8F79]">{Number(v.snapshot_data.actual_margin_percent || 0).toFixed(2)}%</p>
                          </div>
                          <div className="p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                            <p className="text-[10px] text-gray-500 uppercase">Line Items</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">{v.snapshot_data.line_items?.length || 0}</p>
                          </div>
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
