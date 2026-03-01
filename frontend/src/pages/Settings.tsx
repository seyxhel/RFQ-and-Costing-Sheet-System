import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { GreenButton } from '../components/ui/GreenButton';
import { User, Lock, Mail, Phone, Building, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
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
    </div>
  );
}
