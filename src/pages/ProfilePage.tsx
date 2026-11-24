import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Lock,
  Bell,
  Star,
  Info,
  LogOut,
  ChevronRight,
  CheckCircle2,
  Calendar,
  Users,
  Download,
  Check,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { Card } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, updateProfile } = useAuth();
  const { groups, tasks, sessions, resources } = useAppData();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Form states
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [program, setProgram] = useState(user?.program || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Notification settings states
  const [emailReminders, setEmailReminders] = useState(true);
  const [taskDueAlerts, setTaskDueAlerts] = useState(true);
  const [circleInvites, setCircleInvites] = useState(true);

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const completedTasksCount = tasks.filter((t) => t.status === 'done').length;

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    try {
      await updateProfile({ fullName: fullName.trim(), program: program.trim() });
      setIsEditOpen(false);
      showToast('Profile information updated successfully!');
    } catch {
      showToast('Failed to update profile', 'error');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
      }
      setIsPasswordOpen(false);
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError('');
      showToast('Password changed successfully!');
    } catch (err: any) {
      setPasswordError(err.message || 'Could not change password.');
    }
  };

  const handleExportData = () => {
    const exportObject = {
      user,
      groups,
      tasks,
      sessions,
      resources,
      exportedAt: new Date().toISOString()
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObject, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `studycircle_export_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Exported your StudyCircle study data (JSON).');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold transition-all ${
            toastMessage.type === 'success'
              ? 'bg-feedback-success-light border-feedback-success/30 text-feedback-success'
              : 'bg-feedback-error-light border-feedback-error/30 text-feedback-error'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <Check className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Profile Header */}
      <div className="text-center pt-2 pb-4">
        <div className="relative inline-block mx-auto mb-3">
          <Avatar initials={user?.initials || 'ST'} size="xl" bgColor="#3D7A8A" />
          <button
            onClick={() => {
              setFullName(user?.fullName || '');
              setProgram(user?.program || '');
              setIsEditOpen(true);
            }}
            className="absolute bottom-0 right-0 w-7 h-7 bg-teal text-white rounded-full flex items-center justify-center border-2 border-white shadow-sm hover:bg-teal-hover transition-colors"
            title="Edit profile"
          >
            <span className="text-xs">✎</span>
          </button>
        </div>

        <h2 className="text-xl font-extrabold text-navy tracking-tight">
          {user?.fullName || 'Student'}
        </h2>
        <p className="text-xs text-navy/50 mt-0.5">{user?.email}</p>
        <span className="inline-block mt-2 px-3 py-1 bg-teal-light text-teal rounded-full text-xs font-semibold">
          {user?.program || 'Undergraduate Student'}
        </span>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3.5 text-center">
          <div className="text-2xl font-extrabold text-navy">{groups.length}</div>
          <div className="text-[11px] font-semibold text-navy/50 mt-0.5 flex items-center justify-center gap-1">
            <Users className="w-3 h-3 text-navy/40" />
            <span>Circles</span>
          </div>
        </Card>
        <Card className="p-3.5 text-center">
          <div className="text-2xl font-extrabold text-feedback-success">{completedTasksCount}</div>
          <div className="text-[11px] font-semibold text-navy/50 mt-0.5 flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-feedback-success" />
            <span>Tasks Done</span>
          </div>
        </Card>
        <Card className="p-3.5 text-center">
          <div className="text-2xl font-extrabold text-amber">{sessions.length}</div>
          <div className="text-[11px] font-semibold text-navy/50 mt-0.5 flex items-center justify-center gap-1">
            <Calendar className="w-3 h-3 text-amber" />
            <span>Sessions</span>
          </div>
        </Card>
      </div>

      {/* Account Settings Section */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-navy/40 uppercase tracking-wider px-1">
          Account Settings
        </span>
        <Card className="divide-y divide-ivory-border overflow-hidden">
          <div
            onClick={() => {
              setFullName(user?.fullName || '');
              setProgram(user?.program || '');
              setIsEditOpen(true);
            }}
            className="p-3.5 flex items-center justify-between hover:bg-ivory-subtle cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-light flex items-center justify-center text-teal">
                <UserIcon className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-navy">Edit Profile Information</span>
            </div>
            <ChevronRight className="w-4 h-4 text-navy/30" />
          </div>

          <div
            onClick={() => setIsPasswordOpen(true)}
            className="p-3.5 flex items-center justify-between hover:bg-ivory-subtle cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-light flex items-center justify-center text-teal">
                <Lock className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-navy">Change Password</span>
            </div>
            <ChevronRight className="w-4 h-4 text-navy/30" />
          </div>

          <div
            onClick={() => setIsNotifOpen(true)}
            className="p-3.5 flex items-center justify-between hover:bg-ivory-subtle cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-light flex items-center justify-center text-teal">
                <Bell className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-navy">Notification Reminders</span>
            </div>
            <ChevronRight className="w-4 h-4 text-navy/30" />
          </div>

          <div
            onClick={handleExportData}
            className="p-3.5 flex items-center justify-between hover:bg-ivory-subtle cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-light flex items-center justify-center text-teal">
                <Download className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-navy">Export My Study Data</span>
            </div>
            <ChevronRight className="w-4 h-4 text-navy/30" />
          </div>
        </Card>
      </div>

      {/* App & Community */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-navy/40 uppercase tracking-wider px-1">
          App &amp; Community
        </span>
        <Card className="divide-y divide-ivory-border overflow-hidden">
          <div
            onClick={() => navigate('/feedback')}
            className="p-3.5 flex items-center justify-between hover:bg-ivory-subtle cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-light flex items-center justify-center text-amber-muted">
                <Star className="w-4 h-4 fill-amber" />
              </div>
              <div>
                <span className="text-sm font-semibold text-navy block">Rate &amp; Share Feedback</span>
                <span className="text-xs text-navy/50">Help us tailor StudyCircle for your coursework</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-navy/30" />
          </div>

          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-ivory-subtle flex items-center justify-center text-navy/50">
                <Info className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-semibold text-navy block">About StudyCircle</span>
                <span className="text-xs text-navy/50">Version 1.0.0 (Production Release)</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Sign Out Button */}
      <Button
        variant="danger"
        size="lg"
        fullWidth
        onClick={handleLogout}
        leftIcon={<LogOut className="w-4 h-4" />}
      >
        Sign Out
      </Button>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Profile"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <Input
            label="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <Input
            label="Degree Program & Year"
            value={program}
            onChange={(e) => setProgram(e.target.value)}
            placeholder="e.g. Year 2 · BSc Mathematics"
            required
          />
          <div className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => setIsEditOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" fullWidth>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        isOpen={isPasswordOpen}
        onClose={() => {
          setIsPasswordOpen(false);
          setPasswordError('');
          setNewPassword('');
          setConfirmPassword('');
        }}
        title="Change Password"
        description="Set a new secure password for your account."
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            label="New Password"
            type="password"
            placeholder="At least 8 characters"
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setPasswordError('');
            }}
            required
          />
          <Input
            label="Confirm New Password"
            type="password"
            placeholder="Repeat password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setPasswordError('');
            }}
            required
          />

          {passwordError && (
            <p className="text-xs text-feedback-error font-medium">{passwordError}</p>
          )}

          <div className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => {
                setIsPasswordOpen(false);
                setPasswordError('');
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" fullWidth>
              Update Password
            </Button>
          </div>
        </form>
      </Modal>

      {/* Notification Preferences Modal */}
      <Modal
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        title="Notification Reminders"
        description="Configure your study session and assignment alerts."
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-ivory-subtle rounded-xl">
            <div>
              <p className="text-xs font-bold text-navy">Study Session Reminders</p>
              <p className="text-[11px] text-navy/50">Get alerts 1 hour before scheduled study sessions</p>
            </div>
            <input
              type="checkbox"
              checked={emailReminders}
              onChange={(e) => setEmailReminders(e.target.checked)}
              className="w-4 h-4 accent-teal rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-ivory-subtle rounded-xl">
            <div>
              <p className="text-xs font-bold text-navy">Task Due Date Warnings</p>
              <p className="text-[11px] text-navy/50">Remind me 24 hours prior to assignment deadlines</p>
            </div>
            <input
              type="checkbox"
              checked={taskDueAlerts}
              onChange={(e) => setTaskDueAlerts(e.target.checked)}
              className="w-4 h-4 accent-teal rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-ivory-subtle rounded-xl">
            <div>
              <p className="text-xs font-bold text-navy">Circle Activity &amp; Resources</p>
              <p className="text-[11px] text-navy/50">Notify when new lecture notes are uploaded</p>
            </div>
            <input
              type="checkbox"
              checked={circleInvites}
              onChange={(e) => setCircleInvites(e.target.checked)}
              className="w-4 h-4 accent-teal rounded cursor-pointer"
            />
          </div>

          <Button
            variant="primary"
            fullWidth
            onClick={() => {
              setIsNotifOpen(false);
              showToast('Notification preferences saved.');
            }}
          >
            Save Preferences
          </Button>
        </div>
      </Modal>
    </div>
  );
};
