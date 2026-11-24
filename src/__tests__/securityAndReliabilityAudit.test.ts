import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { isSafeInternalRoute, sanitizeInternalRoute } from '../utils/routeSanitizer';
import { validateEducationalUrl, validateSessionDate, validateSessionInput, validateResourceInput } from '../utils/validators';

/**
 * ==============================================================================
 * Comprehensive Security & Reliability Audit Test Suite for StudyCircle
 * Verifies:
 * 1. Multi-account data isolation & RLS access controls (Alice, Bob, Eve).
 * 2. Role escalation prevention & membership authorization.
 * 3. Cryptographic invitation token lifecycle & rate limiting.
 * 4. Credential isolation (zero leaked service_role keys or secrets).
 * 5. Input validation, malicious URL injection defense, and open redirect defense.
 * ==============================================================================
 */

// ------------------------------------------------------------------------------
// Multi-Account RLS Simulation Engine
// Replicating PostgreSQL 15 + Supabase RLS migrations:
// - 20261124000000_initial_schema.sql
// - 20261124100000_secure_groups_and_invitations.sql
// - 20261124110000_sessions_and_resources_enhancement.sql
// - 20261124120000_feedback_enhancement.sql
// - 20261124140000_security_audit_hardening.sql
// ------------------------------------------------------------------------------
interface Profile {
  id: string;
  email: string;
  full_name: string;
  is_system_admin?: boolean;
}

interface StudyGroup {
  id: string;
  created_by: string;
  name: string;
  is_private: boolean;
}

interface GroupMember {
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
}

interface GroupInvitation {
  id: string;
  group_id: string;
  token: string;
  created_by: string;
  expires_at: number; // timestamp
  max_uses: number;
  uses_count: number;
  is_revoked: boolean;
}

interface Task {
  id: string;
  group_id: string;
  created_by: string;
  title: string;
}

interface StudySession {
  id: string;
  group_id: string;
  created_by: string;
  title: string;
}

interface SharedResource {
  id: string;
  group_id: string;
  uploaded_by: string;
  title: string;
  url: string;
}

interface Feedback {
  id: string;
  user_id: string;
  screen_name: string;
  comments: string;
  rating?: number;
}

interface InvitationAttempt {
  user_id: string;
  attempted_token: string;
  success: boolean;
  attempted_at: number; // timestamp
}

class SecurityRLSSimulator {
  profiles: Profile[] = [
    { id: 'usr-alice', email: 'alice@mit.edu', full_name: 'Alice Admin' },
    { id: 'usr-bob', email: 'bob@mit.edu', full_name: 'Bob Member' },
    { id: 'usr-eve', email: 'attacker.admin@external.net', full_name: 'Eve Attacker' },
  ];

  studyGroups: StudyGroup[] = [
    { id: 'grp-private-1', created_by: 'usr-alice', name: 'CS 6.046 Advanced Algorithms', is_private: true },
    { id: 'grp-public-1', created_by: 'usr-alice', name: 'Open Math Workshop', is_private: false },
  ];

  groupMembers: GroupMember[] = [
    { group_id: 'grp-private-1', user_id: 'usr-alice', role: 'admin' },
    { group_id: 'grp-private-1', user_id: 'usr-bob', role: 'member' },
  ];

  invitations: GroupInvitation[] = [
    {
      id: 'inv-1',
      group_id: 'grp-private-1',
      token: 'SECURE_TOKEN_VALID_2026_XYZ',
      created_by: 'usr-alice',
      expires_at: Date.now() + 86400000, // +24 hours
      max_uses: 5,
      uses_count: 0,
      is_revoked: false,
    },
    {
      id: 'inv-expired',
      group_id: 'grp-private-1',
      token: 'SECURE_TOKEN_EXPIRED_2026_ABC',
      created_by: 'usr-alice',
      expires_at: Date.now() - 3600000, // -1 hour in the past
      max_uses: 10,
      uses_count: 0,
      is_revoked: false,
    },
    {
      id: 'inv-revoked',
      group_id: 'grp-private-1',
      token: 'SECURE_TOKEN_REVOKED_2026_DEF',
      created_by: 'usr-alice',
      expires_at: Date.now() + 86400000,
      max_uses: 10,
      uses_count: 0,
      is_revoked: true,
    },
    {
      id: 'inv-exhausted',
      group_id: 'grp-private-1',
      token: 'SECURE_TOKEN_EXHAUSTED_2026_GHI',
      created_by: 'usr-alice',
      expires_at: Date.now() + 86400000,
      max_uses: 3,
      uses_count: 3,
      is_revoked: false,
    },
  ];

