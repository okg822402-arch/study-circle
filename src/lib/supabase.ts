import { createClient } from '@supabase/supabase-js';

const defaultSupabaseUrl = 'https://bvpnilkghunftpowwomb.supabase.co';
const defaultSupabaseAnonKey = 'sb_publishable_7m5Jn4K0OqK8_8xpvu_taA_oidMFN7B';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultSupabaseUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || defaultSupabaseAnonKey;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  !supabaseUrl.includes('placeholder') &&
  supabaseAnonKey &&
  !supabaseAnonKey.includes('placeholder')
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

