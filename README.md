# StudyCircle — Student Collaboration Application

A mobile-first, responsive student collaboration platform built with **React**, **TypeScript**, **Tailwind CSS**, and **Vite**.

---

## 🎨 Design System & Visual Language

- **Warm Ivory Background:** `#FAFAF7` (Canvas: `#EDEBE5`, Cards: `#FFFFFF`)
- **Dark Navy Typography & Accents:** `#1B2B4B`
- **Muted Teal Primary Actions:** `#3D7A8A` (Hover: `#306070`, Light tint: `rgba(61, 122, 138, 0.12)`)
- **Soft Amber Accent:** `#E8A83E` (Focus / ratings / calendar highlights)
- **8-Point Spacing Grid:** Strict spacing scale (`p-2`, `p-3`, `p-4`, `p-5`, `p-6`)
- **Rounded Cards & Subtle Elevation:** 16px radius (`rounded-card`) with `0 1px 3px rgba(27, 43, 75, 0.05)`
- **Typography:** DM Sans / Inter font family with clear hierarchy.

---

## 📁 Project Architecture

```
src/
├── types/
│   └── index.ts                 # Strongly typed domain models (User, Group, Task, Session, Resource, Feedback)
├── context/
│   ├── AuthContext.tsx          # Authentication state, login, register, logout, profile update
│   └── AppDataContext.tsx       # Circles, tasks, sessions, resources, feedback actions with persistent storage
├── services/
│   └── mockData.ts              # High fidelity initial realistic study circle seed data
├── components/
│   ├── ui/                      # Reusable atomic design components
│   │   ├── Button.tsx           # Primary teal, secondary outline, ghost, danger, amber variants
│   │   ├── Badge.tsx            # Teal, amber, danger, success, navy, gray status badges
│   │   ├── Card.tsx             # 16px card with optional accent border stripes
│   │   ├── Input.tsx            # Floating styled input with validation & error states
│   │   ├── Avatar.tsx           # Initials avatar with dynamic background colors
│   │   └── Modal.tsx            # Responsive bottom sheet (mobile) / dialog (desktop)
│   └── layout/
│       ├── Header.tsx           # App bar with brand logo, notifications & user profile
│       ├── BottomNav.tsx        # Mobile thumb-zone navigation (Home, Tasks, Circles, Profile)
│       └── AppLayout.tsx        # Responsive layout shell with desktop sidebar navigation rail
├── pages/
│   ├── WelcomePage.tsx          # Initial onboarding & brand introduction
│   ├── LoginPage.tsx            # Sign in with email/password or Google OAuth
│   ├── RegisterPage.tsx         # Account creation with dynamic password strength meter
│   ├── DashboardPage.tsx        # Home dashboard with "Up Next" hero card & task preview
│   ├── TasksPage.tsx            # Task management (Overdue, In Progress, To Do, Done)
│   ├── CirclesPage.tsx          # Circle discovery, search, new circle modal & code joiner
│   ├── CircleDetailPage.tsx     # 4-tab circle hub (Overview, Tasks, Sessions, Resources)
│   ├── SessionsPage.tsx         # Week date selector, timeline schedule & RSVP actions
│   ├── ResourcesPage.tsx        # Searchable study materials & file downloads
│   ├── ProfilePage.tsx          # Student information, accomplishments & account settings
│   └── FeedbackPage.tsx         # Interactive 5-star rating, category chips & submission
├── App.tsx                      # HashRouter route tree & route guards
└── main.tsx                     # React root mount
```

---

## 🚀 Getting Started

To run the application locally in development mode:

```bash
npm run dev
```

The Vite dev server will start at `http://localhost:3000`.

To build for production:

```bash
npm run build
```