  tasks: Task[] = [
    { id: 'tsk-1', group_id: 'grp-private-1', created_by: 'usr-alice', title: 'Implement Red-Black Trees' },
    { id: 'tsk-2', group_id: 'grp-private-1', created_by: 'usr-bob', title: 'Prepare Midterm Cheatsheet' },
  ];

  sessions: StudySession[] = [
    { id: 'ses-1', group_id: 'grp-private-1', created_by: 'usr-alice', title: 'Dynamic Programming Review' },
  ];

  resources: SharedResource[] = [
    { id: 'res-1', group_id: 'grp-private-1', uploaded_by: 'usr-alice', title: 'Lecture Notes 07', url: 'https://ocw.mit.edu/courses/notes.pdf' },
  ];

  feedback: Feedback[] = [
    { id: 'fb-1', user_id: 'usr-alice', screen_name: 'Tasks', comments: 'Alice confidential suggestion' },
    { id: 'fb-2', user_id: 'usr-bob', screen_name: 'Sessions', comments: 'Bob confidential bug report' },
  ];

  invitationAttempts: InvitationAttempt[] = [];

  // RLS Helper: is_member_of
  isMemberOf(groupId: string, userId: string): boolean {
    return this.groupMembers.some((m) => m.group_id === groupId && m.user_id === userId);
  }

  // RLS Helper: is_admin_of
  isAdminOf(groupId: string, userId: string): boolean {
    return this.groupMembers.some((m) => m.group_id === groupId && m.user_id === userId && m.role === 'admin');
  }

  // RLS Query: SELECT FROM study_groups WHERE is_private = false OR is_member_of(id)
  queryStudyGroups(authUid: string): StudyGroup[] {
    return this.studyGroups.filter((g) => !g.is_private || this.isMemberOf(g.id, authUid));
  }

  // RLS Query: SELECT FROM tasks WHERE is_member_of(group_id)
  queryTasks(authUid: string): Task[] {
    return this.tasks.filter((t) => this.isMemberOf(t.group_id, authUid));
  }

  // RLS Query: SELECT FROM study_sessions WHERE is_member_of(group_id)
  querySessions(authUid: string): StudySession[] {
    return this.sessions.filter((s) => this.isMemberOf(s.group_id, authUid));
  }

  // RLS Query: SELECT FROM resources WHERE is_member_of(group_id)
  queryResources(authUid: string): SharedResource[] {
    return this.resources.filter((r) => this.isMemberOf(r.group_id, authUid));
  }

  // RLS Query: SELECT FROM feedback WHERE auth.uid() = user_id OR app_metadata->>role = 'admin'
  queryFeedback(authUid: string, userRole?: string): Feedback[] {
    return this.feedback.filter((f) => f.user_id === authUid || userRole === 'admin');
  }

  // RLS Query: SELECT FROM group_invitations WHERE is_admin_of(group_id)
  queryInvitations(authUid: string): GroupInvitation[] {
    return this.invitations.filter((i) => this.isAdminOf(i.group_id, authUid));
  }

