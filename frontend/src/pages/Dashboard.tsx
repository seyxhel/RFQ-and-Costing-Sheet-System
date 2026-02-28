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

export default function Dashboard() {
  const navigate = useNavigate();
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
  const pendingRfqs = rfqs.filter((r) => ['SUBMITTED', 'UNDER_REVIEW'].includes(r.status)).length;
  const approvedRfqs = rfqs.filter((r) => r.status === 'APPROVED').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">Overview of RFQ and Costing modules</p>
        </div>
        <div className="flex gap-3">
          <GreenButton onClick={() => navigate('/rfq/new')}>
            <Plus className="w-4 h-4 mr-2" /> New RFQ
          </GreenButton>
          <GreenButton variant="outline" onClick={() => navigate('/costing/new')}>
            <Plus className="w-4 h-4 mr-2" /> New Costing
          </GreenButton>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total RFQs" value={String(rfqs.length)} icon={FileText} color="blue" subtext={`${draftRfqs} drafts`} />
        <StatCard title="Pending Approval" value={String(pendingRfqs)} icon={Clock} color="orange" subtext="Awaiting review" />
        <StatCard title="Approved" value={String(approvedRfqs)} icon={CheckCircle} color="green" />
        <StatCard title="Costing Sheets" value={String(costings.length)} icon={Calculator} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent RFQs */}
        <Card accent title="Recent RFQs">
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                ) : rfqs.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No RFQs yet. Create your first one!</td></tr>
                ) : (
                  rfqs.slice(0, 5).map((rfq) => (
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
          {rfqs.length > 5 && (
            <div className="mt-4 text-center">
              <button onClick={() => navigate('/rfq')} className="text-sm font-medium text-[#0E8F79] dark:text-green-400 hover:underline">
                View all RFQs →
              </button>
            </div>
          )}
        </Card>

        {/* Recent Costing Sheets */}
        <Card accent title="Recent Costing Sheets">
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Total</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                ) : costings.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No costing sheets yet.</td></tr>
                ) : (
                  costings.slice(0, 5).map((cs) => (
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
          {costings.length > 5 && (
            <div className="mt-4 text-center">
              <button onClick={() => navigate('/costing')} className="text-sm font-medium text-[#0E8F79] dark:text-green-400 hover:underline">
                View all Costing Sheets →
              </button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
