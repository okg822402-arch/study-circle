export type UserRole = 'admin' | 'member';

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TaskFilterParams extends PaginationParams {
  status?: string;
  priority?: string;
  groupId?: string;
  userId?: string;
}

export interface GroupFilterParams extends PaginationParams {
  subject?: string;
  isPrivate?: boolean;
}

export interface ResourceFilterParams extends PaginationParams {
  groupId?: string;
  resourceType?: string;
  subject?: string;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  initials: string;
  program: string;
  joinedAt: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  groupId: string;
  groupName: string;
  subject?: string;
  createdBy?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assignedTo?: {
    id: string;
    fullName: string;
    initials: string;
    color: string;
  };
  progress?: number; // 0 to 100 for in_progress
  createdAt: string;
}

export type SessionType = 'in_person' | 'online';
export type RSVPStatus = 'going' | 'maybe' | 'not_going';

export interface SessionAttendee {
  userId: string;
  fullName: string;
  initials: string;
  avatarColor: string;
  status: RSVPStatus;
}

export interface StudySession {
  id: string;
  groupId: string;
  groupName: string;
  title: string;
  topic?: string; // Topic of the study session
  description?: string;
  date: string; // ISO or YYYY-MM-DD
  displayDate: string; // "Mon, 24 Nov"
  startTime: string; // "4:00 PM"
  endTime: string; // "6:00 PM"
  durationMinutes: number;
  type: SessionType;
  locationOrLink: string;
  creator?: {
    id: string;
    fullName: string;
    initials: string;
    avatarColor?: string;
  };
  createdBy?: string;
  attendees: SessionAttendee[]; // Participant list
  myRsvp: RSVPStatus;
  isParticipant?: boolean;
}

export type ResourceType = 'file' | 'link';

export interface Resource {
  id: string;
  groupId: string;
  groupName: string;
  title: string;
  subject?: string; // Course subject or topic
  description?: string;
  type: ResourceType;
  fileType?: 'pdf' | 'xlsx' | 'pptx' | 'docx';
  urlOrPath: string; // Educational URL or link
  educationalUrl?: string;
  fileSize?: string;
  uploadedBy: {
    id?: string;
    fullName: string;
    initials: string;
  };
  createdBy?: string;
  uploadedAt: string;
  dateAdded?: string;
}

export interface GroupMember {
  userId: string;
  fullName: string;
  email: string;
  initials: string;
  avatarColor: string;
  role: UserRole;
  isCurrentUser?: boolean;
}

export interface StudyGroup {
  id: string;
  name: string;
  subject: string;
  description: string;
  icon: string;
  color: string;
  inviteCode: string;
  isPrivate: boolean;
  memberCount: number;
  openTasksCount: number;
  members: GroupMember[];
  myRole: UserRole;
  nextSessionText?: string;
}

export interface GroupInvitation {
  id: string;
  groupId: string;
  token: string;
  createdBy: string;
  expiresAt: string; // ISO date string
  maxUses: number;
  usesCount: number;
  isRevoked: boolean;
  createdAt: string;
}

export interface InvitationCreateInput {
  groupId: string;
  expiresInHours: number; // e.g. 24, 168 (7 days), 720 (30 days)
  maxUses: number; // e.g. 1, 5, 10, 50, 100
}

export interface JoinInvitationResult {
  success: boolean;
  message: string;
  group?: StudyGroup;
  errorCode?: string;
}

export interface FeedbackSubmission {
  id: string;
  userId?: string;
  screenName: string; // Screen where the problem or suggestion was found
  category: string; // Bug Report, Suggestion / Feature, Usability, Performance, General
  comments: string; // Short description
  rating?: number | null; // Optional experience rating (1 to 5)
  submittedAt: string;
}
