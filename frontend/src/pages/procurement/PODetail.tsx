import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { GreenButton } from '../../components/ui/GreenButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { purchaseOrderAPI, actualCostAPI } from '../../services/procurementService';
import { toast } from 'sonner';
import { ArrowLeft, Send, CheckCircle, Plus, Trash2, DollarSign } from 'lucide-react';

export default function PODetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [po, setPo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showCostForm, setShowCostForm] = useState(false);
  const [costForm, setCostForm] = useState({ cost_type: 'MATERIAL', description: '', amount: '', reference_number: '', date: '' });
  const [savingCost, setSavingCost] = useState(false);

  const load = () => {
    purchaseOrderAPI.get(Number(id)).then((r) => { setPo(r.data); setLoading(false); })
      .catch(() => { toast.error('Failed to load PO'); navigate('/purchase-orders'); });
  };

  useEffect(() => { load(); }, [id]);

  const doAction = async (action: string) => {
    setActing(true);
    try {
      if (action === 'issue') await purchaseOrderAPI.issue(Number(id));
      else if (action === 'complete') await purchaseOrderAPI.complete(Number(id));
      toast.success(`PO ${action}d successfully`);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || `Failed to ${action}`);
    } finally {
      setActing(false);
    }
  };

  const handleAddCost = async () => {
    if (!costForm.amount) { toast.error('Amount is required'); return; }
    setSavingCost(true);
    try {
      await actualCostAPI.create({
        purchase_order: Number(id),
        cost_type: costForm.cost_type,
        description: costForm.description,
        amount: costForm.amount,
        reference_number: costForm.reference_number,
        date: costForm.date || new Date().toISOString().slice(0, 10),
      });
      toast.success('Actual cost recorded');
      setCostForm({ cost_type: 'MATERIAL', description: '', amount: '', reference_number: '', date: '' });
      setShowCostForm(false);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save cost');
    } finally {
      setSavingCost(false);
    }
  };

  const handleDeleteCost = async (costId: number) => {
    try {
      await actualCostAPI.delete(costId);
      toast.success('Cost entry deleted');
      load();
    } catch { toast.error('Failed to delete cost'); }
  };

  if (loading) return <p className="text-gray-400 p-8">Loading...</p>;
  if (!po) return null;

  const variance = Number(po.actual_total || 0) - Number(po.estimated_total || 0);
  const variancePct = Number(po.estimated_total) > 0 ? ((variance / Number(po.estimated_total)) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{po.title}</h1>
            <StatusBadge status={po.status} />
          </div>
          <p className="text-sm text-[#0E8F79] dark:text-green-400 font-medium mt-1">{po.po_number}</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {po.status === 'DRAFT' && (
            <GreenButton onClick={() => doAction('issue')} disabled={acting}><Send className="w-4 h-4 mr-2" /> Issue PO</GreenButton>
          )}
          {['ISSUED', 'PARTIALLY_RECEIVED'].includes(po.status) && (
            <GreenButton onClick={() => doAction('complete')} disabled={acting}><CheckCircle className="w-4 h-4 mr-2" /> Mark Complete</GreenButton>
          )}
          <GreenButton variant="outline" onClick={() => navigate(`/purchase-orders/${id}/edit`)}>Edit</GreenButton>
          <GreenButton variant="outline" onClick={() => navigate('/purchase-orders')}><ArrowLeft className="w-4 h-4 mr-2" /> Back</GreenButton>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card accent>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Estimated Total</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">₱{Number(po.estimated_total).toLocaleString()}</p>
        </Card>
        <Card accent>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Actual Total</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">₱{Number(po.actual_total).toLocaleString()}</p>
        </Card>
        <Card accent>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Variance</p>
          <p className={`text-2xl font-bold ${variance > 0 ? 'text-red-500' : variance < 0 ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
            {variance > 0 ? '+' : ''}₱{variance.toLocaleString()}
          </p>
        </Card>
        <Card accent>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Variance %</p>
          <p className={`text-2xl font-bold ${Number(variancePct) > 0 ? 'text-red-500' : Number(variancePct) < 0 ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
            {Number(variancePct) > 0 ? '+' : ''}{variancePct}%
          </p>
        </Card>
      </div>

      {/* Line Items */}
      <Card accent>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Line Items</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold text-right">Qty</th>
                <th className="px-4 py-3 font-semibold text-right">Unit Cost</th>
                <th className="px-4 py-3 font-semibold text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {(po.line_items || []).map((li: any) => (
                <tr key={li.id}>
                  <td className="px-4 py-3 font-medium text-[#0E8F79] dark:text-green-400 text-xs">{li.product_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{li.description}</td>
                  <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">{li.quantity}</td>
                  <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">₱{Number(li.unit_cost).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">₱{Number(li.total_cost).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Actual Costs */}
      <Card accent>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Actual Costs</h3>
          <GreenButton variant="outline" onClick={() => setShowCostForm(!showCostForm)}>
            <Plus className="w-4 h-4 mr-1" /> Record Cost
          </GreenButton>
        </div>

        {showCostForm && (
          <div className="grid grid-cols-12 gap-3 items-end p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg mb-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Type</label>
              <select value={costForm.cost_type} onChange={(e) => setCostForm((p) => ({ ...p, cost_type: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none">
                <option value="MATERIAL">Material</option>
                <option value="LABOR">Labor</option>
                <option value="SHIPPING">Shipping</option>
                <option value="TAX">Tax</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="col-span-3">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
              <input value={costForm.description} onChange={(e) => setCostForm((p) => ({ ...p, description: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Amount (₱)</label>
              <input type="number" step="0.01" min={0} value={costForm.amount} onChange={(e) => setCostForm((p) => ({ ...p, amount: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Reference #</label>
              <input value={costForm.reference_number} onChange={(e) => setCostForm((p) => ({ ...p, reference_number: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Date</label>
              <input type="date" value={costForm.date} onChange={(e) => setCostForm((p) => ({ ...p, date: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none" />
            </div>
            <div className="col-span-1 flex justify-end">
              <GreenButton onClick={handleAddCost} isLoading={savingCost} className="py-2">Save</GreenButton>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold text-right">Amount</th>
                <th className="px-4 py-3 font-semibold">Reference</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {(po.actual_costs || []).length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  <DollarSign className="w-6 h-6 mx-auto mb-1 text-gray-300" />
                  No actual costs recorded yet.
                </td></tr>
              ) : (po.actual_costs || []).map((ac: any) => (
                <tr key={ac.id}>
                  <td className="px-4 py-3"><StatusBadge status={ac.cost_type} /></td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white">{ac.description}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">₱{Number(ac.amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{ac.reference_number || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{ac.date}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDeleteCost(ac.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Info */}
      <Card accent>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div><span className="font-medium text-gray-500 dark:text-gray-400">Supplier:</span> <span className="text-gray-900 dark:text-white ml-2">{po.supplier_name || '—'}</span></div>
          <div><span className="font-medium text-gray-500 dark:text-gray-400">RFQ:</span> <span className="text-gray-900 dark:text-white ml-2">{po.rfq_title || '—'}</span></div>
          <div><span className="font-medium text-gray-500 dark:text-gray-400">Budget:</span> <span className="text-gray-900 dark:text-white ml-2">{po.budget_title || '—'}</span></div>
          <div><span className="font-medium text-gray-500 dark:text-gray-400">Expected Delivery:</span> <span className="text-gray-900 dark:text-white ml-2">{po.expected_delivery_date || '—'}</span></div>
          <div><span className="font-medium text-gray-500 dark:text-gray-400">Issue Date:</span> <span className="text-gray-900 dark:text-white ml-2">{po.issue_date || '—'}</span></div>
          <div><span className="font-medium text-gray-500 dark:text-gray-400">Created:</span> <span className="text-gray-900 dark:text-white ml-2">{po.created_at?.slice(0, 10)}</span></div>
          {po.description && <div className="md:col-span-2"><span className="font-medium text-gray-500 dark:text-gray-400">Description:</span> <span className="text-gray-900 dark:text-white ml-2">{po.description}</span></div>}
        </div>
      </Card>
    </div>
  );
}
