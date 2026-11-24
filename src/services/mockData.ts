import { User, StudyGroup, Task, StudySession, Resource } from '../types';

export const CURRENT_USER: User = {
  id: 'usr-1',
  fullName: 'Priya Sharma',
  email: 'priya.sharma@uni.edu',
  initials: 'PS',
  program: 'Year 2 · BSc Mathematics',
  joinedAt: 'September 2025'
};

export const INITIAL_GROUPS: StudyGroup[] = [
  {
    id: 'grp-math',
    name: 'Advanced Mathematics',
    subject: 'Mathematics',
    description: 'A focused group for Year 2 Maths students preparing for the December exams. We cover differential equations, integration, and linear algebra.',
    icon: '📐',
    color: '#1B2B4B',
    inviteCode: 'MTH-4829',
    isPrivate: true,
    memberCount: 8,
    openTasksCount: 3,
    myRole: 'admin',
    nextSessionText: 'Session today 4:00 PM',
    members: [
      { userId: 'usr-1', fullName: 'Priya Sharma', email: 'priya.sharma@uni.edu', initials: 'PS', avatarColor: '#3D7A8A', role: 'admin', isCurrentUser: true },
      { userId: 'usr-2', fullName: 'Arjun Rao', email: 'arjun.rao@uni.edu', initials: 'AR', avatarColor: '#E8A83E', role: 'member' },
      { userId: 'usr-3', fullName: 'Kavya Patel', email: 'kavya.p@uni.edu', initials: 'KP', avatarColor: '#7A5AE8', role: 'member' },
      { userId: 'usr-4', fullName: 'Mihir Shah', email: 'mihir.s@uni.edu', initials: 'MS', avatarColor: '#D44A6A', role: 'member' },
      { userId: 'usr-5', fullName: 'Sneha Verma', email: 'sneha.v@uni.edu', initials: 'SV', avatarColor: '#28B464', role: 'member' },
      { userId: 'usr-6', fullName: 'Rohan Gupta', email: 'rohan.g@uni.edu', initials: 'RG', avatarColor: '#E8A83E', role: 'member' },
      { userId: 'usr-7', fullName: 'Aanya Sen', email: 'aanya.s@uni.edu', initials: 'AS', avatarColor: '#3D7A8A', role: 'member' },
      { userId: 'usr-8', fullName: 'Vikram Joshi', email: 'vikram.j@uni.edu', initials: 'VJ', avatarColor: '#1B2B4B', role: 'member' }
    ]
  },
  {
    id: 'grp-phys',
    name: 'Quantum Physics',
    subject: 'Physics',
    description: 'Weekly problem sets and theoretical paper reviews for Quantum Mechanics and Thermodynamics.',
    icon: '⚛️',
    color: '#2C4A6E',
    inviteCode: 'PHY-1092',
    isPrivate: true,
    memberCount: 5,
    openTasksCount: 2,
    myRole: 'member',
    nextSessionText: 'Next session Fri 2:00 PM',
    members: [
      { userId: 'usr-2', fullName: 'Arjun Rao', email: 'arjun.rao@uni.edu', initials: 'AR', avatarColor: '#E8A83E', role: 'admin' },
      { userId: 'usr-1', fullName: 'Priya Sharma', email: 'priya.sharma@uni.edu', initials: 'PS', avatarColor: '#3D7A8A', role: 'member', isCurrentUser: true },
      { userId: 'usr-4', fullName: 'Mihir Shah', email: 'mihir.s@uni.edu', initials: 'MS', avatarColor: '#D44A6A', role: 'member' },
      { userId: 'usr-7', fullName: 'Aanya Sen', email: 'aanya.s@uni.edu', initials: 'AS', avatarColor: '#3D7A8A', role: 'member' },
      { userId: 'usr-8', fullName: 'Vikram Joshi', email: 'vikram.j@uni.edu', initials: 'VJ', avatarColor: '#1B2B4B', role: 'member' }
    ]
  },
  {
    id: 'grp-cs',
    name: 'Computer Science',
    subject: 'Computer Science',
    description: 'Algorithms, Data Structures in C++, and Database Management Systems final project collaboration.',
    icon: '💻',
    color: '#3A5A7A',
    inviteCode: 'CS-9912',
    isPrivate: true,
    memberCount: 12,
    openTasksCount: 7,
    myRole: 'member',
    nextSessionText: 'Next: Sun 2:00 PM',
    members: [
      { userId: 'usr-3', fullName: 'Kavya Patel', email: 'kavya.p@uni.edu', initials: 'KP', avatarColor: '#7A5AE8', role: 'admin' },
      { userId: 'usr-1', fullName: 'Priya Sharma', email: 'priya.sharma@uni.edu', initials: 'PS', avatarColor: '#3D7A8A', role: 'member', isCurrentUser: true },
      { userId: 'usr-2', fullName: 'Arjun Rao', email: 'arjun.rao@uni.edu', initials: 'AR', avatarColor: '#E8A83E', role: 'member' }
    ]
  },
  {
    id: 'grp-lit',
    name: 'English Literature',
    subject: 'Literature',
    description: 'Comparative literary studies and Victorian prose essay workshops.',
    icon: '📖',
    color: '#4A3A6A',
    inviteCode: 'ENG-3341',
    isPrivate: false,
    memberCount: 6,
    openTasksCount: 2,
    myRole: 'member',
    nextSessionText: 'No session scheduled',
    members: [
      { userId: 'usr-5', fullName: 'Sneha Verma', email: 'sneha.v@uni.edu', initials: 'SV', avatarColor: '#28B464', role: 'admin' },
      { userId: 'usr-1', fullName: 'Priya Sharma', email: 'priya.sharma@uni.edu', initials: 'PS', avatarColor: '#3D7A8A', role: 'member', isCurrentUser: true }
    ]
  }
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 'tsk-1',
    groupId: 'grp-phys',
    groupName: 'Quantum Physics',
    title: 'Thermodynamics Problem Set',
    description: 'Complete questions 1 to 14 from Chapter 4 on entropy and enthalpy.',
    status: 'todo',
    priority: 'high',
    dueDate: '2026-11-22', // Overdue
    assignedTo: { id: 'usr-2', fullName: 'Arjun Rao', initials: 'AR', color: '#E8A83E' },
    createdAt: '2026-11-15'
  },
  {
    id: 'tsk-2',
    groupId: 'grp-math',
    groupName: 'Advanced Mathematics',
    title: 'Chapter 5 — Integration Practice',
    description: 'Solve substitution and parts questions before Monday session.',
    status: 'in_progress',
    priority: 'medium',
    progress: 60,
    dueDate: '2026-11-24', // Due today
    assignedTo: { id: 'usr-1', fullName: 'Priya Sharma', initials: 'PS', color: '#3D7A8A' },
    createdAt: '2026-11-18'
  },
  {
    id: 'tsk-3',
    groupId: 'grp-math',
    groupName: 'Advanced Mathematics',
    title: 'Read Linear Algebra Chapter 7',
    description: 'Eigenvalues and Eigenvectors notes summary.',
    status: 'todo',
    priority: 'medium',
    dueDate: '2026-11-26',
    assignedTo: { id: 'usr-1', fullName: 'Priya Sharma', initials: 'PS', color: '#3D7A8A' },
    createdAt: '2026-11-20'
  },
  {
    id: 'tsk-4',
    groupId: 'grp-cs',
    groupName: 'Computer Science',
    title: 'Database schema design draft',
    description: 'Create ERD for study group relational tables in PostgreSQL.',
    status: 'in_progress',
    priority: 'high',
    progress: 30,
    dueDate: '2026-11-27',
    assignedTo: { id: 'usr-3', fullName: 'Kavya Patel', initials: 'KP', color: '#7A5AE8' },
    createdAt: '2026-11-21'
  },
  {
    id: 'tsk-5',
    groupId: 'grp-cs',
    groupName: 'Computer Science',
    title: 'Prepare presentation slides',
    description: 'Draft 10 slides on B-Trees indexing strategies.',
    status: 'todo',
    priority: 'low',
    dueDate: '2026-11-28',
    assignedTo: { id: 'usr-1', fullName: 'Priya Sharma', initials: 'PS', color: '#3D7A8A' },
    createdAt: '2026-11-22'
  },
  {
    id: 'tsk-6',
    groupId: 'grp-phys',
    groupName: 'Quantum Physics',
    title: 'Annotate quantum mechanics paper',
    description: 'Read and highlight key formulas in section 3 of the arXiv preprint.',
    status: 'todo',
    priority: 'medium',
    dueDate: '2026-11-30',
    createdAt: '2026-11-23'
  },
  {
    id: 'tsk-7',
    groupId: 'grp-cs',
    groupName: 'Computer Science',
    title: 'Literature Review Draft',
    description: 'Survey paper on distributed caching protocols.',
    status: 'done',
    priority: 'medium',
    dueDate: '2026-11-20',
    assignedTo: { id: 'usr-1', fullName: 'Priya Sharma', initials: 'PS', color: '#3D7A8A' },
    createdAt: '2026-11-10'
  },
  {
    id: 'tsk-8',
    groupId: 'grp-lit',
    groupName: 'English Literature',
    title: 'Submit assignment brief',
    description: 'Short essay overview on narrative structures.',
    status: 'done',
    priority: 'low',
    dueDate: '2026-11-19',
    assignedTo: { id: 'usr-1', fullName: 'Priya Sharma', initials: 'PS', color: '#3D7A8A' },
    createdAt: '2026-11-08'
  }
];

