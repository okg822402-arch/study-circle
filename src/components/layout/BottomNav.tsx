import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, CheckSquare, Users, User as UserIcon } from 'lucide-react';
import { useAppData } from '../../context/AppDataContext';

export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tasks } = useAppData();

  const todayStr = new Date().toISOString().split('T')[0];
  const overdueCount = tasks.filter(
    (t) => t.status !== 'done' && t.dueDate < todayStr
  ).length;

  const navItems = [
    { label: 'Home', path: '/dashboard', icon: Home },
    { label: 'Tasks', path: '/tasks', icon: CheckSquare, badge: overdueCount > 0 ? overdueCount : undefined },
    { label: 'Circles', path: '/circles', icon: Users },
    { label: 'Profile', path: '/profile', icon: UserIcon },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-ivory-border px-3 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:hidden">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`
                flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-150 btn-press relative min-h-[44px] min-w-[52px]
                ${isActive ? 'text-teal' : 'text-navy/40 hover:text-navy/70'}
              `}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
                {item.badge ? (
                  <span className="absolute -top-1 -right-2 bg-feedback-danger text-white text-[10px] font-bold min-w-4 h-4 px-1 rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <span className={`text-[11px] mt-0.5 font-medium ${isActive ? 'font-bold text-teal' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
