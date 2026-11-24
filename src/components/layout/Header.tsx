import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../ui/Avatar';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, showBack = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const isMainTab = ['/dashboard', '/tasks', '/circles', '/profile'].includes(location.pathname);

  return (
    <header className="sticky top-0 z-40 bg-ivory/95 backdrop-blur-md border-b border-ivory-border px-4 py-3 sm:px-6">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {showBack || !isMainTab ? (
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 -ml-1.5 text-navy hover:bg-black/5 rounded-lg transition-colors shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center"
              aria-label="Go back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : null}

          {title ? (
            <h1 className="text-base sm:text-lg font-bold text-navy truncate" title={title}>{title}</h1>
          ) : (
            <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => navigate('/dashboard')}>
              <div className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center shadow-sm shrink-0">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="7" stroke="#3D7A8A" strokeWidth="1.5" />
                  <circle cx="10" cy="10" r="2.5" fill="#E8A83E" />
                  <path d="M3 10h4M13 10h4M10 3v4M10 13v4" stroke="#FAFAF7" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <span className="font-extrabold text-navy tracking-tight text-base sm:text-lg">StudyCircle</span>
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => navigate('/feedback')}
            className="text-xs font-semibold px-2.5 py-1 text-amber-muted bg-amber-light hover:bg-amber/20 rounded-full transition-colors hidden sm:inline-flex items-center gap-1 shrink-0"
          >
            <span>Feedback</span>
          </button>
          <button
            className="p-2 text-navy/60 hover:text-navy hover:bg-black/5 rounded-full transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
          </button>
          {user && (
            <div onClick={() => navigate('/profile')} className="cursor-pointer shrink-0">
              <Avatar initials={user.initials} size="sm" bgColor="#E8A83E" />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
