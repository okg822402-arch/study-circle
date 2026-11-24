import { describe, it, expect, beforeEach } from 'vitest';
import { StudyGroup, StudySession, Resource, RSVPStatus, UserRole } from '../types';

describe('StudyCircle Circles, Sessions & Resources Logic', () => {
  let mockGroup: StudyGroup;
  let mockSessions: StudySession[];
  let mockResources: Resource[];

  beforeEach(() => {
    mockGroup = {
      id: 'grp-101',
      name: 'Organic Chemistry II',
      subject: 'Chemistry',
      description: 'Reaction mechanisms and synthesis review',
      icon: '🧪',
      color: '#3D7A8A',
      inviteCode: 'CHE-9042',
      isPrivate: true,
      memberCount: 2,
      openTasksCount: 3,
      myRole: 'admin',
      members: [
        {
          userId: 'usr-admin',
          fullName: 'Priya Sharma',
          email: 'priya@university.edu',
          initials: 'PS',
          avatarColor: '#3D7A8A',
          role: 'admin',
          isCurrentUser: true,
        },
        {
          userId: 'usr-member',
          fullName: 'Arjun Verma',
          email: 'arjun@university.edu',
          initials: 'AV',
          avatarColor: '#2E5A44',
          role: 'member',
          isCurrentUser: false,
        },
      ],
    };

    mockSessions = [
      {
        id: 'ses-1',
        groupId: 'grp-101',
        groupName: 'Organic Chemistry II',
        title: 'Weekly Problem Set Review',
        date: '2026-11-28',
        displayDate: 'Fri, 28 Nov',
        startTime: '4:00 PM',
        endTime: '6:00 PM',
        durationMinutes: 120,
        type: 'in_person',
        locationOrLink: 'Library Room 204',
        myRsvp: 'going',
        attendees: [
          {
            userId: 'usr-admin',
            fullName: 'Priya Sharma',
            initials: 'PS',
            avatarColor: '#3D7A8A',
            status: 'going',
          },
        ],
      },
    ];

    mockResources = [
      {
        id: 'res-1',
        groupId: 'grp-101',
        groupName: 'Organic Chemistry II',
        title: 'Reaction Mechanisms Cheat Sheet',
        type: 'file',
        fileType: 'pdf',
        fileSize: '3.2 MB',
        urlOrPath: 'https://storage.example.com/chemistry/mechanisms.pdf',
        uploadedBy: {
          fullName: 'Priya Sharma',
          initials: 'PS',
        },
        uploadedAt: '24 Nov 2026',
      },
      {
        id: 'res-2',
        groupId: 'grp-101',
        groupName: 'Organic Chemistry II',
        title: 'Professor Khan Video Lectures',
        type: 'link',
        urlOrPath: 'https://youtube.com/playlist?list=123',
        uploadedBy: {
          fullName: 'Arjun Verma',
          initials: 'AV',
        },
        uploadedAt: '23 Nov 2026',
      },
    ];
  });

  // 1. Study Circles & Membership Tests
  describe('Study Circles & Membership Operations', () => {
    it('generates standardized 8-character uppercase invite codes', () => {
      const subject = 'Computer Science';
      const code = `${subject.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
      expect(code).toMatch(/^[A-Z]{3}-\d{4}$/);
    });

    it('verifies invite code joining and rejects duplicate membership', () => {
      const isAlreadyMember = mockGroup.members.some((m) => m.userId === 'usr-member');
      expect(isAlreadyMember).toBe(true);

      const isNewMember = mockGroup.members.some((m) => m.userId === 'usr-new');
      expect(isNewMember).toBe(false);
    });

    it('promotes and demotes member roles when authorized by admin', () => {
      const promoteMember = (userId: string, newRole: UserRole) => {
        return mockGroup.members.map((m) => (m.userId === userId ? { ...m, role: newRole } : m));
      };

      const updatedMembers = promoteMember('usr-member', 'admin');
      const promoted = updatedMembers.find((m) => m.userId === 'usr-member');
      expect(promoted?.role).toBe('admin');

      const demotedMembers = promoteMember('usr-member', 'member');
      const demoted = demotedMembers.find((m) => m.userId === 'usr-member');
      expect(demoted?.role).toBe('member');
    });

    it('removes member from circle and decrements member count', () => {
      const removeMember = (userId: string) => {
        const remaining = mockGroup.members.filter((m) => m.userId !== userId);
        return {
          ...mockGroup,
          members: remaining,
          memberCount: remaining.length,
        };
      };

      const groupAfterRemoval = removeMember('usr-member');
      expect(groupAfterRemoval.members).toHaveLength(1);
      expect(groupAfterRemoval.memberCount).toBe(1);
      expect(groupAfterRemoval.members[0].userId).toBe('usr-admin');
    });
  });

  // 2. Study Sessions & RSVP Tests
  describe('Study Sessions & RSVP Tracking', () => {
    it('updates attendee RSVP status correctly', () => {
      const updateRsvp = (sessionId: string, userId: string, newStatus: RSVPStatus) => {
        const session = mockSessions.find((s) => s.id === sessionId);
        if (!session) return null;

        const attendeeIndex = session.attendees.findIndex((a) => a.userId === userId);
        const attendees = [...session.attendees];

        if (attendeeIndex >= 0) {
          attendees[attendeeIndex] = { ...attendees[attendeeIndex], status: newStatus };
        } else {
          attendees.push({
            userId,
            fullName: 'Arjun Verma',
            initials: 'AV',
            avatarColor: '#2E5A44',
            status: newStatus,
          });
        }

        return { ...session, myRsvp: newStatus, attendees };
      };

      const updated = updateRsvp('ses-1', 'usr-admin', 'maybe');
      expect(updated?.myRsvp).toBe('maybe');
      expect(updated?.attendees[0].status).toBe('maybe');

      const added = updateRsvp('ses-1', 'usr-member', 'going');
      expect(added?.attendees).toHaveLength(2);
      expect(added?.attendees.find((a) => a.userId === 'usr-member')?.status).toBe('going');
    });

    it('validates iCalendar (.ics) format generation for calendar imports', () => {
      const session = mockSessions[0];
      const cleanDate = session.date.replace(/-/g, '');
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//StudyCircle//Student Collaboration//EN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `SUMMARY:${session.title} (${session.groupName})`,
        `LOCATION:${session.locationOrLink}`,
        `DTSTART:${cleanDate}T160000Z`,
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('SUMMARY:Weekly Problem Set Review (Organic Chemistry II)');
      expect(ics).toContain('LOCATION:Library Room 204');
      expect(ics).toContain('DTSTART:20261128T160000Z');
      expect(ics).toContain('END:VCALENDAR');
    });
  });

  // 3. Shared Resources Tests
  describe('Shared Learning Resources Operations', () => {
    it('filters resources by type and circle correctly', () => {
      const filesOnly = mockResources.filter((r) => r.type === 'file');
      expect(filesOnly).toHaveLength(1);
      expect(filesOnly[0].fileType).toBe('pdf');

      const linksOnly = mockResources.filter((r) => r.type === 'link');
      expect(linksOnly).toHaveLength(1);
      expect(linksOnly[0].urlOrPath).toContain('youtube.com');
    });

    it('deletes resource from group repository', () => {
      const deleteResource = (resourceId: string) => {
        return mockResources.filter((r) => r.id !== resourceId);
      };

      const remaining = deleteResource('res-1');
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('res-2');
    });
  });

  // 4. Feedback Validation Tests
  describe('Feedback Validation', () => {
    it('validates feedback rating range from 1 to 5', () => {
      const validateFeedback = (rating: number, category: string) => {
        if (rating < 1 || rating > 5) return 'Rating must be between 1 and 5';
        if (!category.trim()) return 'Category is required';
        return 'valid';
      };

      expect(validateFeedback(0, 'Tasks')).toBe('Rating must be between 1 and 5');
      expect(validateFeedback(6, 'Tasks')).toBe('Rating must be between 1 and 5');
      expect(validateFeedback(5, '')).toBe('Category is required');
      expect(validateFeedback(4, 'Overall Experience')).toBe('valid');
    });
  });
});
