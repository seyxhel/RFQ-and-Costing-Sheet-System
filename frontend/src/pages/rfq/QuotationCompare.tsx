import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { GreenButton } from '../../components/ui/GreenButton';
import { rfqAPI, quotationAPI } from '../../services/rfqService';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle, XCircle, DollarSign, Clock, Shield, Star } from 'lucide-react';

export default function QuotationCompare() {
  const { id } = useParams(); // RFQ id
  const navigate = useNavigate();
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<number | null>(null);

  useEffect(() => {
    rfqAPI.compare(Number(id)).then((r) => { setComparison(r.data); setLoading(false); }).catch(() => { toast.error('Failed to load comparison'); setLoading(false); });
  }, [id]);

  const handleAccept = async (quotationId: number) => {
    setAccepting(quotationId);
    try {
      await quotationAPI.accept(quotationId);
      toast.success('Quotation accepted! Other quotations have been rejected.');
      // Reload comparison data
      rfqAPI.compare(Number(id)).then((r) => setComparison(r.data)).catch(() => {});
    } catch {
      toast.error('Failed to accept quotation');
    } finally {
      setAccepting(null);
    }
  };

  const handleReject = async (quotationId: number) => {
    try {
      await quotationAPI.reject(quotationId);
      toast.success('Quotation rejected');
      rfqAPI.compare(Number(id)).then((r) => setComparison(r.data)).catch(() => {});
    } catch {
      toast.error('Failed to reject quotation');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-[#3BC25B] border-t-transparent rounded-full animate-spin" /></div>;
  }

  const quotations = comparison?.quotations || [];
  const lineItems = comparison?.comparison_matrix || [];

  // Find best prices
  const bestByItem: Record<number, number> = {};
  lineItems.forEach((item: any) => {
    let best = Infinity;
    let bestSupId = -1;
    (item.quotes || []).forEach((p: any) => { if (p.unit_price && Number(p.unit_price) < best) { best = Number(p.unit_price); bestSupId = p.supplier_id; } });
    bestByItem[item.rfq_item_id] = bestSupId;
  });

  const statusColor = (s: string) => {
    if (s === 'ACCEPTED') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    if (s === 'REJECTED') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quotation Comparison</h1>
          <p className="text-gray-500 dark:text-gray-400">RFQ #{id} — Side-by-side supplier comparison</p>
        </div>
        <GreenButton variant="outline" onClick={() => navigate(`/rfq/${id}`)}><ArrowLeft className="w-4 h-4 mr-2" /> Back to RFQ</GreenButton>
      </div>

      {/* Supplier summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quotations.map((q: any, idx: number) => {
          const colors = ['from-[#63D44A] to-[#0E8F79]', 'from-blue-400 to-blue-600', 'from-purple-400 to-purple-600', 'from-orange-400 to-orange-600'];
          return (
            <Card key={q.id}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${colors[idx % colors.length]} flex items-center justify-center text-white font-bold`}>{q.supplier_name?.charAt(0)}</div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{q.supplier_name}</h3>
                    <p className="text-xs text-gray-500">Quotation #{q.id}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColor(q.status)}`}>{q.status}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                  <DollarSign className="w-4 h-4 text-[#3BC25B]" />
                  <div><p className="text-[10px] text-gray-500 uppercase">Total</p><p className="text-sm font-bold text-gray-900 dark:text-white">₱{Number(q.total_amount || 0).toLocaleString()}</p></div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <div><p className="text-[10px] text-gray-500 uppercase">Lead Time</p><p className="text-sm font-bold text-gray-900 dark:text-white">{q.delivery_days || '—'} days</p></div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                  <Shield className="w-4 h-4 text-purple-500" />
                  <div><p className="text-[10px] text-gray-500 uppercase">Terms</p><p className="text-sm font-bold text-gray-900 dark:text-white">{q.payment_terms || '—'}</p></div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                  <Star className="w-4 h-4 text-orange-500" />
                  <div><p className="text-[10px] text-gray-500 uppercase">Rating</p><p className="text-sm font-bold text-gray-900 dark:text-white">{q.supplier_rating ? `${q.supplier_rating}/5` : '—'}</p></div>
                </div>
              </div>
              {/* Accept / Reject buttons */}
              {q.status === 'PENDING' && (
                <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => handleAccept(q.id)}
                    disabled={accepting !== null}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-gradient-to-r from-[#63D44A] to-[#0E8F79] rounded-lg hover:shadow-lg hover:shadow-green-200/50 dark:hover:shadow-green-900/30 transition-all disabled:opacity-50"
                  >
                    {accepting === q.id ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Accept
                  </button>
                  <button
                    onClick={() => handleReject(q.id)}
                    disabled={accepting !== null}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              )}
              {q.status === 'ACCEPTED' && (
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700 text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" /><span className="text-sm font-semibold">Accepted</span>
                </div>
              )}
              {q.status === 'REJECTED' && (
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700 text-red-500 dark:text-red-400">
                  <XCircle className="w-4 h-4" /><span className="text-sm font-semibold">Rejected</span>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Line-by-line comparison table */}
      {lineItems.length > 0 && (
        <Card accent title="Price Comparison by Item">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 font-semibold">Item</th>
                  <th className="px-6 py-4 font-semibold">Qty / Unit</th>
                  {quotations.map((q: any) => (
                    <th key={q.id} className="px-6 py-4 font-semibold text-center">{q.supplier_name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {lineItems.map((item: any) => (
                  <tr key={item.rfq_item_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{item.item_name}</td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs">{item.quantity} {item.unit}</td>
                    {quotations.map((q: any) => {
                      const priceEntry = (item.quotes || []).find((p: any) => p.supplier_id === q.supplier);
                      const isBest = bestByItem[item.rfq_item_id] === q.supplier;
                      return (
                        <td key={q.id} className="px-6 py-4 text-center">
                          {priceEntry && priceEntry.unit_price ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-semibold ${isBest ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'text-gray-800 dark:text-gray-200'}`}>
                              {isBest && <CheckCircle className="w-3.5 h-3.5" />}₱{Number(priceEntry.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-200 dark:border-gray-600">
                <tr className="bg-gray-50 dark:bg-gray-700/50 font-bold">
                  <td className="px-6 py-4 text-gray-900 dark:text-white" colSpan={2}>Grand Total</td>
                  {quotations.map((q: any) => (
                    <td key={q.id} className="px-6 py-4 text-center text-gray-900 dark:text-white">₱{Number(q.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {quotations.length === 0 && (
        <Card>
          <div className="text-center py-12 text-gray-400"><p className="text-lg">No quotations available for comparison</p><p className="text-sm mt-1">Submit quotations from suppliers first</p></div>
        </Card>
      )}
    </div>
  );
}