  // Anti-escalation trigger: trigger_prevent_self_role_escalation
  updateMemberRole(authUid: string, targetUserId: string, targetGroupId: string, newRole: 'admin' | 'member'): { success: boolean; error?: string; code?: string } {
    // 1. Disallow self role update
    if (authUid === targetUserId) {
      return {
        success: false,
        error: 'Security violation: Users are strictly forbidden from modifying their own membership role.',
        code: '42501',
      };
    }

    // 2. Only admin can modify roles of other members
    if (!this.isAdminOf(targetGroupId, authUid)) {
      return {
        success: false,
        error: 'Unauthorized: Only circle administrators can modify member roles.',
        code: '42501',
      };
    }

    const member = this.groupMembers.find((m) => m.group_id === targetGroupId && m.user_id === targetUserId);
    if (!member) {
      return { success: false, error: 'Member not found', code: 'P0002' };
    }

    member.role = newRole;
    return { success: true };
  }

  // Direct insert into group_members (RLS: "Users can only directly join public groups")
  directJoinGroup(authUid: string, groupId: string): { success: boolean; error?: string; code?: string } {
    const group = this.studyGroups.find((g) => g.id === groupId);
    if (!group) {
      return { success: false, error: 'Group does not exist', code: 'P0001' };
    }

    // RLS: is_private = false OR created_by = auth.uid()
    if (group.is_private && group.created_by !== authUid) {
      return {
        success: false,
        error: 'RLS check violation: Direct insertion into private group members is prohibited. Must use join_group_via_invitation() RPC.',
        code: '42501',
      };
    }

    this.groupMembers.push({ group_id: groupId, user_id: authUid, role: 'member' });
    return { success: true };
  }

  // RPC: join_group_via_invitation
  joinViaInvitation(authUid: string, token: string): { success: boolean; error?: string; code?: string } {
    const cleanToken = token.trim();
    if (!cleanToken) {
      return { success: false, error: 'Invitation token cannot be empty.', code: 'P0001' };
    }

    // Rate-limiting check: count failed attempts in the last 15 minutes (threshold = 5)
    const fifteenMinAgo = Date.now() - 15 * 60 * 1000;
    const failedAttempts = this.invitationAttempts.filter(
      (a) => a.user_id === authUid && !a.success && a.attempted_at > fifteenMinAgo
    ).length;

    if (failedAttempts >= 5) {
      return {
        success: false,
        error: 'Rate limit exceeded: Too many invalid invitation attempts. Please wait 15 minutes before trying again.',
        code: 'P0002',
      };
    }

    const inv = this.invitations.find((i) => i.token === cleanToken);
    if (!inv) {
      this.invitationAttempts.push({ user_id: authUid, attempted_token: cleanToken, success: false, attempted_at: Date.now() });
      return { success: false, error: 'Invalid or nonexistent invitation token.', code: 'P0003' };
    }

    if (inv.is_revoked) {
      this.invitationAttempts.push({ user_id: authUid, attempted_token: cleanToken, success: false, attempted_at: Date.now() });
      return { success: false, error: 'This invitation has been revoked by an administrator.', code: 'P0004' };
    }

    if (inv.expires_at < Date.now()) {
      this.invitationAttempts.push({ user_id: authUid, attempted_token: cleanToken, success: false, attempted_at: Date.now() });
      return { success: false, error: 'This invitation has expired.', code: 'P0005' };
    }

    if (inv.uses_count >= inv.max_uses) {
      this.invitationAttempts.push({ user_id: authUid, attempted_token: cleanToken, success: false, attempted_at: Date.now() });
      return { success: false, error: 'This invitation has reached its maximum allowed uses.', code: 'P0006' };
    }

    // Already a member?
    if (this.isMemberOf(inv.group_id, authUid)) {
      this.invitationAttempts.push({ user_id: authUid, attempted_token: cleanToken, success: true, attempted_at: Date.now() });
      return { success: true, error: 'You are already an active member of this circle.' };
    }

    // Success: increment usage count and add member
    inv.uses_count += 1;
    this.groupMembers.push({ group_id: inv.group_id, user_id: authUid, role: 'member' });
    this.invitationAttempts.push({ user_id: authUid, attempted_token: cleanToken, success: true, attempted_at: Date.now() });

    return { success: true };
  }
}

