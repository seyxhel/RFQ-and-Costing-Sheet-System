import React, { useEffect, useState, useCallback } from 'react';
import { Search, Filter, Download, Clock, User, ArrowRight, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, FileText, MessageSquare } from 'lucide-react';
import { auditLogAPI } from '../services/userService';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';

const MODULE_OPTIONS = ['', 'ACCOUNTS', 'PRODUCTS', 'RFQ', 'COSTING', 'SALES', 'BUDGET', 'PROCUREMENT', 'SETTINGS'];
const ACTION_OPTIONS = ['', 'CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'SUBMIT', 'APPROVE', 'REJECT', 'ACCEPT', 'SEND', 'ISSUE', 'COMPLETE', 'CLOSE', 'RECALCULATE', 'SAVE_VERSION', 'LOGIN', 'LOGOUT'];

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  UPDATE: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  SUBMIT: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  APPROVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REJECT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  ACCEPT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  SEND: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  ISSUE: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  COMPLETE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CLOSE: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  RECALCULATE: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  SAVE_VERSION: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  LOGIN: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  LOGOUT: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  STATUS_CHANGE: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

const PAGE_SIZE = 50;

export default function AuditLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [module, setModule] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };
      if (search) params.search = search;
      if (module) params.module = module;
      if (action) params.action = action;
      const res = await auditLogAPI.list(params);
      const data = res.data?.results ?? res.data;
      setLogs(Array.isArray(data) ? data : []);
      setHasMore(Array.isArray(data) && data.length >= PAGE_SIZE);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [search, module, action, page]);

  useEffect(() => { load(); }, [load]);

  const exportCSV = () => {
    const rows: string[][] = [['Timestamp', 'Module', 'Action', 'Object Type', 'Object', 'Old Status', 'New Status', 'Reference', 'User', 'IP', 'Remarks', 'Details']];
    logs.forEach((l) => {
      rows.push([
        l.timestamp, l.module, l.action_display || l.action,
        l.object_type, l.object_repr, l.old_status, l.new_status,
        l.reference || '', l.user_name, l.ip_address || '', l.remarks || '',
        l.details && Object.keys(l.details).length ? JSON.stringify(l.details) : '',
      ]);
    });
    const csv = rows.map((r) => r.map((c) => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'audit_log.csv';
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Log</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">System-wide activity trail — every action, every module</p>
        </div>
        <button onClick={exportCSV} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <Card accent>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search object name, type..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none"
              />
            </div>
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Module</label>
            <select value={module} onChange={(e) => { setModule(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none">
              <option value="">All Modules</option>
              {MODULE_OPTIONS.filter(Boolean).map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Action</label>
            <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none">
              <option value="">All Actions</option>
              {ACTION_OPTIONS.filter(Boolean).map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {/* Log Table */}
      <Card accent>
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading audit trail...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No audit log entries found.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold w-8"></th>
                    <th className="px-4 py-3 font-semibold">Timestamp</th>
                    <th className="px-4 py-3 font-semibold">Module</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                    <th className="px-4 py-3 font-semibold">Entity &amp; Reference</th>
                    <th className="px-4 py-3 font-semibold">Status Change</th>
                    <th className="px-4 py-3 font-semibold">User</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {logs.map((log) => {
                    const hasExtra = log.reference || log.remarks || (log.details && Object.keys(log.details).length > 0);
                    const isExpanded = expandedId === log.id;
                    return (
                    <React.Fragment key={log.id}>
                    <tr onClick={() => hasExtra && setExpandedId(isExpanded ? null : log.id)}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${hasExtra ? 'cursor-pointer' : ''}`}>
                      <td className="px-2 py-3 text-center">
                        {hasExtra ? (
                          isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400 mx-auto" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400 mx-auto" />
                        ) : null}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="text-xs">{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          {log.module_display || log.module}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'}`}>
                          {log.action_display || log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <span className="text-xs text-gray-400 dark:text-gray-500">{log.object_type}</span>
                          {log.object_repr && (
                            <p className="font-medium text-gray-900 dark:text-white text-xs">{log.object_repr}</p>
                          )}
                          {log.reference && (
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
                              <FileText className="w-3 h-3" /> {log.reference}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {(log.old_status || log.new_status) ? (
                          <div className="flex items-center gap-1.5 text-xs">
                            {log.old_status && <StatusBadge status={log.old_status} />}
                            {log.old_status && log.new_status && <ArrowRight className="w-3 h-3 text-gray-400" />}
                            {log.new_status && <StatusBadge status={log.new_status} />}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                          <User className="w-3 h-3" />
                          {log.user_name}
                        </div>
                        {log.ip_address && (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">{log.ip_address}</span>
                        )}
                      </td>
                    </tr>
                    {/* Expandable detail row */}
                    {isExpanded && hasExtra && (
                      <tr className="bg-gray-50/50 dark:bg-gray-800/30">
                        <td colSpan={7} className="px-8 py-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            {log.reference && (
                              <div>
                                <span className="font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-1"><FileText className="w-3 h-3" /> Reference</span>
                                <span className="text-gray-900 dark:text-white">{log.reference}</span>
                              </div>
                            )}
                            {log.remarks && (
                              <div>
                                <span className="font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-1"><MessageSquare className="w-3 h-3" /> Remarks</span>
                                <span className="text-gray-900 dark:text-white">{log.remarks}</span>
                              </div>
                            )}
                            {log.details && Object.keys(log.details).length > 0 && (
                              <div className="md:col-span-2">
                                <span className="font-semibold text-gray-500 dark:text-gray-400 mb-1 block">Details</span>
                                <div className="bg-white dark:bg-gray-800 rounded p-2 border border-gray-200 dark:border-gray-700 font-mono text-[11px] whitespace-pre-wrap break-all">
                                  {Object.entries(log.details).map(([k, v]) => (
                                    <div key={k}><span className="text-gray-400">{k}:</span> <span className="text-gray-900 dark:text-gray-100">{String(v)}</span></div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Page {page} · {logs.length} entries
              </span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button disabled={!hasMore} onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
