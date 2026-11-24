import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { CURRENT_USER } from '../services/mockData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { profileService } from '../services/profileService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (fullName: string, email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updated: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('studycircle_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return CURRENT_USER;
      }
    }
    return CURRENT_USER;
  });

  const [isLoading, setIsLoading] = useState(true);

  // Sync state with Supabase Auth Session
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      if (!isSupabaseConfigured) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          const profile = await profileService.fetchProfile(session.user.id);
          if (profile) {
            setUser(profile);
          } else {
            const initials = (session.user.user_metadata?.full_name || session.user.email || 'ST')
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();

            setUser({
              id: session.user.id,
              fullName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Student',
              email: session.user.email || '',
              initials: initials || 'ST',
              program: session.user.user_metadata?.program || 'Undergraduate Student',
              joinedAt: new Date(session.user.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
            });
          }
        }
      } catch (err) {
        console.warn('Session verification fallback to local:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initSession();

    // Listen for auth state transitions (sign-in, token refresh, sign-out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await profileService.fetchProfile(session.user.id);
        if (profile && mounted) {
          setUser(profile);
        }
      } else if (event === 'SIGNED_OUT') {
        if (mounted) setUser(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('studycircle_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('studycircle_user');
    }
  }, [user]);

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: pass
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data.user) {
          const profile = await profileService.fetchProfile(data.user.id);
          if (profile) {
            setUser(profile);
          } else {
            const initials = (data.user.user_metadata?.full_name || email)
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();

            setUser({
              id: data.user.id,
              fullName: data.user.user_metadata?.full_name || email.split('@')[0],
              email: data.user.email || email,
              initials: initials || 'ST',
              program: 'Undergraduate Student',
              joinedAt: 'Today'
            });
          }
          return { success: true };
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Login failed' };
      }
    }

    // Local simulated auth if keys are not yet configured
    await new Promise((r) => setTimeout(r, 300));
    const loggedInUser: User = {
      ...CURRENT_USER,
      email: email || CURRENT_USER.email,
    };
    setUser(loggedInUser);
    return { success: true };
  };

  const register = async (fullName: string, email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: pass,
          options: {
            data: {
              full_name: fullName.trim(),
              program: 'Year 1 · Undergraduate'
            }
          }
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data.user) {
          const initials = fullName
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();

          const newUser: User = {
            id: data.user.id,
            fullName: fullName.trim(),
            email: data.user.email || email,
            initials: initials || 'ST',
            program: 'Year 1 · Undergraduate',
            joinedAt: 'Today'
          };
          setUser(newUser);
          return { success: true };
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Registration failed' };
      }
    }

    // Local simulated registration
    await new Promise((r) => setTimeout(r, 300));
    const initials = fullName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const newUser: User = {
      id: `usr-${Date.now()}`,
      fullName,
      email,
      initials: initials || 'ST',
      program: 'Year 1 · Undergraduate',
      joinedAt: 'Today'
    };
    setUser(newUser);
    return { success: true };
  };

  const loginWithGoogle = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
    } else {
      setUser(CURRENT_USER);
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error('Supabase signOut error:', e);
      }
    }
    setUser(null);
  };

  const updateProfile = async (updated: Partial<User>) => {
    if (user) {
      if (isSupabaseConfigured) {
        try {
          await profileService.updateProfile(user.id, {
            fullName: updated.fullName,
            program: updated.program,
            avatarUrl: updated.avatarUrl
          });
        } catch (e) {
          console.error('Remote profile update error:', e);
        }
      }
      setUser({ ...user, ...updated });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        loginWithGoogle,
        logout,
        updateProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