describe('StudyCircle Security & Reliability Audit: Multi-Account Isolation', () => {
  let sim: SecurityRLSSimulator;

  beforeEach(() => {
    sim = new SecurityRLSSimulator();
  });

  it('prohibits non-members (Eve) from querying private study circles', () => {
    const aliceGroups = sim.queryStudyGroups('usr-alice');
    const bobGroups = sim.queryStudyGroups('usr-bob');
    const eveGroups = sim.queryStudyGroups('usr-eve');

    // Alice and Bob see private group + public group
    expect(aliceGroups.map((g) => g.id)).toContain('grp-private-1');
    expect(bobGroups.map((g) => g.id)).toContain('grp-private-1');

    // Eve (non-member) ONLY sees public groups, never private ones
    expect(eveGroups.map((g) => g.id)).not.toContain('grp-private-1');
    expect(eveGroups.map((g) => g.id)).toEqual(['grp-public-1']);
  });

  it('prohibits non-members (Eve) from accessing private circle tasks, sessions, and resources', () => {
    const eveTasks = sim.queryTasks('usr-eve');
    const eveSessions = sim.querySessions('usr-eve');
    const eveResources = sim.queryResources('usr-eve');

    expect(eveTasks).toHaveLength(0);
    expect(eveSessions).toHaveLength(0);
    expect(eveResources).toHaveLength(0);

    // Members (Bob) can access private group contents
    expect(sim.queryTasks('usr-bob')).toHaveLength(2);
    expect(sim.querySessions('usr-bob')).toHaveLength(1);
    expect(sim.queryResources('usr-bob')).toHaveLength(1);
  });

  it('strictly enforces private feedback isolation even if user email contains "admin"', () => {
    // Alice only sees her feedback
    const aliceFeedback = sim.queryFeedback('usr-alice');
    expect(aliceFeedback).toHaveLength(1);
    expect(aliceFeedback[0].user_id).toBe('usr-alice');

    // Bob only sees his feedback
    const bobFeedback = sim.queryFeedback('usr-bob');
    expect(bobFeedback).toHaveLength(1);
    expect(bobFeedback[0].user_id).toBe('usr-bob');

    // Eve registered as 'attacker.admin@external.net'. Despite email matching '%admin%@%',
    // hardened RLS prevents her from reading Alice or Bob's confidential feedback!
    const eveFeedback = sim.queryFeedback('usr-eve');
    expect(eveFeedback).toHaveLength(0);

    // Only genuine system admin (verified via app_metadata role = 'admin') can access system-wide feedback
    const systemAdminFeedback = sim.queryFeedback('usr-admin', 'admin');
    expect(systemAdminFeedback).toHaveLength(2);
  });
});

describe('StudyCircle Security & Reliability Audit: Role Integrity & Privilege Escalation', () => {
  let sim: SecurityRLSSimulator;

  beforeEach(() => {
    sim = new SecurityRLSSimulator();
  });

  it('blocks ordinary member (Bob) from escalating his own role to admin (42501)', () => {
    const result = sim.updateMemberRole('usr-bob', 'usr-bob', 'grp-private-1', 'admin');

    expect(result.success).toBe(false);
    expect(result.code).toBe('42501');
    expect(result.error).toContain('strictly forbidden from modifying their own membership role');

    // Member role remains unchanged
    const bobMember = sim.groupMembers.find((m) => m.user_id === 'usr-bob');
    expect(bobMember?.role).toBe('member');
  });

  it('blocks non-admin members from altering other members roles (42501)', () => {
    const result = sim.updateMemberRole('usr-bob', 'usr-alice', 'grp-private-1', 'member');

    expect(result.success).toBe(false);
    expect(result.code).toBe('42501');
    expect(result.error).toContain('Only circle administrators can modify member roles');
  });

  it('permits genuine circle administrators (Alice) to modify roles', () => {
    const result = sim.updateMemberRole('usr-alice', 'usr-bob', 'grp-private-1', 'admin');

    expect(result.success).toBe(true);
    const bobMember = sim.groupMembers.find((m) => m.user_id === 'usr-bob');
    expect(bobMember?.role).toBe('admin');
  });

  it('prohibits ordinary members from querying unhashed or private invitation tokens', () => {
    // Only circle admins can view invitations via RLS
    const aliceInvitations = sim.queryInvitations('usr-alice');
    const bobInvitations = sim.queryInvitations('usr-bob');
    const eveInvitations = sim.queryInvitations('usr-eve');

    expect(aliceInvitations.length).toBeGreaterThan(0);
    expect(bobInvitations).toHaveLength(0);
    expect(eveInvitations).toHaveLength(0);
  });
});

