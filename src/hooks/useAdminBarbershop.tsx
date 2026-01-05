import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBarbershop, Barbershop } from '@/hooks/useBarbershop';

export function useAdminBarbershop() {
  const { user, barbershopId } = useAuth();
  const { barbershop, setBarbershopBySlug } = useBarbershop();
  const [adminBarbershop, setAdminBarbershop] = useState<Barbershop | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (barbershopId && user) {
      fetchAdminBarbershop();
    } else {
      setIsLoading(false);
    }
  }, [barbershopId, user]);

  const fetchAdminBarbershop = async () => {
    if (!barbershopId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from('barbershops')
      .select('*')
      .eq('id', barbershopId)
      .maybeSingle();

    if (data && !error) {
      setAdminBarbershop(data as Barbershop);
      
      // Apply theme by setting barbershop in context
      if (data.slug) {
        await setBarbershopBySlug(data.slug);
      }
    }
    setIsLoading(false);
  };

  return {
    barbershop: adminBarbershop || barbershop,
    barbershopId,
    isLoading,
    refetch: fetchAdminBarbershop,
  };
}