export const INITIAL_SESSIONS: StudySession[] = [
  {
    id: 'ses-1',
    groupId: 'grp-math',
    groupName: 'Advanced Mathematics',
    title: 'Advanced Calculus Study Session',
    description: 'In-depth problem solving on definite integrals and series convergence before Friday test.',
    date: '2026-11-24',
    displayDate: 'Mon, 24 Nov',
    startTime: '4:00 PM',
    endTime: '6:00 PM',
    durationMinutes: 120,
    type: 'in_person',
    locationOrLink: 'Library Room 204',
    myRsvp: 'going',
    attendees: [
      { userId: 'usr-1', fullName: 'Priya Sharma', initials: 'PS', avatarColor: '#3D7A8A', status: 'going' },
      { userId: 'usr-2', fullName: 'Arjun Rao', initials: 'AR', avatarColor: '#E8A83E', status: 'going' },
      { userId: 'usr-3', fullName: 'Kavya Patel', initials: 'KP', avatarColor: '#7A5AE8', status: 'going' },
      { userId: 'usr-4', fullName: 'Mihir Shah', initials: 'MS', avatarColor: '#D44A6A', status: 'going' },
      { userId: 'usr-5', fullName: 'Sneha Verma', initials: 'SV', avatarColor: '#28B464', status: 'going' },
      { userId: 'usr-6', fullName: 'Rohan Gupta', initials: 'RG', avatarColor: '#E8A83E', status: 'going' }
    ]
  },
  {
    id: 'ses-2',
    groupId: 'grp-phys',
    groupName: 'Quantum Physics',
    title: 'Exam Prep Sprint',
    description: 'Collaborative review of past midterms and quick formula drills.',
    date: '2026-11-28',
    displayDate: 'Fri, 28 Nov',
    startTime: '10:00 AM',
    endTime: '1:00 PM',
    durationMinutes: 180,
    type: 'online',
    locationOrLink: 'https://meet.google.com/stu-circ-phys',
    myRsvp: 'maybe',
    attendees: [
      { userId: 'usr-2', fullName: 'Arjun Rao', initials: 'AR', avatarColor: '#E8A83E', status: 'going' },
      { userId: 'usr-4', fullName: 'Mihir Shah', initials: 'MS', avatarColor: '#D44A6A', status: 'going' },
      { userId: 'usr-7', fullName: 'Aanya Sen', initials: 'AS', avatarColor: '#3D7A8A', status: 'going' },
      { userId: 'usr-1', fullName: 'Priya Sharma', initials: 'PS', avatarColor: '#3D7A8A', status: 'maybe' }
    ]
  },
  {
    id: 'ses-3',
    groupId: 'grp-cs',
    groupName: 'Computer Science',
    title: 'Database Design Review',
    description: 'Peer review and normalization verification (3NF/BCNF) for term projects.',
    date: '2026-11-30',
    displayDate: 'Sun, 30 Nov',
    startTime: '2:00 PM',
    endTime: '4:00 PM',
    durationMinutes: 120,
    type: 'in_person',
    locationOrLink: 'Student Union Room B2',
    myRsvp: 'going',
    attendees: [
      { userId: 'usr-1', fullName: 'Priya Sharma', initials: 'PS', avatarColor: '#3D7A8A', status: 'going' },
      { userId: 'usr-3', fullName: 'Kavya Patel', initials: 'KP', avatarColor: '#7A5AE8', status: 'going' },
      { userId: 'usr-5', fullName: 'Sneha Verma', initials: 'SV', avatarColor: '#28B464', status: 'going' }
    ]
  },
  {
    id: 'ses-4',
    groupId: 'grp-phys',
    groupName: 'Quantum Physics',
    title: 'Quantum Mechanics Q&A',
    description: 'Open discussion on perturbation theory and spin operators.',
    date: '2026-12-03',
    displayDate: 'Wed, 3 Dec',
    startTime: '3:00 PM',
    endTime: '4:30 PM',
    durationMinutes: 90,
    type: 'in_person',
    locationOrLink: 'Science Hall 102',
    myRsvp: 'not_going',
    attendees: [
      { userId: 'usr-2', fullName: 'Arjun Rao', initials: 'AR', avatarColor: '#E8A83E', status: 'going' }
    ]
  }
];