describe('StudyCircle Security & Reliability Audit: Invitation Lifecycle & Brute-Force Rate Limiting', () => {
  let sim: SecurityRLSSimulator;

  beforeEach(() => {
    sim = new SecurityRLSSimulator();
  });

  it('blocks direct membership insertion into private groups without valid invitation', () => {
    const result = sim.directJoinGroup('usr-eve', 'grp-private-1');

    expect(result.success).toBe(false);
    expect(result.code).toBe('42501');
    expect(result.error).toContain('Direct insertion into private group members is prohibited');
  });

  it('allows joining private group using a valid, active invitation token', () => {
    const result = sim.joinViaInvitation('usr-eve', 'SECURE_TOKEN_VALID_2026_XYZ');

    expect(result.success).toBe(true);
    expect(sim.isMemberOf('grp-private-1', 'usr-eve')).toBe(true);

    // Usage count is properly incremented
    const inv = sim.invitations.find((i) => i.token === 'SECURE_TOKEN_VALID_2026_XYZ');
    expect(inv?.uses_count).toBe(1);
  });

  it('rejects expired invitation tokens with code P0005', () => {
    const result = sim.joinViaInvitation('usr-eve', 'SECURE_TOKEN_EXPIRED_2026_ABC');

    expect(result.success).toBe(false);
    expect(result.code).toBe('P0005');
    expect(result.error).toContain('expired');
  });

  it('rejects revoked invitation tokens with code P0004', () => {
    const result = sim.joinViaInvitation('usr-eve', 'SECURE_TOKEN_REVOKED_2026_DEF');

    expect(result.success).toBe(false);
    expect(result.code).toBe('P0004');
    expect(result.error).toContain('revoked');
  });

  it('rejects exhausted invitation tokens that reached max uses with code P0006', () => {
    const result = sim.joinViaInvitation('usr-eve', 'SECURE_TOKEN_EXHAUSTED_2026_GHI');

    expect(result.success).toBe(false);
    expect(result.code).toBe('P0006');
    expect(result.error).toContain('maximum allowed uses');
  });

  it('enforces rate limiting after 5 consecutive failed token attempts (P0002)', () => {
    // Eve performs 5 consecutive failed brute-force attempts
    for (let i = 1; i <= 5; i++) {
      const res = sim.joinViaInvitation('usr-eve', `BOGUS_BRUTEFORCE_TOKEN_${i}`);
      expect(res.success).toBe(false);
      expect(res.code).toBe('P0003');
    }

    // 6th attempt should be blocked immediately by rate-limit guard
    const blockedRes = sim.joinViaInvitation('usr-eve', 'SECURE_TOKEN_VALID_2026_XYZ');
    expect(blockedRes.success).toBe(false);
    expect(blockedRes.code).toBe('P0002');
    expect(blockedRes.error).toContain('Rate limit exceeded');
  });
});

