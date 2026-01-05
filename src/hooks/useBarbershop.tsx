import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Barbershop {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  whatsapp_number: string | null;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  opening_time: string | null;
  closing_time: string | null;
  active: boolean;
}

interface BarbershopContextType {
  barbershop: Barbershop | null;
  isLoading: boolean;
  error: string | null;
  setBarbershopBySlug: (slug: string) => Promise<boolean>;
  clearBarbershop: () => void;
}

const BarbershopContext = createContext<BarbershopContextType | undefined>(undefined);

export function BarbershopProvider({ children }: { children: ReactNode }) {
  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setBarbershopBySlug = async (slug: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('barbershops')
        .select('*')
        .eq('slug', slug)
        .eq('active', true)
        .maybeSingle();

      if (fetchError) {
        setError('Erro ao carregar barbearia');
        setIsLoading(false);
        return false;
      }

      if (!data) {
        setError('Barbearia não encontrada');
        setIsLoading(false);
        return false;
      }

      setBarbershop(data as Barbershop);
      setIsLoading(false);
      return true;
    } catch (err) {
      setError('Erro ao carregar barbearia');
      setIsLoading(false);
      return false;
    }
  };

  const clearBarbershop = () => {
    setBarbershop(null);
    setError(null);
  };

  return (
    <BarbershopContext.Provider value={{ 
      barbershop, 
      isLoading, 
      error, 
      setBarbershopBySlug,
      clearBarbershop 
    }}>
      {children}
    </BarbershopContext.Provider>
  );
}

export function useBarbershop() {
  const context = useContext(BarbershopContext);
  if (context === undefined) {
    throw new Error('useBarbershop must be used within a BarbershopProvider');
  }
  return context;
}
