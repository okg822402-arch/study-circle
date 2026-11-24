import { describe, it, expect, beforeEach } from 'vitest';

/**
 * RLS Simulator Engine
 * Replicates the exact SQL Row-Level Security evaluation rules defined in:
 * supabase/migrations/20261124000000_initial_schema.sql
 */
class SupabaseRLSSimulator {
  private users: { id: string; email: string }[] = [];
  private profiles: { id: string; full_name: string; email: string }[] = [];
  private studyGroups: { id: string; created_by: string; name: string; is_private: boolean }[] = [];
  private groupMembers: { group_id: string; user_id: string; role: 'admin' | 'member' }[] = [];
  private tasks: { id: string; group_id: string; created_by: string; title: string }[] = [];
  private sessionAttendees: { session_id: string; user_id: string; rsvp_status: string }[] = [];
  private feedback: { id: string; user_id: string; rating: number; comments: string }[] = [];

  constructor() {
    // Seed test users: Alice (creator/admin), Bob (regular member), Charlie (outsider)
    this.users = [
      { id: 'usr-alice', email: 'alice@uni.edu' },
      { id: 'usr-bob', email: 'bob@uni.edu' },
      { id: 'usr-charlie', email: 'charlie@uni.edu' },
    ];

    this.profiles = [
      { id: 'usr-alice', full_name: 'Alice Walker', email: 'alice@uni.edu' },
      { id: 'usr-bob', full_name: 'Bob Miller', email: 'bob@uni.edu' },
      { id: 'usr-charlie', full_name: 'Charlie Davis', email: 'charlie@uni.edu' },
    ];

    // Alice creates Private Study Group 1
    this.studyGroups = [
      { id: 'grp-1', created_by: 'usr-alice', name: 'Advanced Algorithms', is_private: true },
    ];

    // Alice is Admin, Bob is Member, Charlie is NOT in the group
    this.groupMembers = [
      { group_id: 'grp-1', user_id: 'usr-alice', role: 'admin' },
      { group_id: 'grp-1', user_id: 'usr-bob', role: 'member' },
    ];

    // Tasks in Group 1
    this.tasks = [
      { id: 'tsk-101', group_id: 'grp-1', created_by: 'usr-alice', title: 'Dynamic Programming Set' },
    ];

    // RSVPs in Group 1 Session
    this.sessionAttendees = [
      { session_id: 'ses-1', user_id: 'usr-alice', rsvp_status: 'going' },
      { session_id: 'ses-1', user_id: 'usr-bob', rsvp_status: 'maybe' },
    ];

    // Private feedback records
    this.feedback = [
      { id: 'fb-1', user_id: 'usr-alice', rating: 5, comments: 'Super smooth UI' },
      { id: 'fb-2', user_id: 'usr-bob', rating: 4, comments: 'Good experience' },
    ];
  }

  // --- RLS Helper Functions (mirroring SQL is_member_of and is_admin_of) ---
  isMemberOf(targetGroupId: string, authUid: string): boolean {
    return this.groupMembers.some((m) => m.group_id === targetGroupId && m.user_id === authUid);
  }

  isAdminOf(targetGroupId: string, authUid: string): boolean {
    return this.groupMembers.some((m) => m.group_id === targetGroupId && m.user_id === authUid && m.role === 'admin');
  }

  // --- Policy Tests ---

  // 1. PROFILES UPDATE: "auth.uid() = id"
  updateProfile(authUid: string, targetProfileId: string, newName: string) {
    if (authUid !== targetProfileId) {
      throw new Error('RLS VIOLATION: Users can only update their own profile (403 Forbidden)');
    }
    const profile = this.profiles.find((p) => p.id === targetProfileId);
    if (profile) profile.full_name = newName;
    return profile;
  }

  // 2. STUDY GROUPS SELECT: "is_private = false OR is_member_of(id)"
  selectGroup(authUid: string, groupId: string) {
    const group = this.studyGroups.find((g) => g.id === groupId);
    if (!group) return null;
    const canAccess = !group.is_private || this.isMemberOf(groupId, authUid);
    if (!canAccess) {
      throw new Error('RLS VIOLATION: Non-members cannot view private study groups');
    }
    return group;
  }

  // 3. STUDY GROUPS UPDATE: "is_admin_of(id)"
  updateGroupSettings(authUid: string, groupId: string, newName: string) {
    if (!this.isAdminOf(groupId, authUid)) {
      throw new Error('RLS VIOLATION: Only group administrators can update group settings');
    }
    const group = this.studyGroups.find((g) => g.id === groupId);
    if (group) group.name = newName;
    return group;
  }

  // 4. STUDY GROUPS DELETE: "auth.uid() = created_by"
  deleteGroup(authUid: string, groupId: string) {
    const group = this.studyGroups.find((g) => g.id === groupId);
    if (!group || group.created_by !== authUid) {
      throw new Error('RLS VIOLATION: Only the group creator can delete a study group');
    }
    this.studyGroups = this.studyGroups.filter((g) => g.id !== groupId);
    return true;
  }

  // 5. GROUP MEMBERS DELETE (Removal): "auth.uid() = user_id OR is_admin_of(group_id)"
  removeMember(authUid: string, groupId: string, targetUserId: string) {
    const isSelfLeave = authUid === targetUserId;
    const isAdmin = this.isAdminOf(groupId, authUid);
    if (!isSelfLeave && !isAdmin) {
      throw new Error('RLS VIOLATION: Only administrators can remove other members from the group');
    }
    this.groupMembers = this.groupMembers.filter((m) => !(m.group_id === groupId && m.user_id === targetUserId));
    return true;
  }

