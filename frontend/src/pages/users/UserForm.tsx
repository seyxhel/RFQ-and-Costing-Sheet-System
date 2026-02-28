import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { GreenButton } from '../../components/ui/GreenButton';
import { userAPI } from '../../services/userService';
import { toast } from 'sonner';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

const ROLES = ['ADMIN', 'MANAGER', 'PROCUREMENT', 'FINANCE', 'VIEWER'];
const EMPTY = { username: '', email: '', first_name: '', last_name: '', password: '', role: 'VIEWER', is_active: true };

export default function UserForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    if (isEdit) {
      userAPI.get(Number(id)).then((r) => setForm({ ...EMPTY, ...r.data, password: '' })).catch(() => { toast.error('Failed to load'); navigate('/users'); });
    }
  }, [id, isEdit, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (isEdit && !payload.password) { delete (payload as any).password; }
      if (isEdit) { await userAPI.update(Number(id), payload); toast.success('User updated'); }
      else { await userAPI.create(payload); toast.success('User created'); }
      navigate('/users');
    } catch (err: any) {
      const detail = err.response?.data;
      if (detail && typeof detail === 'object') {
        const msgs = Object.entries(detail).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n');
        toast.error(msgs || 'Failed to save');
      } else { toast.error('Failed to save'); }
    } finally { setSaving(false); }
  };

  const inputCls = 'w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#3BC25B] outline-none';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit User' : 'Add User'}</h1>
          <p className="text-gray-500 dark:text-gray-400">User account and role settings</p>
        </div>
        <GreenButton variant="outline" onClick={() => navigate('/users')}><ArrowLeft className="w-4 h-4 mr-2" /> Back</GreenButton>
      </div>

      <Card accent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Username <span className="text-red-500">*</span></label>
              <input name="username" value={form.username} onChange={handleChange} required className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Email <span className="text-red-500">*</span></label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">First Name</label>
              <input name="first_name" value={form.first_name} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Last Name</label>
              <input name="last_name" value={form.last_name} onChange={handleChange} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Password {!isEdit && <span className="text-red-500">*</span>}{isEdit && <span className="text-xs text-gray-400 font-normal">(leave blank to keep current)</span>}</label>
              <div className="relative">
                <input name="password" type={showPwd ? 'text' : 'password'} value={form.password} onChange={handleChange} required={!isEdit} className={inputCls + ' pr-10'} />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Role</label>
              <select name="role" value={form.role} onChange={handleChange} className={inputCls}>
                {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer mt-6">
                <input type="checkbox" name="is_active" checked={form.is_active as any} onChange={handleChange} className="w-4 h-4 rounded border-gray-300 text-[#3BC25B] focus:ring-[#3BC25B]" />
                <span className="text-sm text-gray-700 dark:text-gray-300">Active account</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <GreenButton type="submit" isLoading={saving}>{isEdit ? 'Update User' : 'Create User'}</GreenButton>
            <GreenButton type="button" variant="outline" onClick={() => navigate('/users')}>Cancel</GreenButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
