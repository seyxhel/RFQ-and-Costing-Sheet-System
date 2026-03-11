import React, { useState, useEffect } from 'react';
import { clientAPI } from '../../services/salesService';
import { toast } from 'sonner';
import { Search, X, Plus, Pencil, Trash2, ArrowLeft, Save } from 'lucide-react';

interface Client {
  id: number;
  name: string;
  designation: string;
  contact_number: string;
  email: string;
  address: string;
  is_active: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (client: Client) => void;
}

const inp = "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm";
const lbl = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";

const EMPTY: Omit<Client, 'id' | 'is_active'> = {
  name: '', designation: '', contact_number: '', email: '', address: '',
};

export default function ClientSelectModal({ open, onClose, onSelect }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // CRUD sub-view
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const fetchClients = () => {
    setLoading(true);
    clientAPI.list({ search: search || undefined })
      .then(r => { setClients(r.data.results || r.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) { fetchClients(); setMode('list'); }
  }, [open]);

  useEffect(() => {
    if (open && mode === 'list') {
      const t = setTimeout(fetchClients, 300);
      return () => clearTimeout(t);
    }
  }, [search]);

  const openCreate = () => {
    setForm({ ...EMPTY });
    setEditId(null);
    setMode('form');
  };

  const openEdit = (c: Client) => {
    setForm({ name: c.name, designation: c.designation, contact_number: c.contact_number, email: c.email, address: c.address });
    setEditId(c.id);
    setMode('form');
  };

  const handleDelete = async (c: Client) => {
    if (!confirm(`Delete client "${c.name}"?`)) return;
    try {
      await clientAPI.delete(c.id);
      toast.success('Client deleted');
      fetchClients();
    } catch { toast.error('Failed to delete'); }
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await clientAPI.update(editId, form);
        toast.success('Client updated');
      } else {
        await clientAPI.create(form);
        toast.success('Client registered');
      }
      setMode('list');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (open && mode === 'list') {
      fetchClients();
    }
  }, [mode]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          {mode === 'form' ? (
            <div className="flex items-center gap-3">
              <button onClick={() => setMode('list')} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><ArrowLeft className="w-5 h-5 text-gray-500" /></button>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{editId ? 'Edit Client' : 'Register a Client'}</h2>
            </div>
          ) : (
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Select Client</h2>
          )}
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        {/* Body */}
        {mode === 'list' ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Search + Register */}
            <div className="px-6 py-3 flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..." className={inp + ' pl-9'} />
              </div>
              <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#63D44A] to-[#0E8F79] text-white text-sm font-medium rounded-lg hover:opacity-90 transition whitespace-nowrap">
                <Plus className="w-4 h-4" /> Register a Client
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-6 pb-4">
              {loading ? (
                <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-[#3BC25B] border-t-transparent rounded-full animate-spin" /></div>
              ) : clients.length === 0 ? (
                <p className="text-center text-gray-400 py-12">No clients found. Register one to get started.</p>
              ) : (
                <div className="space-y-2">
                  {clients.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition cursor-pointer group" onClick={() => onSelect(c)}>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">{c.name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {[c.designation, c.contact_number, c.email].filter(Boolean).join(' · ') || 'No details'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition" onClick={e => e.stopPropagation()}>
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600"><Pencil className="w-3.5 h-3.5 text-gray-500" /></button>
                        <button onClick={() => handleDelete(c)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* CRUD Form */
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div>
              <label className={lbl}>Client Name <span className="text-red-500">*</span></label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required className={inp} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Designation</label>
                <input value={form.designation} onChange={e => setForm(p => ({ ...p, designation: e.target.value }))} className={inp} placeholder="e.g. CEO, Procurement Head" />
              </div>
              <div>
                <label className={lbl}>Contact Number</label>
                <input value={form.contact_number} onChange={e => setForm(p => ({ ...p, contact_number: e.target.value }))} className={inp} placeholder="e.g. +63 912 345 6789" />
              </div>
            </div>
            <div>
              <label className={lbl}>Email</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className={lbl}>Address</label>
              <textarea value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className={inp} rows={2} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setMode('list')} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button type="button" disabled={saving || !form.name.trim()} onClick={handleSave} className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#63D44A] to-[#0E8F79] text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition">
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
