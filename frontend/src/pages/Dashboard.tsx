import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { GreenButton } from '../components/ui/GreenButton';
import { StatusBadge } from '../components/ui/StatusBadge';
import {
  FileText, Calculator, Users, Clock, CheckCircle, Award,
  TrendingUp, Send, DollarSign, Target, ShoppingCart, BarChart3,
  ArrowRight, XCircle,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { rfqAPI } from '../services/rfqService';
import { costingAPI } from '../services/costingService';
import { salesDashboardAPI } from '../services/salesService';
import { useAuth } from '../context/AuthContext';

function peso(v: number) {
  return `\u20B1${Number(v).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [costings, setCostings] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const isSales = user?.role === 'SALES';

  useEffect(() => {
    const fetches: Promise<any>[] = [
      rfqAPI.list().catch(() => ({ data: { results: [] } })),
      salesDashboardAPI.summary().catch(() => ({ data: null })),
    ];
    if (!isSales) {
      fetches.push(costingAPI.list().catch(() => ({ data: { results: [] } })));
    }
    Promise.all(fetches).then((results) => {
      setRfqs(results[0].data.results || results[0].data || []);
      setSummary(results[1].data);
      if (!isSales && results[2]) {
        setCostings(results[2].data.results || results[2].data || []);
      }
      setLoading(false);
    });
  }, [isSales]);

  const q = summary?.quotations;
  const so = summary?.sales_orders;

  /* ──────────── SALES DASHBOARD ──────────── */
  if (isSales) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">Your sales activity overview</p>
        </div>

        {/* KPI Cards: RFQs, Quotations, Won, Sales Orders */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="RFQs"
            value={summary?.rfq?.total ?? rfqs.length}
            icon={FileText}
            color="blue"
            subtext={`${summary?.rfq?.draft ?? 0} drafts · ${summary?.rfq?.pending ?? 0} pending`}
          />
          <StatCard
            title="Formal Quotations"
            value={q?.total ?? 0}
            icon={Send}
            color="orange"
            subtext={`${q?.sent ?? 0} sent · ${q?.draft ?? 0} drafts`}
          />
          <StatCard
            title="Won Quotations"
            value={q?.won ?? 0}
            icon={Award}
            color="green"
            subtext={`${q?.rejected ?? 0} rejected`}
          />
          <StatCard
            title="Sales Orders"
            value={so?.total ?? 0}
            icon={ShoppingCart}
            color="purple"
            subtext={`${so?.completed ?? 0} completed · ${so?.in_progress ?? 0} active`}
          />
        </div>

        {/* Tables: Recent RFQs + Quotation Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent RFQs */}
          <div className="lg:col-span-2">
          <Card accent title="Recent RFQs" action={
            <GreenButton variant="outline" onClick={() => navigate('/rfq')} className="py-1.5 px-3 text-xs">
              View All
            </GreenButton>
          }>
            <div className="mt-4 max-h-[275px] overflow-y-auto">
              <table className="w-full text-sm text-left table-fixed">
                <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 font-semibold w-[50%]">Title</th>
                    <th className="px-4 py-3 font-semibold w-[30%]">Status</th>
                    <th className="px-4 py-3 font-semibold w-[20%]">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {loading ? (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
                  ) : rfqs.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No RFQs yet. Create your first one!</td></tr>
                  ) : (
                    rfqs.slice(0, 10).map((rfq) => (
                      <tr key={rfq.id} onClick={() => navigate(`/rfq/${rfq.id}`)} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer transition-colors">
                        <td className="px-4 py-3 truncate">
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
          </Card>
          </div>

          {/* Quotation Pie Chart */}
          <Card accent title="Quotation Status">
            <div className="mt-4">
              {(() => {
                const pieData = [
                  { name: 'Draft', value: q?.draft ?? 0, color: '#9CA3AF' },
                  { name: 'Sent', value: q?.sent ?? 0, color: '#3B82F6' },
                  { name: 'Won', value: q?.won ?? 0, color: '#10B981' },
                  { name: 'Rejected', value: q?.rejected ?? 0, color: '#EF4444' },
                ].filter((d) => d.value > 0);
                if (pieData.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <BarChart3 className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-2" />
                      <p className="text-sm text-gray-400 dark:text-gray-500">No quotations yet</p>
                    </div>
                  );
                }
                return (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--tooltip-bg, #fff)', border: 'none', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,.1)' }}
                        formatter={(value: number, name: string) => [`${value}`, name]}
                      />
                      <Legend
                        verticalAlign="bottom"
                        iconType="circle"
                        iconSize={8}
                        formatter={(value: string) => <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          </Card>
        </div>

        {/* Recent Won → Sales Orders created from them */}
        <div className="grid grid-cols-1 gap-6">
          <Card accent title="Recent Won Deals" action={
            <GreenButton variant="outline" onClick={() => navigate('/sales/quotations')} className="py-1.5 px-3 text-xs">
              View All
            </GreenButton>
          }>
            <div className="mt-4">
              {(summary?.recent_wins?.length ?? 0) === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Award className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-sm text-gray-400 dark:text-gray-500">No won deals yet</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">When a formal quotation is won, it will appear here so you can create a Sales Order.</p>
                </div>
              ) : (
                <div className="relative max-h-[410px] overflow-y-auto pl-6 border-l-2 border-emerald-200 dark:border-emerald-800">
                  <div className="space-y-4">
                    {summary.recent_wins.map((w: any, idx: number) => (
                      <div
                        key={w.id}
                        onClick={() => navigate(`/sales/quotations/${w.id}`)}
                        className="relative flex items-start gap-3 cursor-pointer group"
                      >
                        {/* dot */}
                        <div className="absolute -left-6 top-1.5 z-10 flex items-center justify-center">
                          <div className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-800 group-hover:ring-emerald-200 dark:group-hover:ring-emerald-700 transition-all" />
                        </div>
                        {/* content */}
                        <div className="flex-1 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/40 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/20 transition-colors border border-gray-100 dark:border-gray-700 group-hover:border-emerald-200 dark:group-hover:border-emerald-800">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{w.project_title || w.quotation_number}</p>
                            <StatusBadge status="WON" />
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-gray-500 dark:text-gray-400">{w.client_name}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{w.updated_at?.slice(0, 10)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  /* ──────────── MANAGEMENT / PURCHASING DASHBOARD ──────────── */
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">Overview of RFQ and Costing modules</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total RFQs"
          value={summary?.rfq?.total ?? rfqs.length}
          icon={FileText}
          color="blue"
          subtext={`${summary?.rfq?.draft ?? 0} drafts · ${summary?.rfq?.pending ?? 0} pending`}
        />
        <StatCard
          title="Pending Approval"
          value={summary?.rfq?.pending ?? 0}
          icon={Clock}
          color="orange"
          subtext="Awaiting review"
        />
        <StatCard
          title="Approved"
          value={summary?.rfq?.approved ?? 0}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Costing Sheets"
          value={costings.length}
          icon={Calculator}
          color="purple"
        />
      </div>

      {/* Financial overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Formal Quotations"
          value={q?.total ?? 0}
          icon={Send}
          color="blue"
          subtext={`${q?.won ?? 0} won · ${q?.sent ?? 0} sent`}
        />
        <StatCard
          title="Pipeline Value"
          value={q?.pipeline_value ? peso(q.pipeline_value) : '\u20b10'}
          icon={TrendingUp}
          color="orange"
          subtext="Draft + Sent + Revised"
        />
        <StatCard
          title="Sales Orders"
          value={so?.total ?? 0}
          icon={ShoppingCart}
          color="purple"
          subtext={`${so?.completed ?? 0} completed · ${so?.in_progress ?? 0} in-progress`}
        />
        <StatCard
          title="Clients"
          value={summary?.clients?.total ?? 0}
          icon={Users}
          color="green"
        />
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No RFQs yet.</td></tr>
                  ) : (
                    rfqs.slice(0, 10).map((rfq) => (
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
                          {cs.grand_total ? `\u20B1${Number(cs.grand_total).toLocaleString()}` : '\u2014'}
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
      </div>
    </div>
  );
}
