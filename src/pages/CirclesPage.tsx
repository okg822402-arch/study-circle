import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ChevronRight, KeyRound, Sparkles, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { SkeletonCircleCard } from '../components/ui/Skeleton';
import { PaginationControls } from '../components/ui/PaginationControls';
import { RetryBanner } from '../components/ui/RetryBanner';
import { useDebounce } from '../hooks/useDebounce';

const PRESET_ICONS = ['📐', '⚛️', '💻', '📖', '🧬', '🎨', '🧪', '🌍', '📊', '⚡', '📝', '🏛️'];
const PRESET_COLORS = ['#1B2B4B', '#2C4A6E', '#3D7A8A', '#4A3A6A', '#2E5A44', '#8B5A2B'];

export const CirclesPage: React.FC = () => {
  const navigate = useNavigate();
  const { groups, createGroup, joinGroupByCode, isLoading, refreshAllData } = useAppData();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Create form state
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('📐');
  const [selectedColor, setSelectedColor] = useState('#3D7A8A');
  const [isPrivate, setIsPrivate] = useState(true);

  // Join form state
  const [inviteCode, setInviteCode] = useState('');
  const [joinMsg, setJoinMsg] = useState<{ success: boolean; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredGroups = useMemo(() => {
    return groups.filter(
      (g) =>
        !debouncedSearch.trim() ||
        g.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        g.subject.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [groups, debouncedSearch]);

  const totalPages = Math.ceil(filteredGroups.length / pageSize);
  const paginatedGroups = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredGroups.slice(start, start + pageSize);
  }, [filteredGroups, page, pageSize]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !subject.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const newGroup = await createGroup({
        name: name.trim(),
        subject: subject.trim(),
        description: description.trim(),
        isPrivate,
        icon: selectedIcon,
        color: selectedColor,
      });

      setIsCreateOpen(false);
      setName('');
      setSubject('');
      setDescription('');
      showToast(`Created study circle "${newGroup.name}"!`);
      navigate(`/circles/${newGroup.id}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to create circle', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      // Clean token in case user pasted full URL
      let token = inviteCode.trim();
      if (token.includes('/join/')) {
        token = token.split('/join/')[1].split('?')[0].split('#')[0].trim();
      }

      const res = await joinGroupByCode(token);
      setJoinMsg({ success: res.success, text: res.message });

      if (res.success && res.group) {
        showToast(res.message);
        setTimeout(() => {
          setIsJoinOpen(false);
          setJoinMsg(null);
          setInviteCode('');
          navigate(`/circles/${res.group?.id}`);
        }, 800);
      }
    } catch (err: any) {
      setJoinMsg({ success: false, text: err.message || 'Could not join circle' });
    } finally {
      setIsSubmitting(false);
    }
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

      {/* Header and Action Buttons */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-extrabold text-navy tracking-tight truncate">Study Circles</h2>
          <p className="text-xs text-navy/50 mt-0.5 line-clamp-1 sm:line-clamp-none">Collaborative peer groups for classes & exam sprints</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsJoinOpen(true)}
            leftIcon={<KeyRound className="w-4 h-4" />}
          >
            Join
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Circle
          </Button>
        </div>
      </div>

      {/* Retry Banner on Failure */}
      {fetchError && (
        <RetryBanner
          message={fetchError}
          onRetry={async () => {
            setFetchError(null);
            try {
              await refreshAllData();
            } catch (err: any) {
              setFetchError(err.message || 'Failed to refresh circles');
            }
          }}
        />
      )}

      {/* Search Input */}
      <Input
        placeholder="Search circles by name or subject…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        leftIcon={<Search className="w-4 h-4" />}
      />

      {/* Circles List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-navy/40 uppercase tracking-wider">
            Active Circles ({filteredGroups.length})
          </span>
          <button
            onClick={() => setIsJoinOpen(true)}
            className="text-xs font-semibold text-teal hover:underline flex items-center gap-1"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Join with code</span>
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <SkeletonCircleCard />
            <SkeletonCircleCard />
            <SkeletonCircleCard />
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-card border border-ivory-border p-6">
            <div className="w-12 h-12 rounded-2xl bg-teal-light flex items-center justify-center mx-auto text-teal mb-3">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-navy">No study circles found</h4>
            <p className="text-xs text-navy/50 mt-1 max-w-xs mx-auto">
              {search
                ? `No circles matched "${search}". Try clearing your search.`
                : 'Create your first study circle or join one with an invite code from a classmate.'}
            </p>
            <div className="flex justify-center gap-2 mt-4">
              {search && (
                <Button variant="secondary" size="sm" onClick={() => setSearch('')}>
                  Clear Search
                </Button>
              )}
              <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
                Create Circle
              </Button>
            </div>
          </div>
        ) : (
          <>
            {paginatedGroups.map((group) => (
              <Card
                key={group.id}
                interactive
                onClick={() => navigate(`/circles/${group.id}`)}
                className="p-4 flex items-start gap-3.5 transition-all hover:border-teal/40"
              >
                <div
                  style={{ backgroundColor: group.color }}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 text-white shadow-sm"
                >
                  {group.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-navy truncate">{group.name}</h3>
                    {group.myRole === 'admin' ? (
                      <Badge variant="amber" size="sm">Admin</Badge>
                    ) : (
                      <Badge variant="teal" size="sm">Member</Badge>
                    )}
                  </div>
                  <p className="text-xs text-navy/50 line-clamp-1 mb-2">
                    {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'} · {group.subject}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-navy/60">
                    {group.nextSessionText ? (
                      <span className="text-teal font-medium">📅 {group.nextSessionText}</span>
                    ) : (
                      <span className="text-navy/40 font-mono text-[11px]">Code: {group.inviteCode}</span>
                    )}
                    <span>•</span>
                    <span className="text-amber-muted font-semibold">{group.openTasksCount} open tasks</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-navy/30 shrink-0 self-center" />
              </Card>
            ))}

            <PaginationControls
              currentPage={page}
              totalPages={totalPages}
              totalCount={filteredGroups.length}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </>
        )}

        {/* Join Dashed Card */}
        <div
          onClick={() => setIsJoinOpen(true)}
          className="border-2 border-dashed border-ivory-border-strong rounded-card p-4 flex items-center gap-3.5 hover:bg-white/80 cursor-pointer transition-colors"
        >
          <div className="w-12 h-12 rounded-2xl bg-ivory-subtle flex items-center justify-center text-navy/40 shrink-0">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-navy">Join via Invite Code</h4>
            <p className="text-xs text-navy/50 mt-0.5">Enter a code (e.g. MAT-4891) shared by your peer</p>
          </div>
        </div>
      </div>

      {/* Create Circle Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Study Circle"
        description="Set up a collaboration workspace for your course, project, or exam."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Circle Name"
            placeholder="e.g. Advanced Calculus & Differential Equations"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Subject / Field of Study"
            placeholder="e.g. Mathematics, Computer Science, Biology"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />

          {/* Icon Selector */}
          <div>
            <label className="block text-xs font-semibold text-navy/80 mb-1.5">Circle Icon</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedIcon(emoji)}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center border transition-all ${
                    selectedIcon === emoji
                      ? 'border-teal bg-teal-light scale-105 shadow-sm'
                      : 'border-ivory-border bg-white hover:bg-ivory-subtle'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selector */}
          <div>
            <label className="block text-xs font-semibold text-navy/80 mb-1.5">Theme Accent Color</label>
            <div className="flex gap-2.5">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-8 h-8 rounded-full transition-all border-2 ${
                    selectedColor === c ? 'border-navy scale-110 shadow-sm' : 'border-transparent'
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-navy/80 mb-1.5">Description (optional)</label>
            <textarea
              rows={3}
              placeholder="What will this circle focus on? e.g. Weekly problem sets, reviewing lecture slides..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-ivory-subtle border border-transparent rounded-input py-2.5 px-3.5 text-sm text-navy placeholder:text-navy/30 focus:outline-none focus:border-teal focus:bg-white resize-none"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-ivory-subtle rounded-xl">
            <div>
              <p className="text-xs font-bold text-navy">Private Circle</p>
              <p className="text-[11px] text-navy/50">Only peers with the invite code can access</p>
            </div>
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="w-4 h-4 accent-teal rounded cursor-pointer"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              disabled={isSubmitting}
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={isSubmitting || !name.trim() || !subject.trim()}
            >
              {isSubmitting ? 'Creating...' : 'Create Circle'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Join via Invite Code Modal */}
      <Modal
        isOpen={isJoinOpen}
        onClose={() => {
          setIsJoinOpen(false);
          setJoinMsg(null);
          setInviteCode('');
        }}
        title="Join a Study Circle"
        description="Enter the secure invitation code or paste the invitation link from your group admin."
      >
        <form onSubmit={handleJoin} className="space-y-4">
          <Input
            label="Invitation Code or Link"
            placeholder="e.g. CHE-8XK9-2MN4-7PQ3 or invitation URL"
            value={inviteCode}
            onChange={(e) => {
              setInviteCode(e.target.value);
              setJoinMsg(null);
            }}
            required
            className="text-center text-sm font-semibold"
          />

          {joinMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-medium ${
                joinMsg.success
                  ? 'bg-feedback-success-light text-feedback-success'
                  : 'bg-feedback-error-light text-feedback-error'
              }`}
            >
              {joinMsg.text}
            </div>
          )}

          <div className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              disabled={isSubmitting}
              onClick={() => {
                setIsJoinOpen(false);
                setJoinMsg(null);
                setInviteCode('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={isSubmitting || !inviteCode.trim()}
            >
              {isSubmitting ? 'Verifying...' : 'Join Circle'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
