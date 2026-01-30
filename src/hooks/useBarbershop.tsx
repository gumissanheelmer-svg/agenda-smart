import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Barbershop {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  opening_time: string | null;
  closing_time: string | null;
  active: boolean;
  business_type: 'barbearia' | 'salao' | 'salao_barbearia';
  background_image_url: string | null;
  background_overlay_level: 'low' | 'medium' | 'high';
  mpesa_number: string | null;
  emola_number: string | null;
  payment_methods_enabled: string[];
  whatsapp_number: string | null;
  payment_required: boolean;
  prep_buffer_minutes: number;
  cleanup_buffer_minutes: number;
  slot_interval_minutes: number;
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
      // Use secure RPC function that excludes owner_email
      const { data, error: fetchError } = await supabase
        .rpc('get_public_barbershop', { p_slug: slug });

      if (fetchError) {
        setError('Erro ao carregar barbearia');
        setIsLoading(false);
        return false;
      }

      if (!data || data.length === 0) {
        setError('Barbearia não encontrada');
        setIsLoading(false);
        return false;
      }

      // RPC returns an array, get first item
      const barbershopData = data[0];
      setBarbershop({
        ...barbershopData,
        active: true, // We only get active barbershops
        business_type: barbershopData.business_type || 'barbearia',
        background_image_url: barbershopData.background_image_url || null,
        background_overlay_level: barbershopData.background_overlay_level || 'medium',
        mpesa_number: barbershopData.mpesa_number || null,
        emola_number: barbershopData.emola_number || null,
        payment_methods_enabled: barbershopData.payment_methods_enabled || [],
        whatsapp_number: barbershopData.whatsapp_number || null,
        payment_required: barbershopData.payment_required || false,
        prep_buffer_minutes: barbershopData.prep_buffer_minutes ?? 0,
        cleanup_buffer_minutes: barbershopData.cleanup_buffer_minutes ?? 0,
        slot_interval_minutes: barbershopData.slot_interval_minutes ?? 30,
      } as Barbershop);
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
