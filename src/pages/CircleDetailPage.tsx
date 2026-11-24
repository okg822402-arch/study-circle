import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Copy,
  Check,
  Plus,
  Calendar,
  FileText,
  CheckSquare,
  Users,
  Settings,
  Trash2,
  LogOut,
  Shield,
  ShieldAlert,
  UserMinus,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  AlertCircle,
  Link as LinkIcon,
  Clock,
  KeyRound,
  XCircle
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { TaskPriority, ResourceType, SessionType, GroupInvitation } from '../types';

export const CircleDetailPage: React.FC = () => {
  const { circleId } = useParams<{ circleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    getGroupById,
    updateGroup,
    deleteGroup,
    leaveGroup,
    updateMemberRole,
    removeMember,
    regenerateInviteCode,
    createInvitation,
    fetchInvitations,
    revokeInvitation,
    tasks,
    sessions,
    resources,
    addTask,
    updateTaskStatus,
    scheduleSession,
    updateSessionRsvp,
    addResource,
    deleteResource,
  } = useAppData();

  const group = getGroupById(circleId || '');
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'sessions' | 'resources'>('overview');
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals inside circle detail
  const [isEditCircleOpen, setIsEditCircleOpen] = useState(false);
  const [isDeleteCircleOpen, setIsDeleteCircleOpen] = useState(false);
  const [isLeaveCircleOpen, setIsLeaveCircleOpen] = useState(false);
  const [isInvitationsOpen, setIsInvitationsOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ userId: string; fullName: string } | null>(null);

  // Create Sub-Item Modals
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isAddResourceOpen, setIsAddResourceOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  // Active Invitations list for admins
  const [groupInvitations, setGroupInvitations] = useState<GroupInvitation[]>([]);
  const [invExpiresInHours, setInvExpiresInHours] = useState(168); // 7 days default
  const [invMaxUses, setInvMaxUses] = useState(10);
  const [isGeneratingInv, setIsGeneratingInv] = useState(false);

  // Edit circle form state
  const [editName, setEditName] = useState(group?.name || '');
  const [editSubject, setEditSubject] = useState(group?.subject || '');
  const [editDescription, setEditDescription] = useState(group?.description || '');

  // Sub-Item Forms State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');
  const [taskDueDate, setTaskDueDate] = useState('2026-11-28');

  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceType, setResourceType] = useState<ResourceType>('file');
  const [resourceUrl, setResourceUrl] = useState('');
  const [resourceFileType, setResourceFileType] = useState<'pdf' | 'docx' | 'xlsx' | 'pptx'>('pdf');

  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDate, setSessionDate] = useState('2026-11-28');
  const [sessionTime, setSessionTime] = useState('4:00 PM');
  const [sessionDuration, setSessionDuration] = useState(120);
  const [sessionLocation, setSessionLocation] = useState('Library Study Room 204');
  const [sessionType, setSessionType] = useState<SessionType>('in_person');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const isAdmin = group?.myRole === 'admin';

  // Load invitations when modal opens or on mount for admins
  useEffect(() => {
    if (group && isAdmin) {
      fetchInvitations(group.id).then((invs) => setGroupInvitations(invs));
    }
  }, [group?.id, isAdmin]);

  if (!group) {
    return (
      <div className="py-12 text-center bg-white rounded-card border border-ivory-border p-8">
        <h3 className="text-lg font-bold text-navy">Circle not found</h3>
        <p className="text-sm text-navy/50 mt-1">This study circle does not exist or has been deleted.</p>
        <Button variant="primary" className="mt-4" onClick={() => navigate('/circles')}>
          Back to Circles
        </Button>
      </div>
    );
  }

  const groupTasks = tasks.filter((t) => t.groupId === group.id);
  const groupSessions = sessions.filter((s) => s.groupId === group.id);
  const groupResources = resources.filter((r) => r.groupId === group.id);

  const copyCode = (tokenToCopy?: string) => {
    const code = tokenToCopy || group.inviteCode;
    navigator.clipboard?.writeText(code);
    setCopied(true);
    showToast(`Invitation code ${code} copied to clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = (tokenToCopy: string) => {
    const origin = window.location.origin;
    const link = `${origin}/#/join/${tokenToCopy}`;
    navigator.clipboard?.writeText(link);
    showToast('Direct invitation link copied to clipboard!');
  };

  const handleGenerateNewInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsGeneratingInv(true);
      const newInv = await createInvitation(
        {
          groupId: group.id,
          expiresInHours: Number(invExpiresInHours),
          maxUses: Number(invMaxUses),
        },
        group.subject.substring(0, 3)
      );

      setGroupInvitations((prev) => [newInv, ...prev]);
      showToast('New secure invitation token generated!');
    } catch {
      showToast('Failed to create invitation', 'error');
    } finally {
      setIsGeneratingInv(false);
    }
  };

  const handleRevokeInvitation = async (invId: string) => {
    try {
      await revokeInvitation(invId);
      setGroupInvitations((prev) =>
        prev.map((i) => (i.id === invId ? { ...i, isRevoked: true } : i))
      );
      showToast('Invitation revoked. It can no longer be used to join.');
    } catch {
      showToast('Failed to revoke invitation', 'error');
    }
  };

  const handleRegenerateCode = async () => {
    try {
      const newCode = await regenerateInviteCode(group.id);
      showToast(`Regenerated new invite code: ${newCode}`);
    } catch {
      showToast('Failed to regenerate invite code', 'error');
    }
  };

  const handleUpdateCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editSubject.trim()) return;

    await updateGroup(group.id, {
      name: editName.trim(),
      subject: editSubject.trim(),
      description: editDescription.trim(),
    });

    setIsEditCircleOpen(false);
    showToast('Updated study circle settings.');
  };

  const handleDeleteCircle = async () => {
    await deleteGroup(group.id);
    navigate('/circles');
  };

  const handleLeaveCircle = async () => {
    await leaveGroup(group.id);
    navigate('/circles');
  };

  const handleRoleToggle = async (targetUserId: string, currentRole: 'admin' | 'member') => {
    // Client-side guard against self-promotion
    if (targetUserId === user?.id) {
      showToast('You cannot alter your own membership role.', 'error');
      return;
    }

    try {
      const newRole = currentRole === 'admin' ? 'member' : 'admin';
      await updateMemberRole(group.id, targetUserId, newRole);
      showToast(`Role updated to ${newRole}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to update member role', 'error');
    }
  };

  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return;
    await removeMember(group.id, memberToRemove.userId);
    showToast(`Removed ${memberToRemove.fullName} from circle.`);
    setMemberToRemove(null);
  };

  // Sub-items creation
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    await addTask({
      title: taskTitle.trim(),
      groupId: group.id,
      groupName: group.name,
      status: 'todo',
      priority: taskPriority,
      dueDate: taskDueDate,
      assignedTo: {
        id: user?.id || 'usr-1',
        fullName: user?.fullName || 'Student',
        initials: user?.initials || 'ST',
        color: '#3D7A8A',
      },
    });

    setTaskTitle('');
    setIsAddTaskOpen(false);
    showToast('Task added to circle!');
  };

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceTitle.trim() || !resourceUrl.trim()) return;

    await addResource({
      title: resourceTitle.trim(),
      groupId: group.id,
      groupName: group.name,
      type: resourceType,
      fileType: resourceType === 'file' ? resourceFileType : undefined,
      urlOrPath: resourceUrl.trim(),
      fileSize: resourceType === 'file' ? '2.4 MB' : undefined,
    });

    setResourceTitle('');
    setResourceUrl('');
    setIsAddResourceOpen(false);
    showToast('Resource added to circle!');
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionTitle.trim()) return;

    await scheduleSession({
      title: sessionTitle.trim(),
      groupId: group.id,
      groupName: group.name,
      date: sessionDate,
      displayDate: new Date(sessionDate).toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }),
      startTime: sessionTime,
      endTime: '6:00 PM',
      durationMinutes: Number(sessionDuration),
      type: sessionType,
      locationOrLink: sessionLocation,
    });

    setSessionTitle('');
    setIsScheduleOpen(false);
    showToast('Session scheduled!');
  };

  return (
    <div className="space-y-5">
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

      {/* Back Button */}
      <button
        onClick={() => navigate('/circles')}
        className="p-1 -ml-1 text-navy/70 hover:text-navy flex items-center gap-1 text-xs font-semibold"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>All Circles</span>
      </button>

      {/* Circle Header Info */}
      <div className="bg-white rounded-card p-5 border border-ivory-border shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              style={{ backgroundColor: group.color }}
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 text-white shadow-sm"
            >
              {group.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-extrabold text-navy tracking-tight truncate">
                {group.name}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <Badge variant="teal" size="sm">{group.subject}</Badge>
                <span className="text-xs text-navy/50 font-medium">
                  {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
                </span>
                {isAdmin ? (
                  <Badge variant="amber" size="sm">Admin</Badge>
                ) : (
                  <Badge variant="gray" size="sm">Member</Badge>
                )}
                {group.isPrivate && (
                  <span className="text-[11px] text-navy/40 font-medium bg-ivory-subtle px-2 py-0.5 rounded-md">
                    🔒 Private Circle
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Circle Settings Button */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isAdmin && (
              <button
                onClick={() => {
                  setEditName(group.name);
                  setEditSubject(group.subject);
                  setEditDescription(group.description);
                  setIsEditCircleOpen(true);
                }}
                className="p-2 rounded-xl text-navy/60 hover:text-navy hover:bg-ivory-subtle transition-colors"
                title="Circle Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
            {isAdmin ? (
              <button
                onClick={() => setIsDeleteCircleOpen(true)}
                className="p-2 rounded-xl text-feedback-error/70 hover:text-feedback-error hover:bg-feedback-error-light transition-colors"
                title="Delete Circle"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setIsLeaveCircleOpen(true)}
                className="p-2 rounded-xl text-feedback-error/70 hover:text-feedback-error hover:bg-feedback-error-light transition-colors"
                title="Leave Circle"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4 Interactive Sub-Tabs */}
      <div className="flex border-b border-ivory-border pb-1 gap-1 overflow-x-auto no-scrollbar">
        {[
          { key: 'overview', label: 'Overview', icon: Users },
          { key: 'tasks', label: `Shared Tasks (${groupTasks.length})`, icon: CheckSquare },
          { key: 'sessions', label: `Sessions (${groupSessions.length})`, icon: Calendar },
          { key: 'resources', label: `Resources (${groupResources.length})`, icon: FileText },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`
                py-2.5 px-3.5 text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap min-h-[44px]
                ${
                  isActive
                    ? 'border-teal text-teal'
                    : 'border-transparent text-navy/50 hover:text-navy hover:border-ivory-border-strong'
                }
              `}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <p className="text-sm text-navy/70 leading-relaxed bg-white p-4 rounded-xl border border-ivory-border">
            {group.description || 'Welcome to this study circle! Coordinate problem sets, exam prep, and shared lecture materials.'}
          </p>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-ivory-subtle rounded-xl p-3 text-center">
              <div className="text-xl font-extrabold text-navy">{group.memberCount}</div>
              <div className="text-[11px] font-semibold text-navy/50 mt-0.5">Members</div>
            </div>
            <div className="bg-ivory-subtle rounded-xl p-3 text-center">
              <div className="text-xl font-extrabold text-amber">
                {groupTasks.filter((t) => t.status !== 'done').length}
              </div>
              <div className="text-[11px] font-semibold text-navy/50 mt-0.5">Open Tasks</div>
            </div>
            <div className="bg-ivory-subtle rounded-xl p-3 text-center">
              <div className="text-xl font-extrabold text-teal">{groupResources.length}</div>
              <div className="text-[11px] font-semibold text-navy/50 mt-0.5">Resources</div>
            </div>
          </div>

          {/* Secure Invitation & Links Card */}
          <div className="bg-white rounded-card p-4 border border-ivory-border space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-navy uppercase tracking-wider block">
                  Invitation Codes &amp; Access
                </span>
                <span className="text-[11px] text-navy/50">
                  {group.isPrivate ? 'Protected: Peers require an active invitation to join' : 'Public group: Open to peers'}
                </span>
              </div>
              {isAdmin && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsInvitationsOpen(true)}
                  leftIcon={<KeyRound className="w-3.5 h-3.5" />}
                  className="shrink-0 self-start sm:self-auto"
                >
                  Manage Tokens
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 bg-ivory-subtle rounded-xl px-3 sm:px-4 py-2.5 font-mono text-center font-bold text-base text-navy tracking-widest border border-ivory-border truncate">
                {group.inviteCode}
              </div>
              <Button
                variant={copied ? 'secondary' : 'primary'}
                onClick={() => copyCode(group.inviteCode)}
                leftIcon={copied ? <Check className="w-4 h-4 text-feedback-success" /> : <Copy className="w-4 h-4" />}
                className="shrink-0"
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 text-[11px] text-navy/50">
              <span>Standard 30-day token with usage controls</span>
              {isAdmin && (
                <button
                  onClick={handleRegenerateCode}
                  className="text-teal font-semibold hover:underline flex items-center gap-1 min-h-[28px]"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Regenerate Primary Code</span>
                </button>
              )}
            </div>
          </div>

          {/* Members List with Management */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-navy/60 uppercase tracking-wider">
                Circle Members ({group.members.length})
              </h4>
              {isAdmin && (
                <button
                  onClick={() => setIsInvitationsOpen(true)}
                  className="text-xs text-teal font-semibold hover:underline"
                >
                  + Create Invitation
                </button>
              )}
            </div>

            <div className="divide-y divide-ivory-border">
              {group.members.map((m) => {
                const isMe = m.userId === user?.id;
                return (
                  <div key={m.userId} className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar initials={m.initials} size="sm" bgColor={m.avatarColor} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-navy truncate">
                          {m.fullName} {isMe && <span className="text-xs text-navy/40 font-normal">(You)</span>}
                        </p>
                        <p className="text-xs text-navy/50 truncate">{m.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {m.role === 'admin' ? (
                        <Badge variant="amber" size="sm">Admin</Badge>
                      ) : (
                        <Badge variant="gray" size="sm">Member</Badge>
                      )}

                      {/* Self Role Lock Guard */}
                      {isMe && (
                        <span
                          className="p-1 text-navy/30"
                          title="Self-role modification is prevented by security policy"
                        >
                          <Shield className="w-3.5 h-3.5" />
                        </span>
                      )}

                      {/* Admin action buttons on other members */}
                      {isAdmin && !isMe && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleRoleToggle(m.userId, m.role)}
                            className="p-1.5 rounded-lg text-navy/50 hover:text-navy hover:bg-ivory-subtle transition-colors"
                            title={m.role === 'admin' ? 'Demote to Member' : 'Promote to Admin'}
                          >
                            {m.role === 'admin' ? (
                              <ShieldAlert className="w-3.5 h-3.5" />
                            ) : (
                              <Shield className="w-3.5 h-3.5 text-teal" />
                            )}
                          </button>
                          <button
                            onClick={() => setMemberToRemove({ userId: m.userId, fullName: m.fullName })}
                            className="p-1.5 rounded-lg text-feedback-error/60 hover:text-feedback-error hover:bg-feedback-error-light transition-colors"
                            title="Remove from Circle"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Shared Tasks */}
      {activeTab === 'tasks' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-navy/50 uppercase tracking-wider">
              {groupTasks.length} Circle Tasks
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddTaskOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Task
            </Button>
          </div>

          {groupTasks.length === 0 ? (
            <div className="py-8 text-center bg-white rounded-card p-6 border border-ivory-border">
              <CheckSquare className="w-8 h-8 text-navy/30 mx-auto mb-2" />
              <p className="text-sm font-semibold text-navy">No tasks yet</p>
              <p className="text-xs text-navy/50 mt-0.5">Add tasks to coordinate studying with your peers.</p>
              <Button
                variant="primary"
                size="sm"
                className="mt-3"
                onClick={() => setIsAddTaskOpen(true)}
              >
                Create Circle Task
              </Button>
            </div>
          ) : (
            groupTasks.map((t) => (
              <Card key={t.id} className="p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => updateTaskStatus(t.id, t.status === 'done' ? 'todo' : 'done')}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs transition-colors shrink-0 ${
                      t.status === 'done'
                        ? 'bg-feedback-success border-feedback-success text-white'
                        : 'border-ivory-border-strong hover:border-teal'
                    }`}
                  >
                    {t.status === 'done' && '✓'}
                  </button>
                  <div className="min-w-0">
                    <h5
                      className={`text-sm font-bold truncate ${
                        t.status === 'done' ? 'line-through text-navy/40' : 'text-navy'
                      }`}
                    >
                      {t.title}
                    </h5>
                    <p className="text-xs text-navy/50">
                      Due {t.dueDate} · {t.priority} priority {t.assignedTo && `· Assigned: ${t.assignedTo.fullName}`}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={t.status === 'done' ? 'success' : t.status === 'in_progress' ? 'teal' : 'gray'}
                  size="sm"
                >
                  {t.status.replace('_', ' ')}
                </Badge>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Sessions */}
      {activeTab === 'sessions' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-navy/50 uppercase tracking-wider">
              {groupSessions.length} Study Sessions
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsScheduleOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Schedule
            </Button>
          </div>

          {groupSessions.length === 0 ? (
            <div className="py-8 text-center bg-white rounded-card p-6 border border-ivory-border">
              <Calendar className="w-8 h-8 text-navy/30 mx-auto mb-2" />
              <p className="text-sm font-semibold text-navy">No sessions planned</p>
              <p className="text-xs text-navy/50 mt-0.5">Schedule a group study date or exam review sprint.</p>
              <Button
                variant="primary"
                size="sm"
                className="mt-3"
                onClick={() => setIsScheduleOpen(true)}
              >
                Schedule First Session
              </Button>
            </div>
          ) : (
            groupSessions.map((s) => (
              <Card key={s.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="text-base font-bold text-navy">{s.title}</h5>
                    <p className="text-xs text-teal font-semibold mt-0.5">
                      📅 {s.displayDate} · {s.startTime} ({s.durationMinutes} mins)
                    </p>
                    <p className="text-xs text-navy/60 mt-1">
                      {s.type === 'online' ? '🔗 Virtual: ' : '📍 Room: '}
                      {s.locationOrLink}
                    </p>
                  </div>
                  <Badge variant={s.type === 'online' ? 'teal' : 'gray'} size="sm">
                    {s.type === 'online' ? 'Online' : 'In-Person'}
                  </Badge>
                </div>

                <div className="pt-2 border-t border-ivory-border flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-navy/50">
                    <Users className="w-3.5 h-3.5" />
                    <span>{s.attendees.filter((a) => a.status === 'going').length} attending</span>
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => updateSessionRsvp(s.id, 'going')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        s.myRsvp === 'going'
                          ? 'bg-teal text-white'
                          : 'bg-ivory-subtle text-navy/60 hover:bg-ivory-border'
                      }`}
                    >
                      Going
                    </button>
                    <button
                      onClick={() => updateSessionRsvp(s.id, 'maybe')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        s.myRsvp === 'maybe'
                          ? 'bg-amber text-white'
                          : 'bg-ivory-subtle text-navy/60 hover:bg-ivory-border'
                      }`}
                    >
                      Maybe
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Tab 4: Resources */}
      {activeTab === 'resources' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-navy/50 uppercase tracking-wider">
              {groupResources.length} Shared Resources
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddResourceOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Resource
            </Button>
          </div>

          {groupResources.length === 0 ? (
            <div className="py-8 text-center bg-white rounded-card p-6 border border-ivory-border">
              <FileText className="w-8 h-8 text-navy/30 mx-auto mb-2" />
              <p className="text-sm font-semibold text-navy">No shared resources</p>
              <p className="text-xs text-navy/50 mt-0.5">Upload cheat sheets, notes, or helpful course links.</p>
              <Button
                variant="primary"
                size="sm"
                className="mt-3"
                onClick={() => setIsAddResourceOpen(true)}
              >
                Upload Resource
              </Button>
            </div>
          ) : (
            groupResources.map((r) => (
              <Card key={r.id} className="p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-ivory-subtle flex items-center justify-center shrink-0 text-base">
                    {r.type === 'file' ? '📄' : '🔗'}
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-sm font-bold text-navy truncate">{r.title}</h5>
                    <p className="text-xs text-navy/50 truncate">
                      {r.uploadedBy.fullName} · {r.fileSize || 'Link'} · {r.uploadedAt}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={r.urlOrPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 text-xs font-semibold text-teal hover:underline flex items-center gap-1"
                  >
                    <span>Open</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  {isAdmin && (
                    <button
                      onClick={() => deleteResource(r.id)}
                      className="p-1.5 text-feedback-error/60 hover:text-feedback-error rounded-lg hover:bg-feedback-error-light"
                      title="Delete resource"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Invitations Management Modal (Admin Only) */}
      <Modal
        isOpen={isInvitationsOpen}
        onClose={() => setIsInvitationsOpen(false)}
        title="Manage Circle Invitations & Access"
        description="Create cryptographically secure tokens with expiration dates and usage limits."
      >
        <div className="space-y-4">
          <form onSubmit={handleGenerateNewInvitation} className="p-3.5 bg-ivory-subtle rounded-xl border border-ivory-border space-y-3">
            <span className="text-xs font-bold text-navy uppercase tracking-wider block">
              Generate New Invitation
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-navy/80 mb-1">Expiration</label>
                <select
                  value={invExpiresInHours}
                  onChange={(e) => setInvExpiresInHours(Number(e.target.value))}
                  className="w-full bg-white border border-ivory-border rounded-input py-2 px-2.5 text-xs text-navy focus:outline-none focus:border-teal"
                >
                  <option value={24}>24 Hours (1 day)</option>
                  <option value={72}>3 Days</option>
                  <option value={168}>7 Days (1 week)</option>
                  <option value={720}>30 Days (1 month)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy/80 mb-1">Usage Limit</label>
                <select
                  value={invMaxUses}
                  onChange={(e) => setInvMaxUses(Number(e.target.value))}
                  className="w-full bg-white border border-ivory-border rounded-input py-2 px-2.5 text-xs text-navy focus:outline-none focus:border-teal"
                >
                  <option value={1}>1 Use (Single use)</option>
                  <option value={5}>5 Uses</option>
                  <option value={10}>10 Uses</option>
                  <option value={25}>25 Uses</option>
                  <option value={50}>50 Uses</option>
                  <option value={100}>100 Uses</option>
                </select>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              fullWidth
              disabled={isGeneratingInv}
              leftIcon={<KeyRound className="w-3.5 h-3.5" />}
            >
              {isGeneratingInv ? 'Generating...' : 'Generate Secure Token'}
            </Button>
          </form>

          {/* Active Invitations List */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-navy/60 uppercase tracking-wider block">
              Active Circle Invitations ({groupInvitations.filter((i) => !i.isRevoked).length})
            </span>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {groupInvitations.map((inv) => {
                const isExpired = new Date(inv.expiresAt).getTime() < Date.now();
                const isExhausted = inv.maxUses && inv.usesCount >= inv.maxUses;
                const isInvalid = inv.isRevoked || isExpired || isExhausted;

                return (
                  <div
                    key={inv.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                      isInvalid
                        ? 'bg-black/5 border-transparent opacity-60'
                        : 'bg-white border-ivory-border shadow-xs'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-navy tracking-wider">
                          {inv.token}
                        </span>
                        {inv.isRevoked ? (
                          <Badge variant="danger" size="sm">Revoked</Badge>
                        ) : isExpired ? (
                          <Badge variant="gray" size="sm">Expired</Badge>
                        ) : isExhausted ? (
                          <Badge variant="amber" size="sm">Exhausted</Badge>
                        ) : (
                          <Badge variant="teal" size="sm">Active</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-navy/50 mt-1">
                        Used: {inv.usesCount} / {inv.maxUses} · Expires {new Date(inv.expiresAt).toLocaleDateString()}
                      </p>
                    </div>

                    {!isInvalid && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => copyCode(inv.token)}
                          className="p-1.5 rounded-lg text-teal hover:bg-teal-light transition-colors"
                          title="Copy Code"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => copyLink(inv.token)}
                          className="p-1.5 rounded-lg text-navy/60 hover:bg-ivory-subtle transition-colors"
                          title="Copy Direct Link"
                        >
                          <LinkIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleRevokeInvitation(inv.id)}
                          className="p-1.5 rounded-lg text-feedback-error hover:bg-feedback-error-light transition-colors"
                          title="Revoke Token"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Circle Modal */}
      <Modal
        isOpen={isEditCircleOpen}
        onClose={() => setIsEditCircleOpen(false)}
        title="Circle Settings"
        description="Update study circle name, subject or overview."
      >
        <form onSubmit={handleUpdateCircle} className="space-y-4">
          <Input
            label="Circle Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
          />
          <Input
            label="Subject"
            value={editSubject}
            onChange={(e) => setEditSubject(e.target.value)}
            required
          />
          <div>
            <label className="block text-xs font-semibold text-navy/80 mb-1.5">Description</label>
            <textarea
              rows={3}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full bg-ivory-subtle border border-transparent rounded-input py-2.5 px-3.5 text-sm text-navy focus:outline-none focus:border-teal focus:bg-white resize-none"
            />
          </div>
          <div className="pt-2 flex gap-2">
            <Button type="button" variant="secondary" fullWidth onClick={() => setIsEditCircleOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" fullWidth>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Circle Confirmation Modal */}
      <Modal
        isOpen={isDeleteCircleOpen}
        onClose={() => setIsDeleteCircleOpen(false)}
        title="Delete Study Circle?"
        description="This will permanently delete this circle along with its tasks, sessions, and shared resources. This cannot be undone."
      >
        <div className="pt-2 flex gap-2">
          <Button variant="secondary" fullWidth onClick={() => setIsDeleteCircleOpen(false)}>
            Keep Circle
          </Button>
          <Button variant="danger" fullWidth onClick={handleDeleteCircle}>
            Yes, Delete Circle
          </Button>
        </div>
      </Modal>

      {/* Leave Circle Confirmation Modal */}
      <Modal
        isOpen={isLeaveCircleOpen}
        onClose={() => setIsLeaveCircleOpen(false)}
        title="Leave Study Circle?"
        description="You will lose access to this circle's shared tasks, calendar, and resources until you re-join with an authorized invitation."
      >
        <div className="pt-2 flex gap-2">
          <Button variant="secondary" fullWidth onClick={() => setIsLeaveCircleOpen(false)}>
            Stay in Circle
          </Button>
          <Button variant="danger" fullWidth onClick={handleLeaveCircle}>
            Yes, Leave Circle
          </Button>
        </div>
      </Modal>

      {/* Remove Member Confirmation Modal */}
      <Modal
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        title="Remove Member?"
        description={`Are you sure you want to remove ${memberToRemove?.fullName} from ${group.name}?`}
      >
        <div className="pt-2 flex gap-2">
          <Button variant="secondary" fullWidth onClick={() => setMemberToRemove(null)}>
            Cancel
          </Button>
          <Button variant="danger" fullWidth onClick={handleConfirmRemoveMember}>
            Remove Member
          </Button>
        </div>
      </Modal>

      {/* Add Task Modal */}
      <Modal
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
        title={`Add Task to ${group.name}`}
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <Input
            label="Title"
            placeholder="e.g. Chapter 6 Problem Set"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-navy/80 mb-1.5">Priority</label>
              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                className="w-full bg-ivory-subtle border border-transparent rounded-input py-2.5 px-3 text-sm text-navy focus:outline-none focus:border-teal focus:bg-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-navy/80 mb-1.5">Due Date</label>
              <input
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="w-full bg-ivory-subtle border border-transparent rounded-input py-2 px-3 text-sm text-navy focus:outline-none focus:border-teal focus:bg-white"
                required
              />
            </div>
          </div>
          <div className="pt-2 flex gap-2">
            <Button type="button" variant="secondary" fullWidth onClick={() => setIsAddTaskOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" fullWidth disabled={!taskTitle.trim()}>
              Save Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Resource Modal */}
      <Modal
        isOpen={isAddResourceOpen}
        onClose={() => setIsAddResourceOpen(false)}
        title="Add Learning Resource"
      >
        <form onSubmit={handleCreateResource} className="space-y-4">
          <Input
            label="Resource Title"
            placeholder="e.g. Calculus Formula Cheat Sheet"
            value={resourceTitle}
            onChange={(e) => setResourceTitle(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setResourceType('file')}
              className={`p-2.5 rounded-lg text-xs font-bold border transition-all ${
                resourceType === 'file' ? 'border-teal bg-teal-light text-teal' : 'border-ivory-border'
              }`}
            >
              📄 Document File
            </button>
            <button
              type="button"
              onClick={() => setResourceType('link')}
              className={`p-2.5 rounded-lg text-xs font-bold border transition-all ${
                resourceType === 'link' ? 'border-teal bg-teal-light text-teal' : 'border-ivory-border'
              }`}
            >
              🔗 Web Link / Drive
            </button>
          </div>

          {resourceType === 'file' && (
            <div>
              <label className="block text-xs font-semibold text-navy/80 mb-1.5">File Format</label>
              <select
                value={resourceFileType}
                onChange={(e) => setResourceFileType(e.target.value as any)}
                className="w-full bg-ivory-subtle border border-transparent rounded-input py-2 px-3 text-sm text-navy focus:outline-none focus:border-teal focus:bg-white"
              >
                <option value="pdf">PDF Document (.pdf)</option>
                <option value="docx">Word Document (.docx)</option>
                <option value="xlsx">Spreadsheet (.xlsx)</option>
                <option value="pptx">Slides Presentation (.pptx)</option>
              </select>
            </div>
          )}

          <Input
            label={resourceType === 'file' ? 'File URL / Path' : 'External Web URL'}
            placeholder={
              resourceType === 'file'
                ? 'https://storage.university.edu/math201/formulas.pdf'
                : 'https://docs.google.com/document/d/...'
            }
            value={resourceUrl}
            onChange={(e) => setResourceUrl(e.target.value)}
            required
          />

          <div className="pt-2 flex gap-2">
            <Button type="button" variant="secondary" fullWidth onClick={() => setIsAddResourceOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" fullWidth disabled={!resourceTitle.trim() || !resourceUrl.trim()}>
              Add Resource
            </Button>
          </div>
        </form>
      </Modal>

      {/* Schedule Session Modal */}
      <Modal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        title="Schedule Study Session"
      >
        <form onSubmit={handleCreateSession} className="space-y-4">
          <Input
            label="Session Topic / Title"
            placeholder="e.g. Midterm Prep & Practice Exam"
            value={sessionTitle}
            onChange={(e) => setSessionTitle(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-navy/80 mb-1.5">Date</label>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full bg-ivory-subtle border border-transparent rounded-input py-2 px-3 text-sm text-navy focus:outline-none focus:border-teal focus:bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-navy/80 mb-1.5">Start Time</label>
              <input
                type="text"
                placeholder="4:00 PM"
                value={sessionTime}
                onChange={(e) => setSessionTime(e.target.value)}
                className="w-full bg-ivory-subtle border border-transparent rounded-input py-2 px-3 text-sm text-navy focus:outline-none focus:border-teal focus:bg-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-navy/80 mb-1.5">Duration</label>
              <select
                value={sessionDuration}
                onChange={(e) => setSessionDuration(Number(e.target.value))}
                className="w-full bg-ivory-subtle border border-transparent rounded-input py-2 px-3 text-sm text-navy focus:outline-none focus:border-teal focus:bg-white"
              >
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
                <option value={180}>3 hours</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-navy/80 mb-1.5">Format</label>
              <select
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value as SessionType)}
                className="w-full bg-ivory-subtle border border-transparent rounded-input py-2 px-3 text-sm text-navy focus:outline-none focus:border-teal focus:bg-white"
              >
                <option value="in_person">In Person</option>
                <option value="online">Online Meeting</option>
              </select>
            </div>
          </div>

          <Input
            label={sessionType === 'online' ? 'Meeting URL (Google Meet / Zoom)' : 'Room / Location'}
            placeholder={
              sessionType === 'online'
                ? 'https://meet.google.com/abc-defg-hij'
                : 'Library Study Room 204'
            }
            value={sessionLocation}
            onChange={(e) => setSessionLocation(e.target.value)}
            required
          />

          <div className="pt-2 flex gap-2">
            <Button type="button" variant="secondary" fullWidth onClick={() => setIsScheduleOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" fullWidth disabled={!sessionTitle.trim()}>
              Schedule Session
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