export const INITIAL_RESOURCES: Resource[] = [
  {
    id: 'res-1',
    groupId: 'grp-math',
    groupName: 'Advanced Mathematics',
    title: 'Calculus Cheat Sheet.pdf',
    type: 'file',
    fileType: 'pdf',
    fileSize: '2.4 MB',
    urlOrPath: 'https://example.com/resources/calculus-cheat-sheet.pdf',
    uploadedBy: { fullName: 'Priya Sharma', initials: 'PS' },
    uploadedAt: '20 Nov 2026'
  },
  {
    id: 'res-2',
    groupId: 'grp-math',
    groupName: 'Advanced Mathematics',
    title: 'Khan Academy — Integration Methods',
    type: 'link',
    urlOrPath: 'https://www.khanacademy.org/math/calculus-2',
    uploadedBy: { fullName: 'Arjun Rao', initials: 'AR' },
    uploadedAt: '19 Nov 2026'
  },
  {
    id: 'res-3',
    groupId: 'grp-math',
    groupName: 'Advanced Mathematics',
    title: 'Practice Problems Set 3.xlsx',
    type: 'file',
    fileType: 'xlsx',
    fileSize: '0.8 MB',
    urlOrPath: 'https://example.com/resources/practice-problems-set3.xlsx',
    uploadedBy: { fullName: 'Kavya Patel', initials: 'KP' },
    uploadedAt: '18 Nov 2026'
  },
  {
    id: 'res-4',
    groupId: 'grp-phys',
    groupName: 'Quantum Physics',
    title: 'Quantum States Lecture Notes.pptx',
    type: 'file',
    fileType: 'pptx',
    fileSize: '5.1 MB',
    urlOrPath: 'https://example.com/resources/quantum-lecture.pptx',
    uploadedBy: { fullName: 'Prof. Mehta', initials: 'PM' },
    uploadedAt: '17 Nov 2026'
  },
  {
    id: 'res-5',
    groupId: 'grp-cs',
    groupName: 'Computer Science',
    title: 'MIT OpenCourseWare — Algorithms (CS50)',
    type: 'link',
    urlOrPath: 'https://ocw.mit.edu/courses/electrical-engineering-and-computer-science',
    uploadedBy: { fullName: 'Riya Gupta', initials: 'RG' },
    uploadedAt: '16 Nov 2026'
  },
  {
    id: 'res-6',
    groupId: 'grp-phys',
    groupName: 'Quantum Physics',
    title: 'Thermodynamics Past Papers.pdf',
    type: 'file',
    fileType: 'pdf',
    fileSize: '3.7 MB',
    urlOrPath: 'https://example.com/resources/thermo-past-papers.pdf',
    uploadedBy: { fullName: 'Mihir Shah', initials: 'MS' },
    uploadedAt: '15 Nov 2026'
  }
];
