import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  StudyGroup,
  Task,
  StudySession,
  Resource,
  TaskStatus,
  RSVPStatus,
  FeedbackSubmission,
  GroupInvitation,
  InvitationCreateInput,
  JoinInvitationResult
} from '../types';
import {
  INITIAL_GROUPS,
  INITIAL_TASKS,
  INITIAL_SESSIONS,
  INITIAL_RESOURCES,
  CURRENT_USER
} from '../services/mockData';
import { isSupabaseConfigured } from '../lib/supabase';
import { groupService } from '../services/groupService';
import { taskService } from '../services/taskService';
import { sessionService } from '../services/sessionService';
import { resourceService } from '../services/resourceService';
import { feedbackService } from '../services/feedbackService';

interface AppDataContextType {
  groups: StudyGroup[];
  tasks: Task[];
  sessions: StudySession[];
  resources: Resource[];
  feedbacks: FeedbackSubmission[];
  isLoading: boolean;
  // Tasks
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  // Groups
  createGroup: (group: { name: string; subject: string; description: string; isPrivate: boolean; icon?: string; color?: string }) => Promise<StudyGroup>;
  joinGroupByCode: (code: string) => Promise<{ success: boolean; message: string; group?: StudyGroup }>;
  joinGroupViaInvitation: (token: string) => Promise<JoinInvitationResult>;
  getGroupById: (id: string) => StudyGroup | undefined;
  updateGroup: (groupId: string, updates: { name?: string; subject?: string; description?: string }) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  updateMemberRole: (groupId: string, targetUserId: string, role: 'admin' | 'member') => Promise<void>;
  removeMember: (groupId: string, targetUserId: string) => Promise<void>;
  regenerateInviteCode: (groupId: string) => Promise<string>;
  createInvitation: (input: InvitationCreateInput, subjectPrefix?: string) => Promise<GroupInvitation>;
  fetchInvitations: (groupId: string) => Promise<GroupInvitation[]>;
  revokeInvitation: (invitationId: string) => Promise<void>;
  // Sessions
  scheduleSession: (session: Omit<StudySession, 'id' | 'attendees' | 'myRsvp'>) => Promise<void>;
  joinSession: (sessionId: string) => Promise<void>;
  leaveSession: (sessionId: string) => Promise<void>;
  updateSessionRsvp: (sessionId: string, rsvp: RSVPStatus) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  // Resources
  addResource: (resource: Omit<Resource, 'id' | 'uploadedBy' | 'uploadedAt'>) => Promise<void>;
  deleteResource: (resourceId: string) => Promise<void>;
  // Feedback
  submitFeedback: (feedback: {
    screenName: string;
    category: string;
    comments: string;
    rating?: number | null;
  }) => Promise<void>;
  refreshAllData: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);

  const [groups, setGroups] = useState<StudyGroup[]>(() => {
    const saved = localStorage.getItem('studycircle_groups');
    return saved ? JSON.parse(saved) : INITIAL_GROUPS;
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('studycircle_tasks');
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });

  const [sessions, setSessions] = useState<StudySession[]>(() => {
    const saved = localStorage.getItem('studycircle_sessions');
    return saved ? JSON.parse(saved) : INITIAL_SESSIONS;
  });

  const [resources, setResources] = useState<Resource[]>(() => {
    const saved = localStorage.getItem('studycircle_resources');
    return saved ? JSON.parse(saved) : INITIAL_RESOURCES;
  });

  const [feedbacks, setFeedbacks] = useState<FeedbackSubmission[]>(() => {
    const saved = localStorage.getItem('studycircle_feedbacks');
    return saved ? JSON.parse(saved) : [];
  });

  const [invitations, setInvitations] = useState<GroupInvitation[]>(() => {
    const saved = localStorage.getItem('studycircle_invitations');
    if (saved) return JSON.parse(saved);
    // Seed initial active invitations for existing groups
    return INITIAL_GROUPS.map((g) => ({
      id: `inv-${g.id}`,
      groupId: g.id,
      token: g.inviteCode,
      createdBy: CURRENT_USER.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      maxUses: 25,
      usesCount: 2,
      isRevoked: false,
      createdAt: new Date().toISOString(),
    }));
  });

  const [failedAttempts, setFailedAttempts] = useState<{ timestamp: number }[]>(() => {
    const saved = localStorage.getItem('studycircle_failed_attempts');
    return saved ? JSON.parse(saved) : [];
  });

  // Sync to localStorage as persistent local cache
  useEffect(() => {
    localStorage.setItem('studycircle_groups', JSON.stringify(groups));
  }, [groups]);

  useEffect(() => {
    localStorage.setItem('studycircle_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('studycircle_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('studycircle_resources', JSON.stringify(resources));
  }, [resources]);

  useEffect(() => {
    localStorage.setItem('studycircle_feedbacks', JSON.stringify(feedbacks));
  }, [feedbacks]);

  useEffect(() => {
    localStorage.setItem('studycircle_invitations', JSON.stringify(invitations));
  }, [invitations]);

  useEffect(() => {
    localStorage.setItem('studycircle_failed_attempts', JSON.stringify(failedAttempts));
  }, [failedAttempts]);

  // Load from Supabase if credentials exist
  const refreshAllData = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      setIsLoading(true);
      const remoteGroups = await groupService.fetchUserGroups(CURRENT_USER.id);
      if (remoteGroups.length > 0) {
        setGroups(remoteGroups);
        const groupIds = remoteGroups.map((g) => g.id);
        const [remoteTasks, remoteSessions, remoteResources] = await Promise.all([
          taskService.fetchTasks(groupIds),
          sessionService.fetchSessions(CURRENT_USER.id, groupIds),
          resourceService.fetchResources(groupIds),
        ]);
        if (remoteTasks.length > 0) setTasks(remoteTasks);
        if (remoteSessions.length > 0) setSessions(remoteSessions);
        if (remoteResources.length > 0) setResources(remoteResources);
      }
    } catch (err) {
      console.warn('Could not load from Supabase, keeping cached state:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Task actions
  const addTask = async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    let newId = `tsk-${Date.now()}`;
    if (isSupabaseConfigured) {
      try {
        newId = await taskService.createTask({
          groupId: taskData.groupId,
          createdBy: CURRENT_USER.id,
          assignedTo: taskData.assignedTo?.id,
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority,
          dueDate: taskData.dueDate,
        });
      } catch (e) {
        console.error('Remote task insert error, fallback local:', e);
      }
    }

    const newTask: Task = {
      ...taskData,
      id: newId,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setTasks((prev) => [newTask, ...prev]);

    if (newTask.status !== 'done') {
      setGroups((prev) =>
        prev.map((g) => (g.id === newTask.groupId ? { ...g, openTasksCount: g.openTasksCount + 1 } : g))
      );
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    if (isSupabaseConfigured) {
      try {
        await taskService.updateTask(taskId, {
          title: updates.title,
          description: updates.description,
          groupId: updates.groupId,
          priority: updates.priority,
          dueDate: updates.dueDate,
          status: updates.status,
          progress: updates.progress,
          assignedTo: updates.assignedTo?.id,
        });
      } catch (e) {
        console.error('Remote task update error:', e);
        throw e;
      }
    }

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const group = updates.groupId ? groups.find((g) => g.id === updates.groupId) : undefined;
          return {
            ...t,
            ...updates,
            groupName: group ? group.name : updates.groupName || t.groupName,
            subject: group ? group.subject : updates.subject || t.subject,
          };
        }
        return t;
      })
    );
  };

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    if (isSupabaseConfigured) {
      try {
        await taskService.updateStatus(taskId, status);
      } catch (e) {
        console.error('Remote task update error:', e);
      }
    }

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const wasDone = t.status === 'done';
          const isNowDone = status === 'done';
          if (!wasDone && isNowDone) {
            setGroups((gPrev) =>
              gPrev.map((g) =>
                g.id === t.groupId ? { ...g, openTasksCount: Math.max(0, g.openTasksCount - 1) } : g
              )
            );
          } else if (wasDone && !isNowDone) {
            setGroups((gPrev) =>
              gPrev.map((g) =>
                g.id === t.groupId ? { ...g, openTasksCount: g.openTasksCount + 1 } : g
              )
            );
          }
          return {
            ...t,
            status,
            progress: status === 'done' ? 100 : status === 'in_progress' ? t.progress || 50 : 0
          };
        }
        return t;
      })
    );
  };

  const deleteTask = async (taskId: string) => {
    if (isSupabaseConfigured) {
      try {
        await taskService.deleteTask(taskId);
      } catch (e) {
        console.error('Remote task delete error:', e);
      }
    }
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  // Group actions
  const createGroup = async (data: {
    name: string;
    subject: string;
    description: string;
    isPrivate: boolean;
    icon?: string;
    color?: string;
  }): Promise<StudyGroup> => {
    let created = {
      id: `grp-${Date.now()}`,
      inviteCode: `${data.subject.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`
    };

    if (isSupabaseConfigured) {
      try {
        created = await groupService.createGroup({
          userId: CURRENT_USER.id,
          name: data.name,
          subject: data.subject,
          description: data.description,
          isPrivate: data.isPrivate,
        });
      } catch (e) {
        console.error('Remote group create error, fallback local:', e);
      }
    }

    const defaultIcons = ['📐', '⚛️', '💻', '📖', '🧬', '🎨', '🧪', '🌍'];
    const defaultColors = ['#1B2B4B', '#2C4A6E', '#3D7A8A', '#4A3A6A', '#2E5A44'];

    const newGroup: StudyGroup = {
      id: created.id,
      name: data.name,
      subject: data.subject,
      description: data.description,
      icon: data.icon || defaultIcons[Math.floor(Math.random() * defaultIcons.length)],
      color: data.color || defaultColors[Math.floor(Math.random() * defaultColors.length)],
      inviteCode: created.inviteCode,
      isPrivate: data.isPrivate,
      memberCount: 1,
      openTasksCount: 0,
      myRole: 'admin',
      members: [
        {
          userId: CURRENT_USER.id,
          fullName: CURRENT_USER.fullName,
          email: CURRENT_USER.email,
          initials: CURRENT_USER.initials,
          avatarColor: '#3D7A8A',
          role: 'admin',
          isCurrentUser: true
        }
      ]
    };

    setGroups((prev) => [newGroup, ...prev]);
    return newGroup;
  };

  const updateGroup = async (
    groupId: string,
    updates: { name?: string; subject?: string; description?: string }
  ) => {
    if (isSupabaseConfigured) {
      try {
        await groupService.updateGroup(groupId, updates);
      } catch (e) {
        console.error('Remote group update error:', e);
      }
    }

    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, ...updates } : g))
    );
  };

  const deleteGroup = async (groupId: string) => {
    if (isSupabaseConfigured) {
      try {
        await groupService.deleteGroup(groupId);
      } catch (e) {
        console.error('Remote group delete error:', e);
      }
    }

    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    // Also remove associated local tasks, sessions, and resources
    setTasks((prev) => prev.filter((t) => t.groupId !== groupId));
    setSessions((prev) => prev.filter((s) => s.groupId !== groupId));
    setResources((prev) => prev.filter((r) => r.groupId !== groupId));
  };

  const leaveGroup = async (groupId: string) => {
    if (isSupabaseConfigured) {
      try {
        await groupService.leaveGroup(groupId, CURRENT_USER.id);
      } catch (e) {
        console.error('Remote group leave error:', e);
      }
    }

    setGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  const updateMemberRole = async (
    groupId: string,
    targetUserId: string,
    role: 'admin' | 'member'
  ) => {
    // Client-side guard against self-promotion
    if (targetUserId === CURRENT_USER.id) {
      throw new Error('Security violation: Users are strictly forbidden from modifying their own role.');
    }

    if (isSupabaseConfigured) {
      try {
        await groupService.updateMemberRole(groupId, targetUserId, role, CURRENT_USER.id);
      } catch (e) {
        console.error('Remote member role update error:', e);
        throw e;
      }
    }

    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          members: g.members.map((m) =>
            m.userId === targetUserId ? { ...m, role } : m
          ),
          myRole: targetUserId === CURRENT_USER.id ? role : g.myRole
        };
      })
    );
  };

  const removeMember = async (groupId: string, targetUserId: string) => {
    if (isSupabaseConfigured) {
      try {
        await groupService.removeMember(groupId, targetUserId);
      } catch (e) {
        console.error('Remote member remove error:', e);
      }
    }

    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const newMembers = g.members.filter((m) => m.userId !== targetUserId);
        return {
          ...g,
          members: newMembers,
          memberCount: newMembers.length
        };
      })
    );
  };

  const regenerateInviteCode = async (groupId: string): Promise<string> => {
    const group = groups.find((g) => g.id === groupId);
    const subject = group?.subject || 'GRP';
    let newCode = `${subject.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    if (isSupabaseConfigured) {
      try {
        newCode = await groupService.regenerateInviteCode(groupId, subject);
      } catch (e) {
        console.error('Remote code regenerate error:', e);
      }
    }

    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, inviteCode: newCode } : g))
    );
    return newCode;
  };

  const createInvitation = async (
    input: InvitationCreateInput,
    subjectPrefix?: string
  ): Promise<GroupInvitation> => {
    const inv = await groupService.createInvitation(CURRENT_USER.id, input, subjectPrefix);
    setInvitations((prev) => [inv, ...prev]);
    return inv;
  };

  const fetchInvitations = async (groupId: string): Promise<GroupInvitation[]> => {
    if (isSupabaseConfigured) {
      try {
        return await groupService.fetchGroupInvitations(groupId);
      } catch (e) {
        console.error('Remote invitation fetch error:', e);
      }
    }
    return invitations.filter((i) => i.groupId === groupId && !i.isRevoked);
  };

  const revokeInvitation = async (invitationId: string) => {
    if (isSupabaseConfigured) {
      try {
        await groupService.revokeInvitation(invitationId);
      } catch (e) {
        console.error('Remote invitation revoke error:', e);
      }
    }
    setInvitations((prev) =>
      prev.map((i) => (i.id === invitationId ? { ...i, isRevoked: true } : i))
    );
  };

  const joinGroupViaInvitation = async (token: string): Promise<JoinInvitationResult> => {
    const cleanToken = token.trim();
    if (!cleanToken) {
      return { success: false, message: 'Please enter a valid invitation token.' };
    }

    // 1. Rate Limiting Check: Max 5 failed attempts in 15 minutes window
    const now = Date.now();
    const fifteenMinsAgo = now - 15 * 60 * 1000;
    const recentFailures = failedAttempts.filter((a) => a.timestamp > fifteenMinsAgo);

    if (recentFailures.length >= 5) {
      return {
        success: false,
        message: 'Rate limit exceeded: Too many invalid invitation attempts. Please wait 15 minutes before trying again.',
        errorCode: 'RATE_LIMIT_EXCEEDED'
      };
    }

    // 2. If Supabase is connected, call server-side RPC join_group_via_invitation()
    if (isSupabaseConfigured) {
      const res = await groupService.joinGroupViaInvitation(cleanToken);
      if (res.success && res.group) {
        setGroups((prev) => [res.group!, ...prev.filter((g) => g.id !== res.group!.id)]);
        setFailedAttempts([]);
      } else {
        setFailedAttempts((prev) => [{ timestamp: Date.now() }, ...prev]);
      }
      return res;
    }

    // 3. Offline / Simulation Fallback
    const inv = invitations.find((i) => i.token.toUpperCase() === cleanToken.toUpperCase());
    const group = groups.find(
      (g) =>
        (inv && g.id === inv.groupId) ||
        g.inviteCode.toUpperCase() === cleanToken.toUpperCase()
    );

    if (!group) {
      setFailedAttempts((prev) => [{ timestamp: Date.now() }, ...prev]);
      return { success: false, message: 'Invalid or nonexistent invitation token.' };
    }

    // Check revocation
    if (inv && inv.isRevoked) {
      setFailedAttempts((prev) => [{ timestamp: Date.now() }, ...prev]);
      return { success: false, message: 'This invitation link has been revoked by an administrator.' };
    }

    // Check expiration
    if (inv && new Date(inv.expiresAt).getTime() < Date.now()) {
      setFailedAttempts((prev) => [{ timestamp: Date.now() }, ...prev]);
      return { success: false, message: 'This invitation token has expired.' };
    }

    // Check usage limit
    if (inv && inv.maxUses && inv.usesCount >= inv.maxUses) {
      setFailedAttempts((prev) => [{ timestamp: Date.now() }, ...prev]);
      return { success: false, message: 'This invitation has reached its maximum allowed uses.' };
    }

    // Check if already a member
    const alreadyMember = group.members.some((m) => m.userId === CURRENT_USER.id);
    if (alreadyMember) {
      return {
        success: true,
        message: 'You are already a member of this circle.',
        group
      };
    }

    // Increment usage count if invitation exists
    if (inv) {
      setInvitations((prev) =>
        prev.map((i) => (i.id === inv.id ? { ...i, usesCount: i.usesCount + 1 } : i))
      );
    }

    // Add user as member to group
    const updatedGroup: StudyGroup = {
      ...group,
      memberCount: group.memberCount + 1,
      members: [
        ...group.members,
        {
          userId: CURRENT_USER.id,
          fullName: CURRENT_USER.fullName,
          email: CURRENT_USER.email,
          initials: CURRENT_USER.initials,
          avatarColor: '#3D7A8A',
          role: 'member',
          isCurrentUser: true,
        }
      ]
    };

    setGroups((prev) => [updatedGroup, ...prev.filter((g) => g.id !== updatedGroup.id)]);
    return {
      success: true,
      message: `Successfully joined ${group.name}!`,
      group: updatedGroup
    };
  };

  const joinGroupByCode = async (code: string): Promise<{ success: boolean; message: string; group?: StudyGroup }> => {
    return joinGroupViaInvitation(code);
  };

  const getGroupById = (id: string) => groups.find((g) => g.id === id);

  // Session actions
  const scheduleSession = async (sessionData: Omit<StudySession, 'id' | 'attendees' | 'myRsvp'>) => {
    let newId = `ses-${Date.now()}`;
    if (isSupabaseConfigured) {
      try {
        newId = await sessionService.createSession({
          groupId: sessionData.groupId,
          createdBy: CURRENT_USER.id,
          title: sessionData.title,
          description: sessionData.description,
          date: sessionData.date,
          startTime: sessionData.startTime,
          endTime: sessionData.endTime,
          durationMinutes: sessionData.durationMinutes,
          type: sessionData.type,
          locationOrLink: sessionData.locationOrLink,
        });
      } catch (e) {
        console.error('Remote session schedule error:', e);
      }
    }

    const newSession: StudySession = {
      ...sessionData,
      id: newId,
      createdBy: CURRENT_USER.id,
      creator: {
        id: CURRENT_USER.id,
        fullName: CURRENT_USER.fullName,
        initials: CURRENT_USER.initials,
        avatarColor: '#1B2B4B',
      },
      myRsvp: 'going',
      isParticipant: true,
      attendees: [
        {
          userId: CURRENT_USER.id,
          fullName: CURRENT_USER.fullName,
          initials: CURRENT_USER.initials,
          avatarColor: '#3D7A8A',
          status: 'going'
        }
      ]
    };
    setSessions((prev) => [newSession, ...prev]);
  };

  const joinSession = async (sessionId: string) => {
    if (isSupabaseConfigured) {
      try {
        await sessionService.joinSession(sessionId, CURRENT_USER.id);
      } catch (e) {
        console.error('Remote session join error:', e);
        throw e;
      }
    }

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s;
        const attendeeIndex = s.attendees.findIndex((a) => a.userId === CURRENT_USER.id);
        let updatedAttendees = [...s.attendees];
        if (attendeeIndex >= 0) {
          updatedAttendees[attendeeIndex] = { ...updatedAttendees[attendeeIndex], status: 'going' };
        } else {
          updatedAttendees.push({
            userId: CURRENT_USER.id,
            fullName: CURRENT_USER.fullName,
            initials: CURRENT_USER.initials,
            avatarColor: '#3D7A8A',
            status: 'going',
          });
        }
        return {
          ...s,
          myRsvp: 'going',
          isParticipant: true,
          attendees: updatedAttendees,
        };
      })
    );
  };

  const leaveSession = async (sessionId: string) => {
    if (isSupabaseConfigured) {
      try {
        await sessionService.leaveSession(sessionId, CURRENT_USER.id);
      } catch (e) {
        console.error('Remote session leave error:', e);
        throw e;
      }
    }

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== sessionId) return s;
        const updatedAttendees = s.attendees.filter((a) => a.userId !== CURRENT_USER.id);
        return {
          ...s,
          myRsvp: 'not_going',
          isParticipant: false,
          attendees: updatedAttendees,
        };
      })
    );
  };

  const updateSessionRsvp = async (sessionId: string, rsvp: RSVPStatus) => {
    if (isSupabaseConfigured) {
      try {
        await sessionService.updateRsvp(sessionId, CURRENT_USER.id, rsvp);
      } catch (e) {
        console.error('Remote RSVP error:', e);
      }
    }

    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === sessionId) {
          const attendeeIndex = s.attendees.findIndex((a) => a.userId === CURRENT_USER.id);
          let updatedAttendees = [...s.attendees];
          if (attendeeIndex >= 0) {
            updatedAttendees[attendeeIndex] = { ...updatedAttendees[attendeeIndex], status: rsvp };
          } else {
            updatedAttendees.push({
              userId: CURRENT_USER.id,
              fullName: CURRENT_USER.fullName,
              initials: CURRENT_USER.initials,
              avatarColor: '#3D7A8A',
              status: rsvp
            });
          }
          return {
            ...s,
            myRsvp: rsvp,
            isParticipant: rsvp === 'going',
            attendees: updatedAttendees
          };
        }
        return s;
      })
    );
  };

  const deleteSession = async (sessionId: string) => {
    if (isSupabaseConfigured) {
      try {
        await sessionService.deleteSession(sessionId);
      } catch (e) {
        console.error('Remote session delete error:', e);
      }
    }
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

  // Resource actions
  const addResource = async (resourceData: Omit<Resource, 'id' | 'uploadedBy' | 'uploadedAt'>) => {
    let newId = `res-${Date.now()}`;
    if (isSupabaseConfigured) {
      try {
        newId = await resourceService.createResource({
          groupId: resourceData.groupId,
          uploadedBy: CURRENT_USER.id,
          title: resourceData.title,
          subject: resourceData.subject || resourceData.groupName || 'General',
          description: resourceData.description,
          type: resourceData.type || 'link',
          fileType: resourceData.fileType,
          fileSize: resourceData.fileSize,
          urlOrPath: resourceData.urlOrPath,
        });
      } catch (e) {
        console.error('Remote resource add error:', e);
        throw e;
      }
    }

    const newRes: Resource = {
      ...resourceData,
      id: newId,
      subject: resourceData.subject,
      description: resourceData.description,
      educationalUrl: resourceData.urlOrPath,
      createdBy: CURRENT_USER.id,
      uploadedBy: {
        id: CURRENT_USER.id,
        fullName: CURRENT_USER.fullName,
        initials: CURRENT_USER.initials
      },
      uploadedAt: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      dateAdded: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    };
    setResources((prev) => [newRes, ...prev]);
  };

  const deleteResource = async (resourceId: string) => {
    if (isSupabaseConfigured) {
      try {
        await resourceService.deleteResource(resourceId);
      } catch (e) {
        console.error('Remote resource delete error:', e);
      }
    }
    setResources((prev) => prev.filter((r) => r.id !== resourceId));
  };

  // Feedback action
  const submitFeedback = async (fb: {
    screenName: string;
    category: string;
    comments: string;
    rating?: number | null;
  }) => {
    let newId = `fb-${Date.now()}`;
    if (isSupabaseConfigured) {
      try {
        newId = await feedbackService.submitFeedback({
          userId: CURRENT_USER.id,
          screenName: fb.screenName,
          category: fb.category,
          comments: fb.comments,
          rating: fb.rating,
        });
      } catch (e) {
        console.error('Remote feedback submit error:', e);
      }
    }

    const newFb: FeedbackSubmission = {
      id: newId,
      userId: CURRENT_USER.id,
      screenName: fb.screenName,
      rating: fb.rating,
      category: fb.category,
      comments: fb.comments,
      submittedAt: new Date().toISOString()
    };
    setFeedbacks((prev) => [newFb, ...prev]);
  };

  return (
    <AppDataContext.Provider
      value={{
        groups,
        tasks,
        sessions,
        resources,
        feedbacks,
        isLoading,
        addTask,
        updateTask,
        updateTaskStatus,
        deleteTask,
        createGroup,
        joinGroupByCode,
        joinGroupViaInvitation,
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
        scheduleSession,
        joinSession,
        leaveSession,
        updateSessionRsvp,
        deleteSession,
        addResource,
        deleteResource,
        submitFeedback,
        refreshAllData
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};
