import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { GreenButton } from '../../components/ui/GreenButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { budgetAPI } from '../../services/budgetService';
import { toast } from 'sonner';
import { ArrowLeft, Send, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export default function BudgetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [budget, setBudget] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = () => {
    budgetAPI.get(Number(id)).then((r) => { setBudget(r.data); setLoading(false); })
      .catch(() => { toast.error('Failed to load budget'); navigate('/budgets'); });
  };

  useEffect(() => { load(); }, [id]);

  const doAction = async (action: string, data?: any) => {
    setActing(true);
    try {
      if (action === 'submit') await budgetAPI.submit(Number(id));
      else if (action === 'approve') await budgetAPI.approve(Number(id));
      else if (action === 'reject') await budgetAPI.reject(Number(id), { rejection_reason: prompt('Rejection reason:') || '' });
      else if (action === 'close') await budgetAPI.close(Number(id));
      else if (action === 'recalculate') await budgetAPI.recalculate(Number(id));
      toast.success(`Budget ${action}d successfully`);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || `Failed to ${action}`);
    } finally {
      setActing(false);
    }
  };

  if (loading) return <p className="text-gray-400 p-8">Loading...</p>;
  if (!budget) return null;

  const util = budget.utilization_percent ?? (budget.allocated_amount > 0 ? ((budget.spent_amount / budget.allocated_amount) * 100).toFixed(1) : 0);
  const utilNum = Number(util);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{budget.title}</h1>
            <StatusBadge status={budget.status} />
          </div>
          <p className="text-sm text-[#0E8F79] dark:text-green-400 font-medium mt-1">{budget.budget_number}</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {budget.status === 'DRAFT' && (
            <GreenButton onClick={() => doAction('submit')} disabled={acting}><Send className="w-4 h-4 mr-2" /> Submit for Approval</GreenButton>
          )}
          {budget.status === 'PENDING' && (
            <>
              <GreenButton onClick={() => doAction('approve')} disabled={acting}><CheckCircle className="w-4 h-4 mr-2" /> Approve</GreenButton>
              <GreenButton variant="danger" onClick={() => doAction('reject')} disabled={acting}><XCircle className="w-4 h-4 mr-2" /> Reject</GreenButton>
            </>
          )}
          {budget.status === 'APPROVED' && (
            <>
              <GreenButton onClick={() => doAction('close')} disabled={acting}><CheckCircle className="w-4 h-4 mr-2" /> Close Budget</GreenButton>
              <GreenButton variant="outline" onClick={() => doAction('recalculate')} disabled={acting}><RefreshCw className="w-4 h-4 mr-2" /> Recalculate Spent</GreenButton>
            </>
          )}
          <GreenButton variant="outline" onClick={() => navigate(`/budgets/${id}/edit`)}>Edit</GreenButton>
          <GreenButton variant="outline" onClick={() => navigate('/budgets')}><ArrowLeft className="w-4 h-4 mr-2" /> Back</GreenButton>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card accent>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Allocated</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">₱{Number(budget.allocated_amount).toLocaleString()}</p>
        </Card>
        <Card accent>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Spent</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">₱{Number(budget.spent_amount).toLocaleString()}</p>
        </Card>
        <Card accent>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Remaining</p>
          <p className={`text-2xl font-bold ${Number(budget.remaining_amount) < 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>₱{Number(budget.remaining_amount).toLocaleString()}</p>
        </Card>
      </div>

      <Card accent>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Budget Utilization</h3>
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-500 dark:text-gray-400">Progress</span>
            <span className={`font-semibold ${utilNum > 90 ? 'text-red-500' : utilNum > 70 ? 'text-yellow-600' : 'text-[#3BC25B]'}`}>{utilNum}%</span>
          </div>
          <div className="w-full h-4 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${utilNum > 90 ? 'bg-red-500' : utilNum > 70 ? 'bg-yellow-500' : 'bg-gradient-to-r from-[#63D44A] to-[#0E8F79]'}`} style={{ width: `${Math.min(100, utilNum)}%` }} />
          </div>
        </div>
      </Card>

      <Card accent>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div><span className="font-medium text-gray-500 dark:text-gray-400">Description:</span> <span className="text-gray-900 dark:text-white ml-2">{budget.description || '—'}</span></div>
          <div><span className="font-medium text-gray-500 dark:text-gray-400">Linked RFQ:</span> <span className="text-gray-900 dark:text-white ml-2">{budget.rfq_title || '—'}</span></div>
          <div><span className="font-medium text-gray-500 dark:text-gray-400">Linked Costing:</span> <span className="text-gray-900 dark:text-white ml-2">{budget.costing_sheet_title || '—'}</span></div>
          <div><span className="font-medium text-gray-500 dark:text-gray-400">Linked Sales Order:</span> <span className="text-gray-900 dark:text-white ml-2">{budget.sales_order_number || '—'}</span></div>
          <div><span className="font-medium text-gray-500 dark:text-gray-400">Created by:</span> <span className="text-gray-900 dark:text-white ml-2">{budget.created_by_name || '—'}</span></div>
          <div><span className="font-medium text-gray-500 dark:text-gray-400">Approved by:</span> <span className="text-gray-900 dark:text-white ml-2">{budget.approved_by_name || '—'}</span></div>
          <div><span className="font-medium text-gray-500 dark:text-gray-400">Created:</span> <span className="text-gray-900 dark:text-white ml-2">{budget.created_at?.slice(0, 10)}</span></div>
          {budget.notes && <div className="md:col-span-2"><span className="font-medium text-gray-500 dark:text-gray-400">Notes:</span> <span className="text-gray-900 dark:text-white ml-2">{budget.notes}</span></div>}
          {budget.rejection_reason && <div className="md:col-span-2"><span className="font-medium text-red-500">Rejection Reason:</span> <span className="text-gray-900 dark:text-white ml-2">{budget.rejection_reason}</span></div>}
        </div>
      </Card>
    </div>
  );
}
