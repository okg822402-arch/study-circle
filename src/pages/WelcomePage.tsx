import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export const WelcomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] bg-ivory flex flex-col justify-between p-6 sm:p-12 max-w-md mx-auto overflow-y-auto">
      {/* Brand Hero */}
      <div className="pt-8 sm:pt-16 text-center my-auto">
        <div className="w-20 h-20 sm:w-28 sm:h-28 bg-navy rounded-3xl mx-auto mb-6 sm:mb-8 flex items-center justify-center shadow-elevated">
          <svg width="52" height="52" viewBox="0 0 62 62" fill="none" className="sm:w-[60px] sm:h-[60px]">
            <circle cx="31" cy="31" r="21" stroke="#3D7A8A" strokeWidth="2" />
            <circle cx="31" cy="31" r="9" fill="#E8A83E" />
            <path d="M10 31h11M40 31h11M31 10v11M31 40v11" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <circle cx="19" cy="19" r="4" fill="rgba(61,122,138,0.55)" />
            <circle cx="43" cy="19" r="4" fill="rgba(61,122,138,0.55)" />
            <circle cx="19" cy="43" r="4" fill="rgba(61,122,138,0.55)" />
            <circle cx="43" cy="43" r="4" fill="rgba(61,122,138,0.55)" />
          </svg>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-navy tracking-tight leading-tight mb-3">
          Study smarter,<br />together.
        </h1>
        <p className="text-navy/60 text-sm sm:text-base leading-relaxed max-w-xs mx-auto">
          Create study circles, manage tasks, schedule sessions and share resources.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 pb-6 pt-4 shrink-0">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => navigate('/register')}
        >
          Create Account
        </Button>
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={() => navigate('/login')}
        >
          Sign In
        </Button>
        <p className="text-center text-xs text-navy/40 mt-1">
          Free for students. No credit card needed.
        </p>
      </div>
    </div>
  );
};
