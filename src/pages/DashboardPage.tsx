import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Calendar, Plus, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { groups, tasks, sessions, updateTaskStatus, updateSessionRsvp, joinGroupByCode } = useAppData();

  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joinMsg, setJoinMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Stats
  const activeCirclesCount = groups.length;
  const pendingTasksCount = tasks.filter((t) => t.status !== 'done').length;
  const upcomingSessionsCount = sessions.length;

  // Up next session (first upcoming)
  const upNextSession = sessions[0];

  // Top 3 tasks for preview
  const topTasks = tasks.slice(0, 3);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode) return;
    const res = await joinGroupByCode(inviteCode);
    setJoinMsg({ success: res.success, text: res.message });
    if (res.success && res.group) {
      setTimeout(() => {
        setIsJoinOpen(false);
        setJoinMsg(null);
        setInviteCode('');
        navigate(`/circles/${res.group?.id}`);
      }, 1000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Greeting & Date */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-navy/50">
            {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
          <h2 className="text-xl sm:text-2xl font-extrabold text-navy tracking-tight mt-0.5 truncate">
            Good morning, {user?.fullName.split(' ')[0] || 'Student'} 👋
          </h2>
        </div>
        <div onClick={() => navigate('/profile')} className="cursor-pointer shrink-0">
          <Avatar initials={user?.initials || 'ST'} size="md" bgColor="#E8A83E" />
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3.5 text-center">
          <div className="text-2xl font-extrabold text-navy">{activeCirclesCount}</div>
          <div className="text-[11px] font-semibold text-navy/50 mt-0.5">Circles</div>
        </Card>
        <Card className="p-3.5 text-center">
          <div className="text-2xl font-extrabold text-amber">{pendingTasksCount}</div>
          <div className="text-[11px] font-semibold text-navy/50 mt-0.5">Pending Tasks</div>
        </Card>
        <Card className="p-3.5 text-center">
          <div className="text-2xl font-extrabold text-teal">{upcomingSessionsCount}</div>
          <div className="text-[11px] font-semibold text-navy/50 mt-0.5">Sessions</div>
        </Card>
      </div>

      {/* Quick Action Pills */}
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1">
        <button
          onClick={() => navigate('/circles')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-navy text-white text-xs font-semibold hover:bg-navy/90 shrink-0 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Circle</span>
        </button>
        <button
          onClick={() => setIsJoinOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-ivory-border-strong text-navy text-xs font-semibold hover:bg-ivory-subtle shrink-0 transition-colors"
        >
          <KeyRound className="w-3.5 h-3.5 text-amber" />
          <span>Join with Code</span>
        </button>
        <button
          onClick={() => navigate('/sessions')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-ivory-border-strong text-navy text-xs font-semibold hover:bg-ivory-subtle shrink-0 transition-colors"
        >
          <Calendar className="w-3.5 h-3.5 text-teal" />
          <span>Schedule</span>
        </button>
      </div>

      {/* Up Next Card */}
      {upNextSession && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-navy uppercase tracking-wider">Up Next</h3>
            <button
              onClick={() => navigate('/sessions')}
              className="text-xs font-semibold text-teal hover:underline"
            >
              See all
            </button>
          </div>

          <div className="relative overflow-hidden bg-navy rounded-2xl p-5 text-white shadow-elevated">
            {/* Background glowing geometry */}
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-teal/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 right-10 w-28 h-28 bg-amber/15 rounded-full blur-xl pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2.5 py-0.5 rounded-full bg-teal/30 text-teal-light text-[11px] font-bold">
                  📅 {upNextSession.displayDate}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber/20 text-amber text-[11px] font-bold">
                  {upNextSession.startTime}
                </span>
              </div>

              <h4 className="text-lg font-bold leading-snug mb-1 line-clamp-2">
                {upNextSession.title}
              </h4>
              <p className="text-xs text-white/60 mb-4 truncate">
                {upNextSession.groupName} · {upNextSession.locationOrLink}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <div className="flex items-center">
                  <div className="flex -space-x-2">
                    {upNextSession.attendees.slice(0, 3).map((a) => (
                      <Avatar
                        key={a.userId}
                        initials={a.initials}
                        size="xs"
                        bgColor={a.avatarColor}
                        border
                      />
                    ))}
                  </div>
                  {upNextSession.attendees.length > 3 && (
                    <span className="text-[11px] text-white/60 font-semibold ml-2.5">
                      +{upNextSession.attendees.length - 3} attending
                    </span>
                  )}
                </div>

                <button
                  onClick={() =>
                    updateSessionRsvp(
                      upNextSession.id,
                      upNextSession.myRsvp === 'going' ? 'maybe' : 'going'
                    )
                  }
                  className={`
                    px-3 py-1.5 rounded-xl text-xs font-bold transition-all btn-press
                    ${
                      upNextSession.myRsvp === 'going'
                        ? 'bg-teal text-white shadow-sm'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }
                  `}
                >
                  {upNextSession.myRsvp === 'going' ? '✓ Attending' : 'RSVP Going'}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Tasks Overview Widget */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-navy uppercase tracking-wider">My Tasks</h3>
          <button
            onClick={() => navigate('/tasks')}
            className="text-xs font-semibold text-teal hover:underline"
          >
            See all
          </button>
        </div>

        <Card className="divide-y divide-ivory-border overflow-hidden">
          {topTasks.map((task) => {
            const isDone = task.status === 'done';
            const todayStr = new Date().toISOString().split('T')[0];
            const isOverdue = !isDone && task.dueDate < todayStr;

            return (
              <div
                key={task.id}
                className="p-3.5 flex items-center gap-3 hover:bg-ivory-subtle/50 transition-colors"
              >
                <button
                  onClick={() => updateTaskStatus(task.id, isDone ? 'todo' : 'done')}
                  className={`
                    w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors
                    ${
                      isDone
                        ? 'bg-feedback-success border-feedback-success text-white'
                        : isOverdue
                        ? 'border-feedback-danger'
                        : 'border-ivory-border-strong hover:border-teal'
                    }
                  `}
                >
                  {isDone && <span className="text-xs font-bold">✓</span>}
                </button>

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold truncate ${
                      isDone ? 'line-through text-navy/40' : 'text-navy'
                    }`}
                  >
                    {task.title}
                  </p>
                  <p className="text-[11px] text-navy/50 truncate mt-0.5">
                    {isOverdue ? (
                      <span className="text-feedback-danger font-semibold">Overdue · </span>
                    ) : null}
                    {task.groupName} · Due {task.dueDate}
                  </p>
                </div>

                <Badge
                  variant={isDone ? 'success' : task.priority === 'high' ? 'danger' : 'teal'}
                  size="sm"
                >
                  {isDone ? 'Done' : task.priority}
                </Badge>
              </div>
            );
          })}
        </Card>
      </section>

      {/* Circles Preview */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-navy uppercase tracking-wider">My Circles</h3>
          <button
            onClick={() => navigate('/circles')}
            className="text-xs font-semibold text-teal hover:underline"
          >
            See all
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {groups.slice(0, 3).map((group) => (
            <Card
              key={group.id}
              interactive
              onClick={() => navigate(`/circles/${group.id}`)}
              className="p-3.5 flex items-center gap-3.5"
            >
              <div
                style={{ backgroundColor: group.color }}
                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 text-white shadow-sm"
              >
                {group.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-navy truncate">{group.name}</h4>
                  {group.myRole === 'admin' && (
                    <Badge variant="amber" size="sm">Admin</Badge>
                  )}
                </div>
                <p className="text-xs text-navy/50 truncate mt-0.5">
                  {group.memberCount} members · {group.openTasksCount} open tasks
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-navy/30 shrink-0" />
            </Card>
          ))}
        </div>
      </section>

      {/* Join via code modal */}
      <Modal
        isOpen={isJoinOpen}
        onClose={() => {
          setIsJoinOpen(false);
          setJoinMsg(null);
        }}
        title="Join a Study Circle"
        description="Enter the 8-character invite code shared by your peer."
      >
        <form onSubmit={handleJoin} className="space-y-4">
          {joinMsg && (
            <div
              className={`p-3 rounded-lg text-xs font-semibold ${
                joinMsg.success
                  ? 'bg-feedback-success-light text-feedback-success'
                  : 'bg-feedback-danger-light text-feedback-danger'
              }`}
            >
              {joinMsg.text}
            </div>
          )}

          <Input
            label="Invite Code"
            placeholder="e.g. MTH-4829 or PHY-1092"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            required
            className="font-mono uppercase text-center tracking-widest text-lg font-bold"
          />

          <div className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => setIsJoinOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" fullWidth>
              Join Circle
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
