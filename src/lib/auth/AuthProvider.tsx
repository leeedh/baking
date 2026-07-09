'use client';

import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export interface AuthProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: string;
  locale: string;
}

interface AuthContextValue {
  user: User | null;
  profile: AuthProfile | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  initialUser,
  children,
}: {
  initialUser: User | null;
  children: React.ReactNode;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(initialUser);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // 세션 변화 구독(로그인/로그아웃/토큰 갱신)
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  // user 변화 시 profile(role 포함) 로드
  useEffect(() => {
    let active = true;
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    supabase
      .from('profiles')
      .select('id, display_name, avatar_url, role, locale')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (!active) return;
        setProfile(data);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      isLoggedIn: !!user,
      isAdmin: profile?.role === 'admin',
      loading,
      signOut: async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
      },
    }),
    [user, profile, loading, supabase],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
