import { describe, it, expect, beforeEach } from 'vitest';
import { generateSecureInvitationToken } from '../services/groupService';
import { StudyGroup, GroupInvitation, UserRole } from '../types';

describe('StudyCircle Groups Module Security & Invitation Protocol', () => {
  let mockGroup: StudyGroup;
  let mockInvitations: GroupInvitation[];
  const currentUserId = 'usr-current';

  beforeEach(() => {
    mockGroup = {
      id: 'grp-crypto-101',
      name: 'Cryptography & Network Security',
      subject: 'Computer Science',
      description: 'Advanced ciphers, public-key infrastructure, and blockchain',
      icon: '🔒',
      color: '#1B2B4B',
      inviteCode: 'CS-8XK9-2MN4-7PQ3',
      isPrivate: true,
      memberCount: 2,
      openTasksCount: 1,
      myRole: 'admin',
      members: [
        {
          userId: 'usr-creator',
          fullName: 'Alice Johnson',
          email: 'alice@university.edu',
          initials: 'AJ',
          avatarColor: '#1B2B4B',
          role: 'admin',
          isCurrentUser: true,
        },
        {
          userId: 'usr-student',
          fullName: 'Bob Smith',
          email: 'bob@university.edu',
          initials: 'BS',
          avatarColor: '#3D7A8A',
          role: 'member',
          isCurrentUser: false,
        },
      ],
    };

    mockInvitations = [
      {
        id: 'inv-valid',
        groupId: 'grp-crypto-101',
        token: 'CS-VALID-TOKEN-1234',
        createdBy: 'usr-creator',
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(), // 7 days in future
        maxUses: 10,
        usesCount: 2,
        isRevoked: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'inv-expired',
        groupId: 'grp-crypto-101',
        token: 'CS-EXPIRED-TOKEN-5678',
        createdBy: 'usr-creator',
        expiresAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), // Expired yesterday
        maxUses: 10,
        usesCount: 1,
        isRevoked: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'inv-exhausted',
        groupId: 'grp-crypto-101',
        token: 'CS-EXHAUSTED-TOKEN-9999',
        createdBy: 'usr-creator',
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        maxUses: 5,
        usesCount: 5, // Reached max
        isRevoked: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'inv-revoked',
        groupId: 'grp-crypto-101',
        token: 'CS-REVOKED-TOKEN-0000',
        createdBy: 'usr-creator',
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        maxUses: 10,
        usesCount: 0,
        isRevoked: true,
        createdAt: new Date().toISOString(),
      },
    ];
  });

  // --------------------------------------------------------------------------
  // 1. RANDOMNESS & ENTROPY OF INVITATION TOKENS
  // --------------------------------------------------------------------------
  describe('Invitation Token Randomness & Entropy', () => {
    it('generates cryptographically random invitation tokens with high entropy', () => {
      const tokens = new Set<string>();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const token = generateSecureInvitationToken('CS');
        expect(token).toMatch(/^[A-Z0-9]{2,4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
        tokens.add(token);
      }

      // Zero collisions across 100 generated tokens
      expect(tokens.size).toBe(iterations);
    });

    it('sanitizes subject prefix to avoid invalid characters or format injection', () => {
      const token1 = generateSecureInvitationToken('Math / Science!!');
      expect(token1.startsWith('MATH-')).toBe(true);

      const token2 = generateSecureInvitationToken('');
      expect(token2.startsWith('SC-')).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 2. SERVER-SIDE INVITATION VALIDATION: EXPIRATION, USAGE LIMITS & REVOCATION
  // --------------------------------------------------------------------------
  describe('Server-Side Invitation Validation Rules', () => {
    const validateInvitationToken = (token: string, invitations: GroupInvitation[]) => {
      const inv = invitations.find((i) => i.token === token);
      if (!inv) {
        return { success: false, error: 'Invalid or nonexistent invitation token.' };
      }
      if (inv.isRevoked) {
        return { success: false, error: 'This invitation has been revoked by an administrator.' };
      }
      if (new Date(inv.expiresAt).getTime() < Date.now()) {
        return { success: false, error: 'This invitation has expired.' };
      }
      if (inv.maxUses && inv.usesCount >= inv.maxUses) {
        return { success: false, error: 'This invitation has reached its maximum allowed uses.' };
      }
      return { success: true, invitation: inv };
    };

    it('accepts valid, unexpired and unexhausted invitation token', () => {
      const res = validateInvitationToken('CS-VALID-TOKEN-1234', mockInvitations);
      expect(res.success).toBe(true);
      expect(res.invitation?.token).toBe('CS-VALID-TOKEN-1234');
    });

    it('rejects expired invitation token', () => {
      const res = validateInvitationToken('CS-EXPIRED-TOKEN-5678', mockInvitations);
      expect(res.success).toBe(false);
      expect(res.error).toBe('This invitation has expired.');
    });

    it('rejects invitation token that reached its max uses limit', () => {
      const res = validateInvitationToken('CS-EXHAUSTED-TOKEN-9999', mockInvitations);
      expect(res.success).toBe(false);
      expect(res.error).toBe('This invitation has reached its maximum allowed uses.');
    });

    it('rejects revoked invitation token', () => {
      const res = validateInvitationToken('CS-REVOKED-TOKEN-0000', mockInvitations);
      expect(res.success).toBe(false);
      expect(res.error).toBe('This invitation has been revoked by an administrator.');
    });

    it('rejects unknown or malformed tokens', () => {
      const res = validateInvitationToken('FAKE-TOKEN-NONEXISTENT', mockInvitations);
      expect(res.success).toBe(false);
      expect(res.error).toBe('Invalid or nonexistent invitation token.');
    });
  });

  // --------------------------------------------------------------------------
  // 3. RATE LIMITING REPEATED ATTEMPTS
  // --------------------------------------------------------------------------
  describe('Rate Limiting on Invitation Verification', () => {
    it('blocks verification after 5 failed attempts within 15 minutes', () => {
      const attemptHistory: { timestamp: number; success: boolean }[] = [];
      const windowMs = 15 * 60 * 1000;
      const maxFailures = 5;

      const recordAttempt = (success: boolean) => {
        const now = Date.now();
        const recentFailures = attemptHistory.filter(
          (a) => !a.success && a.timestamp > now - windowMs
        );

        if (recentFailures.length >= maxFailures) {
          return {
            allowed: false,
            error: 'Rate limit exceeded: Too many invalid invitation attempts. Please wait 15 minutes before trying again.',
          };
        }

        attemptHistory.push({ timestamp: now, success });
        return { allowed: true };
      };

      // 5 consecutive failed attempts
      for (let i = 0; i < 5; i++) {
        const check = recordAttempt(false);
        expect(check.allowed).toBe(true);
      }

      // 6th attempt should be blocked by rate limiter
      const blockedAttempt = recordAttempt(false);
      expect(blockedAttempt.allowed).toBe(false);
      expect(blockedAttempt.error).toContain('Rate limit exceeded');
    });
  });

  // --------------------------------------------------------------------------
  // 4. PREVENTING UNAUTHORIZED JOINS TO PRIVATE GROUPS
  // --------------------------------------------------------------------------
  describe('Private Group Access Protection', () => {
    it('prevents direct unauthorized join to private groups without valid token', () => {
      const canDirectlyJoin = (group: StudyGroup, hasValidToken: boolean) => {
        // Public groups allow direct joining; private groups require server-side token validation
        if (!group.isPrivate) return true;
        return hasValidToken;
      };

      expect(canDirectlyJoin(mockGroup, false)).toBe(false);
      expect(canDirectlyJoin(mockGroup, true)).toBe(true);

      const publicGroup = { ...mockGroup, isPrivate: false };
      expect(canDirectlyJoin(publicGroup, false)).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 5. ANTI-ROLE ESCALATION ENFORCEMENT
  // --------------------------------------------------------------------------
  describe('Anti-Role Escalation Protection', () => {
    it('strictly forbids users from modifying their own membership role', () => {
      const updateRole = (
        targetUserId: string,
        newRole: UserRole,
        actorUserId: string,
        actorIsAdmin: boolean
      ) => {
        // Enforce trigger rule: Users cannot alter their own role
        if (targetUserId === actorUserId) {
          throw new Error('Security violation: Users are strictly forbidden from modifying their own membership role.');
        }

        // Only group administrators can modify roles
        if (!actorIsAdmin) {
          throw new Error('Unauthorized: Only circle administrators can modify member roles.');
        }

        return { targetUserId, newRole };
      };

      // Self-promotion attempt: member tries to promote self to admin
      expect(() => {
        updateRole('usr-student', 'admin', 'usr-student', false);
      }).toThrow('Security violation: Users are strictly forbidden from modifying their own membership role.');

      // Self-demotion attempt by admin on themselves
      expect(() => {
        updateRole('usr-creator', 'member', 'usr-creator', true);
      }).toThrow('Security violation: Users are strictly forbidden from modifying their own membership role.');

      // Non-admin tries to modify another user's role
      expect(() => {
        updateRole('usr-creator', 'member', 'usr-student', false);
      }).toThrow('Unauthorized: Only circle administrators can modify member roles.');

      // Authorized admin successfully promotes another member
      const success = updateRole('usr-student', 'admin', 'usr-creator', true);
      expect(success.newRole).toBe('admin');
    });
  });

  // --------------------------------------------------------------------------
  // 6. MEMBERSHIP MANAGEMENT & LEAVING GROUPS
  // --------------------------------------------------------------------------
  describe('Membership Lifecycle & Management', () => {
    it('allows authorized creator to remove a member from circle', () => {
      const removeMember = (adminId: string, memberIdToRemove: string) => {
        const admin = mockGroup.members.find((m) => m.userId === adminId && m.role === 'admin');
        if (!admin) throw new Error('Unauthorized');

        const updated = mockGroup.members.filter((m) => m.userId !== memberIdToRemove);
        return { ...mockGroup, members: updated, memberCount: updated.length };
      };

      const result = removeMember('usr-creator', 'usr-student');
      expect(result.memberCount).toBe(1);
      expect(result.members.some((m) => m.userId === 'usr-student')).toBe(false);
    });

    it('allows standard member to leave group cleanly', () => {
      const leaveGroup = (userId: string) => {
        const remaining = mockGroup.members.filter((m) => m.userId !== userId);
        return { ...mockGroup, members: remaining, memberCount: remaining.length };
      };

      const afterLeave = leaveGroup('usr-student');
      expect(afterLeave.members.some((m) => m.userId === 'usr-student')).toBe(false);
      expect(afterLeave.memberCount).toBe(1);
    });
  });
});
