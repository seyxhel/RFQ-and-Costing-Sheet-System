import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { GreenButton } from '../components/ui/GreenButton';
import { User, Lock, Mail, Phone, Building, Sun, Moon, Tag, Users, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { costCategoryAPI, commissionRoleAPI } from '../services/costingService';
import { toast } from 'sonner';

const inputCls =
  'w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#3BC25B] outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-all text-sm';
const labelCls =
  'block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1.5';

export default function Settings() {
  const { isDark, toggleDark } = useTheme();
  const { user, refreshUser } = useAuth();

  // Personal details state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [saving, setSaving] = useState(false);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  // Cost Categories CRUD
  const [categories, setCategories] = useState<any[]>([]);
  const [catEditing, setCatEditing] = useState<number | null>(null);
  const [catForm, setCatForm] = useState({ name: '', description: '', has_input_vat: false, sort_order: 0 });
  const [catAdding, setCatAdding] = useState(false);

  // Commission Roles CRUD
  const [roles, setRoles] = useState<any[]>([]);
  const [roleEditing, setRoleEditing] = useState<number | null>(null);
  const [roleForm, setRoleForm] = useState({ name: '', default_percent: '0', sort_order: 0 });
  const [roleAdding, setRoleAdding] = useState(false);

  // Pre-populate from auth user
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setDepartment(user.department || '');
    }
  }, [user]);

  // Load cost categories & commission roles
  useEffect(() => {
    costCategoryAPI.list().then((r) => setCategories(r.data.results || r.data || [])).catch(() => {});
    commissionRoleAPI.list().then((r) => setRoles(r.data.results || r.data || [])).catch(() => {});
  }, []);

  const loadCategories = () => costCategoryAPI.list().then((r) => setCategories(r.data.results || r.data || []));
  const loadRoles = () => commissionRoleAPI.list().then((r) => setRoles(r.data.results || r.data || []));

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/accounts/profile/', {
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        department,
      });
      await refreshUser();
      toast.success('Profile updated successfully');
    } catch (err: any) {
      const data = err.response?.data;
      const msg = data ? Object.values(data).flat().join(' ') : 'Failed to update profile';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }

    setChangingPw(true);
    try {
      await api.post('/accounts/change-password/', {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.current_password) {
        toast.error(Array.isArray(data.current_password) ? data.current_password[0] : data.current_password);
      } else if (data?.confirm_password) {
        toast.error(Array.isArray(data.confirm_password) ? data.confirm_password[0] : data.confirm_password);
      } else {
        const msg = data ? Object.values(data).flat().join(' ') : 'Failed to change password';
        toast.error(msg);
      }
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage your account details and security</p>
      </div>

      {/* Display & Appearance */}
      <Card className="border-l-4 border-l-[#3BC25B]">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-lg bg-[#0E8F79]/10 dark:bg-[#0E8F79]/20">
            {isDark ? <Moon className="w-5 h-5 text-[#0E8F79]" /> : <Sun className="w-5 h-5 text-[#0E8F79]" />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Display & Appearance</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Control the look and feel of the interface</p>
          </div>
        </div>

        <div className="flex items-center justify-between py-3 px-1">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Dark Mode</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Toggle between dark and light themes</p>
          </div>
          <button
            onClick={toggleDark}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#3BC25B] focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
              isDark ? 'bg-[#0E8F79]' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                isDark ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </Card>

      {/* Personal Details */}
      <Card className="border-l-4 border-l-[#3BC25B]">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-lg bg-[#0E8F79]/10 dark:bg-[#0E8F79]/20">
            <User className="w-5 h-5 text-[#0E8F79]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Personal Details</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Update your personal information</p>
          </div>
        </div>

        <form onSubmit={handleSaveDetails} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>First Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. John"
                  className={inputCls + ' pl-10'}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Last Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Doe"
                  className={inputCls + ' pl-10'}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. john@example.com"
                  className={inputCls + ' pl-10'}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 09171234567"
                  className={inputCls + ' pl-10'}
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Department</label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Engineering"
                  className={inputCls + ' pl-10'}
                />
              </div>
            </div>
          </div>
          <div className="pt-2">
            <GreenButton type="submit" isLoading={saving}>Save Changes</GreenButton>
          </div>
        </form>
      </Card>

      {/* Change Password */}
      <Card className="border-l-4 border-l-[#3BC25B]">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-lg bg-[#0E8F79]/10 dark:bg-[#0E8F79]/20">
            <Lock className="w-5 h-5 text-[#0E8F79]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Change Password</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Update your account password</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-5">
          <div className="max-w-md space-y-4">
            <div>
              <label className={labelCls}>Current Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className={inputCls + ' pl-10'}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className={inputCls + ' pl-10'}
                />
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Must be at least 8 characters</p>
            </div>
            <div>
              <label className={labelCls}>Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className={inputCls + ' pl-10'}
                />
              </div>
            </div>
          </div>
          <div className="pt-2">
            <GreenButton type="submit" isLoading={changingPw}>Update Password</GreenButton>
          </div>
        </form>
      </Card>

      {/* ---- Cost Categories CRUD ---- */}
      <Card className="border-l-4 border-l-[#3BC25B]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#0E8F79]/10 dark:bg-[#0E8F79]/20">
              <Tag className="w-5 h-5 text-[#0E8F79]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Cost Categories</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Configure categories for costing sheet line items</p>
            </div>
          </div>
          <GreenButton onClick={() => { setCatAdding(true); setCatForm({ name: '', description: '', has_input_vat: false, sort_order: categories.length }); }}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </GreenButton>
        </div>

        {catAdding && (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Name</label>
                <input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} className={inputCls} placeholder="e.g. COGS" />
              </div>
              <div>
                <label className={labelCls}>Sort Order</label>
                <input type="number" value={catForm.sort_order} onChange={(e) => setCatForm({ ...catForm, sort_order: Number(e.target.value) })} className={inputCls} />
              </div>
              <div className="flex items-end gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={catForm.has_input_vat} onChange={(e) => setCatForm({ ...catForm, has_input_vat: e.target.checked })} className="rounded border-gray-300" />
                  <span className="text-gray-700 dark:text-gray-300">Has Input VAT</span>
                </label>
              </div>
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <input value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} className={inputCls} />
            </div>
            <div className="flex gap-2">
              <GreenButton onClick={async () => {
                try { await costCategoryAPI.create(catForm); toast.success('Category created'); setCatAdding(false); loadCategories(); } catch { toast.error('Failed'); }
              }}><Check className="w-4 h-4 mr-1" /> Save</GreenButton>
              <GreenButton variant="outline" onClick={() => setCatAdding(false)}><X className="w-4 h-4 mr-1" /> Cancel</GreenButton>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Description</th>
                <th className="px-4 py-2 text-center">Input VAT</th>
                <th className="px-4 py-2 text-center">Order</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {categories.map((c: any) => (
                <tr key={c.id}>
                  {catEditing === c.id ? (
                    <>
                      <td className="px-4 py-2"><input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} className={inputCls} /></td>
                      <td className="px-4 py-2"><input value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} className={inputCls} /></td>
                      <td className="px-4 py-2 text-center"><input type="checkbox" checked={catForm.has_input_vat} onChange={(e) => setCatForm({ ...catForm, has_input_vat: e.target.checked })} /></td>
                      <td className="px-4 py-2 text-center"><input type="number" value={catForm.sort_order} onChange={(e) => setCatForm({ ...catForm, sort_order: Number(e.target.value) })} className={inputCls + ' w-16 text-center'} /></td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={async () => { try { await costCategoryAPI.update(c.id, catForm); toast.success('Updated'); setCatEditing(null); loadCategories(); } catch { toast.error('Failed'); } }} className="text-[#3BC25B] hover:text-[#0E8F79] mr-2"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setCatEditing(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">{c.name}</td>
                      <td className="px-4 py-2 text-gray-500">{c.description || '—'}</td>
                      <td className="px-4 py-2 text-center">{c.has_input_vat ? <span className="text-[#3BC25B] text-xs font-medium">Yes</span> : <span className="text-gray-400 text-xs">No</span>}</td>
                      <td className="px-4 py-2 text-center text-gray-500">{c.sort_order}</td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => { setCatEditing(c.id); setCatForm({ name: c.name, description: c.description || '', has_input_vat: c.has_input_vat, sort_order: c.sort_order }); }} className="text-gray-400 hover:text-[#0E8F79] mr-2"><Pencil className="w-4 h-4" /></button>
                        <button onClick={async () => { if (confirm('Delete this category?')) { try { await costCategoryAPI.delete(c.id); toast.success('Deleted'); loadCategories(); } catch { toast.error('Cannot delete (in use)'); } } }} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {categories.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No categories configured</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ---- Commission Roles CRUD ---- */}
      <Card className="border-l-4 border-l-[#3BC25B]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#0E8F79]/10 dark:bg-[#0E8F79]/20">
              <Users className="w-5 h-5 text-[#0E8F79]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Commission Roles</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Define commission split roles and default percentages</p>
            </div>
          </div>
          <GreenButton onClick={() => { setRoleAdding(true); setRoleForm({ name: '', default_percent: '0', sort_order: roles.length }); }}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </GreenButton>
        </div>

        {roleAdding && (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Role Name</label>
                <input value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} className={inputCls} placeholder="e.g. Sales" />
              </div>
              <div>
                <label className={labelCls}>Default %</label>
                <input type="number" step="0.01" value={roleForm.default_percent} onChange={(e) => setRoleForm({ ...roleForm, default_percent: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Sort Order</label>
                <input type="number" value={roleForm.sort_order} onChange={(e) => setRoleForm({ ...roleForm, sort_order: Number(e.target.value) })} className={inputCls} />
              </div>
            </div>
            <div className="flex gap-2">
              <GreenButton onClick={async () => {
                try { await commissionRoleAPI.create(roleForm); toast.success('Role created'); setRoleAdding(false); loadRoles(); } catch { toast.error('Failed'); }
              }}><Check className="w-4 h-4 mr-1" /> Save</GreenButton>
              <GreenButton variant="outline" onClick={() => setRoleAdding(false)}><X className="w-4 h-4 mr-1" /> Cancel</GreenButton>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-2 text-left">Role Name</th>
                <th className="px-4 py-2 text-right">Default %</th>
                <th className="px-4 py-2 text-center">Order</th>
                <th className="px-4 py-2 text-center">Active</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {roles.map((r: any) => (
                <tr key={r.id}>
                  {roleEditing === r.id ? (
                    <>
                      <td className="px-4 py-2"><input value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} className={inputCls} /></td>
                      <td className="px-4 py-2"><input type="number" step="0.01" value={roleForm.default_percent} onChange={(e) => setRoleForm({ ...roleForm, default_percent: e.target.value })} className={inputCls + ' w-24 text-right'} /></td>
                      <td className="px-4 py-2 text-center"><input type="number" value={roleForm.sort_order} onChange={(e) => setRoleForm({ ...roleForm, sort_order: Number(e.target.value) })} className={inputCls + ' w-16 text-center'} /></td>
                      <td className="px-4 py-2 text-center">—</td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={async () => { try { await commissionRoleAPI.update(r.id, roleForm); toast.success('Updated'); setRoleEditing(null); loadRoles(); } catch { toast.error('Failed'); } }} className="text-[#3BC25B] hover:text-[#0E8F79] mr-2"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setRoleEditing(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">{r.name}</td>
                      <td className="px-4 py-2 text-right text-[#0E8F79] font-medium">{r.default_percent}%</td>
                      <td className="px-4 py-2 text-center text-gray-500">{r.sort_order}</td>
                      <td className="px-4 py-2 text-center">{r.is_active ? <span className="text-[#3BC25B] text-xs font-medium">Active</span> : <span className="text-gray-400 text-xs">Inactive</span>}</td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => { setRoleEditing(r.id); setRoleForm({ name: r.name, default_percent: r.default_percent, sort_order: r.sort_order }); }} className="text-gray-400 hover:text-[#0E8F79] mr-2"><Pencil className="w-4 h-4" /></button>
                        <button onClick={async () => { if (confirm('Delete this role?')) { try { await commissionRoleAPI.delete(r.id); toast.success('Deleted'); loadRoles(); } catch { toast.error('Cannot delete (in use)'); } } }} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {roles.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No commission roles configured</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
