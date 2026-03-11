import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { GreenButton } from '../../components/ui/GreenButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Search, Plus, MoreHorizontal, Pencil, Trash2, Users, Shield } from 'lucide-react';
import { userAPI } from '../../services/userService';
import { toast } from 'sonner';

const ROLE_TABS = ['All', 'management', 'sales', 'purchasing'];

export default function UserList() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  useEffect(() => {
    userAPI.list().then((r) => { setUsers(r.data.results || r.data); setLoading(false); }).catch(() => { toast.error('Failed to load users'); setLoading(false); });
  }, []);

  useEffect(() => { const h = () => setOpenMenuId(null); document.addEventListener('click', h); return () => document.removeEventListener('click', h); }, []);

  const handleDelete = (id: number) => {
    userAPI.delete(id).then(() => { setUsers((p) => p.filter((u) => u.id !== id)); toast.success('User deleted'); }).catch(() => toast.error('Delete failed'));
    setOpenMenuId(null);
  };

  const filtered = users.filter((u) => {
    const matchSearch = !search || u.username?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()) || u.first_name?.toLowerCase().includes(search.toLowerCase()) || u.last_name?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'All' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage team members and permissions</p>
        </div>
        <GreenButton onClick={() => navigate('/users/new')}><Plus className="w-4 h-4 mr-2" /> Add User</GreenButton>
      </div>

      {/* Role filter tabs */}
      <div className="flex flex-wrap gap-2">
        {ROLE_TABS.map((tab) => (
          <button key={tab} onClick={() => setRoleFilter(tab)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${roleFilter === tab ? 'bg-gradient-to-r from-[#63D44A] to-[#0E8F79] text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-[#3BC25B]'}`}>
            {tab === 'All' ? 'All Users' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            <span className="ml-1.5 text-xs opacity-70">({tab === 'All' ? users.length : users.filter((u) => u.role === tab).length})</span>
          </button>
        ))}
      </div>

      <Card accent>
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} type="text" placeholder="Search users..." className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3BC25B]" />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-4 border-[#3BC25B] border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12"><Users className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" /><p className="text-gray-400">No users found</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((u) => (
              <div key={u.id} className="relative p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl hover:shadow-lg transition-all group">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#63D44A] to-[#0E8F79] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {(u.first_name?.charAt(0) || u.username?.charAt(0) || '?').toUpperCase()}{(u.last_name?.charAt(0) || '').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : u.username}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{u.username}</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{u.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <StatusBadge status={u.role || 'viewer'} />
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${u.is_active ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-green-500' : 'bg-red-500'}`} />{u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="relative">
                    <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === u.id ? null : u.id); }} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-opacity"><MoreHorizontal className="w-5 h-5" /></button>
                    {openMenuId === u.id && (
                      <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-8 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 min-w-[140px]">
                        <button onClick={() => { setOpenMenuId(null); navigate(`/users/${u.id}/edit`); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"><Pencil className="w-4 h-4" /> Edit</button>
                        <button onClick={() => handleDelete(u.id)} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4" /> Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
