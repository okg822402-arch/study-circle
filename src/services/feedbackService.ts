import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const feedbackService = {
  /**
   * Submit student bug report, feature suggestion, or experience review
   */
  async submitFeedback(data: {
    userId?: string;
    screenName: string;
    category: string;
    comments: string;
    rating?: number | null;
  }): Promise<string> {
    if (!isSupabaseConfigured) return `fb-${Date.now()}`;

    try {
      const { data: created, error } = await (supabase as any)
        .from('feedback')
        .insert({
          user_id: data.userId || null,
          screen_name: data.screenName.trim(),
          category: data.category.trim(),
          comments: data.comments.trim(),
          rating: data.rating !== undefined ? data.rating : null,
        })
        .select('id')
        .single();

      if (error) {
        console.warn('Supabase feedback insert error, falling back to local submission ID:', error.message);
        return `fb-${Date.now()}`;
      }

      return created?.id || `fb-${Date.now()}`;
    } catch (err: any) {
      console.warn('Supabase feedback network exception, falling back to local submission ID:', err?.message || err);
      return `fb-${Date.now()}`;
    }
  },

  /**
   * Fetch authenticated user's submitted feedback (RLS strictly prevents cross-user access)
   */
  async fetchMyFeedback(userId: string) {
    if (!isSupabaseConfigured) return [];

    const { data, error } = await (supabase as any)
      .from('feedback')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user feedback:', error);
      return [];
    }

    return (data || []).map((fb: any) => ({
      id: fb.id,
      userId: fb.user_id,
      screenName: fb.screen_name || 'General',
      category: fb.category,
      comments: fb.comments,
      rating: fb.rating,
      submittedAt: fb.created_at,
    }));
  }
};