  // 6. TASKS SELECT: "is_member_of(group_id)"
  selectTasks(authUid: string, groupId: string) {
    if (!this.isMemberOf(groupId, authUid)) {
      throw new Error('RLS VIOLATION: Non-members cannot view group tasks');
    }
    return this.tasks.filter((t) => t.group_id === groupId);
  }

  // 7. SESSION ATTENDEES ALL: "auth.uid() = user_id"
  updateRsvp(authUid: string, sessionId: string, targetUserId: string, newRsvp: string) {
    if (authUid !== targetUserId) {
      throw new Error('RLS VIOLATION: Users can only modify their own RSVP response');
    }
    const attendee = this.sessionAttendees.find((a) => a.session_id === sessionId && a.user_id === targetUserId);
    if (attendee) attendee.rsvp_status = newRsvp;
    return attendee;
  }

  // 8. FEEDBACK SELECT: "auth.uid() = user_id"
  selectFeedback(authUid: string) {
    return this.feedback.filter((f) => f.user_id === authUid);
  }
}

describe('Row Level Security (RLS) Policy Test Suite', () => {
  let rls: SupabaseRLSSimulator;

  beforeEach(() => {
    rls = new SupabaseRLSSimulator();
  });

  describe('Requirement 1: Users must only access their own private records', () => {
    it('succeeds when Alice updates her own profile', () => {
      const updated = rls.updateProfile('usr-alice', 'usr-alice', 'Alice Walker Ph.D.');
      expect(updated?.full_name).toBe('Alice Walker Ph.D.');
    });

    it('FAILS when Bob attempts to update Alice profile (Unauthorized 403)', () => {
      expect(() => {
        rls.updateProfile('usr-bob', 'usr-alice', 'Hacked By Bob');
      }).toThrowError(/RLS VIOLATION: Users can only update their own profile/);
    });

    it('strictly isolates feedback records so users only read their own private submissions', () => {
      const aliceFeedback = rls.selectFeedback('usr-alice');
      expect(aliceFeedback).toHaveLength(1);
      expect(aliceFeedback[0].comments).toBe('Super smooth UI');

      // Alice cannot see Bob's feedback
      const hasBobData = aliceFeedback.some((f) => f.user_id === 'usr-bob');
      expect(hasBobData).toBe(false);
    });
  });

  describe('Requirement 2: Group members must only access groups they belong to', () => {
    it('succeeds when group member Bob views tasks in Group 1', () => {
      const tasks = rls.selectTasks('usr-bob', 'grp-1');
      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Dynamic Programming Set');
    });

    it('FAILS when non-member Charlie attempts to query tasks in Group 1 (Denied)', () => {
      expect(() => {
        rls.selectTasks('usr-charlie', 'grp-1');
      }).toThrowError(/RLS VIOLATION: Non-members cannot view group tasks/);
    });

    it('FAILS when non-member Charlie attempts to view private Group 1', () => {
      expect(() => {
        rls.selectGroup('usr-charlie', 'grp-1');
      }).toThrowError(/RLS VIOLATION: Non-members cannot view private study groups/);
    });
  });

  describe('Requirement 3: Only authorised group creators or administrators may perform privileged actions', () => {
    it('succeeds when group admin Alice updates circle settings', () => {
      const updated = rls.updateGroupSettings('usr-alice', 'grp-1', 'Advanced Algorithms & Complexity');
      expect(updated?.name).toBe('Advanced Algorithms & Complexity');
    });

    it('FAILS when regular member Bob attempts to update circle settings (Denied)', () => {
      expect(() => {
        rls.updateGroupSettings('usr-bob', 'grp-1', 'Bob Renamed Circle');
      }).toThrowError(/RLS VIOLATION: Only group administrators can update group settings/);
    });

    it('succeeds when group admin Alice kicks a member', () => {
      const success = rls.removeMember('usr-alice', 'grp-1', 'usr-bob');
      expect(success).toBe(true);
      expect(rls.isMemberOf('grp-1', 'usr-bob')).toBe(false);
    });

    it('FAILS when regular member Bob attempts to kick admin Alice (Denied)', () => {
      expect(() => {
        rls.removeMember('usr-bob', 'grp-1', 'usr-alice');
      }).toThrowError(/RLS VIOLATION: Only administrators can remove other members/);
    });

    it('FAILS when non-creator Bob attempts to delete the study group (Denied)', () => {
      expect(() => {
        rls.deleteGroup('usr-bob', 'grp-1');
      }).toThrowError(/RLS VIOLATION: Only the group creator can delete a study group/);
    });
  });

  describe('Requirement 4: Session RSVP isolation', () => {
    it('succeeds when Bob updates his own RSVP status to going', () => {
      const res = rls.updateRsvp('usr-bob', 'ses-1', 'usr-bob', 'going');
      expect(res?.rsvp_status).toBe('going');
    });

    it('FAILS when Bob attempts to modify Alice RSVP response (Denied)', () => {
      expect(() => {
        rls.updateRsvp('usr-bob', 'ses-1', 'usr-alice', 'not_going');
      }).toThrowError(/RLS VIOLATION: Users can only modify their own RSVP response/);
    });
  });
});
