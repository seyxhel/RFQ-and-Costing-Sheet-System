import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  FileText, CheckCircle, Clock, Download, ArrowLeft, TrendingUp,
  Truck, Calculator, Send, Award, Wallet, ShoppingCart, AlertTriangle,
  User, ArrowRight, Search,
} from 'lucide-react';
import { reportAPI } from '../services/userService';
import { budgetAPI } from '../services/budgetService';
import { rfqAPI } from '../services/rfqService';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';

export default function ProjectReport() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Picker state
  const [anchor, setAnchor] = useState<'budget' | 'rfq' | 'po'>('budget');
  const [anchorId, setAnchorId] = useState('');
  const [pickerItems, setPickerItems] = useState<any[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  // Auto-load if URL has params
  useEffect(() => {
    const budget = params.get('budget');
    const rfq = params.get('rfq');
    const po = params.get('po');
    if (budget) { setAnchor('budget'); setAnchorId(budget); loadReport({ budget }); }
    else if (rfq) { setAnchor('rfq'); setAnchorId(rfq); loadReport({ rfq }); }
    else if (po) { setAnchor('po'); setAnchorId(po); loadReport({ po }); }
  }, []);

  // Load picker options
  useEffect(() => {
    (async () => {
      setPickerLoading(true);
      try {
        if (anchor === 'budget') {
          const res = await budgetAPI.list();
          setPickerItems((res.data?.results ?? res.data).map((b: any) => ({ id: b.id, label: `${b.budget_number} — ${b.title}` })));
        } else if (anchor === 'rfq') {
          const res = await rfqAPI.list();
          setPickerItems((res.data?.results ?? res.data).map((r: any) => ({ id: r.id, label: `${r.rfq_number} — ${r.title}` })));
        } else {
          const { purchaseOrderAPI } = await import('../services/procurementService');
          const res = await purchaseOrderAPI.list();
          setPickerItems((res.data?.results ?? res.data).map((p: any) => ({ id: p.id, label: `${p.po_number} — ${p.title}` })));
        }
      } catch { setPickerItems([]); }
      finally { setPickerLoading(false); }
    })();
  }, [anchor]);

  const loadReport = async (p: any) => {
    setLoading(true);
    setError('');
    try {
      const res = await reportAPI.project(p);
      setData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load report');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => {
    if (!anchorId) return;
    loadReport({ [anchor]: anchorId });
  };

  const exportCSV = () => {
    if (!data) return;
    const rows: string[][] = [];
    const s = data.executive_summary;

    rows.push(['PROJECT LIFECYCLE REPORT']);
    rows.push([]);
    rows.push(['EXECUTIVE SUMMARY']);
    rows.push(['Project', s.project_title]);
    rows.push(['Client', s.client_name]);
    rows.push(['Total Estimated', s.total_estimated]);
    rows.push(['Total Actual', s.total_actual]);
    rows.push(['Total Variance', s.total_variance]);
    rows.push(['Variance %', s.total_variance_pct + '%']);
    rows.push([]);

    if (data.rfqs?.length) {
      rows.push(['RFQ LIST']);
      rows.push(['RFQ #', 'Title', 'Project', 'Client', 'Status', 'Created By']);
      data.rfqs.forEach((r: any) => rows.push([r.rfq_number, r.title, r.project_title, r.client_name, r.status, r.created_by]));
      rows.push([]);
    }

    if (data.quotations?.length) {
      rows.push(['SUPPLIER QUOTATIONS']);
      rows.push(['Quotation #', 'Supplier', 'Status', 'Total']);
      data.quotations.forEach((q: any) => rows.push([q.quotation_number, q.supplier_name, q.status, q.total_amount]));
      rows.push([]);
    }

    if (data.costing_sheets?.length) {
      rows.push(['COSTING SHEETS']);
      rows.push(['Sheet #', 'Title', 'Status', 'Total Project Cost', 'Version']);
      data.costing_sheets.forEach((c: any) => rows.push([c.sheet_number, c.title, c.status, c.total_project_cost, c.version]));
      rows.push([]);
    }

    if (data.formal_quotations?.length) {
      rows.push(['FORMAL QUOTATIONS']);
      rows.push(['Quotation #', 'Client', 'Project', 'Status', 'Total']);
      data.formal_quotations.forEach((q: any) => rows.push([q.quotation_number, q.client_name, q.project_title, q.status, q.total_amount]));
      rows.push([]);
    }

    if (data.sales_orders?.length) {
      rows.push(['SALES ORDERS']);
      rows.push(['SO #', 'Client', 'Project', 'Status', 'Contract Amount']);
      data.sales_orders.forEach((so: any) => rows.push([so.so_number, so.client_name, so.project_title, so.status, so.contract_amount]));
      rows.push([]);
    }

    if (data.contract_analyses?.length) {
      rows.push(['CONTRACT ANALYSES']);
      rows.push(['Sales Order', 'Contract Price', 'Net Cash Flow', 'Net Benefit']);
      data.contract_analyses.forEach((ca: any) => rows.push([ca.sales_order, ca.contract_price, ca.net_cash_flow, ca.net_benefit]));
      rows.push([]);
    }

    if (data.budgets?.length) {
      rows.push(['BUDGETS']);
      rows.push(['Budget #', 'Title', 'Status', 'Allocated', 'Spent', 'Remaining', 'Utilization %', 'Approved By']);
      data.budgets.forEach((b: any) => rows.push([b.budget_number, b.title, b.status, b.allocated_amount, b.spent_amount, b.remaining_amount, b.utilization_percent + '%', b.approved_by]));
      rows.push([]);
    }

    if (data.purchase_orders?.length) {
      rows.push(['PURCHASE ORDERS']);
      rows.push(['PO #', 'Title', 'Status', 'Supplier', 'Estimated', 'Actual', 'Variance', 'Variance %']);
      data.purchase_orders.forEach((p: any) => rows.push([p.po_number, p.title, p.status, p.supplier_name, p.estimated_total, p.actual_total, p.variance, p.variance_pct + '%']));
      rows.push([]);
    }

    if (data.audit_trail?.length) {
      rows.push(['AUDIT TRAIL']);
      rows.push(['Timestamp', 'Action', 'Object Type', 'Object', 'Old Status', 'New Status', 'User']);
      data.audit_trail.forEach((a: any) => rows.push([a.timestamp, a.action_display, a.object_type, a.object_repr, a.old_status, a.new_status, a.user_name]));
    }

    const csv = rows.map((r) => r.map((c) => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Project_Report_${s.project_title?.replace(/\s+/g, '_') || 'report'}.csv`;
    a.click();
  };

  const fmt = (v: string | number) => `₱${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  const pct = (v: string | number) => `${Number(v) > 0 ? '+' : ''}${v}%`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Project Lifecycle Report</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Consolidated management-level project summary</p>
        </div>
        <div className="flex gap-3">
          {data && (
            <button onClick={exportCSV} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Picker */}
      <Card accent>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Trace From</label>
            <select value={anchor} onChange={(e) => { setAnchor(e.target.value as any); setAnchorId(''); }}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none">
              <option value="budget">Budget</option>
              <option value="rfq">RFQ</option>
              <option value="po">Purchase Order</option>
            </select>
          </div>
          <div className="flex-1 min-w-[250px]">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Select Record</label>
            <select value={anchorId} onChange={(e) => setAnchorId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none">
              <option value="">— Select —</option>
              {pickerItems.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </div>
          <button onClick={handleGenerate} disabled={!anchorId || loading}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#63D44A] to-[#0E8F79] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40">
            <Search className="w-4 h-4 inline mr-2" /> Generate Report
          </button>
        </div>
      </Card>

      {loading && <div className="text-center py-12 text-gray-400">Loading report...</div>}
      {error && <div className="text-center py-12 text-red-500">{error}</div>}

      {data && !loading && (
        <>
          {/* Executive Summary */}
          <Card accent>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#0E8F79]" /> Executive Summary
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Project</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{data.executive_summary.project_title || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Client</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{data.executive_summary.client_name || '—'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Total Estimated</p>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{fmt(data.executive_summary.total_estimated)}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                <p className="text-xs text-green-600 dark:text-green-400 font-medium">Total Actual</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-300">{fmt(data.executive_summary.total_actual)}</p>
              </div>
              <div className={`p-3 rounded-lg ${Number(data.executive_summary.total_variance) > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
                <p className={`text-xs font-medium ${Number(data.executive_summary.total_variance) > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>Total Variance</p>
                <p className={`text-xl font-bold ${Number(data.executive_summary.total_variance) > 0 ? 'text-red-700 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{fmt(data.executive_summary.total_variance)}</p>
              </div>
              <div className={`p-3 rounded-lg ${Number(data.executive_summary.total_variance_pct) > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
                <p className={`text-xs font-medium ${Number(data.executive_summary.total_variance_pct) > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>Variance %</p>
                <p className={`text-xl font-bold ${Number(data.executive_summary.total_variance_pct) > 0 ? 'text-red-700 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{pct(data.executive_summary.total_variance_pct)}</p>
              </div>
            </div>
          </Card>

          {/* RFQs */}
          {data.rfqs?.length > 0 && (
            <Card accent>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#0E8F79]" /> RFQs
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3">RFQ #</th><th className="px-4 py-3">Title</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Created By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {data.rfqs.map((r: any) => (
                      <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 font-medium text-[#0E8F79]">{r.rfq_number}</td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white">{r.title}</td>
                        <td className="px-4 py-3 text-gray-500">{r.client_name}</td>
                        <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                        <td className="px-4 py-3 text-gray-500">{r.created_by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Quotations */}
          {data.quotations?.length > 0 && (
            <Card accent>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#0E8F79]" /> Supplier Quotations
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3">Quotation #</th><th className="px-4 py-3">Supplier</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {data.quotations.map((q: any) => (
                      <tr key={q.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 font-medium text-[#0E8F79]">{q.quotation_number}</td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white">{q.supplier_name}</td>
                        <td className="px-4 py-3"><StatusBadge status={q.status} /></td>
                        <td className="px-4 py-3 text-right">{fmt(q.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Costing Sheets */}
          {data.costing_sheets?.length > 0 && (
            <Card accent>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-[#0E8F79]" /> Costing Sheets
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3">Sheet #</th><th className="px-4 py-3">Title</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Total Project Cost</th><th className="px-4 py-3 text-right">Version</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {data.costing_sheets.map((c: any) => (
                      <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 font-medium text-[#0E8F79]">{c.sheet_number}</td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white">{c.title}</td>
                        <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                        <td className="px-4 py-3 text-right">{fmt(c.total_project_cost)}</td>
                        <td className="px-4 py-3 text-right text-gray-500">v{c.version}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Formal Quotations */}
          {data.formal_quotations?.length > 0 && (
            <Card accent>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Send className="w-5 h-5 text-[#0E8F79]" /> Formal Quotations
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3">Quotation #</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Project</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {data.formal_quotations.map((q: any) => (
                      <tr key={q.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 font-medium text-[#0E8F79]">{q.quotation_number}</td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white">{q.client_name}</td>
                        <td className="px-4 py-3 text-gray-500">{q.project_title}</td>
                        <td className="px-4 py-3"><StatusBadge status={q.status} /></td>
                        <td className="px-4 py-3 text-right">{fmt(q.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Sales Orders */}
          {data.sales_orders?.length > 0 && (
            <Card accent>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-[#0E8F79]" /> Sales Orders
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3">SO #</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Project</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Contract Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {data.sales_orders.map((so: any) => (
                      <tr key={so.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 font-medium text-[#0E8F79]">{so.so_number}</td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white">{so.client_name}</td>
                        <td className="px-4 py-3 text-gray-500">{so.project_title}</td>
                        <td className="px-4 py-3"><StatusBadge status={so.status} /></td>
                        <td className="px-4 py-3 text-right font-medium">{fmt(so.contract_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Contract Analyses */}
          {data.contract_analyses?.length > 0 && (
            <Card accent>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#0E8F79]" /> Contract Analyses
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3">Sales Order</th><th className="px-4 py-3 text-right">Contract Price</th><th className="px-4 py-3 text-right">Net Cash Flow</th><th className="px-4 py-3 text-right">Net Benefit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {data.contract_analyses.map((ca: any) => (
                      <tr key={ca.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 text-gray-900 dark:text-white">SO #{ca.sales_order}</td>
                        <td className="px-4 py-3 text-right">{fmt(ca.contract_price)}</td>
                        <td className="px-4 py-3 text-right">{fmt(ca.net_cash_flow)}</td>
                        <td className="px-4 py-3 text-right font-medium">{fmt(ca.net_benefit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Budgets */}
          {data.budgets?.length > 0 && (
            <Card accent>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-[#0E8F79]" /> Budgets
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3">Budget #</th><th className="px-4 py-3">Title</th><th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Allocated</th><th className="px-4 py-3 text-right">Spent</th>
                      <th className="px-4 py-3 text-right">Remaining</th><th className="px-4 py-3 text-right">Utilization</th><th className="px-4 py-3">Approved By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {data.budgets.map((b: any) => (
                      <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 font-medium text-[#0E8F79]">{b.budget_number}</td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white">{b.title}</td>
                        <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                        <td className="px-4 py-3 text-right">{fmt(b.allocated_amount)}</td>
                        <td className="px-4 py-3 text-right">{fmt(b.spent_amount)}</td>
                        <td className="px-4 py-3 text-right">{fmt(b.remaining_amount)}</td>
                        <td className="px-4 py-3 text-right font-medium">{b.utilization_percent}%</td>
                        <td className="px-4 py-3 text-gray-500">{b.approved_by || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Purchase Orders */}
          {data.purchase_orders?.length > 0 && (
            <Card accent>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#0E8F79]" /> Purchase Orders & Variance
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3">PO #</th><th className="px-4 py-3">Title</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Supplier</th>
                      <th className="px-4 py-3 text-right">Estimated</th><th className="px-4 py-3 text-right">Actual</th>
                      <th className="px-4 py-3 text-right">Variance</th><th className="px-4 py-3 text-right">Var %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {data.purchase_orders.map((p: any) => (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 font-medium text-[#0E8F79]">{p.po_number}</td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white">{p.title}</td>
                        <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                        <td className="px-4 py-3 text-gray-500">{p.supplier_name}</td>
                        <td className="px-4 py-3 text-right">{fmt(p.estimated_total)}</td>
                        <td className="px-4 py-3 text-right">{fmt(p.actual_total)}</td>
                        <td className={`px-4 py-3 text-right font-medium ${Number(p.variance) > 0 ? 'text-red-500' : Number(p.variance) < 0 ? 'text-green-600' : ''}`}>{fmt(p.variance)}</td>
                        <td className={`px-4 py-3 text-right ${Number(p.variance_pct) > 0 ? 'text-red-500' : Number(p.variance_pct) < 0 ? 'text-green-600' : ''}`}>{pct(p.variance_pct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Audit Trail */}
          <Card accent>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#0E8F79]" /> Audit Trail ({data.audit_trail?.length || 0} events)
            </h2>
            {data.audit_trail?.length > 0 ? (
              <div className="relative">
                <div className="absolute left-[18px] top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                <div className="space-y-3">
                  {data.audit_trail.map((a: any, i: number) => (
                    <div key={a.id} className="flex gap-4 items-start relative">
                      <div className="w-9 h-9 rounded-full bg-white dark:bg-gray-800 border-2 border-[#3BC25B] flex items-center justify-center z-10 flex-shrink-0">
                        <CheckCircle className="w-4 h-4 text-[#0E8F79]" />
                      </div>
                      <div className="flex-1 min-w-0 pb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-gray-900 dark:text-white">{a.action_display}</span>
                          <span className="text-xs text-gray-400">{a.object_type}</span>
                          {a.object_repr && <span className="text-xs font-medium text-[#0E8F79]">{a.object_repr}</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {(a.old_status || a.new_status) && (
                            <div className="flex items-center gap-1 text-xs">
                              {a.old_status && <StatusBadge status={a.old_status} />}
                              {a.old_status && a.new_status && <ArrowRight className="w-3 h-3 text-gray-400" />}
                              {a.new_status && <StatusBadge status={a.new_status} />}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 dark:text-gray-500">
                          <span className="flex items-center gap-1"><User className="w-3 h-3" /> {a.user_name}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(a.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">
                No audit trail entries yet. Actions performed from now on will appear here.
              </p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
