import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, AlertCircle } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { formatAuthError } from '../utils/authValidation';
import { sanitizeInternalRoute } from '../utils/routeSanitizer';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = sanitizeInternalRoute(searchParams.get('redirect'), '/dashboard');
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('priya.sharma@uni.edu');
  const [password, setPassword] = useState('StudyPass2026!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please provide both your university email and password.');
      return;
    }
    setError('');
    setInfoMessage('');
    setLoading(true);
    try {
      const res = await login(email, password);
      if (!res.success) {
        setError(formatAuthError(res.error));
      } else {
        navigate(redirectTarget);
      }
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-ivory flex flex-col p-6 max-w-md mx-auto overflow-y-auto">
      <div className="pt-2 sm:pt-4">
        <button
          onClick={() => navigate('/')}
          className="p-2 -ml-2 text-navy hover:bg-black/5 rounded-lg transition-colors inline-flex items-center gap-1 text-sm font-medium min-h-[44px]"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
      </div>

      <div className="mt-6 sm:mt-8">
        <h2 className="text-2xl font-extrabold text-navy tracking-tight">Welcome back</h2>
        <p className="text-sm text-navy/60 mt-1">Sign in to your StudyCircle account.</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 sm:mt-8 flex flex-col gap-4">
        {error && (
          <div className="p-3.5 bg-feedback-danger-light text-feedback-danger text-xs font-semibold rounded-xl flex items-start gap-2 border border-feedback-danger/20">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed break-words">{error}</span>
          </div>
        )}

        {infoMessage && (
          <div className="p-3.5 bg-teal-light text-teal text-xs font-semibold rounded-xl flex items-start gap-2 border border-teal/20">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed break-words">{infoMessage}</span>
          </div>
        )}

        <Input
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError('');
            if (infoMessage) setInfoMessage('');
          }}
          placeholder="you@university.edu"
          autoComplete="email"
          required
        />

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-navy/80">Password</label>
            <button
              type="button"
              onClick={() => setInfoMessage('Password reset instructions have been sent to your university email.')}
              className="text-xs font-medium text-teal hover:underline min-h-[28px] flex items-center"
            >
              Forgot password?
            </button>
          </div>
          <Input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError('');
              if (infoMessage) setInfoMessage('');
            }}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={loading}
          className="mt-2"
        >
          Sign In
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px bg-ivory-border flex-1" />
        <span className="text-xs text-navy/40 font-medium">or continue with</span>
        <div className="h-px bg-ivory-border flex-1" />
      </div>

      <Button
        variant="secondary"
        size="lg"
        fullWidth
        onClick={async () => {
          await loginWithGoogle();
          navigate(redirectTarget);
        }}
        leftIcon={
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
          </svg>
        }
      >
        Continue with Google
      </Button>

      <p className="text-center text-sm text-navy/60 mt-8 pb-4">
        Don't have an account?{' '}
        <Link to="/register" className="text-teal font-semibold hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
};
