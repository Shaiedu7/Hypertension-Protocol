import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// TODO: Replace with your actual Supabase credentials
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database Table Names
export const TABLES = {
  USERS: 'users',
  PATIENTS: 'patients',
  BP_READINGS: 'bp_readings',
  MEDICATIONS: 'medications',
  EMERGENCY_SESSIONS: 'emergency_sessions',
  TIMERS: 'timers',
  NOTIFICATIONS: 'notifications',
  AUDIT_LOGS: 'audit_logs',
} as const;
