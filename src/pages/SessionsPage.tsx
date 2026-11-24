import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  MapPin,
  Video,
  Users,
  Calendar as CalendarIcon,
  Download,
  Trash2,
  Check,
  AlertCircle,
  ExternalLink,
  Filter,
  Search
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { SkeletonSessionCard } from '../components/ui/Skeleton';
import { PaginationControls } from '../components/ui/PaginationControls';
import { RetryBanner } from '../components/ui/RetryBanner';
import { useDebounce } from '../hooks/useDebounce';
import { StudySession, SessionType, RSVPStatus } from '../types';

export const SessionsPage: React.FC = () => {
  const { sessions, groups, scheduleSession, updateSessionRsvp, deleteSession, isLoading, refreshAllData } = useAppData();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<StudySession | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedDay, selectedGroupFilter]);

  // Form state
  const [title, setTitle] = useState('');
  const [groupId, setGroupId] = useState(groups[0]?.id || '');
  const [date, setDate] = useState('2026-11-28');
  const [startTime, setStartTime] = useState('4:00 PM');
  const [duration, setDuration] = useState(120);
  const [sessionType, setSessionType] = useState<SessionType>('in_person');
  const [locationOrLink, setLocationOrLink] = useState('Library Room 204');

  // Helper date checker & dynamic week generator
  const todayStr = new Date().toISOString().split('T')[0];

  const weekDays = React.useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay();
    const diffToMonday = (currentDay === 0 ? -6 : 1) - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);

    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    return days.map((dayName, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      return {
        dayName,
        dayNum: d.getDate(),
        dateStr: d.toISOString().split('T')[0],
      };
    });
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const downloadIcs = (session: StudySession) => {
    try {
      const cleanDate = session.date.replace(/-/g, '');
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//StudyCircle//Student Collaboration//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `SUMMARY:${session.title} (${session.groupName})`,
        `DESCRIPTION:StudyCircle session for ${session.groupName}. Meet location: ${session.locationOrLink}`,
        `LOCATION:${session.locationOrLink}`,
        `DTSTART:${cleanDate}T160000Z`,
        `DTEND:${cleanDate}T180000Z`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${session.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Downloaded .ics event for calendar import!');
    } catch {
      showToast('Failed to export calendar event', 'error');
    }
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const group = groups.find((g) => g.id === groupId);
      await scheduleSession({
        title: title.trim(),
        groupId,
        groupName: group?.name || 'Study Circle',
        date,
        displayDate: new Date(date).toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }),
        startTime,
        endTime: '6:00 PM',
        durationMinutes: Number(duration),
        type: sessionType,
        locationOrLink,
      });

      setTitle('');
      setIsScheduleOpen(false);
      showToast('Study session scheduled successfully!');
    } catch (err: any) {
      showToast(err.message || 'Failed to schedule session', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!sessionToDelete) return;
    try {
      await deleteSession(sessionToDelete.id);
      showToast(`Cancelled "${sessionToDelete.title}".`);
      setSessionToDelete(null);
    } catch {
      showToast('Failed to delete session', 'error');
    }
  };

  // Filter sessions (with Debounced Search)
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase();
        const matchesTitle = s.title.toLowerCase().includes(q);
        const matchesGroup = s.groupName.toLowerCase().includes(q);
        const matchesLoc = s.locationOrLink.toLowerCase().includes(q);
        if (!matchesTitle && !matchesGroup && !matchesLoc) return false;
      }
      if (selectedGroupFilter !== 'all' && s.groupId !== selectedGroupFilter) return false;
      if (selectedDay !== null) {
        const matchDay = weekDays.find((w) => w.dayNum === selectedDay);
        if (matchDay && s.date !== matchDay.dateStr) return false;
      }
      return true;
    });
  }, [sessions, debouncedSearch, selectedGroupFilter, selectedDay, weekDays]);

  const totalPages = Math.ceil(filteredSessions.length / pageSize);
  const paginatedSessions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSessions.slice(start, start + pageSize);
  }, [filteredSessions, page, pageSize]);

  const todaySessions = paginatedSessions.filter((s) => s.date === todayStr);
  const upcomingSessions = paginatedSessions.filter((s) => s.date !== todayStr);

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

      {/* Header & Schedule Button */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-extrabold text-navy tracking-tight truncate">Study Sessions</h2>
          <p className="text-xs text-navy/50 mt-0.5 line-clamp-1 sm:line-clamp-none">Plan study meetups, virtual rooms & exam sprints</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsScheduleOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
          className="shrink-0"
        >
          Schedule
        </Button>
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
              setFetchError(err.message || 'Failed to refresh sessions');
            }
          }}
        />
      )}

      {/* Search Input */}
      <Input
        placeholder="Search sessions by topic or meeting place…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        leftIcon={<Search className="w-4 h-4" />}
      />

      {/* Filter Row: Circle Filter & Day Filter Reset */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setSelectedGroupFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors ${
              selectedGroupFilter === 'all'
                ? 'bg-navy text-white'
                : 'bg-white border border-ivory-border text-navy/70 hover:bg-ivory-subtle'
            }`}
          >
            All Circles
          </button>
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setSelectedGroupFilter(g.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors ${
                selectedGroupFilter === g.id
                  ? 'bg-navy text-white'
                  : 'bg-white border border-ivory-border text-navy/70 hover:bg-ivory-subtle'
              }`}
            >
              {g.icon} {g.name}
            </button>
          ))}
        </div>

        {selectedDay !== null && (
          <button
            onClick={() => setSelectedDay(null)}
            className="text-xs text-teal font-semibold hover:underline shrink-0"
          >
            Show All Days
          </button>
        )}
      </div>

      {/* Week Selector Strip */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
        {weekDays.map((d) => {
          const isSelected = selectedDay === d.dayNum;
          const hasSession = sessions.some((s) => s.date === d.dateStr);

          return (
            <button
              key={d.dayNum}
              onClick={() => setSelectedDay(isSelected ? null : d.dayNum)}
              className={`
                flex flex-col items-center justify-center min-w-[48px] py-2 px-1.5 rounded-xl transition-all btn-press
                ${
                  isSelected
                    ? 'bg-navy text-white shadow-sm'
                    : 'bg-white border border-ivory-border text-navy hover:bg-ivory-subtle'
                }
              `}
            >
              <span className={`text-[10px] font-bold ${isSelected ? 'text-white/60' : 'text-navy/50'}`}>
                {d.dayName}
              </span>
              <span className="text-base font-extrabold mt-0.5 leading-none">
                {d.dayNum}
              </span>
              <span
                className={`w-1.5 h-1.5 rounded-full mt-1.5 ${
                  hasSession ? (isSelected ? 'bg-amber' : 'bg-teal') : 'opacity-0'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Sessions Content */}
      {isLoading ? (
        <div className="space-y-3">
          <SkeletonSessionCard />
          <SkeletonSessionCard />
          <SkeletonSessionCard />
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-card border border-ivory-border p-6">
          <CalendarIcon className="w-10 h-10 text-navy/30 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-navy">No sessions scheduled</h4>
          <p className="text-xs text-navy/50 mt-1 max-w-xs mx-auto">
            {selectedDay !== null
              ? `There are no study sessions planned for Day ${selectedDay}.`
              : 'Plan a collaborative meetup with your classmates to review problem sets.'}
          </p>
          <div className="flex justify-center gap-2 mt-4">
            {selectedDay !== null && (
              <Button variant="secondary" size="sm" onClick={() => setSelectedDay(null)}>
                View All Days
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={() => setIsScheduleOpen(true)}>
              Schedule Session
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Today Section */}
          {todaySessions.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal animate-pulse-subtle" />
                <h3 className="text-xs font-bold text-navy uppercase tracking-wider">
                  Today · Mon 24 Nov ({todaySessions.length})
                </h3>
              </div>

              {todaySessions.map((session) => (
                <Card key={session.id} accentBorder="teal" className="p-4 sm:p-5">
                  <div className="flex items-start gap-4">
                    {/* Date Box */}
                    <div className="w-12 h-12 rounded-xl bg-navy flex flex-col items-center justify-center text-white shrink-0 shadow-sm">
                      <span className="text-[9px] font-bold text-white/50 tracking-wider">NOV</span>
                      <span className="text-lg font-black leading-none">24</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-base font-bold text-navy leading-snug">{session.title}</h4>
                          <p className="text-xs text-teal font-semibold mt-0.5">
                            {session.startTime} – {session.endTime} ({session.durationMinutes} mins)
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => downloadIcs(session)}
                            className="p-1.5 text-navy/40 hover:text-navy rounded-lg hover:bg-ivory-subtle"
                            title="Add to Calendar (.ics)"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setSessionToDelete(session)}
                            className="p-1.5 text-feedback-error/50 hover:text-feedback-error rounded-lg hover:bg-feedback-error-light"
                            title="Delete Session"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-navy/60 mt-1">
                        {session.type === 'online' ? (
                          <Video className="w-3.5 h-3.5 text-teal shrink-0" />
                        ) : (
                          <MapPin className="w-3.5 h-3.5 text-amber shrink-0" />
                        )}
                        {session.type === 'online' ? (
                          <a
                            href={session.locationOrLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-teal hover:underline truncate inline-flex items-center gap-1"
                          >
                            <span>Join Video Call</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="truncate">{session.locationOrLink}</span>
                        )}
                        <span>•</span>
                        <span className="font-medium text-navy/70 truncate">{session.groupName}</span>
                      </div>

                      {/* Attendees and RSVP Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-3 border-t border-ivory-border">
                        <div className="flex items-center">
                          <div className="flex -space-x-1.5">
                            {session.attendees.slice(0, 3).map((a) => (
                              <Avatar
                                key={a.userId}
                                initials={a.initials}
                                size="xs"
                                bgColor={a.avatarColor}
                                border
                              />
                            ))}
                          </div>
                          <span className="text-xs text-navy/60 font-medium ml-2">
                            {session.attendees.filter((a) => a.status === 'going').length} going
                          </span>
                        </div>

                        {/* RSVP buttons */}
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => updateSessionRsvp(session.id, 'going')}
                            className={`
                              px-3 py-1 rounded-lg text-xs font-bold transition-all btn-press
                              ${
                                session.myRsvp === 'going'
                                  ? 'bg-teal text-white shadow-sm'
                                  : 'bg-ivory-subtle text-navy/70 hover:bg-black/5'
                              }
                            `}
                          >
                            Going ✓
                          </button>
                          <button
                            onClick={() => updateSessionRsvp(session.id, 'maybe')}
                            className={`
                              px-3 py-1 rounded-lg text-xs font-bold transition-all btn-press
                              ${
                                session.myRsvp === 'maybe'
                                  ? 'bg-amber text-white shadow-sm'
                                  : 'bg-ivory-subtle text-navy/70 hover:bg-black/5'
                              }
                            `}
                          >
                            Maybe
                          </button>
                          <button
                            onClick={() => updateSessionRsvp(session.id, 'not_going')}
                            className={`
                              px-2 py-1 rounded-lg text-xs font-semibold transition-all btn-press
                              ${
                                session.myRsvp === 'not_going'
                                  ? 'bg-navy/20 text-navy'
                                  : 'bg-ivory-subtle text-navy/50 hover:bg-black/5'
                              }
                            `}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </section>
          )}

          {/* Upcoming Section */}
          {upcomingSessions.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-bold text-navy/50 uppercase tracking-wider">
                Upcoming Sessions ({upcomingSessions.length})
              </h3>

              {upcomingSessions.map((session) => (
                <Card key={session.id} className="p-4 sm:p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-ivory-subtle border border-ivory-border flex flex-col items-center justify-center text-navy shrink-0">
                      <span className="text-[9px] font-bold text-navy/40 tracking-wider">
                        {session.displayDate.split(',')[0]}
                      </span>
                      <span className="text-base font-extrabold leading-none mt-0.5">
                        {session.date.split('-')[2]}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm sm:text-base font-bold text-navy leading-snug truncate">
                          {session.title}
                        </h4>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => downloadIcs(session)}
                            className="p-1 text-navy/40 hover:text-navy rounded hover:bg-ivory-subtle"
                            title="Add to Calendar"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setSessionToDelete(session)}
                            className="p-1 text-feedback-error/50 hover:text-feedback-error rounded hover:bg-feedback-error-light"
                            title="Delete Session"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-navy/50 mt-0.5">
                        {session.displayDate} · {session.startTime} · {session.groupName}
                      </p>
                      <p className="text-xs text-teal font-medium mt-1 truncate">
                        {session.type === 'online' ? '🔗 Virtual Meet link' : `📍 ${session.locationOrLink}`}
                      </p>

                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-ivory-border">
                        <span className="text-xs text-navy/50 font-medium">
                          {session.attendees.filter((a) => a.status === 'going').length} going
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => updateSessionRsvp(session.id, 'going')}
                            className={`
                              px-2.5 py-1 rounded-lg text-xs font-semibold transition-all
                              ${session.myRsvp === 'going' ? 'bg-teal text-white' : 'bg-ivory-subtle text-navy/60 hover:bg-black/5'}
                            `}
                          >
                            Going
                          </button>
                          <button
                            onClick={() => updateSessionRsvp(session.id, 'maybe')}
                            className={`
                              px-2.5 py-1 rounded-lg text-xs font-semibold transition-all
                              ${session.myRsvp === 'maybe' ? 'bg-amber text-white' : 'bg-ivory-subtle text-navy/60 hover:bg-black/5'}
                            `}
                          >
                            Maybe
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </section>
          )}

          <PaginationControls
            currentPage={page}
            totalPages={totalPages}
            totalCount={filteredSessions.length}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!sessionToDelete}
        onClose={() => setSessionToDelete(null)}
        title="Cancel Study Session?"
        description={`Are you sure you want to cancel "${sessionToDelete?.title}"? All RSVP responses will be removed.`}
      >
        <div className="pt-2 flex gap-2">
          <Button variant="secondary" fullWidth onClick={() => setSessionToDelete(null)}>
            Keep Session
          </Button>
          <Button variant="danger" fullWidth onClick={handleConfirmDelete}>
            Cancel Session
          </Button>
        </div>
      </Modal>

      {/* Schedule Modal */}
      <Modal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        title="Schedule a Study Session"
        description="Notify circle members and sync calendars."
      >
        <form onSubmit={handleSchedule} className="space-y-4">
          <Input
            label="Title"
            placeholder="e.g. Calculus Final Exam Prep Sprint"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-navy/80 mb-1.5">Study Circle</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full bg-ivory-subtle border border-transparent rounded-input py-2.5 px-3.5 text-sm text-navy focus:outline-none focus:border-teal focus:bg-white"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.icon} {g.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <Input
              label="Start Time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              placeholder="4:00 PM"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-navy/80 mb-1.5">Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full bg-ivory-subtle border border-transparent rounded-input py-2.5 px-3.5 text-sm text-navy focus:outline-none focus:border-teal focus:bg-white"
              >
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
                <option value={180}>3 hours</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-navy/80 mb-1.5">Session Format</label>
              <select
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value as SessionType)}
                className="w-full bg-ivory-subtle border border-transparent rounded-input py-2.5 px-3.5 text-sm text-navy focus:outline-none focus:border-teal focus:bg-white"
              >
                <option value="in_person">In Person</option>
                <option value="online">Online Video</option>
              </select>
            </div>
          </div>

          <Input
            label={sessionType === 'online' ? 'Meeting URL (Google Meet / Zoom)' : 'Location / Room'}
            placeholder={
              sessionType === 'online'
                ? 'https://meet.google.com/abc-defg-hij'
                : 'Library Study Room 204'
            }
            value={locationOrLink}
            onChange={(e) => setLocationOrLink(e.target.value)}
            required
          />

          <div className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              disabled={isSubmitting}
              onClick={() => setIsScheduleOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={isSubmitting || !title.trim()}
            >
              {isSubmitting ? 'Scheduling...' : 'Confirm Session'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
