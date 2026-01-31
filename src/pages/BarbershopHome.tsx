import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBarbershop } from '@/hooks/useBarbershop';
import { LandingPage } from '@/components/LandingPage';
import { BookingForm } from '@/components/BookingForm';
import { Logo } from '@/components/Logo';
import { Helmet } from 'react-helmet-async';

export default function BarbershopHome() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { barbershop, isLoading, error, setBarbershopBySlug } = useBarbershop();
  const [showBooking, setShowBooking] = useState(false);

  useEffect(() => {
    if (slug) {
      // Always fetch fresh data when the page loads
      // This ensures settings changes are reflected immediately
      console.log('[BarbershopHome] Loading business data for slug:', slug);
      setBarbershopBySlug(slug);
    }
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-center">
          <Logo size="lg" />
          <p className="text-muted-foreground mt-4">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error || !barbershop) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Logo size="lg" />
        <h1 className="mt-8 text-2xl font-display text-foreground">
          Negócio não encontrado
        </h1>
        <p className="text-muted-foreground mt-2">
          O link que você está a aceder não existe ou foi desativado.
        </p>
        <button 
          onClick={() => navigate('/')}
          className="mt-6 text-primary hover:underline"
        >
          Voltar à página inicial
        </button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{barbershop.name} - Agendamento Online | Moçambique</title>
        <meta 
          name="description" 
          content={`Agende seu atendimento online na ${barbershop.name}. Profissionais experientes, atendimento de qualidade em Moçambique.`} 
        />
      </Helmet>
      
      {showBooking ? (
        <BookingForm 
          onBack={() => setShowBooking(false)} 
          barbershopId={barbershop.id}
          backgroundImageUrl={barbershop.background_image_url}
          backgroundOverlayLevel={barbershop.background_overlay_level as 'low' | 'medium' | 'high' | undefined}
        />
      ) : (
        <LandingPage 
          onBookNow={() => setShowBooking(true)} 
          barbershopName={barbershop.name}
          logoUrl={barbershop.logo_url}
          backgroundImageUrl={barbershop.background_image_url}
          backgroundOverlayLevel={barbershop.background_overlay_level}
        />
      )}
    </>
  );
}
