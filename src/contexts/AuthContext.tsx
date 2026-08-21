import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

export type UserRole = 'admin' | 'department_chair' | 'advisor';

interface AuthUser {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  department: string | null;
  must_change_password: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore the stored session, then ALWAYS revalidate it against the
    // backend. Without this, a profile cached at first login (role,
    // department, status) stays frozen forever, so users keep seeing the
    // permissions/behaviour of the version they signed in on.
    const stored = localStorage.getItem('arip_user');
    if (!stored) {
      setLoading(false);
      return;
    }

    let cached: AuthUser | null = null;
    try {
      cached = JSON.parse(stored);
      setUser(cached);
    } catch {
      localStorage.removeItem('arip_user');
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const { data } = await supabase
          .from('app_users')
          .select('*')
          .eq('user_id', cached!.id)
          .maybeSingle();

        if (!data || data.status !== 'active') {
          // Deleted or deactivated account: end the stale session.
          setUser(null);
          localStorage.removeItem('arip_user');
        } else {
          const fresh: AuthUser = {
            id: data.user_id,
            username: data.username,
            full_name: data.full_name,
            role: data.role as UserRole,
            department: data.department,
            must_change_password: data.must_change_password,
          };
          setUser(fresh);
          localStorage.setItem('arip_user', JSON.stringify(fresh));
        }
      } catch {
        // Network failure: keep the cached session rather than locking out.
      } finally {
        setLoading(false);
      }
    })();
  }, []);


  const login = async (username: string, password: string): Promise<{ error?: string }> => {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('username', username)
        .eq('status', 'active')
        .single();

      if (error || !data) {
        return { error: 'Invalid username or password' };
      }

      // For demo: simple password check (in production, use proper hashing via edge function)
      if (data.password_hash !== password) {
        return { error: 'Invalid username or password' };
      }

      const authUser: AuthUser = {
        id: data.user_id,
        username: data.username,
        full_name: data.full_name,
        role: data.role as UserRole,
        department: data.department,
        must_change_password: data.must_change_password,
      };

      setUser(authUser);
      localStorage.setItem('arip_user', JSON.stringify(authUser));
      return {};
    } catch {
      return { error: 'Login failed. Please try again.' };
    }
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem('arip_user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
