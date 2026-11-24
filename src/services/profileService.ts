import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User } from '../types';

export const profileService = {
  /**
   * Fetch user profile from public.profiles
   */
  async fetchProfile(userId: string): Promise<User | null> {
    if (!isSupabaseConfigured) return null;

    const { data, error } = await (supabase as any)
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      fullName: data.full_name,
      email: data.email,
      avatarUrl: data.avatar_url || undefined,
      initials: data.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      program: data.program || 'Undergraduate Student',
      joinedAt: new Date(data.created_at).toLocaleDateString('en-GB', {
        month: 'short',
        year: 'numeric',
      }),
    };
  },

  /**
   * Update student profile fields
   */
  async updateProfile(userId: string, updates: { fullName?: string; program?: string; avatarUrl?: string }): Promise<void> {
    if (!isSupabaseConfigured) return;

    const { error } = await (supabase as any)
      .from('profiles')
      .update({
        full_name: updates.fullName,
        program: updates.program,
        avatar_url: updates.avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }
};
