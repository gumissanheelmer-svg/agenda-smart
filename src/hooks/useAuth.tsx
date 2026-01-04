import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface BarberAccountInfo {
  id: string;
  name: string;
  barber_id: string | null;
  approval_status: 'pending' | 'approved' | 'rejected' | 'blocked';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isBarber: boolean;
  isApprovedBarber: boolean;
  barberAccount: BarberAccountInfo | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBarber, setIsBarber] = useState(false);
  const [isApprovedBarber, setIsApprovedBarber] = useState(false);
  const [barberAccount, setBarberAccount] = useState<BarberAccountInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            checkUserRoles(session.user.id);
          }, 0);
        } else {
          resetRoles();
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        checkUserRoles(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const resetRoles = () => {
    setIsAdmin(false);
    setIsBarber(false);
    setIsApprovedBarber(false);
    setBarberAccount(null);
  };

  const checkUserRoles = async (userId: string) => {
    try {
      // Check admin role
      const { data: adminData, error: adminError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (adminError) {
        console.error('Error checking admin role:', adminError);
      }
      setIsAdmin(!!adminData);

      // Check barber account and status
      const { data: barberData, error: barberError } = await supabase
        .from('barber_accounts')
        .select('id, name, barber_id, approval_status')
        .eq('user_id', userId)
        .maybeSingle();

      if (barberError) {
        console.error('Error checking barber account:', barberError);
        setIsBarber(false);
        setIsApprovedBarber(false);
        setBarberAccount(null);
        return;
      }

      if (barberData) {
        setIsBarber(true);
        setBarberAccount(barberData as BarberAccountInfo);
        setIsApprovedBarber(barberData.approval_status === 'approved');
      } else {
        setIsBarber(false);
        setIsApprovedBarber(false);
        setBarberAccount(null);
      }
    } catch (err) {
      console.error('Error in checkUserRoles:', err);
      resetRoles();
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const redirectUrl = `${window.location.origin}/admin/dashboard`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    resetRoles();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      isAdmin, 
      isBarber, 
      isApprovedBarber, 
      barberAccount,
      isLoading, 
      signIn, 
      signUp, 
      signOut 
    }}>
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
