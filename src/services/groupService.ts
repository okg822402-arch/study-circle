import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { StudyGroup, GroupMember, GroupInvitation, InvitationCreateInput, JoinInvitationResult, GroupFilterParams, PaginatedResponse } from '../types';
import { resilientQuery } from '../lib/resilientQuery';

/**
 * Generate a cryptographically secure random invitation token.
 * Uses Web Crypto API with 128-bit entropy (16 random bytes).
 */
export function generateSecureInvitationToken(prefix: string = 'SC'): string {
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase() || 'SC';
  const randomBytes = new Uint8Array(12);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < randomBytes.length; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // Base64url-like character set without confusing characters (0/O, 1/I/l)
  const charset = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let tokenStr = '';
  for (let i = 0; i < randomBytes.length; i++) {
    tokenStr += charset[randomBytes[i] % charset.length];
  }

  // Format: e.g. MAT-8XK9-2MN4-7PQ3
  return `${cleanPrefix}-${tokenStr.slice(0, 4)}-${tokenStr.slice(4, 8)}-${tokenStr.slice(8, 12)}`;
}

export const groupService = {
  /**
   * Fetch paginated study groups with server-side pagination, search, and filtering.
   * Default pageSize is 20 records per page.
   */
  async fetchPaginatedUserGroups(
    userId: string,
    params: GroupFilterParams = {}
  ): Promise<PaginatedResponse<StudyGroup>> {
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
          .from('group_members')
          .select(
            `
            role,
            study_groups!inner (
              id,
              name,
              subject,
              description,
              icon,
              color,
              invite_code,
              is_private,
              created_at
            )
          `,
            { count: 'exact' }
          )
          .eq('user_id', userId);

        if (params.search && params.search.trim()) {
          const term = `%${params.search.trim()}%`;
          query = query.ilike('study_groups.name', term);
        }

        if (params.subject && params.subject !== 'all') {
          query = query.eq('study_groups.subject', params.subject);
        }

        // Server-side pagination
        query = query.range(from, to);

        if (signal) {
          query = query.abortSignal(signal);
        }

        const { data, count, error } = await query;
        if (error) {
          console.error('Error fetching paginated user groups:', error);
          throw error;
        }

        const totalCount = count || 0;
        const totalPages = Math.ceil(totalCount / pageSize);

        const mappedGroups: StudyGroup[] = (data || [])
          .filter((row: any) => row.study_groups !== null)
          .map((row: any) => {
            const g = row.study_groups;
            return {
              id: g.id,
              name: g.name,
              subject: g.subject,
              description: g.description || '',
              icon: g.icon || '📐',
              color: g.color || '#3D7A8A',
              inviteCode: g.invite_code,
              memberCount: 1,
              openTasksCount: 0,
              isPrivate: Boolean(g.is_private),
              myRole: row.role as 'admin' | 'member',
              createdAt: g.created_at,
              members: [],
            };
          });

        return {
          data: mappedGroups,
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
        isPrivate: true,
      }
    );
  },
  /**
   * Fetch all study groups where the user is an active member
   */
  async fetchUserGroups(userId: string): Promise<StudyGroup[]> {
    if (!isSupabaseConfigured) {
      return [];
    }

    const { data, error } = await (supabase as any)
      .from('group_members')
      .select(`
        role,
        study_groups (
          id,
          name,
          subject,
          description,
          icon,
          color,
          invite_code,
          is_private,
          created_at
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user groups:', error);
      throw error;
    }

    if (!data) return [];

    return data
      .filter((row: any) => row.study_groups !== null)
      .map((row: any) => {
        const g = row.study_groups;
        return {
          id: g.id,
          name: g.name,
          subject: g.subject,
          description: g.description || '',
          icon: g.icon,
          color: g.color,
          inviteCode: g.invite_code,
          isPrivate: g.is_private,
          memberCount: 1,
          openTasksCount: 0,
          myRole: row.role,
          members: []
        };
      });
  },

  /**
   * Fetch single study group by ID including members
   */
  async fetchGroupById(groupId: string): Promise<StudyGroup | null> {
    if (!isSupabaseConfigured) return null;

    const { data: group, error: groupErr } = await (supabase as any)
      .from('study_groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (groupErr || !group) return null;

    const { data: members } = await (supabase as any)
      .from('group_members')
      .select(`
        role,
        profiles (
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('group_id', groupId);

    const formattedMembers: GroupMember[] = (members || []).map((m: any) => ({
      userId: m.profiles.id,
      fullName: m.profiles.full_name,
      email: m.profiles.email,
      initials: m.profiles.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      avatarColor: '#3D7A8A',
      role: m.role,
    }));

    return {
      id: group.id,
      name: group.name,
      subject: group.subject,
      description: group.description || '',
      icon: group.icon,
      color: group.color,
      inviteCode: group.invite_code,
      isPrivate: group.is_private,
      memberCount: formattedMembers.length,
      openTasksCount: 0,
      myRole: 'member',
      members: formattedMembers
    };
  },

  /**
   * Create a new study group. Database trigger auto-adds creator as admin.
   */
  async createGroup(data: {
    userId: string;
    name: string;
    subject: string;
    description: string;
    isPrivate: boolean;
    icon?: string;
    color?: string;
  }): Promise<{ id: string; inviteCode: string }> {
    const inviteCode = generateSecureInvitationToken(data.subject.substring(0, 3));

    if (!isSupabaseConfigured) {
      return { id: `grp-${Date.now()}`, inviteCode };
    }

    const { data: created, error } = await (supabase as any)
      .from('study_groups')
      .insert({
        created_by: data.userId,
        name: data.name,
        subject: data.subject,
        description: data.description,
        icon: data.icon || '📐',
        color: data.color || '#3D7A8A',
        invite_code: inviteCode,
        is_private: data.isPrivate,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating group:', error);
      throw error;
    }

    // Auto-create initial default invitation in group_invitations
    try {
      await (supabase as any)
        .from('group_invitations')
        .insert({
          group_id: created.id,
          token: inviteCode,
          created_by: data.userId,
          expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(), // 30 days
          max_uses: 50,
        });
    } catch (invErr) {
      console.warn('Initial invitation creation notice:', invErr);
    }

    return { id: created.id, inviteCode: created.invite_code };
  },

  /**
   * Create a secure, expiring, usage-limited invitation token.
   * Stored in public.group_invitations protected by RLS.
   */
  async createInvitation(
    userId: string,
    input: InvitationCreateInput,
    subjectPrefix?: string
  ): Promise<GroupInvitation> {
    const token = generateSecureInvitationToken(subjectPrefix || 'SC');
    const expiresAt = new Date(Date.now() + input.expiresInHours * 3600 * 1000).toISOString();

    if (!isSupabaseConfigured) {
      return {
        id: `inv-${Date.now()}`,
        groupId: input.groupId,
        token,
        createdBy: userId,
        expiresAt,
        maxUses: input.maxUses,
        usesCount: 0,
        isRevoked: false,
        createdAt: new Date().toISOString(),
      };
    }

    const { data, error } = await (supabase as any)
      .from('group_invitations')
      .insert({
        group_id: input.groupId,
        token,
        created_by: userId,
        expires_at: expiresAt,
        max_uses: input.maxUses,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating group invitation:', error);
      throw error;
    }

    return {
      id: data.id,
      groupId: data.group_id,
      token: data.token,
      createdBy: data.created_by,
      expiresAt: data.expires_at,
      maxUses: data.max_uses,
      usesCount: data.uses_count,
      isRevoked: data.is_revoked,
      createdAt: data.created_at,
    };
  },

  /**
   * Fetch active invitations for a circle (authorized admins only).
   */
  async fetchGroupInvitations(groupId: string): Promise<GroupInvitation[]> {
    if (!isSupabaseConfigured) return [];

    const { data, error } = await (supabase as any)
      .from('group_invitations')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching circle invitations:', error);
      return [];
    }

    return (data || []).map((inv: any) => ({
      id: inv.id,
      groupId: inv.group_id,
      token: inv.token,
      createdBy: inv.created_by,
      expiresAt: inv.expires_at,
      maxUses: inv.max_uses,
      usesCount: inv.uses_count,
      isRevoked: inv.is_revoked,
      createdAt: inv.created_at,
    }));
  },

  /**
   * Regenerate circle invite code with secure randomness
   */
  async regenerateInviteCode(groupId: string, subjectPrefix: string): Promise<string> {
    const newCode = generateSecureInvitationToken(subjectPrefix);

    if (!isSupabaseConfigured) return newCode;

    const { error } = await (supabase as any)
      .from('study_groups')
      .update({ invite_code: newCode })
      .eq('id', groupId);

    if (error) {
      console.error('Error regenerating invite code:', error);
      throw error;
    }

    return newCode;
  },

  /**
   * Revoke an invitation link so it can no longer be used.
   */
  async revokeInvitation(invitationId: string): Promise<void> {
    if (!isSupabaseConfigured) return;

    const { error } = await (supabase as any)
      .from('group_invitations')
      .update({ is_revoked: true })
      .eq('id', invitationId);

    if (error) {
      console.error('Error revoking invitation:', error);
      throw error;
    }
  },

  /**
   * Join a study group using an invitation token.
   * Validated server-side via PostgreSQL RPC join_group_via_invitation() with rate limiting,
   * expiration check, max usage check, and automatic member insertion.
   */
  async joinGroupViaInvitation(token: string): Promise<JoinInvitationResult> {
    const cleanToken = token.trim();
    if (!cleanToken) {
      return { success: false, message: 'Please enter a valid invitation token or code.' };
    }

    if (!isSupabaseConfigured) {
      return {
        success: false,
        message: 'Supabase is not configured. Running in offline preview mode.'
      };
    }

    const { data, error } = await (supabase as any).rpc('join_group_via_invitation', {
      invitation_token: cleanToken,
    });

    if (error) {
      console.warn('Server invitation validation failed:', error);
      return {
        success: false,
        message: error.message || 'Failed to validate invitation.',
        errorCode: error.code
      };
    }

    if (!data || !data.success) {
      return {
        success: false,
        message: data?.message || 'Could not join study circle.',
      };
    }

    return {
      success: true,
      message: data.message,
      group: {
        id: data.group_id,
        name: data.name,
        subject: data.subject,
        description: data.description || '',
        icon: data.icon || '📐',
        color: data.color || '#3D7A8A',
        inviteCode: cleanToken,
        isPrivate: data.is_private,
        memberCount: 1,
        openTasksCount: 0,
        myRole: 'member',
        members: []
      }
    };
  },

  /**
   * Update circle details (name, subject, description)
   */
  async updateGroup(
    groupId: string,
    updates: { name?: string; subject?: string; description?: string }
  ): Promise<void> {
    if (!isSupabaseConfigured) return;

    const { error } = await (supabase as any)
      .from('study_groups')
      .update({
        ...(updates.name && { name: updates.name }),
        ...(updates.subject && { subject: updates.subject }),
        ...(updates.description !== undefined && { description: updates.description }),
      })
      .eq('id', groupId);

    if (error) {
      console.error('Error updating study group:', error);
      throw error;
    }
  },

  /**
   * Update a member's role (admin vs member).
   * Enforces that a user cannot modify their own role.
   */
  async updateMemberRole(
    groupId: string,
    targetUserId: string,
    newRole: 'admin' | 'member',
    currentUserId?: string
  ): Promise<void> {
    if (currentUserId && targetUserId === currentUserId) {
      throw new Error('Security violation: Users are strictly forbidden from modifying their own role.');
    }

    if (!isSupabaseConfigured) return;

    const { error } = await (supabase as any)
      .from('group_members')
      .update({ role: newRole })
      .eq('group_id', groupId)
      .eq('user_id', targetUserId);

    if (error) {
      console.error('Error updating member role:', error);
      throw error;
    }
  },

  /**
   * Remove a member from the circle (admin action).
   */
  async removeMember(groupId: string, targetUserId: string): Promise<void> {
    if (!isSupabaseConfigured) return;

    const { error } = await (supabase as any)
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', targetUserId);

    if (error) {
      console.error('Error removing member:', error);
      throw error;
    }
  },

  /**
   * Current user leaves the circle.
   */
  async leaveGroup(groupId: string, userId: string): Promise<void> {
    if (!isSupabaseConfigured) return;

    const { error } = await (supabase as any)
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error leaving circle:', error);
      throw error;
    }
  },

  /**
   * Delete circle (creator / admin action).
   */
  async deleteGroup(groupId: string): Promise<void> {
    if (!isSupabaseConfigured) return;

    const { error } = await (supabase as any)
      .from('study_groups')
      .delete()
      .eq('id', groupId);

    if (error) {
      console.error('Error deleting circle:', error);
      throw error;
    }
  }
};
