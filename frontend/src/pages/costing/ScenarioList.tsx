import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { GreenButton } from '../../components/ui/GreenButton';
import { scenarioAPI } from '../../services/costingService';
import { toast } from 'sonner';
import { ArrowLeft, Plus, FlaskConical, Trash2, Eye } from 'lucide-react';

export default function ScenarioList() {
  const { sheetId } = useParams();
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    scenarioAPI.list(Number(sheetId)).then((r) => { setScenarios(r.data.results || r.data); setLoading(false); }).catch(() => { toast.error('Failed to load scenarios'); setLoading(false); });
  }, [sheetId]);

  const handleDelete = (id: number) => {
    scenarioAPI.delete(Number(sheetId), id).then(() => { setScenarios((p) => p.filter((s) => s.id !== id)); toast.success('Scenario deleted'); }).catch(() => toast.error('Delete failed'));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">What-If Scenarios</h1>
          <p className="text-gray-500 dark:text-gray-400">Costing Sheet #{sheetId} — Explore cost variations</p>
        </div>
        <div className="flex gap-2">
          <GreenButton variant="outline" onClick={() => navigate(`/costing/${sheetId}`)}><ArrowLeft className="w-4 h-4 mr-2" /> Back</GreenButton>
          <GreenButton onClick={() => navigate(`/costing/${sheetId}/scenarios/new`)}><Plus className="w-4 h-4 mr-2" /> New Scenario</GreenButton>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-4 border-[#3BC25B] border-t-transparent rounded-full animate-spin" /></div>
      ) : scenarios.length === 0 ? (
        <Card>
          <div className="text-center py-16">
            <FlaskConical className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Scenarios Yet</h3>
            <p className="text-sm text-gray-500 mb-4">Create what-if scenarios to explore pricing variations</p>
            <GreenButton onClick={() => navigate(`/costing/${sheetId}/scenarios/new`)}>Create First Scenario</GreenButton>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map((s) => (
            <Card key={s.id}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center"><FlaskConical className="w-4 h-4 text-white" /></div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{s.name}</h3>
                </div>
                <button onClick={() => handleDelete(s.id)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
              {s.description && <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{s.description}</p>}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                  <p className="text-[10px] text-gray-500 uppercase">Adjusted Cost</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">₱{Number(s.projected_total_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">Sum of line items</p>
                </div>
                <div className="p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                  <p className="text-[10px] text-gray-500 uppercase">Margin</p>
                  <p className="text-sm font-bold text-[#0E8F79]">{Number(s.projected_margin_percent || 0).toFixed(2)}%</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">Applied percentage</p>
                </div>
                <div className="p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg col-span-2">
                  <p className="text-[10px] text-gray-500 uppercase">Selling Price</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">₱{Number(s.projected_selling_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">Cost × (1 + Margin%)</p>
                </div>
                <div className="p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg col-span-2">
                  <p className="text-[10px] text-gray-500 uppercase">Created</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
