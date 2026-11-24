import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Task, TaskStatus, TaskPriority, TaskFilterParams, PaginatedResponse } from '../types';
import { resilientQuery } from '../lib/resilientQuery';

export const taskService = {
  /**
   * Fetch paginated tasks with server-side filtering, sorting, column projection,
   * request timeouts, and controlled retries.
   * Default pageSize is 20 records per page.
   */
  async fetchPaginatedTasks(params: TaskFilterParams = {}): Promise<PaginatedResponse<Task>> {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    if (!isSupabaseConfigured) {
      return {
        data: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 0,
        hasMore: false,
      };
    }

    return resilientQuery.execute(
      async (signal) => {
        let query = (supabase as any)
          .from('tasks')
          .select(
            `
            id,
            group_id,
            created_by,
            title,
            description,
            status,
            priority,
            progress,
            due_date,
            created_at,
            study_groups ( id, name, subject ),
            profiles:assigned_to ( id, full_name )
          `,
            { count: 'exact' }
          );

        // Server-side filtering
        if (params.groupId && params.groupId !== 'all') {
          query = query.eq('group_id', params.groupId);
        }

        if (params.status && params.status !== 'all') {
          const todayStr = new Date().toISOString().split('T')[0];
          if (params.status === 'overdue') {
            query = query.neq('status', 'done').lt('due_date', todayStr);
          } else if (params.status === 'upcoming') {
            query = query.neq('status', 'done').gte('due_date', todayStr);
          } else {
            query = query.eq('status', params.status);
          }
        }

        if (params.priority && params.priority !== 'all') {
          query = query.eq('priority', params.priority);
        }

        if (params.search && params.search.trim()) {
          const term = `%${params.search.trim()}%`;
          query = query.ilike('title', term);
        }

        // Server-side sorting
        const sortColumn = params.sortBy === 'priority' ? 'priority' : 'due_date';
        const isAscending = params.sortOrder ? params.sortOrder === 'asc' : true;
        query = query.order(sortColumn, { ascending: isAscending });

        // Server-side range pagination (20 per page)
        query = query.range(from, to);

        if (signal) {
          query = query.abortSignal(signal);
        }

        const { data, count, error } = await query;
        if (error) {
          console.error('Error fetching paginated tasks:', error);
          throw error;
        }

        const totalCount = count || 0;
        const totalPages = Math.ceil(totalCount / pageSize);

        const mappedTasks: Task[] = (data || []).map((t: any) => ({
          id: t.id,
          groupId: t.group_id,
          groupName: t.study_groups?.name || 'Study Circle',
          subject: t.study_groups?.subject || undefined,
          createdBy: t.created_by,
          title: t.title,
          description: t.description || undefined,
          status: t.status as TaskStatus,
          priority: t.priority as TaskPriority,
          progress: t.progress ?? (t.status === 'done' ? 100 : t.status === 'in_progress' ? 50 : 0),
          dueDate: t.due_date,
          createdAt: t.created_at,
          assignedTo: t.profiles
            ? {
                id: t.profiles.id,
                fullName: t.profiles.full_name,
                initials: t.profiles.full_name
                  .split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase(),
                color: '#3D7A8A',
              }
            : undefined,
        }));

        return {
          data: mappedTasks,
          totalCount,
          page,
          pageSize,
          totalPages,
          hasMore: page < totalPages,
        };
      },
      {
        timeoutMs: 8000,
        maxRetries: 2,
        isPrivate: true, // Never cache private user tasks publicly
      }
    );
  },

  /**
   * Fetch tasks for backward compatibility with existing tests
   */
  async fetchTasks(groupIds?: string[]): Promise<Task[]> {
    if (!isSupabaseConfigured) return [];

    return resilientQuery.execute(
      async () => {
        let query = (supabase as any)
          .from('tasks')
          .select(`
            id,
            group_id,
            created_by,
            title,
            description,
            status,
            priority,
            progress,
            due_date,
            created_at,
            study_groups ( name, subject ),
            profiles:assigned_to ( id, full_name )
          `)
          .order('due_date', { ascending: true })
          .limit(100); // Guard rail against unbounded select

        if (groupIds && groupIds.length > 0) {
          query = query.in('group_id', groupIds);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (!data) return [];

        return data.map((t: any) => ({
          id: t.id,
          groupId: t.group_id,
          groupName: t.study_groups?.name || 'Study Circle',
          subject: t.study_groups?.subject || undefined,
          createdBy: t.created_by,
          title: t.title,
          description: t.description || undefined,
          status: t.status as TaskStatus,
          priority: t.priority as TaskPriority,
          progress: t.progress ?? (t.status === 'done' ? 100 : t.status === 'in_progress' ? 50 : 0),
          dueDate: t.due_date,
          createdAt: t.created_at,
          assignedTo: t.profiles
            ? {
                id: t.profiles.id,
                fullName: t.profiles.full_name,
                initials: t.profiles.full_name
                  .split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase(),
                color: '#3D7A8A',
              }
            : undefined,
        }));
      },
      { isPrivate: true }
    );
  },

  /**
   * Insert a new task into Supabase with duplicate submission protection
   */
  async createTask(data: {
    groupId: string;
    createdBy: string;
    assignedTo?: string;
    title: string;
    description?: string;
    priority: TaskPriority;
    dueDate: string;
  }): Promise<string> {
    const lockKey = `create_task_${data.createdBy}_${data.groupId}_${data.title.trim().toLowerCase()}`;
    if (!resilientQuery.acquireLock(lockKey)) {
      throw new Error('A submission is already in progress. Please wait.');
    }

    try {
      if (!isSupabaseConfigured) return `tsk-${Date.now()}`;

      const { data: created, error } = await (supabase as any)
        .from('tasks')
        .insert({
          group_id: data.groupId,
          created_by: data.createdBy,
          assigned_to: data.assignedTo || null,
          title: data.title.trim(),
          description: data.description ? data.description.trim() : null,
          priority: data.priority,
          due_date: data.dueDate,
          status: 'todo',
          progress: 0,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating task in Supabase:', error);
        throw error;
      }

      return created.id;
    } finally {
      resilientQuery.releaseLock(lockKey);
    }
  },

  /**
   * Update full task details
   */
  async updateTask(
    taskId: string,
    updates: {
      title?: string;
      description?: string;
      groupId?: string;
      priority?: TaskPriority;
      dueDate?: string;
      status?: TaskStatus;
      progress?: number;
      assignedTo?: string | null;
    }
  ): Promise<void> {
    if (!isSupabaseConfigured) return;

    const payload: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.title !== undefined) payload.title = updates.title.trim();
    if (updates.description !== undefined) payload.description = updates.description?.trim() || null;
    if (updates.groupId !== undefined) payload.group_id = updates.groupId;
    if (updates.priority !== undefined) payload.priority = updates.priority;
    if (updates.dueDate !== undefined) payload.due_date = updates.dueDate;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.progress !== undefined) payload.progress = updates.progress;
    if (updates.assignedTo !== undefined) payload.assigned_to = updates.assignedTo || null;

    const { error } = await (supabase as any)
      .from('tasks')
      .update(payload)
      .eq('id', taskId);

    if (error) {
      console.error('Error updating task in Supabase:', error);
      throw error;
    }
  },

  /**
   * Fast toggle for task status and progress
   */
  async updateStatus(taskId: string, status: TaskStatus, progress?: number): Promise<void> {
    if (!isSupabaseConfigured) return;

    const calculatedProgress =
      progress !== undefined ? progress : status === 'done' ? 100 : status === 'in_progress' ? 50 : 0;

    const { error } = await (supabase as any)
      .from('tasks')
      .update({
        status,
        progress: calculatedProgress,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);

    if (error) {
      console.error('Error updating task status in Supabase:', error);
      throw error;
    }
  },

  /**
   * Delete a task from Supabase.
   */
  async deleteTask(taskId: string): Promise<void> {
    if (!isSupabaseConfigured) return;

    const { error } = await (supabase as any).from('tasks').delete().eq('id', taskId);
    if (error) {
      console.error('Error deleting task in Supabase:', error);
      throw error;
    }
  }
};
