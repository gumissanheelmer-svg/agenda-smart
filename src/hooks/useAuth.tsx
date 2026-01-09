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

interface ManagerInfo {
  id: string;
  name: string;
  barbershop_id: string;
  status: 'pending' | 'active' | 'blocked';
  active: boolean;
}

interface BarbershopInfo {
  id: string;
  name: string;
  approval_status: 'pending' | 'approved' | 'rejected' | 'blocked';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isActiveManager: boolean;
  managerInfo: ManagerInfo | null;
  isBarber: boolean;
  isApprovedBarber: boolean;
  barberAccount: BarberAccountInfo | null;
  barbershopId: string | null;
  barbershopInfo: BarbershopInfo | null;
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
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [isActiveManager, setIsActiveManager] = useState(false);
  const [managerInfo, setManagerInfo] = useState<ManagerInfo | null>(null);
  const [isBarber, setIsBarber] = useState(false);
  const [isApprovedBarber, setIsApprovedBarber] = useState(false);
  const [barberAccount, setBarberAccount] = useState<BarberAccountInfo | null>(null);
  const [barbershopId, setBarbershopId] = useState<string | null>(null);
  const [barbershopInfo, setBarbershopInfo] = useState<BarbershopInfo | null>(null);
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
    setIsSuperAdmin(false);
    setIsAdmin(false);
    setIsManager(false);
    setIsActiveManager(false);
    setManagerInfo(null);
    setIsBarber(false);
    setIsApprovedBarber(false);
    setBarberAccount(null);
    setBarbershopId(null);
    setBarbershopInfo(null);
  };

  const checkUserRoles = async (userId: string) => {
    try {
      // Check all roles for this user
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role, barbershop_id')
        .eq('user_id', userId);

      if (rolesError) {
        console.error('Error checking roles:', rolesError);
      }

      // Check for superadmin role
      const superAdminRole = rolesData?.find(r => r.role === 'superadmin');
      setIsSuperAdmin(!!superAdminRole);

      // Check for admin role and get barbershop_id
      const adminRole = rolesData?.find(r => r.role === 'admin');
      setIsAdmin(!!adminRole);

      // Check for manager role and get barbershop_id
      const managerRole = rolesData?.find(r => r.role === 'manager');
      setIsManager(!!managerRole);
      
      // If manager role exists, check if manager is active
      if (managerRole) {
        const { data: managerData } = await supabase
          .from('managers')
          .select('id, name, barbershop_id, active')
          .eq('user_id', userId)
          .eq('active', true)
          .maybeSingle();
          
        const mgr = managerData as unknown as ManagerInfo | null;
        if (mgr) {
          setManagerInfo(mgr);
          setIsActiveManager(mgr.active);
          if (!barbershopId) {
            setBarbershopId(mgr.barbershop_id);
          }
        } else {
          setManagerInfo(null);
          setIsActiveManager(false);
        }
      }
      
      // Use admin or manager barbershop_id
      const roleWithShop = adminRole || managerRole;
      
      if (roleWithShop?.barbershop_id) {
        setBarbershopId(roleWithShop.barbershop_id);
        
        // Fetch barbershop info to check approval status
        const { data: shopData, error: shopError } = await supabase
          .from('barbershops')
          .select('id, name, approval_status')
          .eq('id', roleWithShop.barbershop_id)
          .maybeSingle();

        if (!shopError && shopData) {
          setBarbershopInfo(shopData as BarbershopInfo);
        }
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
        if (barberData.barbershop_id && !barbershopId) {
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
      isSuperAdmin,
      isAdmin,
      isManager,
      isActiveManager,
      managerInfo,
      isBarber, 
      isApprovedBarber, 
      barberAccount,
      barbershopId,
      barbershopInfo,
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
