import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { GreenButton } from '../components/ui/GreenButton';
import { StatusBadge } from '../components/ui/StatusBadge';
import { FileText, Truck, Calculator, Users, Clock, CheckCircle, AlertTriangle, Plus } from 'lucide-react';
import { rfqAPI } from '../services/rfqService';
import { costingAPI } from '../services/costingService';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [costings, setCostings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      rfqAPI.list().catch(() => ({ data: { results: [] } })),
      costingAPI.list().catch(() => ({ data: { results: [] } })),
    ]).then(([rfqRes, costRes]) => {
      setRfqs(rfqRes.data.results || rfqRes.data || []);
      setCostings(costRes.data.results || costRes.data || []);
      setLoading(false);
    });
  }, []);

  const draftRfqs = rfqs.filter((r) => r.status === 'DRAFT').length;
  const pendingRfqs = rfqs.filter((r) => ['PENDING_FOR_CANVASS', 'UNDER_REVIEW'].includes(r.status)).length;
  const approvedRfqs = rfqs.filter((r) => r.status === 'APPROVED').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">Overview of RFQ and Costing modules</p>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total RFQs" value={String(rfqs.length)} icon={FileText} color="blue" subtext={`${draftRfqs} drafts`} />
        <StatCard title="Pending Approval" value={String(pendingRfqs)} icon={Clock} color="orange" subtext="Awaiting review" />
        <StatCard title="Approved" value={String(approvedRfqs)} icon={CheckCircle} color="green" />
        {user?.role !== 'SALES' && <StatCard title="Costing Sheets" value={String(costings.length)} icon={Calculator} color="purple" />}
      </div>

      <div className={`grid grid-cols-1 ${user?.role !== 'SALES' ? 'lg:grid-cols-2' : ''} gap-6`}>
        {/* Recent RFQs */}
        <Card accent title="Recent RFQs" action={
          <GreenButton variant="outline" onClick={() => navigate('/rfq')} className="py-1.5 px-3 text-xs">
            View All
          </GreenButton>
        }>
          <div className="mt-4">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                </tr>
              </thead>
            </table>
            <div className="max-h-[240px] overflow-y-auto">
              <table className="w-full text-sm text-left">
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {loading ? (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                  ) : rfqs.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No RFQs yet. Create your first one!</td></tr>
                  ) : (
                    rfqs.map((rfq) => (
                      <tr key={rfq.id} onClick={() => navigate(`/rfq/${rfq.id}`)} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-900 dark:text-white">{rfq.title}</span>
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={rfq.status} /></td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{rfq.created_at?.slice(0, 10)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        {/* Recent Costing Sheets */}
        {user?.role !== 'SALES' && (
        <Card accent title="Recent Costing Sheets" action={
          <GreenButton variant="outline" onClick={() => navigate('/costing')} className="py-1.5 px-3 text-xs">
            View All
          </GreenButton>
        }>
          <div className="mt-4">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Total</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                </tr>
              </thead>
            </table>
            <div className="max-h-[240px] overflow-y-auto">
              <table className="w-full text-sm text-left">
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {loading ? (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                  ) : costings.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No costing sheets yet.</td></tr>
                  ) : (
                    costings.map((cs) => (
                      <tr key={cs.id} onClick={() => navigate(`/costing/${cs.id}`)} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-900 dark:text-white">{cs.name}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono">
                          {cs.grand_total ? `₱${Number(cs.grand_total).toLocaleString()}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{cs.created_at?.slice(0, 10)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
        )}
      </div>
    </div>
  );
}
