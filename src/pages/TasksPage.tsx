import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  Clock,
  Trash2,
  Edit3,
  Calendar,
  RefreshCw,
  X,
  AlertTriangle,
  ArrowUpDown
} from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { SkeletonTaskCard } from '../components/ui/Skeleton';
import { PaginationControls } from '../components/ui/PaginationControls';
import { RetryBanner } from '../components/ui/RetryBanner';
import { useDebounce } from '../hooks/useDebounce';
import { Task, TaskPriority, TaskStatus } from '../types';

export const TasksPage: React.FC = () => {
  const { tasks, groups, addTask, updateTask, updateTaskStatus, deleteTask, refreshAllData, isLoading } = useAppData();
  const { user } = useAuth();

  // Search & Filters state
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'in_progress' | 'done' | 'overdue' | 'upcoming'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'due_asc' | 'due_desc' | 'priority'>('due_asc');

  // Pagination state (20 records per page)
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, priorityFilter, groupFilter, sortBy]);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formGroupId, setFormGroupId] = useState('');
  const [formPriority, setFormPriority] = useState<TaskPriority>('medium');
  const [formDueDate, setFormDueDate] = useState('');
  const [formStatus, setFormStatus] = useState<TaskStatus>('todo');
  const [formProgress, setFormProgress] = useState(0);

  // Submission & Toast states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{ title?: string; dueDate?: string; group?: string }>({});
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current));
    }, 4000);
  };

  // Helper date checker
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filtered and Sorted Tasks (Debounced Search)
  const processedTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        // Debounced search filter
        if (debouncedSearch.trim()) {
          const q = debouncedSearch.toLowerCase();
          const matchesTitle = task.title.toLowerCase().includes(q);
          const matchesDesc = (task.description || '').toLowerCase().includes(q);
          const matchesGroup = task.groupName.toLowerCase().includes(q);
          const matchesSubject = (task.subject || '').toLowerCase().includes(q);
          if (!matchesTitle && !matchesDesc && !matchesGroup && !matchesSubject) {
            return false;
          }
        }

        // Status filter
        const isOverdue = task.status !== 'done' && task.dueDate < todayStr;
        const isUpcoming = task.status !== 'done' && task.dueDate >= todayStr;

        if (statusFilter === 'overdue') return isOverdue;
        if (statusFilter === 'upcoming') return isUpcoming;
        if (statusFilter !== 'all') return task.status === statusFilter;

        // Priority filter
        if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
          return false;
        }

        // Group filter
        if (groupFilter !== 'all' && task.groupId !== groupFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'due_asc') return a.dueDate.localeCompare(b.dueDate);
        if (sortBy === 'due_desc') return b.dueDate.localeCompare(a.dueDate);
        if (sortBy === 'priority') {
          const priorityWeight = { high: 3, medium: 2, low: 1 };
          return priorityWeight[b.priority] - priorityWeight[a.priority];
        }
        return 0;
      });
  }, [tasks, debouncedSearch, statusFilter, priorityFilter, groupFilter, sortBy]);

  // Pagination Windowing
  const totalPages = Math.ceil(processedTasks.length / pageSize);
  const paginatedTasks = useMemo(() => {
    const start = (page - 1) * pageSize;
    return processedTasks.slice(start, start + pageSize);
  }, [processedTasks, page, pageSize]);

  // Derived sections
  const overdueTasks = paginatedTasks.filter((t) => t.status !== 'done' && t.dueDate < todayStr);
  const inProgressTasks = paginatedTasks.filter((t) => t.status === 'in_progress');
  const todoTasks = paginatedTasks.filter((t) => t.status === 'todo');
  const doneTasks = paginatedTasks.filter((t) => t.status === 'done');

  // Open Create Modal
  const openCreateModal = () => {
    setEditingTask(null);
    setFormTitle('');
    setFormDescription('');
    setFormGroupId(groups[0]?.id || '');
    setFormPriority('medium');
    setFormDueDate('2026-11-28');
    setFormStatus('todo');
    setFormProgress(0);
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormDescription(task.description || '');
    setFormGroupId(task.groupId);
    setFormPriority(task.priority);
    setFormDueDate(task.dueDate);
    setFormStatus(task.status);
    setFormProgress(task.progress || (task.status === 'done' ? 100 : task.status === 'in_progress' ? 50 : 0));
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Form validation
  const validateForm = () => {
    const errors: { title?: string; dueDate?: string; group?: string } = {};
    if (!formTitle.trim() || formTitle.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters long.';
    }
    if (!formDueDate) {
      errors.dueDate = 'Due date is required.';
    }
    if (!formGroupId) {
      errors.group = 'Please select a study circle.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Task (Create or Update)
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const selectedGroup = groups.find((g) => g.id === formGroupId);

      if (editingTask) {
        // Update existing task
        await updateTask(editingTask.id, {
          title: formTitle.trim(),
          description: formDescription.trim(),
          groupId: formGroupId,
          groupName: selectedGroup?.name || editingTask.groupName,
          subject: selectedGroup?.subject || editingTask.subject,
          priority: formPriority,
          dueDate: formDueDate,
          status: formStatus,
          progress: formStatus === 'done' ? 100 : formStatus === 'todo' ? 0 : formProgress,
        });
        showToast('success', 'Task updated successfully in Supabase.');
      } else {
        // Create new task
        await addTask({
          title: formTitle.trim(),
          description: formDescription.trim(),
          groupId: formGroupId,
          groupName: selectedGroup?.name || 'Study Circle',
          subject: selectedGroup?.subject,
          priority: formPriority,
          dueDate: formDueDate,
          status: formStatus,
          progress: formStatus === 'done' ? 100 : formProgress,
          assignedTo: {
            id: user?.id || 'usr-1',
            fullName: user?.fullName || 'Priya Sharma',
            initials: user?.initials || 'PS',
            color: '#3D7A8A',
          },
        });
        showToast('success', 'New task added to Supabase.');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showToast('error', err?.message || 'Database operation failed. Please check permissions.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Task
  const handleDeleteTask = async () => {
    if (!deletingTask || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await deleteTask(deletingTask.id);
      showToast('success', 'Task deleted from Supabase.');
      setDeletingTask(null);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to delete task. You must be creator or circle admin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Status
  const handleToggleStatus = async (task: Task) => {
    const nextStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done';
    try {
      await updateTaskStatus(task.id, nextStatus);
      showToast('success', nextStatus === 'done' ? 'Task marked as completed! ✓' : 'Task moved back to To Do.');
    } catch (err: any) {
      showToast('error', 'Could not update task status in Supabase.');
    }
  };

  const renderTaskCard = (task: Task) => {
    const isDone = task.status === 'done';
    const isOverdue = !isDone && task.dueDate < todayStr;

    return (
      <Card
        key={task.id}
        accentBorder={isOverdue ? 'danger' : task.status === 'in_progress' ? 'teal' : 'none'}
        className="p-4"
      >
        <div className="flex items-start gap-3.5">
          {/* Checkbox toggle */}
          <button
            onClick={() => handleToggleStatus(task)}
            className={`
              w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors
              ${
                isDone
                  ? 'bg-feedback-success border-feedback-success text-white'
                  : isOverdue
                  ? 'border-feedback-danger hover:bg-feedback-danger/10'
                  : 'border-ivory-border-strong hover:border-teal'
              }
            `}
            title={isDone ? 'Mark as to do' : 'Mark as complete'}
          >
            {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4
                className={`text-sm font-bold leading-snug break-words flex-1 min-w-0 ${
                  isDone ? 'line-through text-navy/40' : 'text-navy'
                }`}
              >
                {task.title}
              </h4>
              {/* Action buttons */}
              <div className="flex items-center gap-1 shrink-0 -mr-1">
                <button
                  onClick={() => openEditModal(task)}
                  className="p-1.5 text-navy/40 hover:text-teal rounded-lg transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                  title="Edit task"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeletingTask(task)}
                  className="p-1.5 text-navy/40 hover:text-feedback-danger rounded-lg transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"
                  title="Delete task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {task.description && (
              <p className="text-xs text-navy/60 line-clamp-2 mt-1 break-words">
                {task.description}
              </p>
            )}

            {/* Progress bar for in-progress tasks */}
            {task.status === 'in_progress' && (
              <div className="mt-2.5">
                <div className="flex items-center justify-between text-[11px] text-navy/50 mb-1">
                  <span>Progress</span>
                  <span className="font-bold text-teal">{task.progress || 50}%</span>
                </div>
                <div className="w-full bg-ivory-subtle h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-teal h-full rounded-full transition-all duration-300"
                    style={{ width: `${task.progress || 50}%` }}
                  />
                </div>
              </div>
            )}

            {/* Meta details footer */}
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-ivory-border text-xs text-navy/50">
              <Badge
                variant={
                  isDone
                    ? 'success'
                    : task.priority === 'high'
                    ? 'danger'
                    : task.priority === 'medium'
                    ? 'amber'
                    : 'gray'
                }
                size="sm"
              >
                {task.priority}
              </Badge>

              <span className="font-semibold text-navy/70 truncate max-w-[130px]" title={task.groupName}>
                {task.groupName}
              </span>

              <span>•</span>

              <span
                className={`flex items-center gap-1 font-medium shrink-0 ${
                  isOverdue ? 'text-feedback-danger font-bold' : ''
                }`}
              >
                <Clock className="w-3 h-3" />
                {isOverdue ? `Overdue (${task.dueDate})` : `Due ${task.dueDate}`}
              </span>

              {task.assignedTo && (
                <div className="ml-auto flex items-center gap-1.5 shrink-0">
                  <Avatar
                    initials={task.assignedTo.initials}
                    size="xs"
                    bgColor={task.assignedTo.color}
                  />
                  <span className="text-[11px] text-navy/60 truncate max-w-[90px]">
                    {task.assignedTo.fullName}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Banner */}
      {toast && (
        <div
          className={`
            fixed top-4 right-4 z-50 max-w-sm p-4 rounded-xl shadow-elevated flex items-start gap-3 border animate-in fade-in slide-in-from-top-2 duration-200
            ${
              toast.type === 'success'
                ? 'bg-feedback-success-light text-feedback-success border-feedback-success/30'
                : 'bg-feedback-danger-light text-feedback-danger border-feedback-danger/30'
            }
          `}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-xs font-semibold leading-relaxed">{toast.message}</div>
          <button onClick={() => setToast(null)} className="text-current opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header and Add Button */}
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-extrabold text-navy tracking-tight truncate">Tasks Module</h2>
          <p className="text-xs text-navy/50 mt-0.5 line-clamp-1 sm:line-clamp-none">Manage assignments, problem sets and team deadlines</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refreshAllData()}
            disabled={isLoading}
            className="text-navy/60 hover:text-navy min-w-[38px] p-2"
            title="Refresh from Supabase"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={openCreateModal}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Task
          </Button>
        </div>
      </div>

      {/* Metrics Counters Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Card className="p-3 text-center">
          <div className="text-xl font-extrabold text-navy">{tasks.length}</div>
          <div className="text-[11px] font-semibold text-navy/50 mt-0.5">Total Tasks</div>
        </Card>
        <Card className="p-3 text-center border-l-4 border-l-feedback-danger">
          <div className="text-xl font-extrabold text-feedback-danger">
            {tasks.filter((t) => t.status !== 'done' && t.dueDate < todayStr).length}
          </div>
          <div className="text-[11px] font-semibold text-navy/50 mt-0.5">Overdue</div>
        </Card>
        <Card className="p-3 text-center border-l-4 border-l-teal">
          <div className="text-xl font-extrabold text-teal">
            {tasks.filter((t) => t.status === 'in_progress').length}
          </div>
          <div className="text-[11px] font-semibold text-navy/50 mt-0.5">In Progress</div>
        </Card>
        <Card className="p-3 text-center border-l-4 border-l-feedback-success">
          <div className="text-xl font-extrabold text-feedback-success">
            {tasks.filter((t) => t.status === 'done').length}
          </div>
          <div className="text-[11px] font-semibold text-navy/50 mt-0.5">Completed</div>
        </Card>
      </div>

      {/* Search Input */}
      <Input
        placeholder="Search tasks by title, circle, subject or description…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        leftIcon={<Search className="w-4 h-4" />}
      />

      {/* Status Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { key: 'all', label: `All (${tasks.length})` },
          { key: 'overdue', label: `⚠️ Overdue (${tasks.filter((t) => t.status !== 'done' && t.dueDate < todayStr).length})` },
          { key: 'upcoming', label: '📅 Upcoming' },
          { key: 'in_progress', label: `⏳ In Progress (${tasks.filter((t) => t.status === 'in_progress').length})` },
          { key: 'todo', label: '📋 To Do' },
          { key: 'done', label: `✓ Completed (${tasks.filter((t) => t.status === 'done').length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key as any)}
            className={`
              px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors
              ${
                statusFilter === tab.key
                  ? tab.key === 'overdue'
                    ? 'bg-feedback-danger text-white'
                    : 'bg-navy text-white shadow-sm'
                  : 'bg-white border border-ivory-border text-navy/60 hover:bg-ivory-subtle'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Priority & Group Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-card border border-ivory-border">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-navy/40 shrink-0" />
          <span className="text-xs font-bold text-navy/60">Filter:</span>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="text-xs bg-ivory-subtle border border-transparent rounded-lg py-1 px-2.5 font-medium text-navy focus:outline-none focus:border-teal"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="text-xs bg-ivory-subtle border border-transparent rounded-lg py-1 px-2.5 font-medium text-navy focus:outline-none focus:border-teal max-w-[140px] truncate"
          >
            <option value="all">All Circles</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-navy/60">
          <ArrowUpDown className="w-3.5 h-3.5 text-navy/40 shrink-0" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs bg-ivory-subtle border border-transparent rounded-lg py-1 px-2.5 font-medium text-navy focus:outline-none focus:border-teal"
          >
            <option value="due_asc">Earliest Due Date</option>
            <option value="due_desc">Latest Due Date</option>
            <option value="priority">Highest Priority</option>
          </select>
        </div>
      </div>

      {/* Task List / Skeleton / Empty State */}
      {isLoading ? (
        <div className="space-y-3">
          <SkeletonTaskCard />
          <SkeletonTaskCard />
          <SkeletonTaskCard />
        </div>
      ) : processedTasks.length === 0 ? (
        <Card className="p-10 text-center space-y-3">
          <div className="w-14 h-14 bg-ivory-subtle rounded-2xl flex items-center justify-center mx-auto text-navy/40">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-navy">No tasks found</h3>
          <p className="text-xs text-navy/50 max-w-xs mx-auto">
            {search || statusFilter !== 'all' || priorityFilter !== 'all' || groupFilter !== 'all'
              ? 'No tasks match the selected search and filter criteria. Try resetting your filters.'
              : 'You have no tasks scheduled. Create a new task to organize your study schedule.'}
          </p>
          <div className="pt-2">
            {search || statusFilter !== 'all' || priorityFilter !== 'all' || groupFilter !== 'all' ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                  setPriorityFilter('all');
                  setGroupFilter('all');
                }}
              >
                Reset Filters
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={openCreateModal}>
                Create Your First Task
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Overdue Section */}
          {overdueTasks.length > 0 && statusFilter === 'all' && (
            <section className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-feedback-danger" />
                <h3 className="text-xs font-bold text-feedback-danger uppercase tracking-wider">
                  Overdue ({overdueTasks.length})
                </h3>
              </div>
              {overdueTasks.map((task) => renderTaskCard(task))}
            </section>
          )}

          {/* In Progress Section */}
          {inProgressTasks.length > 0 && statusFilter === 'all' && (
            <section className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal" />
                <h3 className="text-xs font-bold text-teal uppercase tracking-wider">
                  In Progress ({inProgressTasks.length})
                </h3>
              </div>
              {inProgressTasks.map((task) => renderTaskCard(task))}
            </section>
          )}

          {/* To Do Section */}
          {todoTasks.length > 0 && statusFilter === 'all' && (
            <section className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-navy/40" />
                <h3 className="text-xs font-bold text-navy/60 uppercase tracking-wider">
                  Upcoming &amp; To Do ({todoTasks.length})
                </h3>
              </div>
              {todoTasks.map((task) => renderTaskCard(task))}
            </section>
          )}

          {/* Done Section */}
          {doneTasks.length > 0 && statusFilter === 'all' && (
            <section className="space-y-2.5 opacity-75">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-feedback-success" />
                <h3 className="text-xs font-bold text-feedback-success uppercase tracking-wider">
                  Completed ({doneTasks.length})
                </h3>
              </div>
              {doneTasks.map((task) => renderTaskCard(task))}
            </section>
          )}

          {/* Filtered Flat List when a specific filter is chosen */}
          {statusFilter !== 'all' && (
            <div className="space-y-2.5">
              {paginatedTasks.map((task) => renderTaskCard(task))}
            </div>
          )}

          {/* Server-Side Pagination Controls */}
          <PaginationControls
            currentPage={page}
            totalPages={totalPages}
            totalCount={processedTasks.length}
            pageSize={pageSize}
            onPageChange={setPage}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Add / Edit Task Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title={editingTask ? 'Edit Task' : 'Create New Task'}
        description={editingTask ? 'Update task details and sync to Supabase.' : 'Add a milestone to your study circle.'}
      >
        <form onSubmit={handleSaveTask} className="space-y-4">
          <div>
            <Input
              label="Task Title *"
              placeholder="e.g. Linear Algebra Problem Set 4"
              value={formTitle}
              onChange={(e) => {
                setFormTitle(e.target.value);
                if (formErrors.title) setFormErrors({ ...formErrors, title: undefined });
              }}
              error={formErrors.title}
              disabled={isSubmitting}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-navy/80 mb-1.5">Description (optional)</label>
            <textarea
              rows={3}
              placeholder="Add key objectives, formulas to review, or chapter numbers..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-ivory-subtle border border-transparent rounded-input py-2.5 px-3.5 text-base sm:text-sm text-navy placeholder:text-navy/30 focus:outline-none focus:border-teal focus:bg-white resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-navy/80 mb-1.5">Study Circle / Subject *</label>
            <select
              value={formGroupId}
              onChange={(e) => setFormGroupId(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-ivory-subtle border border-transparent rounded-input py-2.5 px-3.5 text-base sm:text-sm text-navy focus:outline-none focus:border-teal focus:bg-white min-h-[44px]"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.icon} {g.name} ({g.subject})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-navy/80 mb-1.5">Priority</label>
              <select
                value={formPriority}
                onChange={(e) => setFormPriority(e.target.value as TaskPriority)}
                disabled={isSubmitting}
                className="w-full bg-ivory-subtle border border-transparent rounded-input py-2.5 px-3.5 text-base sm:text-sm text-navy focus:outline-none focus:border-teal focus:bg-white min-h-[44px]"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>

            <div>
              <Input
                label="Due Date *"
                type="date"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
                error={formErrors.dueDate}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          {editingTask && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-ivory-subtle rounded-xl">
              <div>
                <label className="block text-xs font-semibold text-navy/80 mb-1.5">Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as TaskStatus)}
                  disabled={isSubmitting}
                  className="w-full bg-white border border-ivory-border rounded-lg py-2 px-2.5 text-xs text-navy font-semibold focus:outline-none focus:border-teal"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy/80 mb-1.5">
                  Progress: {formStatus === 'done' ? 100 : formStatus === 'todo' ? 0 : formProgress}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={formStatus === 'done' ? 100 : formStatus === 'todo' ? 0 : formProgress}
                  onChange={(e) => setFormProgress(Number(e.target.value))}
                  disabled={formStatus !== 'in_progress' || isSubmitting}
                  className="w-full accent-teal cursor-pointer disabled:opacity-40"
                />
              </div>
            </div>
          )}

          <div className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={isSubmitting}
            >
              {editingTask ? 'Save Changes' : 'Create Task'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <Modal
        isOpen={Boolean(deletingTask)}
        onClose={() => !isSubmitting && setDeletingTask(null)}
        title="Delete Task"
        description="Are you sure you want to remove this task?"
      >
        <div className="space-y-4">
          <div className="p-3 bg-feedback-danger-light text-feedback-danger rounded-xl text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">This action will delete the task from Supabase.</p>
              <p className="mt-0.5 opacity-80">
                "{deletingTask?.title}" from {deletingTask?.groupName}.
              </p>
            </div>
          </div>

          <p className="text-xs text-navy/60 leading-relaxed">
            Note: Supabase Row Level Security strictly enforces that only the student who created this task or the study circle administrator has permission to delete it.
          </p>

          <div className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => setDeletingTask(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              fullWidth
              isLoading={isSubmitting}
              onClick={handleDeleteTask}
            >
              Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
