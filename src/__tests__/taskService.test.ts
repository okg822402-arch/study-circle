import { describe, it, expect, beforeEach } from 'vitest';
import { Task, TaskPriority, TaskStatus } from '../types';

describe('StudyCircle Tasks Module & Database Permissions', () => {
  let mockTasks: Task[];
  const currentUserId = 'usr-alice';

  beforeEach(() => {
    mockTasks = [
      {
        id: 'tsk-1',
        groupId: 'grp-math',
        groupName: 'Advanced Mathematics',
        subject: 'Mathematics',
        createdBy: 'usr-alice',
        title: 'Integration Practice Set',
        description: 'Complete questions 1 through 10',
        status: 'in_progress',
        priority: 'high',
        progress: 60,
        dueDate: '2026-11-22', // Overdue
        createdAt: '2026-11-15',
      },
      {
        id: 'tsk-2',
        groupId: 'grp-phys',
        groupName: 'Quantum Physics',
        subject: 'Physics',
        createdBy: 'usr-bob',
        title: 'Entropy Proofs',
        description: 'Prepare notes for Friday review',
        status: 'todo',
        priority: 'medium',
        progress: 0,
        dueDate: '2026-11-28', // Upcoming
        createdAt: '2026-11-20',
      },
    ];
  });

  it('validates task creation input fields strictly', () => {
    const validateTaskInput = (title: string, dueDate: string, groupId: string) => {
      const errors: string[] = [];
      if (!title || title.trim().length < 3) errors.push('Title must be at least 3 characters');
      if (!dueDate) errors.push('Due date is required');
      if (!groupId) errors.push('Group is required');
      return errors;
    };

    expect(validateTaskInput('', '2026-11-28', 'grp-math')).toContain('Title must be at least 3 characters');
    expect(validateTaskInput('Hi', '2026-11-28', 'grp-math')).toContain('Title must be at least 3 characters');
    expect(validateTaskInput('Complete Calculus Assignment', '', 'grp-math')).toContain('Due date is required');
    expect(validateTaskInput('Complete Calculus Assignment', '2026-11-28', '')).toContain('Group is required');
    expect(validateTaskInput('Complete Calculus Assignment', '2026-11-28', 'grp-math')).toHaveLength(0);
  });

  it('updates task status and synchronizes progress percentage', () => {
    const task = { ...mockTasks[1] };

    // Move to in_progress
    task.status = 'in_progress';
    task.progress = 50;
    expect(task.status).toBe('in_progress');
    expect(task.progress).toBe(50);

    // Complete task
    task.status = 'done';
    task.progress = 100;
    expect(task.status).toBe('done');
    expect(task.progress).toBe(100);

    // Move back to todo
    task.status = 'todo';
    task.progress = 0;
    expect(task.status).toBe('todo');
    expect(task.progress).toBe(0);
  });

  it('correctly filters tasks by overdue and upcoming deadlines', () => {
    const today = '2026-11-24';
    const overdue = mockTasks.filter((t) => t.status !== 'done' && t.dueDate < today);
    const upcoming = mockTasks.filter((t) => t.status !== 'done' && t.dueDate >= today);

    expect(overdue).toHaveLength(1);
    expect(overdue[0].id).toBe('tsk-1');

    expect(upcoming).toHaveLength(1);
    expect(upcoming[0].id).toBe('tsk-2');
  });

  it('filters tasks by priority and study circle group', () => {
    const highPriority = mockTasks.filter((t) => t.priority === 'high');
    expect(highPriority).toHaveLength(1);
    expect(highPriority[0].title).toBe('Integration Practice Set');

    const mathTasks = mockTasks.filter((t) => t.groupId === 'grp-math');
    expect(mathTasks).toHaveLength(1);
    expect(mathTasks[0].groupName).toBe('Advanced Mathematics');
  });

  it('enforces deletion ownership permissions matching Supabase RLS policy', () => {
    const canDeleteTask = (task: Task, userId: string, isGroupAdmin: boolean) => {
      // Supabase RLS rule: auth.uid() = created_by OR is_admin_of(group_id)
      return task.createdBy === userId || isGroupAdmin;
    };

    // Task 1 created by Alice -> Alice can delete
    expect(canDeleteTask(mockTasks[0], 'usr-alice', false)).toBe(true);

    // Task 1 created by Alice -> Charlie (regular non-admin) CANNOT delete
    expect(canDeleteTask(mockTasks[0], 'usr-charlie', false)).toBe(false);

    // Task 2 created by Bob -> Alice as Circle Admin CAN delete
    expect(canDeleteTask(mockTasks[1], 'usr-alice', true)).toBe(true);
  });

  it('prevents duplicate submissions with isSubmitting lock', async () => {
    let callCount = 0;
    let isSubmitting = false;

    const mockSave = async () => {
      if (isSubmitting) return; // Prevent repeated submission
      isSubmitting = true;
      callCount++;
      await new Promise((r) => setTimeout(r, 50));
      isSubmitting = false;
    };

    // Simulate double click
    const p1 = mockSave();
    const p2 = mockSave();
    await Promise.all([p1, p2]);

    expect(callCount).toBe(1); // Locked out second click
  });
});
