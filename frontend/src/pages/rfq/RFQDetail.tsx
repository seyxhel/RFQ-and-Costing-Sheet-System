import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { GreenButton } from '../../components/ui/GreenButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { rfqAPI } from '../../services/rfqService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import { ArrowLeft, Send, CheckCircle, XCircle, BarChart3, ClipboardCheck } from 'lucide-react';

export default function RFQDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canApprove, user } = useAuth();
  const [rfq, setRfq] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    rfqAPI.get(Number(id)).then((r) => { setRfq(r.data); setLoading(false); }).catch(() => { toast.error('Failed to load RFQ'); navigate('/rfq'); });
  }, [id, navigate]);

  const handleSubmit = () => {
    rfqAPI.submit(Number(id)).then((r) => { setRfq(r.data); toast.success('RFQ submitted to purchasing'); }).catch((e) => toast.error(e.response?.data?.detail || 'Failed'));
  };

  const handleApprove = (approved: boolean) => {
    rfqAPI.approve(Number(id), { approved, comments: approved ? 'Approved' : 'Rejected' }).then((r) => { setRfq(r.data); toast.success(approved ? 'RFQ approved' : 'RFQ rejected'); }).catch((e) => toast.error(e.response?.data?.detail || 'Failed'));
  };

  const handleCompleteCanvass = () => {
    rfqAPI.completeCanvass(Number(id)).then((r) => { setRfq(r.data); toast.success('Canvass marked as complete'); }).catch((e) => toast.error(e.response?.data?.detail || 'Failed'));
  };

  if (loading) return <p className="text-gray-400 p-8">Loading...</p>;
  if (!rfq) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{rfq.title}</h1>
          <p className="text-sm text-[#0E8F79] dark:text-green-400 font-mono">{rfq.rfq_number}</p>
        </div>
        <div className="flex gap-3">
          <GreenButton variant="outline" onClick={() => navigate('/rfq')}><ArrowLeft className="w-4 h-4 mr-2" /> Back</GreenButton>
          <GreenButton variant="outline" onClick={() => navigate(`/rfq/${id}/edit`)}><span>Edit</span></GreenButton>
          <GreenButton variant="outline" onClick={() => navigate(`/rfq/${id}/compare`)}><BarChart3 className="w-4 h-4 mr-2" /> Compare Canvass</GreenButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" accent>
          <div className="flex items-center gap-3 mb-4">
            <StatusBadge status={rfq.status} />
            {rfq.due_date && <span className="text-sm text-gray-500 dark:text-gray-400">Due: {rfq.due_date}</span>}
          </div>
          {rfq.description && <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">{rfq.description}</p>}

          <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">Line Items</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Item Name</th>
                  <th className="px-4 py-3 font-semibold">Qty</th>
                  <th className="px-4 py-3 font-semibold">Unit</th>
                  <th className="px-4 py-3 font-semibold">Specs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {(rfq.items || []).map((item: any, idx: number) => (
                  <tr key={item.id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.item_name || '—'}</td>
                    <td className="px-4 py-3">{item.quantity}</td>
                    <td className="px-4 py-3">{item.unit}</td>
                    <td className="px-4 py-3 text-gray-500">{item.specifications || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-6">
          {/* Actions */}
          <Card className="border-t-4 border-t-[#3BC25B]">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Actions</h3>
            <div className="space-y-3">
              {rfq.status === 'DRAFT' && (
                <GreenButton fullWidth onClick={handleSubmit}><Send className="w-4 h-4 mr-2" /> Submit to Purchasing</GreenButton>
              )}
              {rfq.status === 'PENDING_FOR_CANVASS' && user?.role === 'PURCHASING' && (
                <GreenButton fullWidth onClick={handleCompleteCanvass}><ClipboardCheck className="w-4 h-4 mr-2" /> Mark Canvass Complete</GreenButton>
              )}
              {['CANVASS_DONE', 'UNDER_REVIEW'].includes(rfq.status) && canApprove() && (
                <>
                  <GreenButton fullWidth onClick={() => handleApprove(true)}><CheckCircle className="w-4 h-4 mr-2" /> Approve</GreenButton>
                  <GreenButton fullWidth variant="danger" onClick={() => handleApprove(false)}><XCircle className="w-4 h-4 mr-2" /> Reject</GreenButton>
                </>
              )}
            </div>
          </Card>

          {/* Info */}
          <Card>
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Details</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Created by</dt><dd className="text-gray-900 dark:text-white font-medium">{rfq.created_by_name || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Created</dt><dd className="text-gray-900 dark:text-white">{rfq.created_at?.slice(0, 10)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Approval Level</dt><dd className="text-gray-900 dark:text-white">{rfq.current_approval_level || 0} / 2</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500 dark:text-gray-400">Suppliers</dt><dd className="text-gray-900 dark:text-white">{rfq.suppliers?.length || 0}</dd></div>
            </dl>
          </Card>

          {/* Approval Log */}
          {rfq.approval_logs?.length > 0 && (
            <Card>
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Approval History</h3>
              <div className="space-y-3">
                {rfq.approval_logs.map((log: any) => (
                  <div key={log.id} className={`pl-3 border-l-4 ${log.decision === 'APPROVED' ? 'border-green-400' : 'border-red-400'}`}>
                    <div className="flex justify-between"><span className="text-xs font-bold">{log.decision}</span><span className="text-[10px] text-gray-500">{log.created_at?.slice(0, 10)}</span></div>
                    <p className="text-xs text-gray-500 mt-1">{log.comments || 'No comments'}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