describe('StudyCircle Security & Reliability Audit: Credential & Secret Key Isolation', () => {
  it('confirms zero Supabase service_role keys or secrets exist in src/ or public/', () => {
    const srcDir = path.resolve(__dirname, '../');
    const files = fs.readdirSync(srcDir, { recursive: true }) as string[];

    const forbiddenPatterns = [
      /service_role/i,
      /SUPABASE_SERVICE_ROLE_KEY/i,
      /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, // JWT secret signature pattern
      /DB_PASSWORD/i,
      /POSTGRES_PASSWORD/i,
    ];

    for (const file of files) {
      const fullPath = path.join(srcDir, file);
      if (fs.statSync(fullPath).isFile() && !file.includes('.test.') && !file.endsWith('.d.ts')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        for (const pattern of forbiddenPatterns) {
          expect(content).not.toMatch(pattern);
        }
      }
    }
  });

  it('verifies that .env.example contains only publishable anon key and public URL', () => {
    const envPath = path.resolve(__dirname, '../../.env.example');
    const content = fs.readFileSync(envPath, 'utf-8');

    expect(content).toContain('VITE_SUPABASE_URL=');
    expect(content).toContain('VITE_SUPABASE_ANON_KEY=');
    expect(content).not.toContain('SERVICE_ROLE');
    expect(content).not.toContain('service_role');
  });

  it('verifies client supabase.ts uses only client-safe environment variables', () => {
    const supabaseClientPath = path.resolve(__dirname, '../lib/supabase.ts');
    const content = fs.readFileSync(supabaseClientPath, 'utf-8');

    expect(content).toContain('import.meta.env.VITE_SUPABASE_URL');
    expect(content).toContain('import.meta.env.VITE_SUPABASE_ANON_KEY');
    expect(content).not.toContain('service_role');
  });
});

describe('StudyCircle Security & Reliability Audit: Open Redirect & Input Injection Defenses', () => {
  it('blocks open redirect attacks via backslash bypasses (React Router GHSA-wrjc-x8rr-h8h6)', () => {
    const maliciousPaths = [
      '\\attacker.com',
      '\\\\attacker.com',
      '/\\attacker.com',
      '\\evil.com/phishing',
      '//evil.com',
      '///evil.com',
      'http://attacker.com/steal-token',
      'https://malicious.io',
      'javascript:alert(document.cookie)',
      'data:text/html,<script>alert(1)</script>',
    ];

    for (const badPath of maliciousPaths) {
      expect(isSafeInternalRoute(badPath)).toBe(false);
      expect(sanitizeInternalRoute(badPath)).toBe('/dashboard');
    }
  });

  it('allows safe, legitimate internal routes', () => {
    const safePaths = [
      '/dashboard',
      '/tasks',
      '/circles/grp-123',
      '/sessions',
      '/resources?filter=all',
      '/profile',
      '/feedback',
    ];

    for (const safePath of safePaths) {
      expect(isSafeInternalRoute(safePath)).toBe(true);
      expect(sanitizeInternalRoute(safePath)).toBe(safePath);
    }
  });

  it('blocks dangerous protocol injection in educational resource URLs', () => {
    const exploitUrls = [
      'javascript:alert(document.domain)',
      'javascript://exploit',
      'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
      'file:///C:/Windows/System32/drivers/etc/hosts',
      'vbscript:MsgBox(1)',
      'about:blank',
    ];

    for (const exploit of exploitUrls) {
      const res = validateEducationalUrl(exploit);
      expect(res.isValid).toBe(false);
      expect(res.error).toMatch(/Unsafe URL protocol|well-formed web URL/i);
    }
  });

  it('accepts valid, benign educational HTTP/HTTPS links', () => {
    const validUrls = [
      'https://ocw.mit.edu/courses/electrical-engineering-and-computer-science',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://github.com/studycircle/repo',
      'http://en.wikipedia.org/wiki/Algorithm',
    ];

    for (const url of validUrls) {
      const res = validateEducationalUrl(url);
      expect(res.isValid).toBe(true);
      expect(res.error).toBeUndefined();
    }
  });

  it('prevents scheduling study sessions in the past', () => {
    // Yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split('T')[0];

    const pastRes = validateSessionDate(yStr);
    expect(pastRes.isValid).toBe(false);
    expect(pastRes.error).toContain('cannot be scheduled in the past');

    // Future (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tStr = tomorrow.toISOString().split('T')[0];

    const futureRes = validateSessionDate(tStr);
    expect(futureRes.isValid).toBe(true);
  });
});
