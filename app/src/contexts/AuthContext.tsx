import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { User, UserRole } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setUserRole: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    checkUser();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await loadUserProfile(session.user.id);
      } else {
        setUser(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function checkUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadUserProfile(session.user.id);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadUserProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUser(data as User);
    } catch (error) {
      console.error('Error loading user profile:', error);
      setUser(null);
    }
  }

  async function signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (data.user) {
        await loadUserProfile(data.user.id);
        
        // Register push token for remote notifications when app is closed
        try {
          const { registerForPushNotifications } = await import('../services/notifications');
          const pushToken = await registerForPushNotifications();
          
          if (pushToken) {
            const { error: updateError } = await supabase
              .from('users')
              .update({ push_token: pushToken })
              .eq('id', data.user.id);
            
            if (updateError) {
              console.error('[Auth] Failed to store push token:', updateError);
            } else {
              console.log('[Auth] Push token registered successfully:', pushToken);
            }
          } else {
            console.warn('[Auth] No push token received from registerForPushNotifications');
          }
        } catch (e) {
          console.error('[Auth] Exception registering push token:', e);
        }
      }
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  async function signOut() {
    try {
      await supabase.auth.signOut();
      setUser(null);
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  async function setUserRole(role: UserRole) {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ role })
        .eq('id', user.id);

      if (error) throw error;
      
      setUser({ ...user, role });
      await AsyncStorage.setItem('userRole', role);
    } catch (error) {
      console.error('Error setting user role:', error);
      throw error;
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, setUserRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
