import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { validatePassword, formatAuthError } from '../utils/authValidation';
import { sanitizeInternalRoute } from '../utils/routeSanitizer';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = sanitizeInternalRoute(searchParams.get('redirect'), '/dashboard');
  const { register } = useAuth();
  const [fullName, setFullName] = useState('Priya Sharma');
  const [email, setEmail] = useState('priya.sharma@uni.edu');
  const [password, setPassword] = useState('StudyPass2026!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validation = validatePassword(password);
  const strengthLabels = ['Too weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-feedback-danger', 'bg-amber', 'bg-teal', 'bg-feedback-success'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!validation.isValid) {
      setError(validation.errors[0] || 'Please create a stronger password.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await register(fullName, email, password);
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
        <h2 className="text-2xl font-extrabold text-navy tracking-tight">Create account</h2>
        <p className="text-sm text-navy/60 mt-1">Join thousands of students collaborating smarter.</p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 sm:mt-8 flex flex-col gap-4">
        {error && (
          <div className="p-3.5 bg-feedback-danger-light text-feedback-danger text-xs font-semibold rounded-xl flex items-start gap-2 border border-feedback-danger/20">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed break-words">{error}</span>
          </div>
        )}

        <Input
          label="Full name"
          type="text"
          value={fullName}
          onChange={(e) => {
            setFullName(e.target.value);
            if (error) setError('');
          }}
          placeholder="Priya Sharma"
          autoComplete="name"
          required
        />

        <Input
          label="University email address"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError('');
          }}
          placeholder="you@university.edu"
          autoComplete="email"
          required
        />

        <div>
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError('');
            }}
            placeholder="Min 8 chars with uppercase, number & symbol"
            autoComplete="new-password"
            required
          />

          {password && (
            <div className="mt-2.5">
              <div className="flex gap-1.5 h-1.5 mb-1.5">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className={`flex-1 rounded-full transition-all duration-300 ${
                      index < validation.score ? strengthColors[validation.score - 1] : 'bg-ivory-border'
                    }`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between text-[11px] font-semibold gap-1">
                <span className={validation.isValid ? 'text-feedback-success' : 'text-amber-muted'}>
                  {validation.isValid ? '✓ Strong Password' : strengthLabels[Math.max(0, validation.score - 1)]}
                </span>
                <span className="text-navy/40 font-normal">8+ chars, upper, number, symbol</span>
              </div>
            </div>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={loading}
          disabled={password.length > 0 && !validation.isValid}
          className="mt-3"
        >
          Create Account
        </Button>
      </form>

      <p className="text-center text-xs text-navy/40 mt-4 leading-relaxed">
        By signing up you agree to our{' '}
        <span className="text-teal font-medium cursor-pointer">Terms of Service</span> and{' '}
        <span className="text-teal font-medium cursor-pointer">Privacy Policy</span>.
      </p>

      <p className="text-center text-sm text-navy/60 mt-8 pb-4">
        Already have an account?{' '}
        <Link to="/login" className="text-teal font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
};
