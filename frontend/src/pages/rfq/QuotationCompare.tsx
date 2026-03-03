import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { GreenButton } from '../../components/ui/GreenButton';
import { rfqAPI, quotationAPI } from '../../services/rfqService';
import { toast } from 'sonner';
import {
  ArrowLeft, CheckCircle, XCircle, DollarSign, Clock, Shield, Star,
  FileText, Calendar, Package, Truck, Award, Info, ChevronDown, ChevronUp,
  Hash, AlertCircle, Download,
} from 'lucide-react';

const fmt = (v: any) => Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const OFFER_LABELS: Record<string, string> = { SAME: 'Same as Requirement', COUNTER: 'Counter-Offer' };
const VAT_LABELS: Record<string, string> = { VAT_INC: 'VAT Inclusive', VAT_EX: 'VAT Exclusive', VAT_EXEMPT: 'VAT Exempt' };
const AVAIL_LABELS: Record<string, string> = { ON_STOCK: 'On Stock', ORDER_BASIS: 'Order Basis' };
const WARRANTY_LABELS: Record<string, string> = { '6MOS': '6 Months', '1YR': '1 Year', '3YRS': '3 Years', '5YRS': '5 Years', OTHER: 'Other' };

export default function QuotationCompare() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<number | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const reload = () => rfqAPI.compare(Number(id)).then((r) => setComparison(r.data)).catch(() => {});

  useEffect(() => {
    rfqAPI.compare(Number(id)).then((r) => { setComparison(r.data); setLoading(false); }).catch(() => { toast.error('Failed to load comparison'); setLoading(false); });
  }, [id]);

  const handleAccept = async (quotationId: number) => {
    setAccepting(quotationId);
    try {
      await quotationAPI.accept(quotationId);
      toast.success('Canvass entry accepted! Others have been auto-rejected.');
      reload();
    } catch { toast.error('Failed to accept canvass entry'); } finally { setAccepting(null); }
  };

  const handleReject = async (quotationId: number) => {
    try {
      await quotationAPI.reject(quotationId);
      toast.success('Canvass entry rejected');
      reload();
    } catch { toast.error('Failed to reject canvass entry'); }
  };

  const toggleRow = (itemId: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      return next;
    });
  };
  const expandAll = () => setExpandedRows(new Set(lineItems.map((i: any) => i.rfq_item_id)));
  const collapseAll = () => setExpandedRows(new Set());

  /* ======== Export to CSV ======== */
  const exportCSV = () => {
    if (!comparison) return;
    const rfqData = comparison.rfq || {};
    const quots = comparison.quotations || [];
    const items = comparison.comparison_matrix || [];
    const esc = (v: any) => {
      const s = String(v ?? '').replace(/"/g, '""');
      return `"${s}"`;
    };
    const rows: string[] = [];

    // --- Section 1: RFQ Information ---
    rows.push('RFQ COMPARISON REPORT');
    rows.push('');
    rows.push(`RFQ Number,${esc(rfqData.rfq_number)}`);
    rows.push(`Title,${esc(rfqData.title)}`);
    rows.push(`Project,${esc(rfqData.project_title)}`);
    rows.push(`Client,${esc(rfqData.client_name)}`);
    rows.push(`Status,${esc(rfqData.status)}`);
    rows.push(`Priority,${esc(rfqData.priority)}`);
    rows.push(`Issue Date,${esc(rfqData.issue_date)}`);
    rows.push(`Deadline,${esc(rfqData.deadline || 'N/A')}`);
    rows.push(`Total Items,${rfqData.item_count}`);
    rows.push(`Total Canvass Entries,${rfqData.quotation_count}`);
    rows.push('');

    // --- Section 2: Supplier Summary ---
    rows.push('SUPPLIER SUMMARY');
    rows.push(['Supplier', 'Canvass #', 'Status', 'Total Amount', 'Currency', 'Lead Time (days)', 'Payment Terms', 'Validity (days)', 'Rating'].map(esc).join(','));
    quots.forEach((q: any) => {
      rows.push([
        q.supplier_name, q.quotation_number || `#${q.id}`, q.status,
        q.total_amount, q.currency, q.delivery_days, q.payment_terms,
        q.validity_days, Number(q.supplier_rating) > 0 ? `${q.supplier_rating}/5` : 'N/A',
      ].map(esc).join(','));
    });
    rows.push('');

    // --- Section 3: Item-by-Item Detail ---
    rows.push('ITEM-BY-ITEM COMPARISON');
    // Build header: fixed cols + per-supplier cols
    const detailFields = ['Unit Price', 'Line Total', 'Offer Type', 'Brand', 'Model', 'Description', 'VAT Type', 'Availability', 'Warranty', 'Delivery (days)', 'Notes'];
    const hdrCols = ['#', 'Item Name', 'Qty', 'Unit'];
    quots.forEach((q: any) => {
      detailFields.forEach((f) => hdrCols.push(`${q.supplier_name} — ${f}`));
    });
    rows.push(hdrCols.map(esc).join(','));

    items.forEach((item: any) => {
      const row: any[] = [item.item_number, item.item_name, item.quantity, item.unit];
      quots.forEach((q: any) => {
        const pe = (item.quotes || []).find((p: any) => p.supplier_id === q.supplier);
        if (pe && pe.unit_price) {
          row.push(
            pe.unit_price, pe.amount,
            OFFER_LABELS[pe.offer_type] || pe.offer_type || '',
            pe.brand || '', pe.model_number || '', pe.description || '',
            VAT_LABELS[pe.vat_type] || pe.vat_type || '',
            AVAIL_LABELS[pe.availability] || pe.availability || '',
            WARRANTY_LABELS[pe.warranty_period] || pe.warranty_period || '',
            pe.delivery_days ?? '', pe.notes || '',
          );
        } else {
          detailFields.forEach(() => row.push('No quote'));
        }
      });
      rows.push(row.map(esc).join(','));
    });

    // Grand total row
    const totalRow: any[] = ['', 'GRAND TOTAL', '', ''];
    quots.forEach((q: any) => {
      totalRow.push(q.total_amount);
      for (let i = 1; i < detailFields.length; i++) totalRow.push('');
    });
    rows.push(totalRow.map(esc).join(','));

    // Download
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${rfqData.rfq_number || 'RFQ'}_Comparison.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Comparison exported to CSV');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-[#3BC25B] border-t-transparent rounded-full animate-spin" /></div>;
  }

  const rfq = comparison?.rfq || {};
  const quotations = comparison?.quotations || [];
  const lineItems = comparison?.comparison_matrix || [];

  /* ---- best-price per item ---- */
  const bestByItem: Record<number, number> = {};
  const bestTotalSupplier: Record<number, number> = {};
  lineItems.forEach((item: any) => {
    let best = Infinity;
    let bestSupId = -1;
    (item.quotes || []).forEach((p: any) => {
      if (p.unit_price && Number(p.unit_price) < best) { best = Number(p.unit_price); bestSupId = p.supplier_id; }
    });
    bestByItem[item.rfq_item_id] = bestSupId;
  });
  quotations.forEach((q: any) => { bestTotalSupplier[q.supplier] = Number(q.total_amount || 0); });
  const lowestTotal = Math.min(...Object.values(bestTotalSupplier));

  const statusColor = (s: string) => {
    if (s === 'ACCEPTED') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    if (s === 'REJECTED') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
  };
  const priorityColor = (p: string) => {
    if (p === 'URGENT') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    if (p === 'HIGH') return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
    if (p === 'MEDIUM') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
    return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
  };

  const supplierColors = ['from-[#63D44A] to-[#0E8F79]', 'from-blue-400 to-blue-600', 'from-purple-400 to-purple-600', 'from-orange-400 to-orange-600', 'from-pink-400 to-pink-600', 'from-teal-400 to-teal-600'];

  return (
    <div className="space-y-6">
      {/* ======== Header ======== */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Canvass Comparison Matrix</h1>
          <p className="text-gray-500 dark:text-gray-400">Side-by-side supplier analysis for {rfq.rfq_number || `RFQ #${id}`}</p>
        </div>
        <div className="flex gap-3">
          <GreenButton onClick={exportCSV}><Download className="w-4 h-4 mr-2" /> Export CSV</GreenButton>
          <GreenButton variant="outline" onClick={() => navigate(`/rfq/${id}`)}><ArrowLeft className="w-4 h-4 mr-2" /> Back to RFQ</GreenButton>
        </div>
      </div>

      {/* ======== RFQ Summary Banner ======== */}
      <Card accent>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#3BC25B]/10"><Hash className="w-5 h-5 text-[#3BC25B]" /></div>
            <div><p className="text-[10px] text-gray-500 uppercase font-semibold">RFQ Number</p><p className="text-sm font-bold text-gray-900 dark:text-white">{rfq.rfq_number}</p></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><FileText className="w-5 h-5 text-blue-500" /></div>
            <div><p className="text-[10px] text-gray-500 uppercase font-semibold">Title</p><p className="text-sm font-bold text-gray-900 dark:text-white">{rfq.title}</p></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10"><Package className="w-5 h-5 text-purple-500" /></div>
            <div><p className="text-[10px] text-gray-500 uppercase font-semibold">Items / Canvass</p><p className="text-sm font-bold text-gray-900 dark:text-white">{rfq.item_count} items &middot; {rfq.quotation_count} canvass entr{rfq.quotation_count !== 1 ? 'ies' : 'y'}</p></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10"><Calendar className="w-5 h-5 text-orange-500" /></div>
            <div><p className="text-[10px] text-gray-500 uppercase font-semibold">Deadline</p><p className="text-sm font-bold text-gray-900 dark:text-white">{rfq.deadline || '—'}</p></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-500/10"><Info className="w-5 h-5 text-gray-500" /></div>
            <div><p className="text-[10px] text-gray-500 uppercase font-semibold">Status</p><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColor(rfq.status)}`}>{rfq.status}</span></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10"><AlertCircle className="w-5 h-5 text-red-500" /></div>
            <div><p className="text-[10px] text-gray-500 uppercase font-semibold">Priority</p><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${priorityColor(rfq.priority)}`}>{rfq.priority}</span></div>
          </div>
        </div>
      </Card>

      {/* ======== Supplier Summary Cards ======== */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Supplier Submissions ({quotations.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {quotations.map((q: any, idx: number) => {
            return (
              <Card key={q.id}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${supplierColors[idx % supplierColors.length]} flex items-center justify-center text-white font-bold text-lg shadow-md`}>{q.supplier_name?.charAt(0)}</div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">{q.supplier_name}</h3>
                      <p className="text-xs text-gray-500">{q.quotation_number || `Quotation #${q.id}`}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${statusColor(q.status)}`}>{q.status}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                    <DollarSign className="w-4 h-4 text-[#3BC25B] shrink-0" />
                    <div className="min-w-0"><p className="text-[10px] text-gray-500 uppercase">Total Amount</p><p className="text-sm font-bold text-gray-900 dark:text-white truncate">₱{fmt(q.total_amount)}</p></div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                    <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                    <div className="min-w-0"><p className="text-[10px] text-gray-500 uppercase">Lead Time</p><p className="text-sm font-bold text-gray-900 dark:text-white">{q.delivery_days || '—'} days</p></div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                    <Shield className="w-4 h-4 text-purple-500 shrink-0" />
                    <div className="min-w-0"><p className="text-[10px] text-gray-500 uppercase">Payment</p><p className="text-sm font-bold text-gray-900 dark:text-white truncate">{q.payment_terms || '—'}</p></div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                    <Star className="w-4 h-4 text-orange-500 shrink-0" />
                    <div><p className="text-[10px] text-gray-500 uppercase">Rating</p><p className="text-sm font-bold text-gray-900 dark:text-white">{Number(q.supplier_rating) > 0 ? `${q.supplier_rating}/5` : '—'}</p></div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                    <Calendar className="w-4 h-4 text-teal-500 shrink-0" />
                    <div><p className="text-[10px] text-gray-500 uppercase">Validity</p><p className="text-sm font-bold text-gray-900 dark:text-white">{q.validity_days} days</p></div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                    <DollarSign className="w-4 h-4 text-gray-500 shrink-0" />
                    <div><p className="text-[10px] text-gray-500 uppercase">Currency</p><p className="text-sm font-bold text-gray-900 dark:text-white">{q.currency}</p></div>
                  </div>
                </div>

                {/* Accept / Reject */}
                {q.status === 'PENDING' && (
                  <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <button onClick={() => handleAccept(q.id)} disabled={accepting !== null}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#63D44A] to-[#0E8F79] rounded-lg hover:shadow-lg hover:shadow-green-200/50 dark:hover:shadow-green-900/30 transition-all disabled:opacity-50">
                      {accepting === q.id ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />} Accept
                    </button>
                    <button onClick={() => handleReject(q.id)} disabled={accepting !== null}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-50">
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                )}
                {q.status === 'ACCEPTED' && (
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700 text-green-600 dark:text-green-400"><CheckCircle className="w-4 h-4" /><span className="text-sm font-semibold">Accepted</span></div>
                )}
                {q.status === 'REJECTED' && (
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700 text-red-500 dark:text-red-400"><XCircle className="w-4 h-4" /><span className="text-sm font-semibold">Rejected</span></div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* ======== Detailed Comparison Table ======== */}
      {lineItems.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Item-by-Item Comparison</h2>
            <div className="flex gap-2">
              <button onClick={expandAll} className="text-xs text-[#3BC25B] hover:underline font-semibold flex items-center gap-1"><ChevronDown className="w-3.5 h-3.5" /> Expand All</button>
              <button onClick={collapseAll} className="text-xs text-gray-500 hover:underline font-semibold flex items-center gap-1"><ChevronUp className="w-3.5 h-3.5" /> Collapse All</button>
            </div>
          </div>
          <Card accent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold w-8">#</th>
                    <th className="px-4 py-3 font-semibold min-w-[180px]">Item Description</th>
                    <th className="px-4 py-3 font-semibold text-center">Qty</th>
                    <th className="px-4 py-3 font-semibold text-center">Unit</th>
                    {quotations.map((q: any, i: number) => (
                      <th key={q.id} className="px-4 py-3 font-semibold text-center min-w-[200px]">
                        <div className="flex items-center justify-center gap-2">
                          <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${supplierColors[i % supplierColors.length]} flex items-center justify-center text-white text-[10px] font-bold`}>{q.supplier_name?.charAt(0)}</div>
                          {q.supplier_name}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {lineItems.map((item: any) => {
                    const isExpanded = expandedRows.has(item.rfq_item_id);
                    return (
                      <React.Fragment key={item.rfq_item_id}>
                        {/* ---- Main row: price summary ---- */}
                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors cursor-pointer" onClick={() => toggleRow(item.rfq_item_id)}>
                          <td className="px-4 py-3 text-gray-500 font-mono text-xs">{item.item_number}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button className="text-gray-400 hover:text-[#3BC25B] transition-colors">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                              <div>
                                <p className="font-semibold text-gray-900 dark:text-white">{item.item_name}</p>
                                {(item.brand || item.model_number) && (
                                  <p className="text-[11px] text-gray-500">{[item.brand, item.model_number].filter(Boolean).join(' · ')}</p>
                                )}
                                {item.description && <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{item.description}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">{item.quantity}</td>
                          <td className="px-4 py-3 text-center text-gray-500">{item.unit}</td>
                          {quotations.map((q: any) => {
                            const pe = (item.quotes || []).find((p: any) => p.supplier_id === q.supplier);
                            const isBest = bestByItem[item.rfq_item_id] === q.supplier && quotations.length > 1;
                            return (
                              <td key={q.id} className="px-4 py-3 text-center">
                                {pe && pe.unit_price ? (
                                  <div>
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold ${isBest ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 ring-1 ring-green-200 dark:ring-green-800' : 'text-gray-800 dark:text-gray-200'}`}>
                                      {isBest && <CheckCircle className="w-3.5 h-3.5" />} ₱{fmt(pe.unit_price)}
                                    </span>
                                    <p className="text-[11px] text-gray-400 mt-1">Line total: ₱{fmt(pe.amount)}</p>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 italic text-xs">No canvass</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>

                        {/* ---- Expanded detail rows ---- */}
                        {isExpanded && (
                          <tr className="bg-gray-50/50 dark:bg-gray-800/30">
                            <td></td>
                            <td colSpan={3 + quotations.length} className="px-4 py-3">
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                  <thead>
                                    <tr className="bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 uppercase">
                                      <th className="px-3 py-2 text-left font-semibold w-[140px]">Detail</th>
                                      {quotations.map((q: any, i: number) => (
                                        <th key={q.id} className="px-3 py-2 text-left font-semibold">
                                          <span className={`inline-block w-2 h-2 rounded-full bg-gradient-to-br ${supplierColors[i % supplierColors.length]} mr-1.5`}></span>
                                          {q.supplier_name}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {/* Offer Type */}
                                    <tr>
                                      <td className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Offer Type</td>
                                      {quotations.map((q: any) => {
                                        const pe = (item.quotes || []).find((p: any) => p.supplier_id === q.supplier);
                                        return <td key={q.id} className="px-3 py-2 text-gray-800 dark:text-gray-200">{pe ? (OFFER_LABELS[pe.offer_type] || pe.offer_type) : '—'}</td>;
                                      })}
                                    </tr>
                                    {/* Brand */}
                                    <tr className="bg-white dark:bg-gray-800/20">
                                      <td className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Brand</td>
                                      {quotations.map((q: any) => {
                                        const pe = (item.quotes || []).find((p: any) => p.supplier_id === q.supplier);
                                        return <td key={q.id} className="px-3 py-2 text-gray-800 dark:text-gray-200">{pe?.brand || '—'}</td>;
                                      })}
                                    </tr>
                                    {/* Model */}
                                    <tr>
                                      <td className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Model Number</td>
                                      {quotations.map((q: any) => {
                                        const pe = (item.quotes || []).find((p: any) => p.supplier_id === q.supplier);
                                        return <td key={q.id} className="px-3 py-2 text-gray-800 dark:text-gray-200 font-mono">{pe?.model_number || '—'}</td>;
                                      })}
                                    </tr>
                                    {/* Description */}
                                    <tr className="bg-white dark:bg-gray-800/20">
                                      <td className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Description</td>
                                      {quotations.map((q: any) => {
                                        const pe = (item.quotes || []).find((p: any) => p.supplier_id === q.supplier);
                                        return <td key={q.id} className="px-3 py-2 text-gray-800 dark:text-gray-200 max-w-[250px]">{pe?.description || '—'}</td>;
                                      })}
                                    </tr>
                                    {/* Unit Price */}
                                    <tr>
                                      <td className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Unit Price</td>
                                      {quotations.map((q: any) => {
                                        const pe = (item.quotes || []).find((p: any) => p.supplier_id === q.supplier);
                                        const isBest = bestByItem[item.rfq_item_id] === q.supplier && quotations.length > 1;
                                        return <td key={q.id} className={`px-3 py-2 font-bold ${isBest ? 'text-green-600 dark:text-green-400' : 'text-gray-800 dark:text-gray-200'}`}>{pe?.unit_price ? `₱${fmt(pe.unit_price)}` : '—'}</td>;
                                      })}
                                    </tr>
                                    {/* Line Total */}
                                    <tr className="bg-white dark:bg-gray-800/20">
                                      <td className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Line Total</td>
                                      {quotations.map((q: any) => {
                                        const pe = (item.quotes || []).find((p: any) => p.supplier_id === q.supplier);
                                        return <td key={q.id} className="px-3 py-2 font-bold text-gray-800 dark:text-gray-200">{pe?.amount ? `₱${fmt(pe.amount)}` : '—'}</td>;
                                      })}
                                    </tr>
                                    {/* VAT Type */}
                                    <tr>
                                      <td className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">VAT Type</td>
                                      {quotations.map((q: any) => {
                                        const pe = (item.quotes || []).find((p: any) => p.supplier_id === q.supplier);
                                        return <td key={q.id} className="px-3 py-2 text-gray-800 dark:text-gray-200">
                                          {pe ? <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${pe.vat_type === 'VAT_INC' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : pe.vat_type === 'VAT_EX' ? 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' : 'bg-gray-100 text-gray-600'}`}>{VAT_LABELS[pe.vat_type] || pe.vat_type}</span> : '—'}
                                        </td>;
                                      })}
                                    </tr>
                                    {/* Availability */}
                                    <tr className="bg-white dark:bg-gray-800/20">
                                      <td className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Availability</td>
                                      {quotations.map((q: any) => {
                                        const pe = (item.quotes || []).find((p: any) => p.supplier_id === q.supplier);
                                        return <td key={q.id} className="px-3 py-2 text-gray-800 dark:text-gray-200">
                                          {pe?.availability ? <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${pe.availability === 'ON_STOCK' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'}`}>{AVAIL_LABELS[pe.availability] || pe.availability}</span> : '—'}
                                        </td>;
                                      })}
                                    </tr>
                                    {/* Warranty */}
                                    <tr>
                                      <td className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Warranty</td>
                                      {quotations.map((q: any) => {
                                        const pe = (item.quotes || []).find((p: any) => p.supplier_id === q.supplier);
                                        return <td key={q.id} className="px-3 py-2 text-gray-800 dark:text-gray-200">{pe?.warranty_period ? (WARRANTY_LABELS[pe.warranty_period] || pe.warranty_period) : '—'}</td>;
                                      })}
                                    </tr>
                                    {/* Delivery Days */}
                                    <tr className="bg-white dark:bg-gray-800/20">
                                      <td className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Delivery (days)</td>
                                      {quotations.map((q: any) => {
                                        const pe = (item.quotes || []).find((p: any) => p.supplier_id === q.supplier);
                                        return <td key={q.id} className="px-3 py-2 text-gray-800 dark:text-gray-200">{pe?.delivery_days ?? '—'}</td>;
                                      })}
                                    </tr>
                                    {/* Notes */}
                                    <tr>
                                      <td className="px-3 py-2 font-semibold text-gray-600 dark:text-gray-400">Notes</td>
                                      {quotations.map((q: any) => {
                                        const pe = (item.quotes || []).find((p: any) => p.supplier_id === q.supplier);
                                        return <td key={q.id} className="px-3 py-2 text-gray-500 italic">{pe?.notes || '—'}</td>;
                                      })}
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 border-gray-200 dark:border-gray-600">
                  <tr className="bg-gray-50 dark:bg-gray-700/50 font-bold">
                    <td className="px-4 py-4" colSpan={2}>
                      <span className="text-gray-900 dark:text-white text-base">Grand Total</span>
                    </td>
                    <td colSpan={2}></td>
                    {quotations.map((q: any) => {
                      const isLowestRow = Number(q.total_amount || 0) === lowestTotal && quotations.length > 1;
                      return (
                        <td key={q.id} className="px-4 py-4 text-center">
                          <span className={`text-base font-bold ${isLowestRow ? 'text-[#3BC25B]' : 'text-gray-900 dark:text-white'}`}>
                            ₱{fmt(q.total_amount)}
                          </span>
                          {isLowestRow && <p className="text-[10px] text-[#3BC25B] font-semibold mt-0.5">BEST PRICE</p>}
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ======== Empty state ======== */}
      {quotations.length === 0 && (
        <Card>
          <div className="text-center py-16 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-semibold">No quotations available for comparison</p>
            <p className="text-sm mt-1 mb-4">Submit quotations from suppliers first, then return here to compare.</p>
            <GreenButton onClick={() => navigate('/quotations/new')}>Create Quotation</GreenButton>
          </div>
        </Card>
      )}
    </div>
  );
}
