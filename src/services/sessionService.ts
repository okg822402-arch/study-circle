import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { StudySession, RSVPStatus, SessionType, PaginatedResponse } from '../types';
import { validateSessionDate, validateEducationalUrl } from '../utils/validators';
import { resilientQuery } from '../lib/resilientQuery';

export const sessionService = {
  /**
   * Fetch paginated study sessions with server-side filtering, column projection,
   * request timeouts, and controlled retries.
   * Default pageSize is 20 records per page.
   */
  async fetchPaginatedSessions(
    currentUserId: string,
    params: {
      page?: number;
      pageSize?: number;
      groupId?: string;
      date?: string;
      search?: string;
    } = {}
  ): Promise<PaginatedResponse<StudySession>> {
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
          .from('study_sessions')
          .select(
            `
            id,
            group_id,
            title,
            description,
            session_date,
            start_time,
            end_time,
            duration_minutes,
            session_type,
            location_or_link,
            created_by,
            created_at,
            study_groups ( name ),
            creator:profiles!study_sessions_created_by_fkey ( id, full_name ),
            session_attendees (
              user_id,
              rsvp_status,
              profiles ( id, full_name )
            )
          `,
            { count: 'exact' }
          )
          .order('session_date', { ascending: true })
          .order('start_time', { ascending: true });

        if (params.groupId && params.groupId !== 'all') {
          query = query.eq('group_id', params.groupId);
        }

        if (params.date) {
          query = query.eq('session_date', params.date);
        }

        if (params.search && params.search.trim()) {
          const term = `%${params.search.trim()}%`;
          query = query.ilike('title', term);
        }

        // Server-side pagination (20 per page)
        query = query.range(from, to);

        if (signal) {
          query = query.abortSignal(signal);
        }

        const { data, count, error } = await query;
        if (error) {
          console.error('Error fetching paginated sessions:', error);
          throw error;
        }

        const totalCount = count || 0;
        const totalPages = Math.ceil(totalCount / pageSize);

        const mappedSessions: StudySession[] = (data || []).map((s: any) => {
          const attendees = (s.session_attendees || []).map((a: any) => ({
            userId: a.user_id,
            fullName: a.profiles?.full_name || 'Student',
            initials: (a.profiles?.full_name || 'ST')
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase(),
            avatarColor: '#3D7A8A',
            status: a.rsvp_status as RSVPStatus,
          }));

          const myAttendee = attendees.find((a: any) => a.userId === currentUserId);
          const isParticipant = myAttendee ? myAttendee.status === 'going' : false;

          const creatorFullName = s.creator?.full_name || 'Circle Admin';
          const creatorInitials = creatorFullName
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();

          return {
            id: s.id,
            groupId: s.group_id,
            groupName: s.study_groups?.name || 'Study Circle',
            title: s.title,
            topic: s.title,
            description: s.description || undefined,
            date: s.session_date,
            displayDate: new Date(s.session_date).toLocaleDateString('en-GB', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            }),
            startTime: s.start_time,
            endTime: s.end_time || '',
            durationMinutes: s.duration_minutes,
            type: (s.session_type as SessionType) || 'in_person',
            locationOrLink: s.location_or_link,
            creator: {
              id: s.created_by,
              fullName: creatorFullName,
              initials: creatorInitials,
              avatarColor: '#1B2B4B',
            },
            createdBy: s.created_by,
            attendees,
            myRsvp: (myAttendee?.status as RSVPStatus) || 'not_going',
            isParticipant,
          };
        });

        return {
          data: mappedSessions,
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
   * Fetch all study sessions for given groups with creator info and participant list
   */
  async fetchSessions(currentUserId: string, groupIds?: string[]): Promise<StudySession[]> {
    if (!isSupabaseConfigured) return [];

    let query = (supabase as any)
      .from('study_sessions')
      .select(`
        id,
        group_id,
        title,
        description,
        session_date,
        start_time,
        end_time,
        duration_minutes,
        session_type,
        location_or_link,
        created_by,
        created_at,
        study_groups ( name ),
        creator:profiles!study_sessions_created_by_fkey ( id, full_name, avatar_url ),
        session_attendees (
          user_id,
          rsvp_status,
          profiles ( id, full_name, avatar_url )
        )
      `)
      .order('session_date', { ascending: true });

    if (groupIds && groupIds.length > 0) {
      query = query.in('group_id', groupIds);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching sessions:', error);
      throw error;
    }

    if (!data) return [];

    return data.map((s: any) => {
      const attendees = (s.session_attendees || []).map((a: any) => ({
        userId: a.user_id,
        fullName: a.profiles?.full_name || 'Student',
        initials: (a.profiles?.full_name || 'ST')
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase(),
        avatarColor: '#3D7A8A',
        status: a.rsvp_status as RSVPStatus,
      }));

      const myAttendee = attendees.find((a: any) => a.userId === currentUserId);
      const isParticipant = myAttendee ? myAttendee.status === 'going' : false;

      const creatorFullName = s.creator?.full_name || 'Circle Admin';
      const creatorInitials = creatorFullName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      return {
        id: s.id,
        groupId: s.group_id,
        groupName: s.study_groups?.name || 'Study Circle',
        title: s.title,
        topic: s.title,
        description: s.description || undefined,
        date: s.session_date,
        displayDate: new Date(s.session_date).toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }),
        startTime: s.start_time,
        endTime: s.end_time,
        durationMinutes: s.duration_minutes,
        type: s.session_type as SessionType,
        locationOrLink: s.location_or_link,
        createdBy: s.created_by,
        creator: {
          id: s.creator?.id || s.created_by,
          fullName: creatorFullName,
          initials: creatorInitials,
          avatarColor: '#1B2B4B',
        },
        attendees,
        myRsvp: myAttendee ? myAttendee.status : 'not_going',
        isParticipant,
      };
    });
  },

  /**
   * Schedule a new study session with server-side date and URL validation
   */
  async createSession(data: {
    groupId: string;
    createdBy: string;
    title: string;
    description?: string;
    date: string;
    startTime: string;
    endTime?: string;
    durationMinutes: number;
    type: SessionType;
    locationOrLink: string;
  }): Promise<string> {
    // Validate session date
    const dateVal = validateSessionDate(data.date);
    if (!dateVal.isValid) {
      throw new Error(dateVal.error);
    }

    // Validate link if online
    if (data.type === 'online') {
      const urlVal = validateEducationalUrl(data.locationOrLink);
      if (!urlVal.isValid) {
        throw new Error(urlVal.error);
      }
    }

    if (!isSupabaseConfigured) return `ses-${Date.now()}`;

    const { data: created, error } = await (supabase as any)
      .from('study_sessions')
      .insert({
        group_id: data.groupId,
        created_by: data.createdBy,
        title: data.title,
        description: data.description || null,
        session_date: data.date,
        start_time: data.startTime,
        end_time: data.endTime || '6:00 PM',
        duration_minutes: data.durationMinutes,
        session_type: data.type,
        location_or_link: data.locationOrLink,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating study session:', error);
      throw error;
    }

    return created.id;
  },

  /**
   * Join action: Adds current user to the participant list with 'going' status
   */
  async joinSession(sessionId: string, userId: string): Promise<void> {
    if (!isSupabaseConfigured) return;

    const { error } = await (supabase as any)
      .from('session_attendees')
      .upsert(
        {
          session_id: sessionId,
          user_id: userId,
          rsvp_status: 'going',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'session_id, user_id' }
      );

    if (error) {
      console.error('Error joining study session:', error);
      throw error;
    }
  },

  /**
   * Leave action: Removes current user from the participant list
   */
  async leaveSession(sessionId: string, userId: string): Promise<void> {
    if (!isSupabaseConfigured) return;

    const { error } = await (supabase as any)
      .from('session_attendees')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error leaving study session:', error);
      throw error;
    }
  },

  /**
   * Upsert an attendee's RSVP response for a session
   */
  async updateRsvp(sessionId: string, userId: string, rsvp: RSVPStatus): Promise<void> {
    if (!isSupabaseConfigured) return;

    const { error } = await (supabase as any)
      .from('session_attendees')
      .upsert(
        {
          session_id: sessionId,
          user_id: userId,
          rsvp_status: rsvp,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'session_id, user_id' }
      );

    if (error) {
      console.error('Error updating RSVP status:', error);
      throw error;
    }
  },

  /**
   * Delete a study session (creator / circle admin action)
   */
  async deleteSession(sessionId: string): Promise<void> {
    if (!isSupabaseConfigured) return;

    const { error } = await (supabase as any)
      .from('study_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      console.error('Error deleting study session:', error);
      throw error;
    }
  }
};
