import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function SettingsPage() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (newPassword.length < 8) {
      return setMessage({ type: 'error', text: 'New password must be at least 8 characters' });
    }
    if (newPassword !== confirmPassword) {
      return setMessage({ type: 'error', text: 'Passwords do not match' });
    }

    setSaving(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to change password' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <h2 className="text-xl font-heading font-bold text-brand-dark">Settings</h2>

      {/* Account Info */}
      <div className="bg-white rounded-2xl shadow-brand-sm p-5 space-y-3">
        <h3 className="font-heading font-semibold text-brand-dark">Account</h3>
        <div>
          <label className="block text-sm font-medium text-brand-muted mb-0.5">Name</label>
          <p className="text-brand-dark">{user?.name || user?.email}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-brand-muted mb-0.5">Email</label>
          <p className="text-brand-dark">{user?.email}</p>
        </div>
      </div>

      {/* Change Password */}
      <form onSubmit={handleChangePassword} className="bg-white rounded-2xl shadow-brand-sm p-5 space-y-4">
        <h3 className="font-heading font-semibold text-brand-dark">Change Password</h3>

        {message.text && (
          <div className={`rounded-xl px-4 py-3 text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-brand-body mb-1">Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-brand-dark focus:ring-2 focus:ring-primary-300 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-body mb-1">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-brand-dark focus:ring-2 focus:ring-primary-300 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-body mb-1">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-brand-dark focus:ring-2 focus:ring-primary-300 outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-primary-600 text-white px-5 py-2 rounded-pill text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 transition-all shadow-brand-sm"
        >
          {saving ? 'Updating...' : 'Update Password'}
        </button>
      </form>

      {/* System Info */}
      <div className="bg-white rounded-2xl shadow-brand-sm p-5 space-y-2">
        <h3 className="font-heading font-semibold text-brand-dark">System</h3>
        <p className="text-sm text-brand-muted">Version: 1.0.0 (MVP)</p>
        <p className="text-sm text-brand-muted">AI Model: Claude Sonnet 4</p>
      </div>
    </div>
  );
}
