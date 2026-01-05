import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface BarberAccountInfo {
  id: string;
  name: string;
  barber_id: string | null;
  approval_status: 'pending' | 'approved' | 'rejected' | 'blocked';
  barbershop_id: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isBarber: boolean;
  isApprovedBarber: boolean;
  barberAccount: BarberAccountInfo | null;
  barbershopId: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBarber, setIsBarber] = useState(false);
  const [isApprovedBarber, setIsApprovedBarber] = useState(false);
  const [barberAccount, setBarberAccount] = useState<BarberAccountInfo | null>(null);
  const [barbershopId, setBarbershopId] = useState<string | null>(null);
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
    setBarbershopId(null);
  };

  const checkUserRoles = async (userId: string) => {
    try {
      // Check admin role and get barbershop_id
      const { data: adminData, error: adminError } = await supabase
        .from('user_roles')
        .select('role, barbershop_id')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (adminError) {
        console.error('Error checking admin role:', adminError);
      }
      setIsAdmin(!!adminData);
      if (adminData?.barbershop_id) {
        setBarbershopId(adminData.barbershop_id);
      }

      // Check barber account and status
      const { data: barberData, error: barberError } = await supabase
        .from('barber_accounts')
        .select('id, name, barber_id, approval_status, barbershop_id')
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
        if (barberData.barbershop_id) {
          setBarbershopId(barberData.barbershop_id);
        }
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
      const redirectUrl = `${window.location.origin}/login`;
      
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

  const refreshRoles = async () => {
    if (user) {
      await checkUserRoles(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      isAdmin, 
      isBarber, 
      isApprovedBarber, 
      barberAccount,
      barbershopId,
      isLoading, 
      signIn, 
      signUp, 
      signOut,
      refreshRoles
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
