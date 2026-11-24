import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { Home, CheckSquare, Users, Calendar, FolderArchive, User as UserIcon, MessageSquareHeart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // If not authenticated and on auth pages, show raw page without navigation chrome
  const isAuthRoute = ['/', '/login', '/register'].includes(location.pathname);
  if (isAuthRoute && !isAuthenticated) {
    return <Outlet />;
  }

  const desktopNavItems = [
    { label: 'Dashboard', path: '/dashboard', icon: Home },
    { label: 'Tasks', path: '/tasks', icon: CheckSquare },
    { label: 'Study Circles', path: '/circles', icon: Users },
    { label: 'Sessions', path: '/sessions', icon: Calendar },
    { label: 'Resources', path: '/resources', icon: FolderArchive },
    { label: 'Profile', path: '/profile', icon: UserIcon },
    { label: 'Feedback', path: '/feedback', icon: MessageSquareHeart },
  ];

  return (
    <div className="min-h-screen bg-ivory text-navy flex flex-col font-sans overflow-x-hidden">
      <Header />

      <div className="flex-1 max-w-5xl w-full mx-auto sm:px-6 sm:py-6 flex gap-6">
        {/* Desktop Sidebar Rail */}
        <aside className="hidden sm:flex flex-col w-52 shrink-0 py-2">
          <div className="sticky top-20 flex flex-col gap-1">
            <span className="text-[11px] font-bold text-navy/40 uppercase tracking-wider px-3 mb-2">Navigation</span>
            {desktopNavItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`
                    flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 text-left
                    ${isActive ? 'bg-navy text-white shadow-sm' : 'text-navy/70 hover:bg-black/5 hover:text-navy'}
                  `}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber' : 'text-navy/50'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-4 sm:px-0 sm:py-0 pb-32 sm:pb-12 min-w-0">
          <Outlet />
        </main>
      </div>

      <BottomNav />
    </div>
  );
};
