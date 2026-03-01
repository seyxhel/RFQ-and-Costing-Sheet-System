import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { GreenButton } from '../../components/ui/GreenButton';
import { BarChart3, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Target, ShoppingCart } from 'lucide-react';
import { purchaseOrderAPI } from '../../services/procurementService';
import { budgetAPI } from '../../services/budgetService';
import { toast } from 'sonner';

export default function VarianceDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      purchaseOrderAPI.list().catch(() => ({ data: [] })),
      budgetAPI.list().catch(() => ({ data: [] })),
      purchaseOrderAPI.varianceSummary().catch(() => ({ data: {} })),
    ]).then(([poRes, bRes, vRes]) => {
      setOrders(poRes.data.results || poRes.data || []);
      setBudgets(bRes.data.results || bRes.data || []);
      setSummary(vRes.data || {});
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="text-gray-400 p-8">Loading variance data...</p>;

  const totalEstimated = Number(summary.total_estimated || 0);
  const totalActual = Number(summary.total_actual || 0);
  const totalVariance = totalActual - totalEstimated;
  const variancePct = totalEstimated > 0 ? ((totalVariance / totalEstimated) * 100).toFixed(1) : '0.0';

  const overBudgetPOs = orders.filter((o) => Number(o.actual_total) > Number(o.estimated_total) && Number(o.actual_total) > 0);
  const underBudgetPOs = orders.filter((o) => Number(o.actual_total) > 0 && Number(o.actual_total) <= Number(o.estimated_total));

  const totalBudgetAllocated = budgets.reduce((s, b) => s + Number(b.allocated_amount || 0), 0);
  const totalBudgetSpent = budgets.reduce((s, b) => s + Number(b.spent_amount || 0), 0);
  const budgetUtilization = totalBudgetAllocated > 0 ? ((totalBudgetSpent / totalBudgetAllocated) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Variance & Cost Monitoring</h1>
          <p className="text-gray-500 dark:text-gray-400">Track estimated vs actual costs across all purchase orders</p>
        </div>
      </div>

      {/* Top-level metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Estimated" value={`₱${totalEstimated.toLocaleString()}`} icon={Target} color="blue" />
        <StatCard title="Total Actual" value={`₱${totalActual.toLocaleString()}`} icon={DollarSign} color="green" />
        <StatCard
          title="Total Variance"
          value={`${totalVariance >= 0 ? '+' : ''}₱${totalVariance.toLocaleString()}`}
          icon={totalVariance > 0 ? TrendingUp : TrendingDown}
          color={totalVariance > 0 ? 'red' : 'green'}
          subtext={`${Number(variancePct) >= 0 ? '+' : ''}${variancePct}% from estimate`}
        />
        <StatCard
          title="Budget Utilization"
          value={`${budgetUtilization}%`}
          icon={BarChart3}
          color={Number(budgetUtilization) > 90 ? 'red' : Number(budgetUtilization) > 70 ? 'orange' : 'green'}
          subtext={`₱${totalBudgetSpent.toLocaleString()} of ₱${totalBudgetAllocated.toLocaleString()}`}
        />
      </div>

      {/* Visual bar comparison */}
      <Card accent>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Estimated vs Actual by Purchase Order</h3>
        {orders.filter((o) => Number(o.estimated_total) > 0 || Number(o.actual_total) > 0).length === 0 ? (
          <p className="text-gray-400 text-center py-8">No purchase orders with cost data yet.</p>
        ) : (
          <div className="space-y-4">
            {orders
              .filter((o) => Number(o.estimated_total) > 0 || Number(o.actual_total) > 0)
              .slice(0, 10)
              .map((o) => {
                const est = Number(o.estimated_total);
                const act = Number(o.actual_total);
                const maxVal = Math.max(est, act, 1);
                const v = act - est;
                return (
                  <div key={o.id} className="group cursor-pointer" onClick={() => navigate(`/purchase-orders/${o.id}`)}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#0E8F79] dark:text-green-400">{o.po_number}</span>
                        <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">{o.title}</span>
                      </div>
                      <span className={`text-xs font-semibold ${v > 0 ? 'text-red-500' : v < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                        {act > 0 ? `${v > 0 ? '+' : ''}₱${v.toLocaleString()}` : '—'}
                      </span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <div className="flex-1">
                        <div className="flex gap-1 h-3">
                          <div className="bg-blue-400 dark:bg-blue-500 rounded-sm" style={{ width: `${(est / maxVal) * 100}%` }} title={`Estimated: ₱${est.toLocaleString()}`} />
                        </div>
                        <div className="flex gap-1 h-3 mt-0.5">
                          <div className={`rounded-sm ${act > est ? 'bg-red-400 dark:bg-red-500' : 'bg-green-400 dark:bg-green-500'}`} style={{ width: `${(act / maxVal) * 100}%` }} title={`Actual: ₱${act.toLocaleString()}`} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            <div className="flex items-center gap-6 text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-blue-400 rounded-sm" /> Estimated</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-green-400 rounded-sm" /> Actual (within budget)</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-400 rounded-sm" /> Actual (over budget)</div>
            </div>
          </div>
        )}
      </Card>

      {/* Over budget alerts */}
      {overBudgetPOs.length > 0 && (
        <Card accent>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-bold text-red-600 dark:text-red-400">Over Budget Alerts ({overBudgetPOs.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">PO Number</th>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold text-right">Estimated</th>
                  <th className="px-4 py-3 font-semibold text-right">Actual</th>
                  <th className="px-4 py-3 font-semibold text-right">Overage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100 dark:divide-red-800/50">
                {overBudgetPOs.map((o) => (
                  <tr key={o.id} onClick={() => navigate(`/purchase-orders/${o.id}`)} className="hover:bg-red-50/50 dark:hover:bg-red-900/10 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-bold text-[#0E8F79] dark:text-green-400 text-xs">{o.po_number}</td>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{o.title}</td>
                    <td className="px-4 py-3 text-right text-gray-500">₱{Number(o.estimated_total).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">₱{Number(o.actual_total).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">
                      +₱{(Number(o.actual_total) - Number(o.estimated_total)).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Budget Overview */}
      <Card accent>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Budget Utilization Overview</h3>
        {budgets.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No budgets created yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">Budget</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Allocated</th>
                  <th className="px-4 py-3 font-semibold text-right">Spent</th>
                  <th className="px-4 py-3 font-semibold text-right">Remaining</th>
                  <th className="px-4 py-3 font-semibold">Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {budgets.map((b) => {
                  const util = b.allocated_amount > 0 ? ((b.spent_amount / b.allocated_amount) * 100) : 0;
                  return (
                    <tr key={b.id} onClick={() => navigate(`/budgets/${b.id}`)} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-bold text-[#0E8F79] dark:text-green-400 text-xs block">{b.budget_number}</span>
                        <span className="text-gray-900 dark:text-white">{b.title}</span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">₱{Number(b.allocated_amount).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-gray-500">₱{Number(b.spent_amount).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={Number(b.remaining_amount) < 0 ? 'text-red-500 font-bold' : 'text-gray-900 dark:text-white'}>
                          ₱{Number(b.remaining_amount).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${util > 90 ? 'bg-red-500' : util > 70 ? 'bg-yellow-500' : 'bg-[#3BC25B]'}`} style={{ width: `${Math.min(100, util)}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 w-10 text-right">{util.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
